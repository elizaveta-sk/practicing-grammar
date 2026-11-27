# Grammar speaking practice

Web app where learners answer spoken questions to practise a grammar point.
See `project-scope.md` (what it does) and `implementation-plan.md` (phases and tasks).

## Run locally

```bash
npm install
cp .env.example .env.local   # then add your API keys
npm run dev
```

Open http://localhost:3000/stt-test for the Phase 1 transcription test.
Sentences to try are in `stt-test-sentences.md`.

To test on a phone, the page must be served over HTTPS (browsers block the microphone otherwise):
`npm run dev -- --experimental-https`, then open `https://<your-computer's-local-IP>:3000/stt-test` on the phone (same Wi-Fi).

## Grammar bank

One `.md` file per grammar point in `grammar-bank/`, one question per line.
