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
    <main className="mx-auto w-full max-w-xl px-4 py-10 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Speaking practice</h1>
        <p className="opacity-70">Choose a grammar topic. You&apos;ll answer 10 questions out loud.</p>
      </header>

      <VoicePicker />

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Topic</h2>
        <ul className="space-y-2">
          {topics.map((t) => (
            <li key={t.id}>
              <Link
                href={`/practice/${t.id}`}
                className="block rounded-lg border border-current/20 px-4 py-3 hover:border-blue-600"
              >
                {t.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
