// Speech-to-text providers. Everything in the app calls `transcribe()`, so a
// provider can be swapped by changing one id. Server-only: uses API keys.
import "server-only";

export type ProviderId =
  | "openai-gpt-transcribe"
  | "openai-gpt-4o-transcribe"
  | "openai-whisper-1"
  | "deepgram-nova-3"
  | "elevenlabs-scribe-v2";

type Provider = {
  id: ProviderId;
  label: string;
  envKey: string;
  run: (audio: File, key: string, context?: string) => Promise<string>;
};

// Asks the model to keep learner mistakes instead of "fixing" them.
const VERBATIM_PROMPT =
  "The speaker is a non-native English learner. Transcribe exactly what they say, " +
  "word for word. Keep every grammar mistake, missing word (such as a missing 'a' or 'the'), " +
  "wrong verb form and wrong word order. Do not correct or improve anything.";

// The question the learner is answering helps recognition ("lottery", not
// "notary"). In the real app it's always known.
function withContext(question?: string) {
  return question
    ? `${VERBATIM_PROMPT} The learner is answering this question: "${question}"`
    : VERBATIM_PROMPT;
}

async function openai(audio: File, key: string, model: string, prompt?: string) {
  const form = new FormData();
  form.append("file", audio, audio.name);
  form.append("model", model);
  form.append("language", "en");
  if (prompt) form.append("prompt", prompt);
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { text: string };
  return data.text;
}

async function deepgram(audio: File, key: string) {
  // No smart_format: it rewrites numbers/formatting. Filler words kept on purpose.
  const url =
    "https://api.deepgram.com/v1/listen?model=nova-3&language=en&punctuate=true&filler_words=true";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${key}`,
      "Content-Type": audio.type || "application/octet-stream",
    },
    body: await audio.arrayBuffer(),
  });
  if (!res.ok) throw new Error(`Deepgram ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    results?: { channels?: { alternatives?: { transcript?: string }[] }[] };
  };
  return data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
}

async function elevenlabs(audio: File, key: string) {
  const form = new FormData();
  form.append("file", audio, audio.name);
  form.append("model_id", "scribe_v2");
  form.append("language_code", "en");
  form.append("tag_audio_events", "false");
  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": key },
    body: form,
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { text?: string; transcripts?: { text: string }[] };
  return data.text ?? data.transcripts?.map((t) => t.text).join(" ") ?? "";
}

const PROVIDERS: Provider[] = [
  {
    id: "openai-gpt-transcribe",
    label: "OpenAI gpt-transcribe",
    envKey: "OPENAI_API_KEY",
    run: (a, k, c) => openai(a, k, "gpt-transcribe", withContext(c)),
  },
  {
    id: "openai-gpt-4o-transcribe",
    label: "OpenAI gpt-4o-transcribe",
    envKey: "OPENAI_API_KEY",
    run: (a, k, c) => openai(a, k, "gpt-4o-transcribe", withContext(c)),
  },
  {
    // Whisper treats the prompt as "the text spoken just before", not as
    // instructions, so it gets only the question that was asked.
    id: "openai-whisper-1",
    label: "OpenAI whisper-1",
    envKey: "OPENAI_API_KEY",
    run: (a, k, c) => openai(a, k, "whisper-1", c || undefined),
  },
  {
    id: "deepgram-nova-3",
    label: "Deepgram Nova-3",
    envKey: "DEEPGRAM_API_KEY",
    run: deepgram,
  },
  {
    id: "elevenlabs-scribe-v2",
    label: "ElevenLabs Scribe v2",
    envKey: "ELEVENLABS_API_KEY",
    run: elevenlabs,
  },
];

/** Providers whose API key is set in the environment. */
export function availableProviders() {
  return PROVIDERS.filter((p) => !!process.env[p.envKey]).map(({ id, label }) => ({ id, label }));
}

export async function transcribe(providerId: ProviderId, audio: File, context?: string) {
  const provider = PROVIDERS.find((p) => p.id === providerId);
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);
  const key = process.env[provider.envKey];
  if (!key) throw new Error(`${provider.envKey} is not set`);
  const started = Date.now();
  const text = (await provider.run(audio, key, context)).trim();
  return { provider: provider.id, label: provider.label, text, ms: Date.now() - started };
}
