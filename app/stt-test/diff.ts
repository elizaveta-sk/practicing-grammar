export type DiffPart = { kind: "same" | "added" | "removed"; word: string };

// Lowercase and strip punctuation, so only real word changes count.
// Contractions stay as one token, so "I'd" vs "I would" shows up as a change.
function tokens(text: string) {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9'\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Word-level diff (longest common subsequence) of what was said vs. the transcript. */
export function wordDiff(expected: string, actual: string): DiffPart[] {
  const a = tokens(expected);
  const b = tokens(actual);
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);

  const parts: DiffPart[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      parts.push({ kind: "same", word: b[j] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      parts.push({ kind: "removed", word: a[i++] });
    } else {
      parts.push({ kind: "added", word: b[j++] });
    }
  }
  while (i < a.length) parts.push({ kind: "removed", word: a[i++] });
  while (j < b.length) parts.push({ kind: "added", word: b[j++] });
  return parts;
}
