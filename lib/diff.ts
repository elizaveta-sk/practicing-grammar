export type DiffPart = { kind: "same" | "added" | "removed"; word: string };

// Words are compared ignoring case and punctuation, but shown as written
// (capitals, commas, brackets kept). Contractions stay one word, so "I'd" vs
// "I would" shows up as a change.
function tokens(text: string) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => ({ raw, key: raw.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9'-]/g, "") }))
    .filter((t) => t.key);
}

/** Word-level diff (longest common subsequence) of `expected` vs. `actual`. */
export function wordDiff(expected: string, actual: string): DiffPart[] {
  const a = tokens(expected);
  const b = tokens(actual);
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      lcs[i][j] = a[i].key === b[j].key ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);

  const parts: DiffPart[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i].key === b[j].key) {
      parts.push({ kind: "same", word: b[j].raw });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      parts.push({ kind: "removed", word: a[i++].raw });
    } else {
      parts.push({ kind: "added", word: b[j++].raw });
    }
  }
  while (i < a.length) parts.push({ kind: "removed", word: a[i++].raw });
  while (j < b.length) parts.push({ kind: "added", word: b[j++].raw });
  return parts;
}

export type OptionalSplit = {
  /** Text before the optional part ("" when it's at the start). */
  before: string;
  /** The optional words, without brackets. */
  optional: string;
  /** Text after it: the main clause, or punctuation and any extra sentences. */
  after: string;
  /** "start" when the sentence begins with the optional part, "end" when it follows the main clause. */
  at: "start" | "end" | null;
};

/**
 * The checker marks an optional if-part with round brackets, in the question's
 * order, after the clause it belongs to:
 *   "(If I could meet anyone,) I would meet Barack Obama."
 *   "I would go to the bank (if I were invisible for a day)."
 *   "I will drink tea (if there is no coffee at my home). It's okay for me."
 */
export function splitOptional(sentence: string): OptionalSplit {
  const m = sentence.match(/^([\s\S]*?)\(([^)]*)\)([\s\S]*)$/);
  if (!m) return { before: sentence, optional: "", after: "", at: null };
  const before = m[1].trim();
  return {
    before,
    optional: m[2].trim(),
    after: before ? m[3].replace(/^\s+(?=[.,!?])/, "") : m[3].trim(),
    at: before ? "end" : "start",
  };
}

/** The sentence without its optional part, as the voice says it. */
export function withoutOptional(sentence: string) {
  const { before, after, at } = splitOptional(sentence);
  if (at !== "end") return at === "start" ? after : before;
  const joined = (before.replace(/[\s,]+$/, "") + after).trim();
  return /[.!?]$/.test(joined) ? joined : joined + ".";
}
