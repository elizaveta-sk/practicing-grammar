import { availableProviders, transcribe, type ProviderId } from "@/lib/stt";
import { testRoutesDisabled as testPageDisabled } from "@/lib/test-gate";

export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024; // Vercel rejects request bodies over ~4.5 MB

export async function GET() {
  if (testPageDisabled()) return new Response("Not found", { status: 404 });
  return Response.json({ providers: availableProviders() });
}

export async function POST(request: Request) {
  if (testPageDisabled()) return new Response("Not found", { status: 404 });

  const form = await request.formData();
  const audio = form.get("audio");
  const provider = form.get("provider");
  const rawContext = form.get("context");
  const context = typeof rawContext === "string" ? rawContext.trim().slice(0, 300) : "";

  if (!(audio instanceof File) || audio.size === 0) {
    return Response.json({ error: "No audio received" }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return Response.json({ error: "Recording is too long (max ~4 MB)" }, { status: 413 });
  }

  const available = availableProviders().map((p) => p.id);
  const ids =
    provider === "all"
      ? available
      : available.filter((id) => id === provider);
  if (ids.length === 0) {
    return Response.json({ error: "Unknown or unconfigured provider" }, { status: 400 });
  }

  // Run providers in parallel; one failing doesn't hide the others' results.
  const results = await Promise.all(
    ids.map((id) =>
      transcribe(id as ProviderId, audio, context || undefined).catch((err: unknown) => ({
        provider: id,
        label: id,
        text: "",
        ms: 0,
        error: err instanceof Error ? err.message : String(err),
      })),
    ),
  );
  return Response.json({ results });
}
