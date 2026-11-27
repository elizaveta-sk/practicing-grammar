# Grammar speaking practice

**Try it: [practicing-grammar.vercel.app/practice](https://practicing-grammar.vercel.app/practice)**

A voice partner for practising English grammar out loud. You choose a grammar topic, the app asks you questions in a natural voice, and you answer by speaking. It writes down exactly what you said, mistakes included, and helps you get the grammar right:

- **Correct answer:** you get a follow-up question, like in a real conversation.
- **Wrong form** (e.g. *"I will go"* instead of *"I would go"*): you see and hear the correct sentence and say it again.
- **Grammar not used** (e.g. *"The bank."*): a reminder to use it, and another question.
- **Other small mistakes** (articles, prepositions): corrected quietly on screen, without stopping the conversation.
- **Stuck?** Ask *"Sorry, what?"*, *"What does 'fictional' mean?"* or *"How do I say this in English?"* and it helps without counting it as a mistake.

Made for adult learners (B1–C1). The first topic is the **second conditional**, with more to come.

**To use it:** open the link in Chrome or Safari (it works on phones too), allow the microphone, pick a voice and a topic, and press **Start**. A session is 10 questions.

## How it's built

| Part | What |
|---|---|
| App | Next.js 16 (TypeScript), hosted on Vercel |
| Speech-to-text | ElevenLabs Scribe v2 (best at keeping learners' mistakes, from testing in Phase 1) |
| Grammar checking and follow-up questions | Claude Haiku 5.5 |
| Voice | ElevenLabs Flash v2.5: Jessica (American) or Daniel (British) |

Project docs: [`project-scope.md`](project-scope.md) (what it does) · [`implementation-plan.md`](implementation-plan.md) (phases and progress).

## Run it locally

```bash
npm install
cp .env.example .env.local   # then add your API keys
npm run dev                  # open http://localhost:3000/practice
```

| Command | What it does |
|---|---|
| `npm run eval:check` | Runs the grammar checker's test set (`evals/second-conditional.md`) and writes a report to `evals/results/` |
| `npm run audio:generate` | Records the bank questions in both voices (only new or changed ones) into `public/audio/` |

Test pages used while building: `/stt-test` (compare speech-to-text providers) and `/tts-test` (compare voices).

On the live site, answer checks and the voice only work while `ENABLE_STT_TEST=1` is set in Vercel. There's no login yet, and they use paid API keys.

## Adding questions

One `.md` file per grammar point in `grammar-bank/`, one question per line. After editing, run `npm run audio:generate` so the new questions get their recordings. A new topic also needs its grammar rules in `lib/topics.ts`.
