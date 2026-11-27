# Checker results: first-conditional

Run 2026-11-27T23:24:28.171Z

**40/43 cases pass · model claude-haiku-5-5 (effort low) · 142319 in / 5130 out tokens · $0.0168 total, $0.00039 per answer · avg 1997 ms per answer**

| # | | Mode | Answer | Expected | Got | Corrected answer | Next question |
|---|---|---|---|---|---|---|---|
| 1 | ✅ | main | I will make pasta. | correct | correct | I will make pasta (if I am hungry when I get home tonight). | What kind of sauce will you put on it? |
| 2 | ✅ | main | I'll order a pizza. | correct | correct | I'll order a pizza (if I am hungry when I get home tonight). | What toppings will you choose on your pizza? |
| 3 | ✅ | main | I'm going to eat some soup. | correct | correct | I'm going to eat some soup (if I am hungry when I get home tonight). | What kind of soup do you like best? |
| 4 | ✅ | main | I might cook eggs. | correct | correct | I might cook eggs (if I am hungry when I get home tonight). | How will you cook your eggs tonight? |
| 5 | ✅ | main | I can take a pill. | correct | correct | I can take a pill (if I suddenly get a headache). | Would you take it with water or with tea? |
| 6 | ✅ | main | I may lie down for a bit. | correct | correct | I may lie down for a bit (if I suddenly get a headache). | How long will you rest for? |
| 7 | ✅ | main | If I get a headache, I will take a pill. | correct | correct | If I get a headache, I will take a pill. | Do you usually take a pill, or try something else first? |
| 8 | ✅ | main | I would make pasta. | incorrect | incorrect | I'll make pasta (if I am hungry when I get home tonight). | What sauce will you put on the pasta? |
| 9 | ✅ | main | I eat pasta. | incorrect | incorrect | I will eat pasta (if I am hungry when I get home tonight). | What will you cook first? |
| 10 | ✅ | main | I will eating pasta. | incorrect | incorrect | I will eat pasta (if I am hungry when I get home tonight). | What will you cook first? |
| 11 | ✅ | main | I will to eat pasta. | incorrect | incorrect | I will eat pasta (if I am hungry when I get home tonight). | Will you cook it yourself tonight? |
| 12 | ✅ | main | If I will get a headache, I will take a pill. | incorrect | incorrect | If I get a headache, I'll take a pill. | Do you usually take a pill, or do you prefer tea? |
| 13 | ✅ | main | I call a doctor. | incorrect | incorrect | I'll call a doctor (if I suddenly get a headache). | Would you call a doctor or take a pill first? |
| 14 | ✅ | main | Pasta. | not_used | not_used |  | And how will you cook it? |
| 15 | ✅ | main | The beach! | not_used | not_used | (If it is fantastic weather tomorrow,) I will go to the beach. | Who will you go to the beach with? |
| 16 | ✅ | main | I will go to cafe. | correct | correct | (If there is no coffee at my home tomorrow morning,) I will go to a cafe. | Which cafe will you choose? |
| 17 | ✅ | main | I will say no. | correct | correct | I will say no (if my ex calls me and wants to get back together). | How will you feel after you say no? |
| 18 | ✅ | main | I'd say no. | incorrect | incorrect | I will say no (if my ex calls me and wants to get back together). | How will you feel afterwards? |
| 19 | ✅ | main | I will work out three times a week. | correct | correct | I will work out three times a week (if you pay for my gym membership). | What will you do at the gym first? |
| 20 | ✅ | main | I will study more. | correct | correct | I will study more (if I get a poor grade on my next English test). | What will you study first? |
| 21 | ✅ | main | I'll watch a movie and drink tea. | correct | correct | (If I want to relax after class,) I'll watch a movie and drink tea. | Which movie will you watch first? |
| 22 | ✅ | main | If it is sunny, I will go to the park. | correct | correct | If it is sunny, I will go to the park. | What will you do at the park? |
| 23 | ✅ | main | If it will be sunny, I go to the park. | incorrect | incorrect | If it is sunny, I will go to the park. | What will you do first when you get there? |
| 24 | ✅ | followup | Pasta. | correct | correct | Pasta. |  |
| 25 | ✅ | followup | I would cook pasta. | incorrect | incorrect | I will cook pasta. |  |
| 26 | ✅ | followup | To the park, because it is near. | correct | correct | To the park, because it is near. |  |
| 27 | ✅ | repeat | I will make pasta. | correct | correct | (If I am hungry when I get home tonight,) I will make pasta. |  |
| 28 | ✅ | repeat | I would make pasta. | incorrect | incorrect | I will make pasta. |  |
| 29 | ✅ | main | Sorry, what? | say_again | say_again |  |  |
| 30 | ✅ | main | What does grade mean? | meaning | meaning | 'Grade' means the score or mark a teacher gives you for your work, like 'an A' or '80 out of 100'. |  |
| 31 | ✅ | main | I will eat, how do you say, гречка | help | help | buckwheat |  |
| 32 | ✅ | followup | I wear dress | incorrect | incorrect | I will wear a dress. |  |
| 33 | ✅ | followup | A red dress. | correct | correct | A red dress. |  |
| 34 | ✅ | main | I'll go to the beach. | correct | correct | (If it is fantastic weather tomorrow,) I'll go to the beach. | Who will you go with? |
| 35 | ❌ | main | I will go to the park if it is sunny. | correct | ERROR: 429 {"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed your rate limit of 500,000 input tokens per minute (org: 0148ec56-eb96-4aea-8e8c-9e85b06b9655, model: claude-haiku-5-5). For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Reduce the prompt length or the maximum tokens requested, or try again later. View your current limits at https://console.anthropic.com/settings/limits. You may also contact sales at https://claude.com/contact-sales to discuss your options for a rate limit increase."},"request_id":"req_011ChUJ5cn4yWRjs18ALj7Wk"} |  |  |
| 36 | ✅ | main | If I get a headache, I will lie down. | correct | correct | If I get a headache, I will lie down. | Will you take a pill first, or rest for a while? |
| 37 | ✅ | main | I lie down if I get a headache. | incorrect | incorrect | I'll lie down if I get a headache. | Where will you lie down when it happens? |
| 38 | ✅ | main | I drink tea. It's okay for me | incorrect | incorrect | (If there is no coffee at my home tomorrow morning,) I will drink tea. It's okay for me. | What will you have with your tea? |
| 39 | ✅ | main | I'll make pasta. I love Italian food. | correct | correct | I'll make pasta (if I am hungry when I get home tonight). I love Italian food. | Do you cook pasta often at home? |
| 40 | ❌ | main | I'll make pasta if I will be hungry. | incorrect | ERROR: 429 {"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed your rate limit of 500,000 input tokens per minute (org: 0148ec56-eb96-4aea-8e8c-9e85b06b9655, model: claude-haiku-5-5). For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Reduce the prompt length or the maximum tokens requested, or try again later. View your current limits at https://console.anthropic.com/settings/limits. You may also contact sales at https://claude.com/contact-sales to discuss your options for a rate limit increase."},"request_id":"req_011ChUJ5qzJWsj4ESpjhRuqx"} |  |  |
| 41 | ✅ | main | I practiced some more, I think. What else? | incorrect | incorrect | I will practice some more (if I get a poor grade on my next English test). | What will you study first? |
| 42 | ✅ | main | I stayed at home and watched films. I don't know. | incorrect | incorrect | I will stay at home and watch films (if it rains this weekend). | Which film will you watch first? |
| 43 | ❌ | main | Netflix, I guess. Is that okay? | not_used | ERROR: 429 {"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed your rate limit of 500,000 input tokens per minute (org: 0148ec56-eb96-4aea-8e8c-9e85b06b9655, model: claude-haiku-5-5). For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Reduce the prompt length or the maximum tokens requested, or try again later. View your current limits at https://console.anthropic.com/settings/limits. You may also contact sales at https://claude.com/contact-sales to discuss your options for a rate limit increase."},"request_id":"req_011ChUJ5yZiwTL9U7puGQcg9"} |  |  |
