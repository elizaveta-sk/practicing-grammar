import { availableVoices, synthesize, type ElevenModel } from "@/lib/tts";
import { testRoutesDisabled } from "@/lib/test-gate";

export const maxDuration = 30;

const MAX_CHARS = 300; // questions and corrections are short; caps cost per call
const MODELS: ElevenModel[] = ["eleven_flash_v2_5", "eleven_multilingual_v2", "eleven_v3"];

export async function GET() {
  if (testRoutesDisabled()) return new Response("Not found", { status: 404 });
  return Response.json({ voices: availableVoices() });
}

export async function POST(request: Request) {
  if (testRoutesDisabled()) return new Response("Not found", { status: 404 });

  const body = (await request.json().catch(() => null)) as {
    voiceId?: string;
    text?: string;
    elevenModel?: string;
    speed?: number;
  } | null;
  const text = body?.text?.trim() ?? "";
  if (!body?.voiceId || !text) return Response.json({ error: "voiceId and text are required" }, { status: 400 });
  if (text.length > MAX_CHARS) return Response.json({ error: `Text over ${MAX_CHARS} characters` }, { status: 413 });
  if (!availableVoices().some((v) => v.id === body.voiceId)) {
    return Response.json({ error: "Unknown or unconfigured voice" }, { status: 400 });
  }
  const elevenModel = MODELS.find((m) => m === body.elevenModel);

  try {
    const audio = await synthesize({
      voiceId: body.voiceId,
      text,
      elevenModel,
      speed: typeof body.speed === "number" ? body.speed : 1,
    });
    return new Response(audio, {
      headers: { "Content-Type": "audio/mpeg", "X-Characters": String(text.length) },
    });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
