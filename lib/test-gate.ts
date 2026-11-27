// The test pages (/stt-test, /tts-test) use paid API keys and have no login
// yet, so their API routes are switched off on the live site unless
// ENABLE_STT_TEST=1 is set in Vercel. Remove once real login protects them.
export function testRoutesDisabled() {
  return process.env.NODE_ENV === "production" && process.env.ENABLE_STT_TEST !== "1";
}
