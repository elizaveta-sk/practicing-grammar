// One learner turn: speech-to-text, then the grammar check, in a single
// round trip so the learner waits as little as possible.
import { checkAnswer, type Mode } from "@/lib/check";
import { reviewQuestion } from "@/lib/review-question";
import { transcribe } from "@/lib/stt";
import { testRoutesDisabled } from "@/lib/test-gate";
import { TOPICS } from "@/lib/topics";

export const maxDuration = 60;

const STT_PROVIDER = "elevenlabs-scribe-v2"; // chosen in Phase 1
const MAX_BYTES = 4 * 1024 * 1024;
const MODES: Mode[] = ["main", "followup", "repeat"];

export async function POST(request: Request) {
  // No login yet (Phase 5), so like the test pages this is local-only for now.
  if (testRoutesDisabled()) return new Response("Not found", { status: 404 });

  const form = await request.formData();
  const audio = form.get("audio");
  const topicId = String(form.get("topicId") ?? "");
  const mode = MODES.find((m) => m === form.get("mode"));
  const question = String(form.get("question") ?? "").slice(0, 300);
  const expectedRepeat = String(form.get("expectedRepeat") ?? "").slice(0, 300) || undefined;

  if (!(audio instanceof File) || audio.size === 0) return Response.json({ error: "No audio received" }, { status: 400 });
  if (audio.size > MAX_BYTES) return Response.json({ error: "Recording is too long" }, { status: 413 });
  if (!TOPICS[topicId] || !mode || !question) return Response.json({ error: "Bad request" }, { status: 400 });

  try {
    const { text: transcript } = await transcribe(STT_PROVIDER, audio);
    // Silence or noise: let the learner try again without using up a try.
    // Any script counts as speech (a Russian or Japanese word asks for word help).
    if (!/\p{L}/u.test(transcript)) return Response.json({ transcript: "" });

    const { result } = await checkAnswer({ topicId, mode, question, answer: transcript, expectedRepeat });
    if (result.askedToRepeat) return Response.json({ transcript, askedToRepeat: true });
    if (result.meaningHelp) return Response.json({ transcript, meaningHelp: result.meaningHelp });
    if (result.wordHelp) return Response.json({ transcript, wordHelp: result.wordHelp });

    // After a nudge there's no follow-up (the nudge was the extra question).
    if (form.get("afterNudge") === "1" && result.verdict !== "not_used") result.nextQuestion = "";

    // A second model checks the next question fits the conversation (owner's request).
    if (result.nextQuestion) {
      const review = await reviewQuestion({
        topicId,
        kind: result.verdict === "not_used" ? "nudge" : "followup",
        asked: question,
        answer: transcript,
        corrected: result.verdict === "incorrect" ? result.correctedAnswer : undefined,
        proposed: result.nextQuestion,
      }).catch(() => null); // if the review fails, ask the original question
      if (review) result.nextQuestion = review.question;
    }
    return Response.json({
      transcript,
      verdict: result.verdict,
      correctedAnswer: result.correctedAnswer,
      nextQuestion: result.nextQuestion,
    });
  } catch (e) {
    console.error("turn failed", e);
    return Response.json({ error: "Something went wrong checking your answer. Please try again." }, { status: 502 });
  }
}
