# Test set: first conditional

Same format as `second-conditional.md`. Expected: `correct` · `incorrect` · `not_used` · `say_again` · `meaning` · `help`. A note can say `correction must include "…"`.

Run it with `npm run eval:check -- first-conditional`.

| # | Mode | Question | Answer | Expected | Note |
|---|---|---|---|---|---|
| 1 | main | What will you eat if you are hungry when you get home tonight? | I will make pasta. | correct | short answer; if-part at the end like the question; correction must include "pasta (if I am hungry when I get home tonight)" |
| 2 | main | What will you eat if you are hungry when you get home tonight? | I'll order a pizza. | correct |  |
| 3 | main | What will you eat if you are hungry when you get home tonight? | I'm going to eat some soup. | correct | going to: accepted (owner) |
| 4 | main | What will you eat if you are hungry when you get home tonight? | I might cook eggs. | correct | might: accepted (owner) |
| 5 | main | What will you do if you suddenly get a headache? | I can take a pill. | correct | can: accepted (owner) |
| 6 | main | What will you do if you suddenly get a headache? | I may lie down for a bit. | correct | may: accepted (owner) |
| 7 | main | What will you do if you suddenly get a headache? | If I get a headache, I will take a pill. | correct | learner said the if-clause; correction must include "If I get a headache" |
| 8 | main | What will you eat if you are hungry when you get home tonight? | I would make pasta. | incorrect | would instead of will |
| 9 | main | What will you eat if you are hungry when you get home tonight? | I eat pasta. | incorrect | present simple instead of will |
| 10 | main | What will you eat if you are hungry when you get home tonight? | I will eating pasta. | incorrect |  |
| 11 | main | What will you eat if you are hungry when you get home tonight? | I will to eat pasta. | incorrect |  |
| 12 | main | What will you do if you suddenly get a headache? | If I will get a headache, I will take a pill. | incorrect | will in the if-clause; correction must include "If I get a headache" |
| 13 | main | What will you do if you suddenly get a headache? | I call a doctor. | incorrect |  |
| 14 | main | What will you eat if you are hungry when you get home tonight? | Pasta. | not_used |  |
| 15 | main | If it is fantastic weather tomorrow, what will you do? | The beach! | not_used |  |
| 16 | main | If there is no coffee at your home tomorrow morning, what will you do? | I will go to cafe. | correct | missing article fixed silently ("a" or "the"); correction must include "cafe" |
| 17 | main | What will you say if your ex calls you and wants to get back together? | I will say no. | correct | correction must include "no (if my ex calls me |
| 18 | main | What will you say if your ex calls you and wants to get back together? | I'd say no. | incorrect | would (contracted) instead of will |
| 19 | main | How often will you work out if I pay for your gym membership? | I will work out three times a week. | correct | correction must include "(if you pay for my gym membership)" |
| 20 | main | What will you do if you get a poor grade on your next English test? | I will study more. | correct |  |
| 21 | main | If you want to relax after class, what will you do? | I'll watch a movie and drink tea. | correct |  |
| 22 | main | If it is fantastic weather tomorrow, what will you do? | If it is sunny, I will go to the park. | correct |  |
| 23 | main | If it is fantastic weather tomorrow, what will you do? | If it will be sunny, I go to the park. | incorrect |  |
| 24 | followup | What will you cook first? | Pasta. | correct | follow-up doesn't require the grammar |
| 25 | followup | What will you cook first? | I would cook pasta. | incorrect | used it, but wrongly |
| 26 | followup | Where will you go? | To the park, because it is near. | correct |  |
| 27 | repeat | → (If I am hungry when I get home tonight,) I will make pasta. | I will make pasta. | correct | optional part skipped |
| 28 | repeat | → I will make pasta. | I would make pasta. | incorrect |  |
| 29 | main | What will you do if you suddenly get a headache? | Sorry, what? | say_again |  |
| 30 | main | What will you do if you get a poor grade on your next English test? | What does grade mean? | meaning | correction must include "grade" |
| 31 | main | What will you eat if you are hungry when you get home tonight? | I will eat, how do you say, гречка | help | Russian word; correction must include "buckwheat" |
| 32 | followup | What will you wear to the party? | I wear dress | incorrect | from a real session (owner); correction must include "will wear" |
| 33 | followup | What will you wear to the party? | A red dress. | correct | no verb: fine in a follow-up |
| 34 | main | If it is fantastic weather tomorrow, what will you do? | I'll go to the beach. | correct | question starts with "If": grey part at the start; correction must include "(If it" |
| 35 | main | If it is fantastic weather tomorrow, what will you do? | I will go to the park if it is sunny. | correct | learner's own order (if at the end) is fine |
| 36 | main | What will you do if you suddenly get a headache? | If I get a headache, I will lie down. | correct | learner's own order (if first) is fine |
| 37 | main | What will you do if you suddenly get a headache? | I lie down if I get a headache. | incorrect | order fine, but present simple instead of will |
| 38 | main | If there is no coffee at your home tomorrow morning, what will you do? | I drink tea. It's okay for me | incorrect | from a real session (owner): only the answer needs will, the general fact stays present; correction must include "It's okay for me" |
| 39 | main | What will you eat if you are hungry when you get home tonight? | I'll make pasta. I love Italian food. | correct | extra opinion stays present simple; correction must include "I love Italian food" |
