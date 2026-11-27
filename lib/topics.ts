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
  /** Reminder shown when the grammar wasn't used. Default: "Remember to use the <name>." */
  nudgeText?: string;
  /** Extra instruction for how correctedAnswer is written for this topic. */
  correctionStyle?: string;
  /**
   * A model start for the corrected answer (not optional, no brackets), for
   * when the checker leaves it out. Returns "" when not needed.
   */
  modelStart?: (question: string, answer: string) => string;
  /**
   * Builds the optional if-part, from the question, for when the checker
   * leaves it out. Returns "" when the question doesn't allow it.
   */
  optionalIf?: (question: string) => string;
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
      "includes one: if + past simple (\"if I won\", \"if I had\", \"if I were/was\"), before or after the result: \"If I won, I would…\" and \"I would… if I won\" are both correct. A short answer with only the " +
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
      "If the learner left out the if-clause, add it in round brackets, built from the question, in the SAME " +
      "place as in the question: at the start for \"If you…, what…?\" questions (\"(If I could have any job,) I " +
      "would be a pilot.\"), at the end for \"…if you…?\" questions (\"I would go to the bank (if I were " +
      "invisible for a day).\"). The brackets mean it's optional, so this does NOT make the answer incorrect. " +
      "If the learner said an if-clause themselves, in either order, keep it (corrected if needed) with no brackets.",
    // Bank questions start "If you …, <question>": turn that into the learner's if-clause.
    optionalIf: ifClauseFor,
  },
};

TOPICS["first-conditional"] = {
  id: "first-conditional",
  name: "First conditional",
  rule:
    "Real or likely situations in the future. Result clause: will/'ll + base verb (\"I will eat\", \"I'll call\"). " +
    "These also count as correct (owner's decision): be going to + verb (\"I'm going to call\"), might / may / can + " +
    "base verb (\"I might stay home\", \"I can go to the gym\"). Condition clause, if the learner includes one: " +
    "if + present simple (\"if I'm hungry\", \"if it rains\", \"if my ex calls me\"), before or after the result: \"If it rains, I'll…\" and \"I'll… if it rains\" are both correct. A short answer with only the " +
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
    "If the learner left out the if-clause, add it in round brackets, built from the question and said by the " +
    "learner, in the SAME place as in the question: at the end for \"What will you…if you…?\" questions (\"I'll " +
    "make pasta (if I am hungry when I get home tonight).\"), at the start for \"If…, what will you…?\" questions " +
    "(\"(If it is fantastic weather tomorrow,) I'll go to the beach.\"). The brackets mean it's optional, so this " +
    "does NOT make the answer incorrect. If the learner said an if-clause themselves, in either order, keep it " +
    "(corrected if needed) with no brackets.",
  optionalIf: ifClauseFor,
};

TOPICS["present-perfect"] = {
  id: "present-perfect",
  name: "Present perfect",
  rule:
    "Experiences and things up to now: have/has + past participle (\"I have met\", \"I've been\", \"it has " +
    "snowed\", \"I haven't eaten\"). Contractions count.\n" +
    "YES/NO QUESTIONS (\"Have you ever…?\", \"Has it…?\", \"Has anyone…?\"): the ideal answer is a short answer " +
    "plus details: \"Yes, I have. I met Tom Hanks in 2019.\" / \"No, I haven't, but I'd love to.\" (owner's " +
    "decision: learners must practise the short answers).\n" +
    "- A short answer alone (\"Yes, I have.\", \"No, I haven't.\") or just \"Yes.\" / \"No.\" is \"not_used\": " +
    "the nudge question asks for details (\"Can you tell me more?\").\n" +
    "- A wrong short answer (\"Yes, I did.\", \"Yes, I do.\", \"No, I didn't.\", \"Yes, I have met.\") is " +
    "\"incorrect\", corrected to \"Yes, I have.\" / \"No, I haven't.\" (\"has\"/\"hasn't\" for he/she/it).\n" +
    "- A short answer followed by ANY details, in any tense, is \"correct\" (\"No, I haven't, but I'd love to.\", " +
    "\"No, I haven't. I'm scared of horses.\").\n" +
    "- A full answer without the short answer (\"I have met Tom Hanks.\") is \"correct\".\n" +
    "- After the short answer, details about a finished time use past simple and are correct (\"Yes, I have. I met " +
    "him in 2019.\").\n" +
    "OTHER QUESTIONS (\"What have you done today?\", \"Where have you been…?\", \"What is the best movie you have " +
    "ever seen?\"): answer with the present perfect (\"I have cleaned my flat.\", \"The best movie I've ever seen is " +
    "Titanic.\"). A bare noun (\"Titanic.\", \"Spain and Italy.\") is \"not_used\".\n" +
    "Mistakes outside have/has + participle (articles, prepositions) are not target mistakes: fixed silently.",
  commonErrors: [
    "past simple with no finished time where present perfect is needed (\"Yes, I met Tom Hanks.\", \"I ate today.\")",
    "present perfect with a finished time (\"I have met him in 2019\" → \"I met him in 2019\")",
    "wrong past participle (\"I have went\", \"I have meet\", \"I have ate\", \"I have rode\", \"I have sang\")",
    "has/have mixed up (\"it have snowed\", \"I has been\")",
    "missing have (\"I been to Spain\", \"I never ridden a horse\")",
    "wrong short answer (\"Yes, I did.\", \"Yes, I do.\")",
  ],
  examples: {
    followUp: "Have you ever told anyone about it?",
    nudge: "Can you tell me more?",
    followupWrong: '"Have you ever told anyone about it?" → "Yes, I told." / "Yes, I have tell my friend."',
    noRepeat: `"Have you ever met a famous person?" → "Yes, I have. I've met a singer."`,
  },
  nudgeText: "Remember to answer with the present perfect, for example: “Yes, I have. I've…”",
  correctionStyle:
    "For a yes/no question answered WITHOUT a short answer, start correctedAnswer with the right short answer as " +
    "a model, then their sentence: \"Yes, I have. I have met Tom Hanks.\" This does NOT make the answer incorrect. " +
    "No brackets for this topic.",
  // The owner's short-answer rule, enforced: "Have you…?" -> "Yes, I have." / "No, I haven't."
  modelStart: (question, answer) => {
    const m = question.match(/^(have|has) (you|it)\b/i);
    if (!m || /^\W*(yes|no|yeah|yep|nope)\b/i.test(answer)) return "";
    const negative = /\b(never|not|haven't|hasn't|no)\b/i.test(answer);
    const subject = m[2].toLowerCase() === "you" ? "I" : "it";
    const verb = subject === "I" ? (negative ? "haven't" : "have") : negative ? "hasn't" : "has";
    return `${negative ? "No" : "Yes"}, ${subject} ${verb}.`;
  },
};

export function getTopic(id: string) {
  const topic = TOPICS[id];
  if (!topic) throw new Error(`Unknown topic: ${id}`);
  return topic;
}
