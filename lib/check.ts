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
  askedToRepeat: z
    .boolean()
    .describe("True when the learner only asked to hear the question again (see SAY IT AGAIN)."),
  meaningHelp: z
    .string()
    .describe('A short, simple explanation when the learner asked what a word means (see WORD MEANING). "" otherwise.'),
  wordHelp: z
    .string()
    .describe(
      'The English word or short phrase the learner is looking for, when they asked for help finding it (see WORD HELP). "" otherwise.',
    ),
  targetPhrase: z
    .string()
    .describe('The part of the answer where the target grammar is or should be, e.g. "I will buy". "" if none.'),
  targetMistake: z
    .string()
    .describe('The exact target-grammar mistake in targetPhrase, e.g. "wrong tense". "none" if there is none.'),
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

SAY IT AGAIN: if the learner didn't answer but asked to hear it again or said they didn't understand ("Sorry, what?", "Pardon?", "Can you repeat the question?", "Sorry, could you say that again?", "I didn't understand"), set askedToRepeat true; the other fields don't matter. If they apologise or hesitate and then answer ("Sorry, um, …" followed by an answer), askedToRepeat is false and you judge the answer.

WORD MEANING: if the learner asked what a word or phrase from the question means ("What does … mean?", "What is …?", "I don't know the word …"), set meaningHelp to ONE short, friendly sentence in simple B1 English, at most 20 words, starting with the word in quotes, with one everyday example. E.g. "'Ancient' means very, very old, like the pyramids in Egypt." The other fields don't matter. A question that is part of their answer (asking themselves the question, then answering it) is not this.

WORD HELP: learners sometimes get stuck on a word and say things like "how do I say this in English?", "how do you call it?", "what's the word?", then describe it ("the person who fixes cars") or say it in Russian or Japanese (it may appear in Cyrillic, Japanese script, or as odd transliterated letters). If they did NOT manage to say the word themselves, set wordHelp to the natural English word or short phrase that fits what they meant ("a mechanic", "to give up smoking"), with no grammar of the answer in it. A description given in place of the word still means they need it: "My dream job is a, how do you call it, a person who flies planes" → wordHelp "a pilot". If they asked but then found the word anyway ("how do I say… a pilot"), wordHelp is "" and you judge the answer normally. When wordHelp is set, the other fields don't matter: verdict "correct", correctedAnswer "", nextQuestion "".

VERDICT, about the target grammar only:
- "correct": the learner used the target grammar correctly. Other mistakes (articles, prepositions, plurals, word choice, a missing "to" after "like") do not change this verdict; fix them silently in correctedAnswer.
- "incorrect": the learner answered with a verb phrase where the target grammar was needed, but formed it wrongly or used another tense.
- "not_used": the learner gave no verb phrase where the target grammar would go, e.g. just a noun or phrase ("A house.", "The past.", "Kyoto, because it's beautiful.").

Learners do not have to repeat words from the question: ${topic.examples.noRepeat} is correct and needs no change.

correctedAnswer: keep the learner's own words and ideas. Make the smallest changes that make the whole answer correct, natural English. Any correct version is fine; do not rewrite style.${topic.correctionStyle ? `\n${topic.correctionStyle}` : ""}

nextQuestion, depending on MODE:
- MODE main, verdict "correct" or "incorrect": one short, natural follow-up question about what they said that itself uses the target grammar (for listening practice), e.g. "${topic.examples.followUp}".
- MODE main, verdict "not_used": a short question that builds on their answer and makes them answer with the target grammar, e.g. "${topic.examples.nudge}". Do not explain grammar.
- MODE followup: the learner does not have to use the target grammar, but if they try to, it must be right. Decide in two steps:
  1. Did they answer the question's own verb with a verb of their own ("What will you wear?" → "I wear…", "What would you buy?" → "I will buy…", "Have you told anyone?" → "Yes, I told…")? If that verb is not in the target form, the verdict is "incorrect": it is a wrong attempt, not "not using it". E.g. ${topic.examples.followupWrong}.
  2. Otherwise, "correct": a short answer without that verb ("A dress.", "In Spain.", "Only my sister."), a clause that doesn't need it ("Because it is beautiful."), or the target form used correctly.
  nextQuestion is "".
- MODE repeat: the learner is repeating a corrected sentence. A part in round brackets is optional: leaving it out is fine. "correct" if the target grammar is now right (other small slips are fine), otherwise "incorrect". nextQuestion is "".

Questions: at most 15 words, friendly, everyday vocabulary, no grammar terms.`;
}

function userPrompt(input: CheckInput) {
  const lines = [`MODE: ${input.mode}`, `QUESTION: ${input.question}`];
  if (input.mode === "repeat" && input.expectedRepeat) lines.push(`SENTENCE TO REPEAT: ${input.expectedRepeat}`);
  lines.push(`LEARNER SAID (transcript): ${input.answer}`);
  return lines.join("\n");
}

// Same words, ignoring case, punctuation, fillers and optional (bracketed) parts.
function sameWords(a: string, b: string) {
  const norm = (s: string) =>
    s
      .replace(/\([^)]*\)/g, " ")
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
  const topic = getTopic(input.topicId);
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
  result.wordHelp = result.wordHelp.trim();
  // Asking to hear it again, what a word means, or for a word, isn't graded: the learner answers the same question again.
  result.meaningHelp = result.meaningHelp.trim();
  // Only one kind of help per turn: say it again > explain a word > give a word.
  if (result.askedToRepeat) result.meaningHelp = result.wordHelp = "";
  if (result.meaningHelp) result.wordHelp = "";
  if (result.askedToRepeat || result.meaningHelp || result.wordHelp) return { result, usage: response.usage };
  // The rules say no question in these modes. Enforce it rather than trust it.
  if (input.mode !== "main") result.nextQuestion = "";
  // Grammar isn't required in follow-ups, so "not used" there means fine.
  if (input.mode === "followup" && result.verdict === "not_used") result.verdict = "correct";
  // The optional if-part is the owner's rule, so don't leave it to chance: if
  // the learner gave no if-clause and the checker didn't add one, build it
  // from the question, in the question's order (owner: both orders are taught).
  if (input.mode === "main" && topic.optionalIf && !/\bif\b/i.test(input.answer)) {
    const corrected = result.correctedAnswer.trim();
    const clause = topic.optionalIf(input.question);
    if (clause && corrected && !corrected.includes("(")) {
      if (/^\s*if\b/i.test(input.question)) {
        const rest = /^(I|I'[a-z]+)\b/.test(corrected) ? corrected : corrected[0].toLowerCase() + corrected.slice(1);
        result.correctedAnswer = `(${clause},) ${rest}`;
      } else {
        const punct = corrected.match(/[.!?]+$/)?.[0] ?? ".";
        const body = corrected.replace(/[.!?]+$/, "");
        result.correctedAnswer = `${body} (${clause.charAt(0).toLowerCase()}${clause.slice(1)})${punct}`;
      }
    }
  }

    // Same for a topic's model start (present perfect's "Yes, I have.").
  if (input.mode === "main" && topic.modelStart && result.verdict !== "not_used") {
    const corrected = result.correctedAnswer.trim();
    const start = topic.modelStart(input.question, input.answer);
    if (start && corrected && !/^\W*(yes|no)\b/i.test(corrected)) result.correctedAnswer = `${start} ${corrected}`;
  }

    // "Incorrect" with nothing to correct contradicts itself, so it's correct.
  if (result.verdict === "incorrect" && sameWords(result.correctedAnswer, input.answer)) {
    result.verdict = "correct";
  }

  return { result, usage: response.usage };
}
