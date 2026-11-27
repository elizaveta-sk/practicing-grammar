// Text-to-speech voices. Everything calls `synthesize()`, so the chosen voice
// is one id. Server-only: uses API keys.
import "server-only";

export type ElevenModel = "eleven_flash_v2_5" | "eleven_multilingual_v2" | "eleven_v3";

type Voice = {
  id: string;
  provider: "elevenlabs" | "openai";
  name: string;
  accent: "US" | "UK";
  gender: "f" | "m";
  /** Provider's own voice id/name. */
  providerVoice: string;
};

// ElevenLabs standard ("premade") voices, checked to work with this account.
// OpenAI voices have no fixed accent; they're American-sounding by default.
export const VOICES: Voice[] = [
  { id: "el-george", provider: "elevenlabs", name: "George", accent: "UK", gender: "m", providerVoice: "JBFqnCBsd6RMkjVDRZzb" },
  { id: "el-daniel", provider: "elevenlabs", name: "Daniel", accent: "UK", gender: "m", providerVoice: "onwK4e9ZLuTAKqWW03F9" },
  { id: "el-alice", provider: "elevenlabs", name: "Alice", accent: "UK", gender: "f", providerVoice: "Xb7hH8MSUJpSbSDYk0k2" },
  { id: "el-lily", provider: "elevenlabs", name: "Lily", accent: "UK", gender: "f", providerVoice: "pFZP5JQG7iQjIQuC4Bku" },
  { id: "el-sarah", provider: "elevenlabs", name: "Sarah", accent: "US", gender: "f", providerVoice: "EXAVITQu4vr4xnSDxMaL" },
  { id: "el-jessica", provider: "elevenlabs", name: "Jessica", accent: "US", gender: "f", providerVoice: "cgSgspJ2msm6clMCkdW9" },
  { id: "el-brian", provider: "elevenlabs", name: "Brian", accent: "US", gender: "m", providerVoice: "nPczCjzI2devNBz1zQrb" },
  { id: "el-eric", provider: "elevenlabs", name: "Eric", accent: "US", gender: "m", providerVoice: "cjVigY5qzO86Huf0OWal" },
  { id: "oa-marin", provider: "openai", name: "Marin", accent: "US", gender: "f", providerVoice: "marin" },
  { id: "oa-coral", provider: "openai", name: "Coral", accent: "US", gender: "f", providerVoice: "coral" },
  { id: "oa-sage", provider: "openai", name: "Sage", accent: "US", gender: "f", providerVoice: "sage" },
  { id: "oa-cedar", provider: "openai", name: "Cedar", accent: "US", gender: "m", providerVoice: "cedar" },
  { id: "oa-ash", provider: "openai", name: "Ash", accent: "US", gender: "m", providerVoice: "ash" },
];

// OpenAI's gpt-4o-mini-tts takes speaking instructions; ElevenLabs doesn't.
const TEACHER_STYLE =
  "Speak clearly and naturally, like a friendly English teacher chatting with an intermediate learner. " +
  "Warm and relaxed, not slow or exaggerated.";

const ENV_KEY = { elevenlabs: "ELEVENLABS_API_KEY", openai: "OPENAI_API_KEY" } as const;

export function availableVoices() {
  return VOICES.filter((v) => !!process.env[ENV_KEY[v.provider]]).map(
    ({ id, provider, name, accent, gender }) => ({ id, provider, name, accent, gender }),
  );
}

export type SpeakOptions = {
  voiceId: string;
  text: string;
  /** ElevenLabs only. Flash is the cheapest and fastest. */
  elevenModel?: ElevenModel;
  /** 0.7–1.2. 1 = normal speed. */
  speed?: number;
};

/** Returns MP3 audio. Billing is per character of `text` on both providers. */
export async function synthesize({ voiceId, text, elevenModel = "eleven_flash_v2_5", speed = 1 }: SpeakOptions) {
  const voice = VOICES.find((v) => v.id === voiceId);
  if (!voice) throw new Error(`Unknown voice: ${voiceId}`);
  const key = process.env[ENV_KEY[voice.provider]];
  if (!key) throw new Error(`${ENV_KEY[voice.provider]} is not set`);
  const s = Math.min(1.2, Math.max(0.7, speed));

  const res =
    voice.provider === "elevenlabs"
      ? await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voice.providerVoice}?output_format=mp3_44100_64`,
          {
            method: "POST",
            headers: { "xi-api-key": key, "Content-Type": "application/json" },
            body: JSON.stringify({ text, model_id: elevenModel, voice_settings: { speed: s } }),
          },
        )
      : await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gpt-4o-mini-tts",
            voice: voice.providerVoice,
            input: text,
            instructions: TEACHER_STYLE,
            response_format: "mp3",
            speed: s,
          }),
        });

  if (!res.ok) throw new Error(`${voice.provider} ${res.status}: ${await res.text()}`);
  return res.arrayBuffer();
}
