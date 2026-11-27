"use client";
// The practice session. For each bank question:
//   main answer (grammar required)
//     correct   -> follow-up question
//     not_used  -> "Remember to use…" + nudge question, repeated until used
//   no session length: the bank is reshuffled when it runs out
//     incorrect -> correction (text + voice), learner repeats it (2 tries) -> follow-up
//   follow-up answer (grammar not required)
//     used wrongly -> correction, repeat (2 tries) -> next bank question
//     otherwise    -> next bank question
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { splitOptional, withoutOptional, wordDiff } from "@/lib/diff";
import { useRecorder, type Recording } from "@/lib/use-recorder";
import { useVoice } from "@/lib/voice-choice";

export type BankQuestion = { text: string; audio: Record<string, string | null> };

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

// The checker marks the optional part with brackets: "(If I could meet anyone,)
// I would meet…". Owner's design: no brackets or label on screen, just grey.
function OptionalPart({ text, trailing = false }: { text: string; trailing?: boolean }) {
  return (
    <>
      <span className="opacity-45" title="Optional: you can leave this part out">
        {text}
      </span>
      {!trailing && " "}
    </>
  );
}

// A friendly speech bubble for the word-help tip.
function ChatIcon() {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-voice text-white" aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
        <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
        <path d="M9 10.5h.01M12 10.5h.01M15 10.5h.01" strokeWidth="2.6" />
      </svg>
    </span>
  );
}

function Optional({ sentence }: { sentence: string }) {
  const { before, optional, after, at } = splitOptional(sentence);
  if (at === "start") return (<><OptionalPart text={optional} />{after}</>);
  if (at === "end") return (<>{before} <OptionalPart text={optional} trailing />{after}</>);
  return <>{sentence}</>;
}

// The corrected answer under the learner's words, with the changed words in
// the main clause underlined and the optional if-part in grey.
function Corrected({ transcript, sentence }: { transcript: string; sentence: string }) {
  const { before, optional, after, at } = splitOptional(sentence);
  const underlined = (text: string) => {
    const words = wordDiff(transcript, text).filter((p) => p.kind !== "removed");
    return words.map((p, i) => (
      <span key={i} className={p.kind === "added" ? "font-semibold underline" : ""}>
        {p.word}
        {i < words.length - 1 ? " " : ""}
      </span>
    ));
  };
  if (at === "start") return (<><OptionalPart text={optional} />{underlined(after)}</>);
  if (at === "end") return (<>{underlined(before)} <OptionalPart text={optional} trailing />{after}</>);
  return <>{underlined(sentence)}</>;
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
  const [order, setOrder] = useState<BankQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [stage, setStage] = useState<Stage>("main");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [repeatTarget, setRepeatTarget] = useState("");
  const [repeatTries, setRepeatTries] = useState(0);
  const [pendingFollowUp, setPendingFollowUp] = useState("");
  // After a nudge, that question was the extra conversation, so no follow-up.
  const [nudged, setNudged] = useState(false);
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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [log.length, popup]);

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
    return speak(withoutOptional(sentence));
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
    const picked = shuffle(questions);
    setOrder(picked);
    setStarted(true);
    askBank(0, picked);
  }

  // No session length (owner): learners practise as long as they like. When
  // the bank runs out, it's shuffled again (not starting with the last question).
  function askBank(i: number, list: BankQuestion[]) {
    const q = list[i % list.length];
    setQIndex(i);
    setStage("main");
    setNudged(false);
    setCurrentQuestion(q.text);
    setPopup(null);
    addBot(q.text, q.audio[voice]);
  }

  function nextBank() {
    const n = qIndex + 1;
    setPopup(null);
    let list = order;
    if (n % order.length === 0) {
      const last = order[order.length - 1];
      list = shuffle(questions);
      if (list.length > 1 && list[0] === last) list.push(list.shift()!);
      setOrder(list);
    }
    askBank(n, list);
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
    if (mode === "main" && nudged) form.append("afterNudge", "1");

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
    // No "✓ corrected" line when the grammar wasn't used: the nudge comes instead,
    // and a fixed-up version of an answer without the grammar looks like approval.
    const corrected =
      data.verdict !== "not_used" && data.correctedAnswer && norm(data.correctedAnswer) !== norm(data.transcript)
        ? data.correctedAnswer
        : undefined;
    addEntry({ who: "learner", transcript: data.transcript, corrected, wrong: data.verdict === "incorrect" });

    if (stage === "main") {
      if (data.verdict === "correct") return nudged ? nextBank() : goFollowUp(data.nextQuestion ?? "");
      if (data.verdict === "not_used") {
        const nudge = data.nextQuestion || currentQuestion;
        setNudged(true);
        setPopup({ kind: "nudge", text: nudgeText });
        setCurrentQuestion(nudge);
        return addBot(nudge);
      }
      setPendingFollowUp(nudged ? "" : (data.nextQuestion ?? ""));
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
      <main className="mx-auto w-full max-w-xl space-y-8 px-4 py-10">
        <BackLink />
        <h1 className="text-3xl font-bold tracking-tight">{topicName}</h1>
        <ol className="space-y-3">
          {[
            "Listen to the question.",
            "Press the button, answer out loud, then press it again.",
            "If there's a mistake, you'll see and hear the correct version. Say it again.",
          ].map((text, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-voice-soft text-sm font-semibold text-voice">
                {i + 1}
              </span>
              <span className="pt-0.5">{text}</span>
            </li>
          ))}
          <li className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-voice-soft text-sm font-semibold text-voice">
              4
            </span>
            <span className="pt-0.5">
              Words in <span className="opacity-45">grey</span> are optional.
            </span>
          </li>
        </ol>
        <p className="flex items-center gap-3 rounded-2xl bg-voice-soft p-4 text-sm">
          <ChatIcon />
          <span>
            <span className="font-semibold">Tip:</span> forgot a word? Say: &ldquo;How do I say this in English…&rdquo;
          </span>
        </p>
        <button
          onClick={start}
          className="w-full rounded-full bg-voice px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-voice/25 transition-transform active:scale-[0.98]"
        >
          Start
        </button>
      </main>
    );
  }

  const busy = checking || recorder.state === "starting";
  const repeating = stage === "repeat" || stage === "followupRepeat";
  const buttonLabel =
    recorder.state === "recording"
      ? "Stop"
      : checking
        ? "Checking…"
        : recorder.state === "starting"
          ? "One moment…"
          : repeating
            ? "Say it again"
            : "Press to answer";

  // No full-height layout: the Answer button sits right under the conversation
  // and moves down as it grows, then sticks to the bottom once the screen is full.
  return (
    <main className="mx-auto w-full max-w-xl px-4">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper/90 py-3 text-sm backdrop-blur">
        <BackLink />
        <span className="font-semibold">{topicName}</span>
        <span className="tabular-nums text-muted">Question {qIndex + 1}</span>
      </header>

      <ol className="space-y-4 py-5">
        {log.map((e) =>
          e.who === "bot" ? (
            <li key={e.id} className="entry-in mr-10 flex items-start gap-3">
              <button
                onClick={() => (e.audioUrl ? play(e.audioUrl) : speak(e.text))}
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-voice text-white shadow-md shadow-voice/25 transition-transform active:scale-95"
                aria-label="Play again"
              >
                <SpeakerIcon />
              </button>
              <div className="min-h-10 rounded-2xl rounded-tl-md bg-card px-4 py-2.5 shadow-sm ring-1 ring-line">
                {shown.has(e.id) ? (
                  <span>{e.text}</span>
                ) : (
                  <button onClick={() => setShown((s) => new Set(s).add(e.id))} className="text-sm font-medium text-voice">
                    Show the question
                  </button>
                )}
              </div>
            </li>
          ) : e.who === "learner" ? (
            <li key={e.id} className="entry-in ml-12 rounded-2xl rounded-tr-md bg-voice-soft px-4 py-3">
              <p>{e.transcript}</p>
              {e.corrected && (
                <p className={`mt-1.5 flex gap-1.5 text-sm ${e.wrong ? "text-honey-ink" : "text-leaf"}`}>
                  <span aria-hidden className="font-bold">{e.wrong ? "✗" : "✓"}</span>
                  <span>
                    <Corrected transcript={e.transcript} sentence={e.corrected} />
                  </span>
                </p>
              )}
            </li>
          ) : (
            <li key={e.id} className="entry-in text-center text-sm font-medium text-leaf">
              {e.text}
            </li>
          ),
        )}
        <div ref={endRef} />
      </ol>

      <footer className="sticky bottom-0 space-y-4 bg-paper pb-6 pt-2">
        {popup?.kind === "correction" && (
          <Sheet tone="honey" title="Try this:" onListen={() => sayCorrection(popup.sentence)}>
            <p className="text-lg">
              <Optional sentence={popup.sentence} />
            </p>
          </Sheet>
        )}
        {popup?.kind === "word" && (
          <Sheet
            tone="voice"
            title="In English you can say:"
            onListen={() => speak(`You can say: ${popup.phrase}.`)}
            note="Now try your answer again"
          >
            <p className="text-lg font-semibold">{popup.phrase}</p>
          </Sheet>
        )}
        {popup?.kind === "meaning" && (
          <Sheet tone="voice" title="What it means:" onListen={() => speak(popup.text)} note="Now answer the question">
            <p className="text-lg">{popup.text}</p>
          </Sheet>
        )}
        {popup?.kind === "nudge" && (
          <div className="sheet-in flex items-center gap-3 rounded-2xl bg-voice-soft p-4">
            <ChatIcon />
            <p className="font-medium">{popup.text}</p>
          </div>
        )}

        {tapToPlay && (
          <button onClick={() => play(tapToPlay)} className="w-full rounded-full border border-voice px-4 py-2 font-medium text-voice">
            ▶ Tap to listen
          </button>
        )}
        {(turnError || recorder.error) && <p className="text-center text-sm text-danger">{turnError || recorder.error}</p>}

        <MicButton
          recording={recorder.state === "recording"}
          busy={busy}
          checking={checking}
          label={buttonLabel}
          getLevel={recorder.getLevel}
          onPress={() => (recorder.state === "recording" ? recorder.stop() : recorder.start())}
        />
      </footer>
    </main>
  );
}

// ---- pieces -----------------------------------------------------------------

function BackLink() {
  return (
    <Link href="/practice" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m15 6-6 6 6 6" />
      </svg>
      Topics
    </Link>
  );
}

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

// A pop-up that rises from the bottom: correction (honey) or word help (indigo).
function Sheet({
  tone,
  title,
  onListen,
  note,
  children,
}: {
  tone: "honey" | "voice";
  title: string;
  onListen: () => void;
  note?: string;
  children: React.ReactNode;
}) {
  const box = tone === "honey" ? "bg-honey-soft ring-honey" : "bg-voice-soft ring-voice/40";
  const accent = tone === "honey" ? "text-honey-ink" : "text-voice";
  return (
    <div className={`sheet-in rounded-2xl p-4 ring-2 ${box}`}>
      <p className={`text-sm font-semibold ${accent}`}>{title}</p>
      <div className="mt-1">{children}</div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <button onClick={onListen} className={`inline-flex items-center gap-1.5 font-medium ${accent}`}>
          <SpeakerIcon />
          Listen again
        </button>
        {note && <span className="text-muted">{note}</span>}
      </div>
    </div>
  );
}

// The big round answer button. While recording, a soft ring grows and shrinks
// with the learner's voice, so they can see the app is listening.
function MicButton({
  recording,
  busy,
  checking,
  label,
  getLevel,
  onPress,
}: {
  recording: boolean;
  busy: boolean;
  checking: boolean;
  label: string;
  getLevel: () => number;
  onPress: () => void;
}) {
  const ringRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const ring = ringRef.current;
    if (!recording || !ring) return;
    let frame = 0;
    let smooth = 0;
    const tick = () => {
      smooth = smooth * 0.7 + getLevel() * 0.3;
      ring.style.setProperty("--level", smooth.toFixed(3));
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(frame);
      ring.style.setProperty("--level", "0");
    };
  }, [recording, getLevel]);

  return (
    <div className="flex flex-col items-center gap-2 pt-1">
      <div className="relative">
        <span
          ref={ringRef}
          aria-hidden
          className={`mic-ring absolute inset-0 rounded-full ${recording ? "bg-danger/25" : "bg-voice/15"}`}
        />
        <button
          onClick={onPress}
          disabled={busy}
          aria-label={label}
          className={`relative flex size-20 items-center justify-center rounded-full text-white shadow-lg transition-[transform,background-color] active:scale-95 disabled:opacity-60 ${
            recording ? "bg-danger shadow-danger/30" : "bg-voice shadow-voice/30"
          }`}
        >
          {checking ? (
            <span className="size-7 animate-spin rounded-full border-[3px] border-white/40 border-t-white" aria-hidden />
          ) : recording ? (
            <span className="size-6 rounded-md bg-white" aria-hidden />
          ) : (
            <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="9" y="3" width="6" height="12" rx="3" fill="currentColor" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          )}
        </button>
      </div>
      <span className="text-sm font-medium text-muted" aria-hidden>
        {label}
      </span>
    </div>
  );
}
