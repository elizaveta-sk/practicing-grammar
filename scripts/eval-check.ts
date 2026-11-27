// Runs a test set from evals/<topic>.md through the checker and reports how
// many verdicts match the answer key, plus the cost.
// Usage: npm run eval:check -- [topic]   (default: second-conditional)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { checkAnswer, CHECK_EFFORT, CHECK_MODEL, type CheckResult, type Mode } from "../lib/check";

// Claude Haiku 5.5 list prices, USD per million tokens (prompts under 100K tokens).
const PRICE_IN = 0.1;
const PRICE_OUT = 0.5;
const CONCURRENCY = 5;

type Case = { n: string; mode: Mode; question: string; answer: string; expected: string; mustInclude?: string };
type Outcome = Case & { got?: CheckResult; error?: string; ms: number };

function parseCases(markdown: string): Case[] {
  return markdown
    .split("\n")
    .filter((line) => /^\|\s*\d+\s*\|/.test(line))
    .map((line) => {
      const [n, mode, question, answer, expected, note = ""] = line.split("|").slice(1).map((c) => c.trim());
      // A note like: correction must include "if I could meet"
      const mustInclude = note.match(/correction must include "([^"]+)"/i)?.[1];
      return { n, mode: mode as Mode, question, answer, expected, mustInclude };
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

  // Passes when the verdict matches and, if the row asks for it, the correction has the right words.
  // A word-help turn counts as the verdict "help"; its must-include check is on the suggested word.
  const verdictOf = (o: Outcome) => (o.got?.askedToRepeat ? "say_again" : o.got?.wordHelp ? "help" : o.got?.verdict);
  const checked = (o: Outcome) => (o.got?.wordHelp ? o.got.wordHelp : (o.got?.correctedAnswer ?? ""));
  const ok = (o: Outcome) =>
    verdictOf(o) === o.expected &&
    (!o.mustInclude || checked(o).toLowerCase().replace(/[’‘]/g, "'").includes(o.mustInclude.toLowerCase()));
  const passed = outcomes.filter(ok);
  const cost = (tokensIn * PRICE_IN + tokensOut * PRICE_OUT) / 1e6;
  const avgMs = Math.round(outcomes.reduce((s, o) => s + o.ms, 0) / outcomes.length);
  const summary =
    `${passed.length}/${outcomes.length} cases pass · model ${CHECK_MODEL} (effort ${CHECK_EFFORT}) · ` +
    `${tokensIn} in / ${tokensOut} out tokens · $${cost.toFixed(4)} total, ` +
    `$${(cost / outcomes.length).toFixed(5)} per answer · avg ${avgMs} ms per answer`;

  const cell = (s: string) => s.replace(/\|/g, "\\|");
  const rows = outcomes.map((o) => {
    const mark = ok(o) ? "✅" : "❌";
    const got = o.error ? `ERROR: ${o.error}` : verdictOf(o)!;
    return `| ${o.n} | ${mark} | ${o.mode} | ${cell(o.answer)} | ${o.expected} | ${cell(got)} | ${cell(checked(o))} | ${cell(o.got?.nextQuestion ?? "")} |`;
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
  for (const o of outcomes.filter((o) => !ok(o))) {
    const why = o.mustInclude && verdictOf(o) === o.expected ? `"${checked(o)}" lacks "${o.mustInclude}"` : `expected ${o.expected}, got ${o.error ?? verdictOf(o)}`;
    console.log(`  ❌ #${o.n} [${o.mode}] "${o.answer}": ${why}`);
  }
  console.log(`Full report: evals/results/${topicId}.md`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
