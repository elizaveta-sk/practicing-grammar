// Reads the question bank: grammar-bank/<topic>.md, one question per line.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const BANK_DIR = path.join(process.cwd(), "grammar-bank");

export function listTopicIds() {
  return readdirSync(BANK_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

export function loadQuestions(topicId: string) {
  if (!/^[a-z0-9-]+$/.test(topicId)) throw new Error(`Bad topic id: ${topicId}`);
  return readFileSync(path.join(BANK_DIR, `${topicId}.md`), "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}
