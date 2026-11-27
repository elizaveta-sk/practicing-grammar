// What counts as "using the target grammar" for each topic. The checker
// prompt is built from these. Add a topic here when its grammar-bank file exists.

export type Topic = {
  id: string; // matches grammar-bank/<id>.md
  name: string;
  /** What the learner must produce, written for the checker. */
  rule: string;
  /** Typical wrong attempts. These count as "incorrect", not "not used". */
  commonErrors: string[];
};

export const TOPICS: Record<string, Topic> = {
  "second-conditional": {
    id: "second-conditional",
    name: "Second conditional",
    rule:
      "Imaginary or unlikely situations in the present/future. Result clause: would/could/might + base verb " +
      "(\"I would buy\", \"I'd buy\", \"I would like to be\", \"it would be\"). Condition clause, if the learner " +
      "includes one: if + past simple (\"if I won\", \"if I had\", \"if I were/was\"). A short answer with only the " +
      "result clause (\"I would buy a house.\") fully counts as correct use. The questions need \"would\": any " +
      "answer with a verb but without would/could/might in the result is incorrect. Mistakes AFTER a correct " +
      "\"would + verb\" are not target mistakes: \"I would like be a pilot\" is correct (the missing \"to\" is " +
      "fixed silently).",
    commonErrors: [
      "will instead of would (\"I will buy\")",
      "present simple instead of would (\"I buy a house\", \"I choose Kyoto\", \"I want to be\")",
      "would + -ing / past form / to (\"I would buying\", \"I would bought\", \"I would to buy\")",
      "would in the if-clause (\"if I would have\")",
      "present tense in the if-clause (\"if I win, I would\")",
    ],
  },
};

export function getTopic(id: string) {
  const topic = TOPICS[id];
  if (!topic) throw new Error(`Unknown topic: ${id}`);
  return topic;
}
