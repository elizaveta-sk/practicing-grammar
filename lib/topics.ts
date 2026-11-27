// What counts as "using the target grammar" for each topic. The checker
// prompt is built from these. Add a topic here when its grammar-bank file exists.

export type Topic = {
  id: string; // matches grammar-bank/<id>.md
  name: string;
  /** What the learner must produce, written for the checker. */
  rule: string;
  /** Typical wrong attempts. These count as "incorrect", not "not used". */
  commonErrors: string[];
  /** Topic-specific examples used in the checker's instructions. */
  examples: {
    /** A follow-up question that uses the grammar. */
    followUp: string;
    /** A nudge question that makes the learner use it. */
    nudge: string;
    /** A follow-up question and a wrong attempt at answering it. */
    followupWrong: string;
    /** An answer that needn't repeat the question's words. */
    noRepeat: string;
  };
  /** Extra instruction for how correctedAnswer is written for this topic. */
  correctionStyle?: string;
  /**
   * Builds the optional start shown in brackets, from the question, for when
   * the checker leaves it out. Returns "" when the question doesn't allow it.
   */
  optionalStart?: (question: string) => string;
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
      "fixed silently). Keep the question's verb: when the question says \"If you could…\", the learner's " +
      "if-clause needs \"could\" too. \"If I met anyone…\" answering \"If you could meet anyone…?\" changes the " +
      "meaning, so it is incorrect and the correction is \"If I could meet anyone…\". Same for \"If I had any job, I " +
      "would be a pilot\" answering \"If you could have any job…?\": incorrect, corrected to \"If I could have any job\".",
    commonErrors: [
      "will instead of would (\"I will buy\")",
      "present simple instead of would (\"I buy a house\", \"I choose Kyoto\", \"I want to be\")",
      "would + -ing / past form / to (\"I would buying\", \"I would bought\", \"I would to buy\")",
      "would in the if-clause (\"if I would have\")",
      "present tense in the if-clause (\"if I win, I would\")",
      "past simple in the result (\"I met Barack Obama\" instead of \"I would meet\")",
      "dropping the question's \"could\" in the if-clause (\"If I met anyone\" for \"If you could meet anyone?\", " +
        "\"If I had any job\" for \"If you could have any job?\")",
    ],
    examples: {
      followUp: "Where would you buy it?",
      nudge: "And what would you do there?",
      followupWrong: '"What would you buy first?" → "I will buy a car." / "I buy a car."',
      noRepeat: '"Would you prefer to see the future or the past?" → "I would prefer the past."',
    },
    // Owner's request: always show the whole pattern, with the if-clause marked optional.
    correctionStyle:
      "If the learner left out the if-clause, start correctedAnswer with the if-clause in round brackets, built " +
      "from the question, then their result clause: \"(If I could have any skill I wanted,) I would like to be the " +
      "best at public speaking.\" The brackets mean it's optional, so this does NOT make the answer incorrect. " +
      "If the learner said an if-clause themselves, keep it (corrected if needed) with no brackets.",
    // Bank questions start "If you …, <question>": turn that into the learner's if-clause.
    optionalStart: (question) => {
      const m = question.match(/^(if you [^,?]+),/i);
      if (!m) return "";
      return m[1]
        .replace(/\byou\b/gi, "I")
        .replace(/\byour\b/gi, "my")
        .replace(/\byourself\b/gi, "myself")
        .replace(/^if/i, "If");
    },
  },
};

export function getTopic(id: string) {
  const topic = TOPICS[id];
  if (!topic) throw new Error(`Unknown topic: ${id}`);
  return topic;
}
