// A second model reviews every follow-up and nudge question before it's
// asked (owner's request): the first model sometimes writes questions that
// are insensitive or silly in context, e.g. after "What will you do if a drunk
// guy challenges you to a fight?" -> "I'll run away" it asked "Run away and do
// what?". Good questions pass through unchanged.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CHECK_MODEL } from "./check";
import { getTopic } from "./topics";

const Review = z.object({
  problem: z
    .string()
    .describe('What is wrong with the proposed question, in a few words, or "none".'),
  verdict: z.enum(["ok", "rewrite"]),
  question: z.string().describe("The question to ask: the proposed one if ok, otherwise a better one."),
});

export type ReviewInput = {
  topicId: string;
  /** "followup" continues the conversation; "nudge" must make the learner use the grammar. */
  kind: "followup" | "nudge";
  /** The question the learner just answered. */
  asked: string;
  /** What the learner said. */
  answer: string;
  /** The question the checker wants to ask next. */
  proposed: string;
};

function systemPrompt(topicId: string) {
  const topic = getTopic(topicId);
  return `You review one question that a friendly English speaking-practice app is about to ask an adult learner (B1–C1). The learner just answered a question; the app asks a short question next.

A good question:
- follows naturally from what the learner said, and is interesting to answer;
- is kind and positive. If the situation is stressful, embarrassing or upsetting (a fight, danger, illness, a break-up, a bad grade, losing a job), do not dig into the bad moment or how bad they would feel. Move it to a positive or practical ending: relaxing or feeling better afterwards, someone to talk to, something nice to do next. E.g. after "What will you do if a drunk guy challenges you to a fight?" → "I'll run away.", a good question is "How will you relax when you get home?", NOT "Run away and do what?" or "Will you be scared?";
- makes sense and is not obvious or repetitive: NOT "Where will you lie down when you feel better?" (you lie down because you feel bad), and nothing the learner already answered;
- is not too personal (no exact money, health details, intimate relationship details);
- MUST use ${topic.formHint ?? `the ${topic.name}, like "${topic.examples.followUp}"`}. A question in another form must be rewritten;
- for a NUDGE: can only be answered with a verb (what they would/will DO), not with a noun or place: NOT "Where would you want it to be?" or "What will you watch?";
- has at most 15 words, everyday vocabulary, and no grammar terms.

If the proposed question is good, verdict "ok" and return it unchanged. Otherwise verdict "rewrite" and write a better one that still continues this conversation.`;
}

let client: Anthropic | null = null;

async function review(input: ReviewInput, extra = "") {
  client ??= new Anthropic();
  const lines = [
    `QUESTION THE LEARNER ANSWERED: ${input.asked}`,
    `LEARNER SAID: ${input.answer}`,
    `PROPOSED ${input.kind === "nudge" ? "NUDGE (must make them answer with the target grammar)" : "FOLLOW-UP"} QUESTION: ${input.proposed}`,
  ];
  if (extra) lines.push(extra);
  const response = await client.messages.parse({
    model: CHECK_MODEL,
    max_tokens: 1000,
    system: systemPrompt(input.topicId),
    messages: [{ role: "user", content: lines.join("\n") }],
    output_config: { effort: "low", format: zodOutputFormat(Review) },
  });
  return response.parsed_output;
}

export async function reviewQuestion(input: ReviewInput) {
  const topic = getTopic(input.topicId);
  const hasForm = (q: string) => !topic.formPattern || topic.formPattern.test(q);
  let result = await review(input);
  // One more try if the question to ask doesn't practise the grammar.
  if (result && !hasForm(result.question)) {
    result = await review(input, `Your last question "${result.question}" did not use ${topic.formHint ?? topic.name}. Rewrite it so it does.`);
  }
  // "ok" means ask the original exactly (the reviewer sometimes rewords anyway).
  const question = result?.verdict === "rewrite" ? result.question.trim() : input.proposed;
  // Keep the original if the review fails or still misses the grammar.
  const usable = !!result && !!question && hasForm(question);
  return {
    question: usable ? question : input.proposed,
    changed: usable && question !== input.proposed,
    problem: result?.problem ?? "",
  };
}
