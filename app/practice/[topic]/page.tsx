import { existsSync } from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { listTopicIds, loadQuestions } from "@/lib/bank";
import { questionAudioFile, questionAudioUrl } from "@/lib/question-audio";
import { APP_VOICES } from "@/lib/tts";
import { TOPICS } from "@/lib/topics";
import { Session, type BankQuestion } from "./session";

export function generateStaticParams() {
  return listTopicIds()
    .filter((id) => TOPICS[id])
    .map((topic) => ({ topic }));
}

export default async function PracticeTopic({ params }: PageProps<"/practice/[topic]">) {
  const { topic: topicId } = await params;
  const topic = TOPICS[topicId];
  if (!topic) notFound();

  // Saved recordings for each voice; a question without one (not generated
  // yet) is spoken live instead.
  const questions: BankQuestion[] = loadQuestions(topicId).map((text) => ({
    text,
    audio: Object.fromEntries(
      APP_VOICES.map((v) => [
        v,
        existsSync(path.join(process.cwd(), "public", questionAudioFile(topicId, v, text)))
          ? questionAudioUrl(topicId, v, text)
          : null,
      ]),
    ),
  }));

  return <Session topicId={topic.id} topicName={topic.name} questions={questions} />;
}
