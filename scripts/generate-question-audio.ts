// Records every bank question in each app voice and saves it under
// public/audio. Only missing files are generated, so it's safe to re-run
// after adding or editing questions. Usage: npm run audio:generate
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { listTopicIds, loadQuestions } from "../lib/bank";
import { questionAudioFile } from "../lib/question-audio";
import { APP_MODEL, APP_SPEED, APP_VOICES, synthesize } from "../lib/tts";

async function main() {
  let made = 0;
  let chars = 0;
  let removed = 0;

  for (const topicId of listTopicIds()) {
    const questions = loadQuestions(topicId);
    for (const voiceId of APP_VOICES) {
      const wanted = new Set<string>();
      for (const text of questions) {
        const file = path.join("public", questionAudioFile(topicId, voiceId, text));
        wanted.add(path.basename(file));
        if (existsSync(file)) continue;
        mkdirSync(path.dirname(file), { recursive: true });
        const audio = await synthesize({ voiceId, text, elevenModel: APP_MODEL, speed: APP_SPEED });
        writeFileSync(file, Buffer.from(audio));
        made++;
        chars += text.length;
        console.log(`  + ${topicId} / ${voiceId}: ${text}`);
      }
      // Remove recordings of questions that were edited or deleted.
      const dir = path.join("public", "audio", topicId, voiceId);
      for (const f of readdirSync(dir)) {
        if (!wanted.has(f)) {
          rmSync(path.join(dir, f));
          removed++;
        }
      }
    }
  }
  console.log(`Done: ${made} new recordings (${chars} characters billed), ${removed} old ones removed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
