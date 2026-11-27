// Runs a test set from evals/<topic>.md through the checker and reports how
// many verdicts match the answer key, plus the cost.
// Usage: npm run eval:check -- [topic]   (default: second-conditional)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { checkAnswer, CHECK_MODEL, type CheckResult, type Mode } from "../lib/check";

// Claude Haiku 5.5 list prices, USD per million tokens (prompts under 100K tokens).
const PRICE_IN = 0.1;
const PRICE_OUT = 0.5;
const CONCURRENCY = 5;

type Case = { n: string; mode: Mode; question: string; answer: string; expected: string };
type Outcome = Case & { got?: CheckResult; error?: string; ms: number };

function parseCases(markdown: string): Case[] {
  return markdown
    .split("\n")
    .filter((line) => /^\|\s*\d+\s*\|/.test(line))
    .map((line) => {
      const [n, mode, question, answer, expected] = line.split("|").slice(1).map((c) => c.trim());
      return { n, mode: mode as Mode, question, answer, expected };
    });
}

async function main() {
  const topicId = process.argv[2] ?? "second-conditional";
  const cases = parseCases(readFileSync(`evals/${topicId}.md`, "utf8"));
  if (cases.length === 0) throw new Error(`No test cases found in evals/${topicId}.md`);

  let tokensIn = 0;
  let tokensOut = 0;
  const outcomes: Outcome[] = [];
  let next = 0;

  async function worker() {
    while (next < cases.length) {
      const c = cases[next++];
      const started = Date.now();
      try {
        const isRepeat = c.mode === "repeat";
        const { result, usage } = await checkAnswer({
          topicId,
          mode: c.mode,
          question: isRepeat ? "(repeating a correction)" : c.question,
          expectedRepeat: isRepeat ? c.question.replace(/^→\s*/, "") : undefined,
          answer: c.answer,
        });
        tokensIn += usage.input_tokens;
        tokensOut += usage.output_tokens;
        outcomes.push({ ...c, got: result, ms: Date.now() - started });
      } catch (e) {
        outcomes.push({ ...c, error: e instanceof Error ? e.message : String(e), ms: Date.now() - started });
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  outcomes.sort((a, b) => Number(a.n) - Number(b.n));

  const passed = outcomes.filter((o) => o.got?.verdict === o.expected);
  const cost = (tokensIn * PRICE_IN + tokensOut * PRICE_OUT) / 1e6;
  const avgMs = Math.round(outcomes.reduce((s, o) => s + o.ms, 0) / outcomes.length);
  const summary =
    `${passed.length}/${outcomes.length} verdicts match · model ${CHECK_MODEL} · ` +
    `${tokensIn} in / ${tokensOut} out tokens · $${cost.toFixed(4)} total, ` +
    `$${(cost / outcomes.length).toFixed(5)} per answer · avg ${avgMs} ms per answer`;

  const cell = (s: string) => s.replace(/\|/g, "\\|");
  const rows = outcomes.map((o) => {
    const ok = o.got?.verdict === o.expected ? "✅" : "❌";
    const got = o.error ? `ERROR: ${o.error}` : o.got!.verdict;
    return `| ${o.n} | ${ok} | ${o.mode} | ${cell(o.answer)} | ${o.expected} | ${cell(got)} | ${cell(o.got?.correctedAnswer ?? "")} | ${cell(o.got?.nextQuestion ?? "")} |`;
  });
  const report = [
    `# Checker results: ${topicId}`,
    "",
    `Run ${new Date().toISOString()}`,
    "",
    `**${summary}**`,
    "",
    "| # | | Mode | Answer | Expected | Got | Corrected answer | Next question |",
    "|---|---|---|---|---|---|---|---|",
    ...rows,
  ].join("\n");

  mkdirSync("evals/results", { recursive: true });
  writeFileSync(`evals/results/${topicId}.md`, report + "\n");

  console.log(summary);
  for (const o of outcomes.filter((o) => o.got?.verdict !== o.expected)) {
    console.log(`  ❌ #${o.n} [${o.mode}] "${o.answer}": expected ${o.expected}, got ${o.error ?? o.got?.verdict}`);
  }
  console.log(`Full report: evals/results/${topicId}.md`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
