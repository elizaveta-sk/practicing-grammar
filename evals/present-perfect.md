# Test set: present perfect

Same format as `second-conditional.md`. Expected: `correct` · `incorrect` · `not_used` · `say_again` · `meaning` · `help`. A note can say `correction must include "…"`.

Owner's rule: yes/no questions want a short answer plus details ("Yes, I have. I met…"). A short answer alone is nudged for details; a full answer without one is correct, and the short answer is added to the correction as a model.

Run it with `npm run eval:check -- present-perfect`.

| # | Mode | Question | Answer | Expected | Note |
|---|---|---|---|---|---|
| 1 | main | Have you ever met a famous person? | Yes, I have. I met Tom Hanks in 2019. | correct | the ideal answer: short answer + details |
| 2 | main | Have you ever met a famous person? | Yes, I have. I have met Tom Hanks. | correct |  |
| 3 | main | Have you ever met a famous person? | No, I haven't, but I would love to. | correct |  |
| 4 | main | Have you ever met a famous person? | I have met Tom Hanks. | correct | no short answer: shown as a model; correction must include "Yes, I have" |
| 5 | main | Have you ever met a famous person? | I've never met anyone famous. | correct | correction must include "No, I haven't" |
| 6 | main | Have you ever met a famous person? | Yes, I have. | not_used | short answer alone: nudge for details |
| 7 | main | Have you ever ridden a horse? | No, I haven't. | not_used | short answer alone |
| 8 | main | Have you ever met a famous person? | Yes. | not_used |  |
| 9 | main | Have you ever met a famous person? | Yes, I did. I met Tom Hanks. | incorrect | wrong short answer; correction must include "Yes, I have" |
| 10 | main | Have you ever ridden a horse? | Yes, I do. I rode a horse on holiday. | incorrect | correction must include "Yes, I have" |
| 11 | main | Have you ever met a famous person? | Yes, I met Tom Hanks. | incorrect | past simple, no finished time |
| 12 | main | Have you ever met a famous person? | Yes, I have. I have met him in 2019. | incorrect | present perfect with a finished time; correction must include "met him in 2019" |
| 13 | main | Have you ever ridden a horse? | Yes, I have rode a horse. | incorrect | wrong participle; correction must include "ridden" |
| 14 | main | Have you sung in public before? | Yes, I have sang at a wedding. | incorrect | correction must include "sung" |
| 15 | main | Has it ever snowed in your hometown? | Yes, it have snowed many times. | incorrect | has/have; correction must include "it has" |
| 16 | main | Has it ever snowed in your hometown? | Yes, it has. It snows every winter. | correct |  |
| 17 | main | Have you eaten today? | Yes, I have. I have eaten breakfast and lunch. | correct |  |
| 18 | main | Have you eaten today? | Yes, I ate today. | incorrect |  |
| 19 | main | Has anyone you know been a soldier? | Yes, my uncle has. He was a soldier for ten years. | correct | short answer with a person |
| 20 | main | Has anyone you know been a soldier? | My uncle been a soldier. | incorrect | missing has |
| 21 | main | What have you done today? | I have cleaned my flat and I have called my mum. | correct | wh-question: no short answer needed |
| 22 | main | What have you done today? | I cleaned my flat. | incorrect |  |
| 23 | main | What have you done today? | Cleaning. | not_used |  |
| 24 | main | Where have you been on holiday in your life? | I've been to Spain and Italy. | correct | contraction counts |
| 25 | main | Where have you been on holiday in your life? | Spain and Italy. | not_used |  |
| 26 | main | Where have you been on holiday in your life? | I have went to Spain. | incorrect |  |
| 27 | main | Why has this been a good (or bad) year? | It has been a good year because I have found a new job. | correct |  |
| 28 | main | What is the best movie you have ever seen? | The best movie I have ever seen is Titanic. | correct |  |
| 29 | main | What is the best movie you have ever seen? | Titanic. | not_used |  |
| 30 | main | Which countries have been in the news this week? | France has been in the news a lot. | correct |  |
| 31 | followup | Have you ever told anyone about it? | Only my sister. | correct | follow-up doesn't require the grammar |
| 32 | followup | Have you ever told anyone about it? | Yes, I did. I told my sister. | incorrect | wrong short answer in the follow-up |
| 33 | repeat | → Yes, I have. I met Tom Hanks in 2019. | Yes, I have. I met Tom Hanks in 2019. | correct |  |
| 34 | repeat | → Yes, I have. I met Tom Hanks in 2019. | Yes, I did. I met Tom Hanks in 2019. | incorrect |  |
| 35 | main | Have you ever ridden a horse? | Pardon? | say_again |  |
| 36 | main | Has anyone you know been a soldier? | What does soldier mean? | meaning | correction must include "soldier" |
| 37 | followup | Have you ever worn a costume to a party? | Yes, I wear a costume last year. | incorrect | same rule: the question's verb in a wrong form |
