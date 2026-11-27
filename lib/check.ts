// Grammar checking with Claude. One call per learner answer returns the
// verdict, the corrected answer and (where needed) the next question to ask,
// so the learner waits for one round trip only.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { getTopic } from "./topics";

export const CHECK_MODEL = "claude-haiku-5-5";
// How hard the model thinks. "low" is fastest; CHECK_EFFORT lets the test
// script compare levels.
export const CHECK_EFFORT = (process.env.CHECK_EFFORT as "low" | "medium" | "high" | undefined) ?? "low";

/**
 * main     – answer to a bank question (or a nudge question). Target grammar required.
 * followup – answer to the conversation follow-up. Target grammar NOT required,
 *            but if it's used it must be right.
 * repeat   – the learner repeating a correction they were shown.
 */
export type Mode = "main" | "followup" | "repeat";

// Field order matters: the model fills these in order, so it names the
// learner's phrase and the exact target mistake before deciding the verdict.
const CheckResult = z.object({
  targetPhrase: z
    .string()
    .describe('The part of the answer where the target grammar is or should be, e.g. "I will buy". "" if none.'),
  targetMistake: z
    .string()
    .describe('The exact target-grammar mistake in targetPhrase, e.g. "will instead of would". "none" if there is none.'),
  verdict: z
    .enum(["correct", "incorrect", "not_used"])
    .describe("Judgement of the TARGET grammar only."),
  correctedAnswer: z
    .string()
    .describe(
      "The learner's answer with every mistake fixed (target and other), changed as little as possible. " +
        "Fillers and false starts removed. Identical to the answer if nothing needs fixing.",
    ),
  nextQuestion: z
    .string()
    .describe("The question to ask next, or an empty string when none is needed (see rules)."),
});
export type CheckResult = z.infer<typeof CheckResult>;

export type CheckInput = {
  topicId: string;
  mode: Mode;
  /** The question the learner was answering. */
  question: string;
  /** Word-for-word transcript of the learner. */
  answer: string;
  /** repeat mode: the corrected sentence the learner was asked to say. */
  expectedRepeat?: string;
};

function systemPrompt(topicId: string) {
  const topic = getTopic(topicId);
  return `You check spoken English answers from adult learners (level B1–C1, first language Russian or Japanese) who are practising one grammar point by voice. Their answers come from speech-to-text, so ignore punctuation, capitalisation, fillers ("um", "uh") and false starts ("If I, if I could…"). Never count those as mistakes.

TARGET GRAMMAR: ${topic.name}
${topic.rule}
Common wrong attempts (these are "incorrect", not "not_used"):
${topic.commonErrors.map((e) => `- ${e}`).join("\n")}

VERDICT, about the target grammar only:
- "correct": the learner used the target grammar correctly. Other mistakes (articles, prepositions, plurals, word choice, a missing "to" after "like") do not change this verdict; fix them silently in correctedAnswer.
- "incorrect": the learner answered with a verb phrase where the target grammar was needed, but formed it wrongly or used another tense.
- "not_used": the learner gave no verb phrase where the target grammar would go, e.g. just a noun or phrase ("A house.", "The past.", "Kyoto, because it's beautiful.").

Learners do not have to repeat words from the question: "Would you prefer to see the future or the past?" → "I would prefer the past." is correct and needs no change.

correctedAnswer: keep the learner's own words and ideas. Make the smallest changes that make the whole answer correct, natural English. Any correct version is fine; do not rewrite style.

nextQuestion, depending on MODE:
- MODE main, verdict "correct" or "incorrect": one short, natural follow-up question about what they said that itself uses the target grammar (for listening practice), e.g. "Where would you buy it?".
- MODE main, verdict "not_used": a short question that builds on their answer and makes them answer with the target grammar, e.g. "And what would you do there?". Do not explain grammar.
- MODE followup: the learner does not have to use the target grammar here. "correct" if they answered without a verb for it ("In Spain.", "A car.") or with a clause that doesn't need it ("Because it is beautiful."), or used it correctly. "incorrect" if they answered the question's own verb in a wrong form, e.g. "What would you buy first?" → "I will buy a car." / "I buy a car." (that is a wrong attempt, not "not using it"). nextQuestion is "".
- MODE repeat: the learner is repeating a corrected sentence. "correct" if the target grammar is now right (other small slips are fine), otherwise "incorrect". nextQuestion is "".

Questions: at most 15 words, friendly, everyday vocabulary, no grammar terms.`;
}

function userPrompt(input: CheckInput) {
  const lines = [`MODE: ${input.mode}`, `QUESTION: ${input.question}`];
  if (input.mode === "repeat" && input.expectedRepeat) lines.push(`SENTENCE TO REPEAT: ${input.expectedRepeat}`);
  lines.push(`LEARNER SAID (transcript): ${input.answer}`);
  return lines.join("\n");
}

// Same words, ignoring case, punctuation and fillers.
function sameWords(a: string, b: string) {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[’‘]/g, "'")
      .replace(/[^a-z0-9'\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w && !["um", "uh", "er", "erm", "hmm"].includes(w))
      .join(" ");
  return norm(a) === norm(b);
}

let client: Anthropic | null = null;

export async function checkAnswer(input: CheckInput) {
  client ??= new Anthropic();
  const response = await client.messages.parse({
    model: CHECK_MODEL,
    max_tokens: 2000,
    system: systemPrompt(input.topicId),
    messages: [{ role: "user", content: userPrompt(input) }],
    output_config: {
      effort: CHECK_EFFORT,
      format: zodOutputFormat(CheckResult),
    },
  });

  if (response.stop_reason === "refusal") throw new Error("The checker declined this answer");
  if (!response.parsed_output) throw new Error(`No parsable result (stop_reason: ${response.stop_reason})`);

  const result = response.parsed_output;
  // The rules say no question in these modes. Enforce it rather than trust it.
  if (input.mode !== "main") result.nextQuestion = "";
  // "Incorrect" with nothing to correct contradicts itself, so it's correct.
  if (result.verdict === "incorrect" && sameWords(result.correctedAnswer, input.answer)) {
    result.verdict = "correct";
  }

  return { result, usage: response.usage };
}
