# Implementation plan

See `project-scope.md` for what the app does.

## Tech stack

| Part | Choice | Why |
|---|---|---|
| App | **Next.js (TypeScript)**: one project for the pages and the server code | One codebase and one deploy. API keys stay on the server. |
| Hosting | **Vercel** free (Hobby) plan | Deploys with no setup. Enough for under 10 users during a trial. |
| Database + login | **Supabase** free plan (Postgres + email/password login) | The owner creates accounts by hand in the Supabase dashboard, which is also the admin view. The app needs no admin screens. |
| Recording | Browser `MediaRecorder` API, with a button to start and stop | Built into browsers. iPhone Safari records in a different format (mp4), so the server must accept both. |
| Speech-to-text | **Decided in Phase 1** by testing: OpenAI `gpt-4o-transcribe`, Deepgram Nova, ElevenLabs Scribe | Whether the tool keeps grammar mistakes decides whether the product works. Test first, then choose. The code keeps this behind one function so the provider can be swapped. |
| Grammar checking + follow-ups | **Claude API** (`@anthropic-ai/sdk`) with structured JSON output | One call per answer returns: target used? correct? corrected sentence, silent fixes, next question. |
| Text-to-speech | OpenAI TTS or Google Cloud TTS (decided in Phase 3) | **Bank questions are fixed, so their audio is generated once and saved as files.** Only nudges, follow-ups and corrections need live TTS. This removes most of the TTS cost. |
| Question bank | `.md` files in `grammar-bank/`, read by the server | Edit a file, redeploy, done. |

### Claude model: `claude-haiku-5-5` (decided)
Each answer is one short call: about 1–2K tokens in and 200 out. A session has about 20–40 calls. At current list prices, that's under $0.01 per session, or about $2–3 a month for 10 students practising daily. Phase 2 measures the real numbers.

Speech-to-text and TTS prices weren't checked here. Phase 1 and Phase 3 compare them.

---

## Phase 0: Setup (≈ half a day)
- [x] 0.1 Create the Next.js + TypeScript project and a Git repository
- [x] 0.2 Create the Supabase project; add the `users` and `sessions` tables
- [x] 0.3 Get API keys (Anthropic, STT candidates, TTS) and set a **monthly spending limit** on each account
- [x] 0.4 Connect the repository to Vercel; add the keys as environment variables; deploy a "hello" page
- [x] 0.5 Add the first grammar-bank file (`second-conditional.md`) as sample data

## Phase 1: Transcription check (the go/no-go step)
- [x] 1.1 Record button: press to start, press to stop, get an audio file in the browser
- [x] 1.2 Server route: receive the audio and send it to an STT provider
- [x] 1.3 Show the transcript on the page
- [x] 1.4 Add 2–3 providers behind one `transcribe()` function, with a dropdown to switch between them (for testing only)
- [x] 1.5 Test on Chrome and on iPhone Safari
- [x] 1.6 **Test:** record ~20 sentences with typical Russian and Japanese speaker mistakes (missing articles, *-s*/*-ed* endings, wrong tense, *I'd* vs *I would*). Write down which provider keeps the mistakes. Try a "transcribe verbatim, do not correct grammar" prompt where the provider supports it.
- [x] 1.7 Choose the provider: **ElevenLabs Scribe v2**. Cost is measured from real usage instead (task 5.6)

**If none keeps the mistakes, stop and rethink before Phase 2.**

### Results, round 1 (2026-11-27: 20 sentences, one speaker using both Russian and Japanese accents, no question context)
Failures that matter for grading. "Hid" = fixed the learner's mistake, so the app would miss it. "Invented" = created a mistake the learner didn't make, so the app would wrongly correct them. Harmless changes (punctuation, fillers, "5" vs "five", "I'll" vs "I will") aren't counted.

| Provider | Hid | Invented | Garbled | Total /20 |
|---|---|---|---|---|
| **ElevenLabs Scribe v2** | 2 | 0 | 0 | **2** |
| OpenAI gpt-transcribe | 2 | 1 | 1 | 4 |
| OpenAI gpt-4o-transcribe | 1 | 3 | 1 | 5 |
| OpenAI whisper-1 | 6 | 0 | 1 | 7 |
| Deepgram Nova-3 | 4 | 1 | 2 | 7 |

- ElevenLabs was the only one to keep *"If I was invisible, I **will** go"* (target-grammar error). The others changed it to *would*.
- Every provider hid *"I would like meet"* (added *to*). Both new OpenAI models turned it into transliterated gibberish.
- **Chosen: ElevenLabs Scribe v2.** Still to do: check the ElevenLabs price per hour, and check transcripts from real students during the Phase 6 trial.

## Phase 2: Grammar checking
- [x] 2.1 Write the checking prompt for each topic. One call returns `verdict` (correct / incorrect / not_used), `correctedAnswer` and `nextQuestion` (`lib/check.ts`, rules in `lib/topics.ts`)
- [ ] 2.2 Write a small test set: ~20 answers per topic marked right or wrong by you, covering correct, partial, wrong grammar, grammar not used, and other mistakes
- [x] 2.3 Add a script that runs the test set and reports how many answers Haiku 5.5 marks correctly; adjust the prompt until the results are good
- [x] 2.4 Prompt for the AI-written **nudge question** (forces the structure)
- [x] 2.5 Prompt for the AI-written **conversation follow-up** (uses the structure, natural and short)
- [x] 2.6 Check a repeated answer: does the repetition now have the target grammar right? (Any correct version counts.)
- [x] 2.7 Log token use per call and calculate the real cost per session

## Phase 3: Voice
- [x] 3.1 Choose the TTS provider and voice (comparison page: `/tts-test`). **ElevenLabs Flash v2.5**, speed 1.0 (natural, ~0.6 s per line vs ~2.3 s for OpenAI). Learners choose a voice: **Jessica** (American, default) or **Daniel** (British)
- [x] 3.2 Script: generate audio for every bank question once and save it as files (`npm run audio:generate`, files in `public/audio/`)
- [ ] 3.3 Server route for live TTS (nudges, follow-ups, corrected sentences)
- [ ] 3.4 Audio player in the page; play automatically when the browser allows it, with a fallback "tap to play" button for iPhone
- [ ] 3.5 **Show text** button for questions

## Phase 4: The practice session
- [ ] 4.1 Topic choice screen, based on the files in `grammar-bank/`
- [ ] 4.2 Pick 10 shuffled questions when a session starts
- [ ] 4.3 Session state machine: question → answer → (nudge loop | correct-and-repeat ×2) → follow-up → (correct-and-repeat ×2) → next question
- [ ] 4.4 Correction pop-up (text + spoken) and "Remember to use…" pop-up
- [ ] 4.5 Show silent fixes in the transcript (e.g. the corrected word highlighted)
- [ ] 4.6 Progress indicator (Question 3 of 10)
- [ ] 4.7 "Session complete" screen
- [ ] 4.8 Handle errors: microphone blocked, empty recording, provider timeout (offer "try again" instead of breaking)

## Phase 5: Accounts, limit, resume
- [ ] 5.1 Login page with Supabase email and password; protect every page and server route
- [ ] 5.2 Save session progress (topic, question order, current question) after each question
- [ ] 5.3 Continue an unfinished session from the home screen
- [ ] 5.4 24-hour limit after a finished session, checked on the **server**; show "next session available in X hours"
- [ ] 5.6 Record usage per session: seconds of student audio (speech-to-text), characters spoken (text-to-speech), Claude tokens. Save the totals with the session so real monthly costs can be worked out
- [ ] 5.5 Write down how to create a learner account in the Supabase dashboard

## Phase 6: Trial
- [ ] 6.1 Add the other three grammar-bank files
- [ ] 6.2 Do a full session yourself on a phone and on a laptop
- [ ] 6.3 Give accounts to 1–2 students first, then everyone
- [ ] 6.4 After a week, check the actual costs (from the usage saved in 5.6) and any marking mistakes students report

## Later (v2)
- Pronunciation checking (needs a pronunciation-scoring service, for example Azure Pronunciation Assessment, plus a separate test like Phase 1)
- Sign-up with invite codes, password reset, payments
