# Test set: second conditional

**Please check the "Expected" column.** That is the answer key the checker is graded against.
Change any label you disagree with. 
- **Mode:** `main` = answer to a bank question (grammar required) · `followup` = answer to the conversation follow-up (grammar not required) · `repeat` = repeating a correction (the sentence to repeat is in the Question column after `→`)
- **Expected:** `correct` · `incorrect` (wrong form) · `not_used` (no attempt, e.g. just a noun) · `say_again` (asked to hear it again) · `meaning` (asked what a word means) · `help` (asked how to say a word; the note's "must include" then checks the suggested word)

A note can also say `correction must include "…"` to check the corrected sentence, not just the verdict.

Run it with `npm run eval:check`. Results are written to `evals/results/second-conditional.md`.

| # | Mode | Question | Answer | Expected | Note |
|---|---|---|---|---|---|
| 1 | main | If you were invisible for a day, what would you do? | I would go to the bank. | correct | |
| 2 | main | If you were invisible for a day, what would you do? | I'd steal some money from bank. | correct | missing "the" fixed silently |
| 3 | main | If you were invisible for a day, what would you do? | I will go to the bank. | incorrect | will → would |
| 4 | main | If you were invisible for a day, what would you do? | I go to the bank. | incorrect | present simple: needs would (decided) |
| 5 | main | If you were invisible for a day, what would you do? | The bank. | not_used | |
| 6 | main | If you were invisible for a day, what would you do? | Maybe I would to travel. | incorrect | would to |
| 7 | main | If you could live in any city, town, or village in the world, where would you choose? | I would choose Kyoto. | correct | |
| 8 | main | If you could live in any city, town, or village in the world, where would you choose? | Kyoto, because it's beautiful. | not_used | |
| 9 | main | If you could live in any city, town, or village in the world, where would you choose? | I choose Kyoto. | incorrect | |
| 10 | main | If you could live in any city, town, or village in the world, where would you choose? | If I could live anywhere, I would choose small village near sea. | correct | articles fixed silently |
| 11 | main | If you could have any job, what job would you like to have? | I would like to be a pilot. | correct | |
| 12 | main | If you could have any job, what job would you like to have? | I would like be a pilot. | correct | missing "to" is not the target mistake, fixed silently (decided) |
| 13 | main | If you could have any job, what job would you like to have? | Pilot. | not_used | |
| 14 | main | If you didn't need sleep, how would you spend your nights? | I would watching movies. | incorrect | |
| 15 | main | If you didn't need sleep, how would you spend your nights? | I would watched movies. | incorrect | |
| 16 | main | If you didn't need sleep, how would you spend your nights? | I'd read books all night. | correct | |
| 17 | main | If you didn't need sleep, how would you spend your nights? | If I wouldn't need sleep, I would read. | incorrect | would in the if-clause |
| 18 | main | If you didn't need sleep, how would you spend your nights? | If I didn't need sleep, I will read. | incorrect | |
| 19 | main | If you could travel in time, would you prefer to see the future or the past? | The past. | not_used | |
| 20 | main | If you could travel in time, would you prefer to see the future or the past? | I would prefer the past. | correct | |
| 21 | main | If you could travel in time, would you prefer to see the future or the past? | I would prefer to see past. | correct | article fixed silently |
| 22 | main | If you were the world's best at something, what would you like to be the world's best at? | I would like to be best at piano. | correct | "the best", "playing" fixed silently |
| 23 | main | If you were the world's best at something, what would you like to be the world's best at? | I want to be the best at cooking. | incorrect | "want" instead of "would like" (decided) |
| 24 | main | If you could stay one age forever, what age would it be? | It would be 25. | correct | |
| 25 | main | If you could stay one age forever, what age would it be? | 25. | not_used | |
| 26 | main | If you could stay one age forever, what age would it be? | It will be 30. | incorrect | |
| 27 | main | If you could travel in time, would you prefer to see the future or the past? | um the future because I, I want to see robots | incorrect | fillers ignored; "want" not "would like" |
| 28 | main | If you won the lottery, what would you do? | if I win lottery I would buy house | incorrect | present in the if-clause |
| 29 | main | If you won the lottery, what would you do? | If I won the lottery I would buy a house | correct | no punctuation, as from speech-to-text |
| 30 | followup | Where would you buy a house? | In Spain. | correct | follow-up doesn't require the grammar |
| 31 | followup | What would you buy first? | I will buy a car. | incorrect | used it, but wrongly |
| 32 | followup | Why would you choose Kyoto? | Because it is very beautiful city. | correct | grammar not needed; article fixed silently |
| 33 | followup | Who would you take with you? | I would took my sister. | incorrect | |
| 34 | repeat | → I would go to the bank. | I would go to the bank. | correct | |
| 35 | repeat | → I would go to the bank. | I would go to bank. | correct | small slip, target is right |
| 36 | repeat | → I would go to the bank. | I will go to the bank. | incorrect | |
| 37 | repeat | → I'd go to the bank. | I would go to the bank. | correct | |
| 38 | main | If you could meet anyone, dead or alive, who would you choose to meet? | If I met anyone dead or alive, I met, um, Barack Obama | incorrect | from a real session (owner); correction must include "if I could meet" |
| 39 | main | If you could meet anyone, dead or alive, who would you choose to meet? | If I could meet anyone, I would meet Barack Obama. | correct | |
| 40 | main | If you could meet anyone, dead or alive, who would you choose to meet? | I would meet Barack Obama. | correct | short answer; correction must include "(If I could meet" |
| 41 | main | If you could have any job, what job would you like to have? | If I had any job, I would be a pilot. | incorrect | question's "could" dropped (same rule as #38); correction must include "could have" |
| 42 | main | If you were the world's best at something, what would you like to be the world's best at? | I would like to be the best at public speaking. | correct | owner's example: if-clause shown in brackets as optional; correction must include "(If I were" |
| 43 | main | If you were invisible for a day, what would you do? | If I was invisible, I would go to the bank. | correct | learner said the if-clause, so no brackets ("was" or "were" both fine); correction must include "invisible, I would go" |
| 44 | repeat | → (If I could meet anyone, dead or alive,) I would meet Barack Obama. | I would meet Barack Obama. | correct | bracketed part is optional when repeating |
| 45 | repeat | → (If I could meet anyone, dead or alive,) I would meet Barack Obama. | If I could meet anyone, I will meet Barack Obama. | incorrect | |
| 46 | main | If you could have any job, what job would you like to have? | Mm, how do I say this in English? The person who repairs cars. I would be that. | help | described in English; correction must include "mechanic" |
| 47 | main | If you could have any job, what job would you like to have? | I would be a, how do you call it, a person who flies planes | help | correction must include "pilot" |
| 48 | main | If you could live in any city, town, or village in the world, where would you choose? | I would choose a small, как это, деревня near the sea | help | Russian word in Cyrillic; correction must include "village" |
| 49 | main | If you could have any job, what job would you like to have? | I would like to be a 医者 | help | Japanese word; correction must include "doctor" |
| 50 | main | If you could have any job, what job would you like to have? | Hmm, how do I say this... I would be a pilot. | correct | asked, but found the word: judged normally |
| 51 | main | If you didn't need sleep, how would you spend your nights? | Let me think. I would read books. | correct | thinking aloud is not a help request |
| 52 | followup | Why would you choose to be a pilot? | Because I, how do you say, I want to see the world from up in the sky, from very high | correct | found a way to say it; follow-up not graded |
| 53 | main | If you could be any fictional character, who would you be and why? | Sorry, what? | say_again | from a real session (owner): must repeat, not ask something new |
| 54 | main | If you could work for any company in the world for a week, which one would you choose and why? | Can you repeat the question, please? | say_again |  |
| 55 | main | If you were invisible for a day, what would you do? | Pardon? | say_again |  |
| 56 | followup | What would you do there every day? | Sorry, I didn't catch that. Could you say it again? | say_again |  |
| 57 | repeat | → I would go to the bank. | Sorry, what? | say_again | while repeating a correction |
| 58 | main | If you were invisible for a day, what would you do? | Sorry, I would go to the bank. | correct | apologises, then answers: judged normally |
| 59 | main | If you could stay one age forever, what age would it be? | What? Hmm, it would be 30. | correct | surprise, then answers |
| 60 | main | If you could be any fictional character, who would you be and why? | What does fictional mean? | meaning | correction must include "fictional" |
| 61 | main | If you could meet anyone, dead or alive, who would you choose to meet? | Sorry, what is dead or alive? | meaning | correction must include "dead or alive" |
| 62 | main | If you were invisible for a day, what would you do? | Um, I don't know the word invisible. | meaning | correction must include "invisible" |
| 63 | followup | Would you give the money back afterwards? | What does afterwards mean? | meaning | correction must include "afterwards" |
| 64 | main | If you could be any fictional character, who would you be and why? | I would be Harry Potter because he can do magic. | correct | uses the word's meaning correctly; not a question |
| 65 | main | If you were invisible for a day, what would you do? | What would I do? I would go to the bank. | correct | question inside the answer is not a meaning request |
| 66 | followup | What would you wear to the party? | I wear a dress. | incorrect | same rule as first-conditional #32; correction must include "would wear" |
| 67 | main | What would you do if you were invisible for a day? | I would go to the bank. | correct | question ends with "if": grey part at the end; correction must include "bank (if" |
| 68 | main | What would you do if you were invisible for a day? | I would go to the bank if I were invisible. | correct | learner's own order is fine |
| 69 | main | If you could have any job, what job would you like to have? | I would be a pilot if I could have any job. | correct | if at the end, though the question has it first: fine |
| 70 | main | What would you do if you were invisible for a day? | I will go to the bank if I am invisible. | incorrect | order fine, tenses wrong; correction must include "would go" |
| 71 | main | Who would you choose to meet if you could meet anyone, dead or alive? | I would meet my grandmother. | correct | correction must include "grandmother (if I could meet anyone |
| 72 | main | What job would you like to have if you could have any job? | I would be a pilot. I love planes. | correct | extra sentence stays present simple; correction must include "I love planes" |
