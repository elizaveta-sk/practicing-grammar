import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 space-y-4">
      <h1 className="text-2xl font-semibold">Grammar speaking practice</h1>
      <Link href="/practice" className="inline-block rounded-full bg-blue-600 px-6 py-3 text-lg text-white">
        Start practising
      </Link>
      <p className="pt-6 opacity-70">Test pages while the app is being built:</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/stt-test" className="inline-block rounded bg-blue-600 px-4 py-2 text-white">
          Transcription test
        </Link>
        <Link href="/tts-test" className="inline-block rounded bg-blue-600 px-4 py-2 text-white">
          Voice comparison
        </Link>
      </div>
    </main>
  );
}
