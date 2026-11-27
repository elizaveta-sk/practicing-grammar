// Shows the follow-up question the app would ask for each answer in
// evals/followups.md, before and after the question reviewer.
// Usage: npm run eval:followups
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { checkAnswer } from "../lib/check";
import { reviewQuestion } from "../lib/review-question";
import { getTopic } from "../lib/topics";

const cases = readFileSync("evals/followups.md", "utf8")
  .split("\n")
  .filter((l) => /^\|\s*\d+\s*\|/.test(l))
  .map((l) => {
    const [n, topicId, question, answer, note = ""] = l.split("|").slice(1).map((c) => c.trim());
    return { n, topicId, question, answer, note };
  });

async function main() {
  let reviewMs = 0;
  const rows = await Promise.all(
    cases.map(async (c) => {
      const { result } = await checkAnswer({ topicId: c.topicId, mode: "main", question: c.question, answer: c.answer });
      const proposed = result.nextQuestion;
      const started = Date.now();
      const review = proposed
        ? await reviewQuestion({ topicId: c.topicId, kind: result.verdict === "not_used" ? "nudge" : "followup", asked: c.question, answer: c.answer, proposed })
        : null;
      reviewMs += Date.now() - started;
      const final = review?.question ?? proposed;
      const pattern = getTopic(c.topicId).formPattern;
      const words = final.split(/\s+/).filter(Boolean).length;
      const ok = !!final && (!pattern || pattern.test(final)) && words <= 15;
      return { ...c, proposed, final, changed: !!review?.changed, problem: review?.problem ?? "", ok, words };
    }),
  );
  const cell = (s: string) => s.replace(/\|/g, "\\|");
  const changed = rows.filter((r) => r.changed).length;
  const failing = rows.filter((r) => !r.ok);
  const summary = `${rows.length} answers · reviewer rewrote ${changed} · ${rows.length - failing.length}/${rows.length} final questions use the grammar and have ≤15 words · avg review ${Math.round(reviewMs / rows.length)} ms`;
  const report = [
    "# Follow-up questions",
    "",
    `Run ${new Date().toISOString()}`,
    "",
    `**${summary}**`,
    "",
    "| # | Answer | First model | Reviewer's problem | Asked | OK |",
    "|---|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.n} | ${cell(r.answer)} | ${cell(r.proposed)} | ${cell(r.changed ? r.problem : "")} | ${r.changed ? "**" + cell(r.final) + "**" : cell(r.final)} | ${r.ok ? "✅" : "❌"} |`),
  ].join("\n");
  mkdirSync("evals/results", { recursive: true });
  writeFileSync("evals/results/followups.md", report + "\n");
  console.log(summary);
  for (const r of rows) console.log(`  #${r.n} ${r.answer}\n     first:  ${r.proposed}\n     asked:  ${r.final}${r.changed ? `   (rewritten: ${r.problem})` : ""}${r.ok ? "" : "   ❌"}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
