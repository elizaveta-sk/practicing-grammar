import Link from "next/link";
import { listTopicIds } from "@/lib/bank";
import { TOPICS } from "@/lib/topics";
import { VoicePicker } from "./voice-picker";

export default function PracticeHome() {
  // A topic appears when it has both questions (grammar-bank) and rules (lib/topics.ts).
  const topics = listTopicIds()
    .filter((id) => TOPICS[id])
    .map((id) => TOPICS[id]);

  return (
    <main className="mx-auto w-full max-w-xl space-y-10 px-4 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Speaking practice</h1>
        <p className="text-muted">Choose a grammar topic and answer out loud.</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted">Topic</h2>
        <ul className="space-y-3">
          {topics.map((t) => (
            <li key={t.id}>
              <Link
                href={`/practice/${t.id}`}
                className="group flex items-center justify-between rounded-2xl border border-line bg-card px-5 py-4 text-lg font-medium transition-colors hover:border-voice"
              >
                {t.name}
                <svg viewBox="0 0 24 24" className="size-5 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-voice" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <VoicePicker />
    </main>
  );
}
