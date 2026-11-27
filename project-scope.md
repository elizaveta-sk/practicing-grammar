# Project scope: AI voice partner for grammar practice (v1, trial)

Built from `project-brief.md` plus the decisions from our review.

## Users

- **Learners:** under 10 adults, aged 25–55, level B1–C1, first language Russian or Japanese, spread around the world.
- **Accounts:** the owner creates them by hand (email + password). There is no sign-up page or invite code. Admin work happens in the database dashboard, not inside the app.

## Platform and cost

- Web app on desktop and mobile browsers.
- The owner pays during the trial, so keep running costs as low as possible.
- **Limit:** one session per learner, then a 24-hour wait counted from when the last session was finished.
- **Resuming:** an unfinished session can be continued later from the question where the learner stopped.

## Question bank

- One `.md` file per grammar point in `grammar-bank/`, written by the owner, one question per line.
- Each session uses 10 questions from the chosen topic in shuffled order.
- First topics: Present Perfect, and the First, Second and Third Conditionals.

## Session flow

1. The learner logs in, chooses a topic, or continues an unfinished session.
2. For each of the 10 bank questions:
   1. The app speaks the question. The text is hidden, with a **Show text** button to reveal it.
   2. The learner presses a button to talk and presses it again to stop.
   3. The app shows a word-for-word transcript, with mistakes left in.
   4. **Main answer:** it must use the target grammar.
      - **Correct:** go to the follow-up. Short or partial answers count ("I would buy a house").
      - **Used incorrectly:** a pop-up shows the corrected sentence and the app reads it aloud. The learner repeats it. After 2 tries, the app moves on. Any correct version is accepted. No grammar explanations.
      - **Not used:** a "Remember to use the second conditional" pop-up appears, and the AI asks a nudge question that needs the structure. This repeats with no limit until the learner uses it.
      - **Other mistakes:** corrected silently in the on-screen text. The conversation doesn't stop.
   5. **Follow-up:** the AI writes one question in real time, using the target grammar for listening practice. The learner doesn't have to use the grammar. If they use it incorrectly, the correct-and-repeat step applies, with a limit of 2 tries.
3. After 10 questions, a "Session complete" screen. No report.

## Data

- Store accounts, the 24-hour limit, and progress in unfinished sessions.
- No audio is saved. Transcripts aren't saved after a session ends.

## Out of scope for v1

- Pronunciation checking (v2)
- Reports or a teacher dashboard
- Sign-up page, invite codes, password reset
- Payments

## v2: pronunciation

- Mark real errors only, such as the wrong vowel ("pie" for "pay") or wrong stress ("indIrect" for "INdirect"). American and British pronunciations are both accepted.
- Grammar and pronunciation mistakes are shown together. The learner hears the correct version and sees it in a pop-up. They can't play back their own recording.

## Biggest technical risk

Speech-to-text tools tend to fix grammar silently, for example adding missing articles, *-s* or *-ed* endings, or turning *'d* into *would*. Phase 1 of the plan tests this before anything else is built.
