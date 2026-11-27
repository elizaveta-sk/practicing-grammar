"use client";

import { useEffect, useRef, useState } from "react";

type Voice = { id: string; provider: "elevenlabs" | "openai"; name: string; accent: string; gender: string };
type Clip = { url: string; ms: number } | { error: string };

// Real lines the app will say: a bank question, a follow-up, a nudge, a correction.
const SAMPLES = [
  "If you could live in any city, town, or village in the world, where would you choose?",
  "That sounds lovely! What would you do there every day?",
  "And what would you do at the bank?",
  "I would go to the bank.",
];

const ELEVEN_MODELS = [
  { id: "eleven_flash_v2_5", label: "Flash v2.5 (cheapest, fastest)" },
  { id: "eleven_multilingual_v2", label: "Multilingual v2 (richer)" },
  { id: "eleven_v3", label: "v3 (most expressive)" },
];

async function fetchClip(body: { voiceId: string; text: string; elevenModel: string; speed: number }): Promise<Clip> {
  const started = Date.now();
  try {
    const res = await fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? `Error ${res.status}`);
    return { url: URL.createObjectURL(await res.blob()), ms: Date.now() - started };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export default function TtsTestPage() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [disabled, setDisabled] = useState(false);
  const [text, setText] = useState(SAMPLES[0]);
  const [elevenModel, setElevenModel] = useState(ELEVEN_MODELS[0].id);
  const [speed, setSpeed] = useState(1);
  const [clips, setClips] = useState<Record<string, Clip>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch("/api/speak")
      .then(async (r) => {
        if (r.status === 404) return setDisabled(true);
        setVoices((await r.json()).voices ?? []);
      })
      .catch(() => setDisabled(true));
  }, []);

  // One clip per voice + settings + text, so replaying doesn't pay again.
  const keyFor = (v: Voice) => `${v.id}|${v.provider === "elevenlabs" ? elevenModel : ""}|${speed}|${text}`;

  async function play(v: Voice) {
    const key = keyFor(v);
    let clip = clips[key];
    if (!clip) {
      setLoading(v.id);
      const fetched = await fetchClip({ voiceId: v.id, text, elevenModel, speed });
      clip = fetched;
      setClips((c) => ({ ...c, [key]: fetched }));
      setLoading(null);
    }
    if ("url" in clip) {
      audioRef.current?.pause();
      audioRef.current = new Audio(clip.url);
      audioRef.current.play();
    }
  }

  const groups: { title: string; list: Voice[] }[] = [
    { title: "ElevenLabs · British", list: voices.filter((v) => v.provider === "elevenlabs" && v.accent === "UK") },
    { title: "ElevenLabs · American", list: voices.filter((v) => v.provider === "elevenlabs" && v.accent === "US") },
    { title: "OpenAI (gpt-4o-mini-tts, told to sound like a friendly teacher)", list: voices.filter((v) => v.provider === "openai") },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Voice comparison</h1>
        <p className="text-sm opacity-70">
          Pick a line, then tap voices to hear it. Each new voice + line costs a few characters; replays are free.
        </p>
      </header>

      {disabled && (
        <p className="text-sm text-amber-600">
          This test page is switched off on the live site (no login yet, paid API keys). Use it locally with npm run dev.
        </p>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {SAMPLES.map((s) => (
            <button
              key={s}
              onClick={() => setText(s)}
              className={`rounded-full border px-3 py-1 text-xs ${text === s ? "border-blue-600 bg-blue-600 text-white" : "border-current/20"}`}
            >
              {s.length > 40 ? s.slice(0, 40) + "…" : s}
            </button>
          ))}
        </div>
        <textarea
          className="w-full rounded border border-current/20 bg-transparent px-3 py-2 text-sm"
          rows={2}
          maxLength={300}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label>
            ElevenLabs model{" "}
            <select
              className="rounded border border-current/20 bg-transparent px-2 py-1"
              value={elevenModel}
              onChange={(e) => setElevenModel(e.target.value)}
            >
              {ELEVEN_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            Speed
            <input type="range" min={0.8} max={1.1} step={0.05} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
            <span className="w-10 tabular-nums">{speed.toFixed(2)}</span>
          </label>
        </div>
      </section>

      {groups.map(
        (g) =>
          g.list.length > 0 && (
            <section key={g.title} className="space-y-2">
              <h2 className="text-sm font-semibold opacity-80">{g.title}</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {g.list.map((v) => {
                  const clip = clips[keyFor(v)];
                  return (
                    <button
                      key={v.id}
                      onClick={() => play(v)}
                      disabled={loading !== null}
                      className="rounded border border-current/20 px-3 py-2 text-left disabled:opacity-50"
                    >
                      <div className="font-medium">
                        {loading === v.id ? "…" : "▶"} {v.name}
                      </div>
                      <div className="text-xs opacity-60">
                        {v.gender === "f" ? "female" : "male"}
                        {clip && "ms" in clip && ` · ${clip.ms} ms`}
                      </div>
                      {clip && "error" in clip && <div className="text-xs text-red-600 break-words">{clip.error}</div>}
                    </button>
                  );
                })}
              </div>
            </section>
          ),
      )}
    </main>
  );
}
