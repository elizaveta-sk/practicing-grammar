"use client";
// The practice session. For each bank question:
//   main answer (grammar required)
//     correct   -> follow-up question
//     not_used  -> "Remember to use…" + nudge question, repeated until used
//     incorrect -> correction (text + voice), learner repeats it (2 tries) -> follow-up
//   follow-up answer (grammar not required)
//     used wrongly -> correction, repeat (2 tries) -> next bank question
//     otherwise    -> next bank question
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { splitOptional, wordDiff } from "@/lib/diff";
import { useRecorder, type Recording } from "@/lib/use-recorder";
import { useVoice } from "@/lib/voice-choice";

export type BankQuestion = { text: string; audio: Record<string, string | null> };

const SESSION_LENGTH = 10;
const MAX_REPEATS = 2;

type Stage = "main" | "repeat" | "followup" | "followupRepeat";
type Verdict = "correct" | "incorrect" | "not_used";
type TurnResponse = {
  transcript: string;
  verdict?: Verdict;
  correctedAnswer?: string;
  nextQuestion?: string;
  /** Set when the learner asked how to say something in English. */
  wordHelp?: string;
  /** "Sorry, what?": say the last line again. */
  askedToRepeat?: boolean;
  /** "What does 'fictional' mean?": a short explanation. */
  meaningHelp?: string;
};

type Entry =
  | { id: number; who: "bot"; text: string; audioUrl?: string }
  | { id: number; who: "learner"; transcript: string; corrected?: string; wrong: boolean }
  | { id: number; who: "note"; text: string };
type NewEntry = Entry extends infer E ? (E extends Entry ? Omit<E, "id"> : never) : never;

type Popup =
  | { kind: "correction"; sentence: string; triesLeft: number }
  | { kind: "nudge"; text: string }
  | { kind: "word"; phrase: string; previous: Popup }
  | { kind: "meaning"; text: string; previous: Popup }
  | null;

// The checker marks an optional start with brackets: "(If I could meet anyone,)
// I would meet…". Owner's design: no brackets or label on screen, just grey.
function OptionalPart({ text }: { text: string }) {
  return (
    <>
      <span className="opacity-45" title="Optional: you can leave this part out">
        {text}
      </span>
      <span className="sr-only"> (optional)</span>{" "}
    </>
  );
}

function Optional({ sentence }: { sentence: string }) {
  const { optional, rest } = splitOptional(sentence);
  return (
    <>
      {optional && <OptionalPart text={optional} />}
      {rest}
    </>
  );
}

// The corrected answer under the learner's words, with the changed words
// underlined and the optional start in grey.
function Corrected({ transcript, sentence }: { transcript: string; sentence: string }) {
  const { optional, rest } = splitOptional(sentence);
  return (
    <>
      {optional && <OptionalPart text={optional} />}
      {wordDiff(transcript, rest)
        .filter((p) => p.kind !== "removed")
        .map((p, i) => (
          <span key={i} className={p.kind === "added" ? "font-semibold underline" : ""}>
            {p.word}{" "}
          </span>
        ))}
    </>
  );
}

// Errors don't always come back as JSON (e.g. the live site's "Not found"
// while practice is switched off, or the host's own error pages), and
// Safari's JSON error ("The string did not match the expected pattern")
// means nothing to a learner. Read the text first and explain what we can.
async function readTurnResponse(res: Response): Promise<TurnResponse> {
  const body = await res.text();
  let json: (TurnResponse & { error?: string }) | null = null;
  try {
    json = JSON.parse(body);
  } catch {}
  if (res.ok && json) return json;
  if (json?.error) throw new Error(json.error);
  if (res.status === 404) throw new Error("Practice is switched off on this site at the moment.");
  if (res.status === 413) throw new Error("That recording was too long. Try a shorter answer.");
  if (res.status === 504 || res.status === 408) throw new Error("Checking took too long.");
  throw new Error(`Something went wrong (error ${res.status}).`);
}

function shuffle<T>(items: T[]) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9'\s]/g, " ").replace(/\s+/g, " ").trim();

export function Session({
  topicId,
  topicName,
  nudgeText,
  questions,
}: {
  topicId: string;
  topicName: string;
  /** The reminder shown when the grammar wasn't used. */
  nudgeText: string;
  questions: BankQuestion[];
}) {
  const voice = useVoice();

  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [order, setOrder] = useState<BankQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [stage, setStage] = useState<Stage>("main");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [repeatTarget, setRepeatTarget] = useState("");
  const [repeatTries, setRepeatTries] = useState(0);
  const [pendingFollowUp, setPendingFollowUp] = useState("");
  const [log, setLog] = useState<Entry[]>([]);
  const [shown, setShown] = useState<Set<number>>(new Set());
  const [popup, setPopup] = useState<Popup>(null);
  const [checking, setChecking] = useState(false);
  const [tapToPlay, setTapToPlay] = useState<string | null>(null);
  const [turnError, setTurnError] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spokenCache = useRef(new Map<string, string>()); // text -> audio URL, so replays are free
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [log.length, popup]);

  const recorder = useRecorder({ onRecorded: handleRecording });

  // ---- audio -------------------------------------------------------------

  // One <audio> element, first played inside the Start tap: iPhone Safari
  // then allows it to play again later without another tap.
  function play(url: string, then?: string) {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    a.src = url;
    // Optionally play a second clip right after (e.g. an explanation, then the question).
    a.onended = then ? () => play(then) : null;
    setTapToPlay(null);
    a.play().catch(() => setTapToPlay(url)); // autoplay blocked: offer a button
  }

  async function speak(text: string) {
    const url = await speechUrl(text);
    if (url) play(url);
    return url;
  }

  // Owner's rule: the grey optional start isn't part of the correction, so the
  // voice reads only the rest ("I will work out every day", not "If you pay…").
  function sayCorrection(sentence: string) {
    return speak(splitOptional(sentence).rest);
  }

  /** Audio for a line of text, generated once and then cached. */
  async function speechUrl(text: string) {
    let url = spokenCache.current.get(`${voice}|${text}`);
    if (!url) {
      try {
        const res = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voiceId: voice, text }),
        });
        if (!res.ok) throw new Error();
        url = URL.createObjectURL(await res.blob());
        spokenCache.current.set(`${voice}|${text}`, url);
      } catch {
        return undefined; // the text is still on screen behind "Show the question"
      }
    }
    return url;
  }

  // ---- log ---------------------------------------------------------------

  function addEntry(entry: NewEntry) {
    const id = nextId.current++;
    setLog((l) => [...l, { ...entry, id } as Entry]);
    return id;
  }

  async function addBot(text: string, audioUrl?: string | null) {
    const id = addEntry({ who: "bot", text, audioUrl: audioUrl ?? undefined });
    const url = audioUrl ? (play(audioUrl), audioUrl) : await speak(text);
    if (url && !audioUrl) setLog((l) => l.map((e) => (e.id === id ? { ...e, audioUrl: url } : e)));
  }

  // ---- flow --------------------------------------------------------------

  function start() {
    audioRef.current = new Audio();
    const picked = shuffle(questions).slice(0, SESSION_LENGTH);
    setOrder(picked);
    setStarted(true);
    askBank(0, picked);
  }

  function askBank(i: number, list: BankQuestion[]) {
    const q = list[i];
    setQIndex(i);
    setStage("main");
    setCurrentQuestion(q.text);
    setPopup(null);
    addBot(q.text, q.audio[voice]);
  }

  function nextBank() {
    const n = qIndex + 1;
    setPopup(null);
    if (n >= order.length) {
      setDone(true);
      addEntry({ who: "note", text: "That's all 10 questions. Great work!" });
      return;
    }
    askBank(n, order);
  }

  function goFollowUp(question: string) {
    setPopup(null);
    if (!question) return nextBank();
    setStage("followup");
    setCurrentQuestion(question);
    addBot(question);
  }

  function showCorrection(sentence: string, next: Stage) {
    setRepeatTarget(sentence);
    setRepeatTries(0);
    setStage(next);
    setPopup({ kind: "correction", sentence, triesLeft: MAX_REPEATS });
    sayCorrection(sentence);
  }

  async function handleRecording(r: Recording) {
    audioRef.current?.pause();
    setTurnError("");
    if (r.seconds < 0.6) return setTurnError("That was very short. Press the button, speak, then press it again.");

    const mode = stage === "main" ? "main" : stage === "followup" ? "followup" : "repeat";
    const form = new FormData();
    form.append("audio", r.blob, r.filename);
    form.append("topicId", topicId);
    form.append("mode", mode);
    form.append("question", currentQuestion);
    if (mode === "repeat") form.append("expectedRepeat", repeatTarget);

    setChecking(true);
    let data: TurnResponse;
    try {
      const res = await fetch("/api/turn", { method: "POST", body: form });
      data = await readTurnResponse(res);
    } catch (e) {
      setChecking(false);
      return setTurnError(`${e instanceof Error && e.message ? e.message : "Connection problem."} Please try again.`);
    }
    setChecking(false);

    if (!data.transcript) return setTurnError("I didn't catch that. Please try again.");

    // "Sorry, what?": say the last line again (the correction being practised,
    // or the question). Not graded and doesn't use up a try.
    if (data.askedToRepeat) {
      addEntry({ who: "learner", transcript: data.transcript, wrong: false });
      if (popup?.kind === "correction") return sayCorrection(popup.sentence);
      const lastBot = [...log].reverse().find((e) => e.who === "bot");
      if (lastBot?.who === "bot" && lastBot.audioUrl) return play(lastBot.audioUrl);
      return speak(currentQuestion);
    }

    // "What does 'fictional' mean?": explain simply, then ask the same
    // question again. Not graded and doesn't use up a try.
    if (data.meaningHelp) {
      const explanation = data.meaningHelp;
      addEntry({ who: "learner", transcript: data.transcript, wrong: false });
      setPopup((p) => ({ kind: "meaning", text: explanation, previous: p && "previous" in p ? p.previous : p }));
      const lastBot = [...log].reverse().find((e) => e.who === "bot");
      const [explained, question] = await Promise.all([
        speechUrl(explanation),
        lastBot?.who === "bot" && lastBot.audioUrl ? lastBot.audioUrl : speechUrl(currentQuestion),
      ]);
      if (explained) play(explained, question);
      return;
    }

    // "How do I say this in English?": give the word, then the same question
    // again. Not graded and doesn't use up a try.
    if (data.wordHelp) {
      addEntry({ who: "learner", transcript: data.transcript, wrong: false });
      setPopup((p) => ({ kind: "word", phrase: data.wordHelp!, previous: p && "previous" in p ? p.previous : p }));
      speak(`You can say: ${data.wordHelp}.`);
      return;
    }
    if (popup && "previous" in popup) setPopup(popup.previous);
    const corrected = data.correctedAnswer && norm(data.correctedAnswer) !== norm(data.transcript) ? data.correctedAnswer : undefined;
    addEntry({ who: "learner", transcript: data.transcript, corrected, wrong: data.verdict === "incorrect" });

    if (stage === "main") {
      if (data.verdict === "correct") return goFollowUp(data.nextQuestion ?? "");
      if (data.verdict === "not_used") {
        const nudge = data.nextQuestion || currentQuestion;
        setPopup({ kind: "nudge", text: nudgeText });
        setCurrentQuestion(nudge);
        return addBot(nudge);
      }
      setPendingFollowUp(data.nextQuestion ?? "");
      return showCorrection(data.correctedAnswer || repeatTarget, "repeat");
    }

    if (stage === "followup") {
      if (data.verdict === "incorrect") return showCorrection(data.correctedAnswer ?? "", "followupRepeat");
      return nextBank();
    }

    // Repeating a correction.
    const after = () => (stage === "repeat" ? goFollowUp(pendingFollowUp) : nextBank());
    const tries = repeatTries + 1;
    if (data.verdict === "correct") {
      addEntry({ who: "note", text: "Well done!" });
      return after();
    }
    if (tries < MAX_REPEATS) {
      setRepeatTries(tries);
      setPopup({ kind: "correction", sentence: repeatTarget, triesLeft: MAX_REPEATS - tries });
      return sayCorrection(repeatTarget);
    }
    addEntry({ who: "note", text: "Good try! Let's move on." });
    after();
  }

  // ---- render ------------------------------------------------------------

  if (!started) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-10 space-y-6">
        <Link href="/practice" className="text-sm underline opacity-70">
          ← Topics
        </Link>
        <h1 className="text-2xl font-semibold">{topicName}</h1>
        <ol className="list-decimal space-y-1 pl-5 opacity-80">
          <li>Listen to the question.</li>
          <li>Press the button, answer out loud, then press it again.</li>
          <li>If there&apos;s a mistake, you&apos;ll see and hear the correct version. Say it again.</li>
          <li>
            Words in <span className="opacity-45">grey</span> are optional.
          </li>
        </ol>
        <button onClick={start} className="w-full rounded-full bg-blue-600 px-6 py-4 text-lg font-medium text-white">
          Start ({Math.min(SESSION_LENGTH, questions.length)} questions)
        </button>
      </main>
    );
  }

  const busy = checking || recorder.state === "starting";
  const repeating = stage === "repeat" || stage === "followupRepeat";
  const buttonLabel =
    recorder.state === "recording"
      ? "■ Stop"
      : checking
        ? "Checking…"
        : recorder.state === "starting"
          ? "…"
          : repeating
            ? "● Say it again"
            : "● Press to answer";

  // No full-height layout: the Answer button sits right under the conversation
  // and moves down as it grows, then sticks to the bottom once the screen is full.
  return (
    <main className="mx-auto w-full max-w-xl px-4">
      <header className="sticky top-0 z-10 space-y-2 bg-background py-3">
        <div className="flex items-center justify-between text-sm">
          <Link href="/practice" className="underline opacity-70">
            ← Topics
          </Link>
          <span className="font-medium">{topicName}</span>
          <span className="tabular-nums opacity-70">
            {Math.min(qIndex + 1, order.length)} / {order.length}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-current/10">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{ width: `${((done ? order.length : qIndex) / order.length) * 100}%` }}
          />
        </div>
      </header>

      <ol className="space-y-3 py-4">
        {log.map((e) =>
          e.who === "bot" ? (
            <li key={e.id} className="entry-in mr-10 rounded-2xl rounded-tl-sm bg-current/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => (e.audioUrl ? play(e.audioUrl) : speak(e.text))}
                  className="rounded-full bg-blue-600 px-3 py-1 text-sm text-white"
                  aria-label="Play again"
                >
                  🔊
                </button>
                {shown.has(e.id) ? (
                  <span>{e.text}</span>
                ) : (
                  <button onClick={() => setShown((s) => new Set(s).add(e.id))} className="text-sm underline opacity-70">
                    Show the question
                  </button>
                )}
              </div>
            </li>
          ) : e.who === "learner" ? (
            <li key={e.id} className="entry-in ml-10 rounded-2xl rounded-tr-sm border border-current/15 px-4 py-3">
              <p>{e.transcript}</p>
              {e.corrected && (
                <p
                  className={`mt-1 text-sm ${
                    e.wrong ? "text-amber-700 dark:text-amber-400" : "text-green-700 dark:text-green-400"
                  }`}
                >
                  {e.wrong ? "✗ " : "✓ "}
                  <Corrected transcript={e.transcript} sentence={e.corrected} />
                </p>
              )}
            </li>
          ) : (
            <li key={e.id} className="entry-in text-center text-sm opacity-70">
              {e.text}
            </li>
          ),
        )}
        <div ref={endRef} />
      </ol>

      <footer className="sticky bottom-0 space-y-3 bg-background pb-6 pt-2">
        {popup?.kind === "correction" && (
          <div className="rounded-xl border-2 border-amber-500 bg-amber-50 p-4 text-black dark:bg-amber-950 dark:text-amber-50">
            <p className="text-sm font-medium">Say it like this:</p>
            <p className="mt-1 text-lg">
              <Optional sentence={popup.sentence} />
            </p>
            <div className="mt-2 flex items-center justify-between text-sm">
              <button onClick={() => sayCorrection(popup.sentence)} className="underline">
                🔊 Listen again
              </button>
              <span className="opacity-70">
                {popup.triesLeft} {popup.triesLeft === 1 ? "try" : "tries"} left
              </span>
            </div>
          </div>
        )}
        {popup?.kind === "word" && (
          <div className="rounded-xl border-2 border-violet-500 bg-violet-50 p-4 text-black dark:bg-violet-950 dark:text-violet-50">
            <p className="text-sm font-medium">💬 In English you can say:</p>
            <p className="mt-1 text-lg font-semibold">{popup.phrase}</p>
            <div className="mt-2 flex items-center justify-between text-sm">
              <button onClick={() => speak(`You can say: ${popup.phrase}.`)} className="underline">
                🔊 Listen again
              </button>
              <span className="opacity-70">Now try your answer again</span>
            </div>
          </div>
        )}
        {popup?.kind === "meaning" && (
          <div className="rounded-xl border-2 border-violet-500 bg-violet-50 p-4 text-black dark:bg-violet-950 dark:text-violet-50">
            <p className="text-sm font-medium">📖 What it means:</p>
            <p className="mt-1 text-lg">{popup.text}</p>
            <div className="mt-2 flex items-center justify-between text-sm">
              <button onClick={() => speak(popup.text)} className="underline">
                🔊 Listen again
              </button>
              <span className="opacity-70">Now answer the question</span>
            </div>
          </div>
        )}
        {popup?.kind === "nudge" && (
          <div className="rounded-xl border-2 border-blue-500 bg-blue-50 p-4 text-black dark:bg-blue-950 dark:text-blue-50">
            <p className="font-medium">💡 {popup.text}</p>
          </div>
        )}

        {tapToPlay && (
          <button onClick={() => play(tapToPlay)} className="w-full rounded-full border border-blue-600 px-4 py-2 text-blue-600">
            ▶ Tap to listen
          </button>
        )}
        {(turnError || recorder.error) && <p className="text-sm text-red-600">{turnError || recorder.error}</p>}

        {done ? (
          <div className="space-y-3 text-center">
            <p className="text-xl font-semibold">🎉 Session complete</p>
            <Link href="/practice" className="inline-block rounded-full bg-blue-600 px-6 py-3 text-white">
              Back to topics
            </Link>
          </div>
        ) : (
          <button
            onClick={() => (recorder.state === "recording" ? recorder.stop() : recorder.start())}
            disabled={busy}
            className={`w-full rounded-full px-6 py-4 text-lg font-medium text-white disabled:opacity-50 ${
              recorder.state === "recording" ? "animate-pulse bg-red-600" : "bg-blue-600"
            }`}
          >
            {buttonLabel}
          </button>
        )}
      </footer>
    </main>
  );
}
