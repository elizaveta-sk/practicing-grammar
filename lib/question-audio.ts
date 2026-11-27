// Bank questions never change, so their audio is generated once
// (npm run audio:generate) and served as static files from public/audio.
// The file name is a hash of the question text: editing a question
// automatically needs (and gets) a new recording, and the old one is unused.
import { createHash } from "node:crypto";

export function questionAudioFile(topicId: string, voiceId: string, text: string) {
  const hash = createHash("sha1").update(text).digest("hex").slice(0, 12);
  return `audio/${topicId}/${voiceId}/${hash}.mp3`;
}

/** URL path the browser uses, e.g. /audio/second-conditional/el-jessica/ab12cd34ef56.mp3 */
export function questionAudioUrl(topicId: string, voiceId: string, text: string) {
  return `/${questionAudioFile(topicId, voiceId, text)}`;
}
