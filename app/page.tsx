import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 space-y-4">
      <h1 className="text-2xl font-semibold">Grammar speaking practice</h1>
      <p className="opacity-70">Phase 1: transcription test.</p>
      <Link href="/stt-test" className="inline-block rounded bg-blue-600 px-4 py-2 text-white">
        Open the transcription test
      </Link>
    </main>
  );
}
