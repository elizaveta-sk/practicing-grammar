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

/** Splits "(If I could…,) I would…" into the optional bracketed start and the rest. */
export function splitOptional(sentence: string) {
  const m = sentence.match(/^\s*\(([^)]*)\)\s*([\s\S]*)$/);
  return m ? { optional: m[1].trim(), rest: m[2] } : { optional: "", rest: sentence };
}
