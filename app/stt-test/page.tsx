"use client";

import { useEffect, useRef, useState } from "react";
import { wordDiff, type DiffPart } from "./diff";

type Provider = { id: string; label: string };
type Result = { provider: string; label: string; text: string; ms: number; error?: string };
type Test = { expected: string; context: string; audioUrl: string; seconds?: number; results: Result[] };

function pickMimeType() {
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return options.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
}

function extensionFor(type: string) {
  if (type.includes("webm")) return "webm";
  if (type.includes("mp4") || type.includes("aac")) return "mp4";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("wav")) return "wav";
  if (type.includes("mpeg")) return "mp3";
  return "webm";
}

export default function SttTestPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [disabled, setDisabled] = useState(false);
  const [provider, setProvider] = useState("all");
  const [expected, setExpected] = useState("");
  const [context, setContext] = useState("");
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [micLabel, setMicLabel] = useState("");
  const [tests, setTests] = useState<Test[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);

  // Release the microphone when leaving the page.
  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  useEffect(() => {
    fetch("/api/transcribe")
      .then(async (r) => {
        if (r.status === 404) return setDisabled(true); // switched off on the live site
        const d = await r.json();
        setProviders(d.providers ?? []);
      })
      .catch(() => setError("Could not load providers"));
  }, []);

  async function send(audio: Blob, filename: string, seconds?: number) {
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("audio", audio, filename);
      form.append("provider", provider);
      form.append("context", context);
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      const audioUrl = URL.createObjectURL(audio);
      setTests((t) => [{ expected, context, audioUrl, seconds, results: data.results }, ...t]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    setError("");
    setStarting(true);
    try {
      // Keep one microphone stream open for the whole page. Opening it fresh
      // on every press cuts off the first words while the mic warms up
      // (Bluetooth headsets are especially slow).
      let stream = streamRef.current;
      if (!stream || stream.getAudioTracks().every((t) => t.readyState === "ended")) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        setMicLabel(stream.getAudioTracks()[0]?.label ?? "");
        await new Promise((r) => setTimeout(r, 500)); // warm-up on first use
      }
      let mimeType = pickMimeType();
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      } catch {
        // Some browsers (iPhone Safari) claim support for a format, then reject it.
        // Fall back to the browser's own default format.
        mimeType = undefined;
        recorder = new MediaRecorder(stream);
      }
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstart = () => {
        startedAtRef.current = Date.now();
        setStarting(false);
        setRecording(true);
      };
      recorder.onstop = () => {
        const seconds = (Date.now() - startedAtRef.current) / 1000;
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        if (blob.size === 0) return setError("Nothing was recorded. Try again.");
        send(blob, `recording.${extensionFor(type)}`, seconds);
      };
      recorderRef.current = recorder;
      recorder.start();
    } catch (e) {
      setStarting(false);
      const name = e instanceof DOMException ? e.name : "";
      const detail = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError(
          "Microphone access was blocked for this site. On iPhone: tap “aA” in the address bar → " +
            `Website Settings → Microphone → Allow, then reload. (${detail})`,
        );
      } else if (name === "NotFoundError") {
        setError(`No microphone found. (${detail})`);
      } else {
        setError(`Could not start recording. (${detail})`);
      }
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) send(file, file.name);
    e.target.value = "";
  }

  function copyTable() {
    const header = "| Said | Question given? | Provider | Transcript | Kept exactly? |\n|---|---|---|---|---|";
    const rows = tests.flatMap((t) =>
      t.results.map((r) => {
        const exact = t.expected ? (wordDiff(t.expected, r.text).every((p) => p.kind === "same") ? "yes" : "no") : "";
        return `| ${t.expected} | ${t.context ? "yes" : "no"} | ${r.label} | ${r.error ? "ERROR" : r.text} | ${exact} |`;
      }),
    );
    navigator.clipboard.writeText([header, ...rows].join("\n"));
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Transcription test</h1>
        <p className="text-sm opacity-70">
          Type the sentence exactly as you will say it, mistakes included. Then record it (or upload a voice
          message). Each provider&apos;s transcript is compared with what you typed.
        </p>
      </header>

      <section className="space-y-3">
        <label className="block text-sm font-medium">
          What will be said (with the mistakes)
          <input
            className="mt-1 w-full rounded border border-current/20 bg-transparent px-3 py-2"
            placeholder="If I win lottery, I would buy house."
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
          />
        </label>

        <label className="block text-sm font-medium">
          Question being answered (optional, gives the provider context, as in the real app)
          <input
            className="mt-1 w-full rounded border border-current/20 bg-transparent px-3 py-2"
            placeholder="If you won the lottery, what would you do?"
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
        </label>

        <label className="block text-sm font-medium">
          Provider
          <select
            className="mt-1 w-full rounded border border-current/20 bg-transparent px-3 py-2"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            <option value="all">All configured providers ({providers.length})</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        {disabled ? (
          <p className="text-sm text-amber-600">
            This test page is switched off on the live site, because it has no login and uses paid API keys.
            Use it locally (npm run dev), or set ENABLE_STT_TEST=1 in Vercel for a short test, then remove it.
          </p>
        ) : (
          providers.length === 0 && (
            <p className="text-sm text-amber-600">No API keys found. Add them to .env.local and restart.</p>
          )
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={toggleRecording}
            disabled={busy || starting || providers.length === 0}
            className={`rounded-full px-6 py-3 font-medium text-white disabled:opacity-40 ${
              recording ? "bg-red-600 animate-pulse" : "bg-blue-600"
            }`}
          >
            {starting ? "Starting…" : recording ? "■ Stop (speak now)" : "● Record"}
          </button>
          <label className="cursor-pointer text-sm underline">
            or upload an audio file
            <input type="file" accept="audio/*,.ogg,.opus,.m4a" className="hidden" onChange={onFile} />
          </label>
          {busy && <span className="text-sm opacity-70">Transcribing…</span>}
        </div>
        {micLabel && (
          <p className="text-xs opacity-70">
            Microphone: {micLabel}
            {/airpods|bluetooth|headset|hands-free|buds/i.test(micLabel) &&
              " ⚠ Bluetooth microphones record in low quality. Try the laptop's built-in mic."}
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </section>

      {tests.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Results</h2>
            <button onClick={copyTable} className="text-sm underline">
              Copy all as a table
            </button>
          </div>
          <p className="text-xs opacity-70">
            <span className="rounded bg-green-200 px-1 text-black">green</span> = word the provider added
            (it &quot;fixed&quot; your grammar) ·{" "}
            <span className="rounded bg-red-200 px-1 text-black line-through">red</span> = word you said that it
            dropped or changed
          </p>
          {tests.map((t, i) => (
            <div key={tests.length - i} className="rounded border border-current/20 p-3 space-y-2">
              <p className="text-sm">
                <span className="opacity-60">Said: </span>
                {t.expected || <em className="opacity-60">(not typed)</em>}
                {t.seconds !== undefined && <span className="opacity-50"> · {t.seconds.toFixed(1)} s</span>}
              </p>
              {t.context && <p className="text-xs opacity-60">Question: {t.context}</p>}
              {/* Listen to what the providers actually received. */}
              <audio controls src={t.audioUrl} className="h-8 w-full" />
              {t.results.map((r) => (
                <div key={r.provider} className="text-sm">
                  <span className="font-medium">{r.label}</span>
                  <span className="opacity-50"> · {r.ms} ms</span>
                  <div className="mt-0.5">
                    {r.error ? (
                      <span className="text-red-600">{r.error}</span>
                    ) : t.expected ? (
                      <Diff parts={wordDiff(t.expected, r.text)} />
                    ) : (
                      r.text
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}

function Diff({ parts }: { parts: DiffPart[] }) {
  const exact = parts.every((p) => p.kind === "same");
  return (
    <span>
      {parts.map((p, i) => (
        <span
          key={i}
          className={
            p.kind === "added"
              ? "rounded bg-green-200 px-0.5 text-black"
              : p.kind === "removed"
                ? "rounded bg-red-200 px-0.5 text-black line-through"
                : ""
          }
        >
          {p.word}{" "}
        </span>
      ))}
      <span className={exact ? "text-green-600" : "text-amber-600"}>{exact ? "✓ kept exactly" : "✗ changed"}</span>
    </span>
  );
}
