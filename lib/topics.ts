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

// Speaking as the learner: "you" -> "I"/"me", "your" -> "my", and "I" -> "you"
// ("if I pay for your gym" -> "if you pay for my gym").
const SWAP: Record<string, string> = {
  your: "my", yours: "mine", yourself: "myself", "you're": "I'm",
  my: "your", mine: "yours", myself: "yourself", me: "you", "i'm": "you're",
};
function asLearner(clause: string) {
  let prev = "";
  return clause.replace(/\b(you're|i'm|yourself|yours|your|you|myself|mine|my|me|i|are|am)\b/gi, (word, _w, offset) => {
    const lower = word.toLowerCase();
    const before = clause.slice(0, offset).trimEnd();
    const subject = /(^|\b(if|when|and|that|so|or|because))$|,$/i.test(before);
    let out: string;
    if (lower === "you") out = subject ? "I" : "me";
    else if (lower === "i") out = "you";
    else if (lower === "are") out = prev === "you" ? "am" : word;
    else if (lower === "am") out = prev === "i" ? "are" : word;
    else out = SWAP[lower] ?? word;
    prev = lower;
    return out;
  });
}

/** The question's if-clause, wherever it is, said by the learner: "If I am hungry when I get home tonight". */
export function ifClauseFor(question: string) {
  const m = question.match(/\bif\b[^,?]*/i);
  if (!m) return "";
  const clause = asLearner(m[0].trim());
  return clause.charAt(0).toUpperCase() + clause.slice(1);
}

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
    optionalStart: ifClauseFor,
  },
};

TOPICS["first-conditional"] = {
  id: "first-conditional",
  name: "First conditional",
  rule:
    "Real or likely situations in the future. Result clause: will/'ll + base verb (\"I will eat\", \"I'll call\"). " +
    "These also count as correct (owner's decision): be going to + verb (\"I'm going to call\"), might / may / can + " +
    "base verb (\"I might stay home\", \"I can go to the gym\"). Condition clause, if the learner includes one: " +
    "if + present simple (\"if I'm hungry\", \"if it rains\", \"if my ex calls me\"). A short answer with only the " +
    "result clause (\"I'll make pasta.\") fully counts as correct use. The questions need a future form: any answer " +
    "with a verb but without will / going to / might / may / can in the result is incorrect. Mistakes AFTER a " +
    "correct \"will + verb\" are not target mistakes: \"I'll go to shop\" is correct (the missing \"the\" is " +
    "fixed silently).",
  commonErrors: [
    "would instead of will (\"I would eat pasta\")",
    "present simple instead of will (\"I eat pasta\", \"I call a doctor\")",
    "will + -ing / past form / to (\"I will eating\", \"I will ate\", \"I will to eat\")",
    "will in the if-clause (\"if I will be hungry\", \"if it will be sunny\")",
    "past tense in the if-clause (\"if I was hungry, I will\")",
  ],
  examples: {
    followUp: "What will you cook first?",
    nudge: "And what will you do with it?",
    followupWrong: '"What will you cook first?" → "I would cook pasta." / "I cook pasta."',
    noRepeat: '"What will you do if you suddenly get a headache?" → "I\'ll take a pill."',
  },
  correctionStyle:
    "If the learner left out the if-clause, start correctedAnswer with the if-clause in round brackets, built " +
    "from the question and said by the learner, then their result clause: \"(If I am hungry when I get home " +
    "tonight,) I'll make pasta.\" The brackets mean it's optional, so this does NOT make the answer incorrect. " +
    "If the learner said an if-clause themselves, keep it (corrected if needed) with no brackets.",
  optionalStart: ifClauseFor,
};

export function getTopic(id: string) {
  const topic = TOPICS[id];
  if (!topic) throw new Error(`Unknown topic: ${id}`);
  return topic;
}
