# Petra Risk Assessment — Documentation & Handoff Guide

*Last updated: July 2026*

This guide is written for Petra leadership. It covers four things:

1. **[What this is and where it lives](#1-what-this-is-and-where-it-lives)** — the app, the code, the services it depends on.
2. **[The questions and answers](#2-the-questions-and-answers)** — every question a client is asked, with all answer choices.
3. **[How to edit the text](#3-how-to-edit-any-of-the-text)** — the process for changing any wording, step by step.
4. **[Access and continuity](#4-access-and-continuity-if-someone-leaves)** — how Petra keeps control of the code and the live site if the person who built it ever leaves.

---

## 1. What this is and where it lives

**What it is:** A web-based Risk Alignment Assessment. A client (or a couple) answers a series of questions, and the app produces a Risk Alignment Score (0–100), a risk band (e.g. "Balanced Growth"), and a written summary. Results are shown on screen, emailed to the client and to Petra, and attached as a PDF.

**Where the pieces live:**

| Piece | Service | What it is | Notes |
|-------|---------|------------|-------|
| **The code** | GitHub | `cleowblankinship-tech/petra-risk-app` | The single source of truth. URL: `https://github.com/cleowblankinship-tech/petra-risk-app` |
| **The live website** | Vercel | Hosts the app and serves it to clients | Connected to the GitHub repo. Publishing a change to GitHub updates the live site. |
| **Email delivery** | Postmark | Sends result emails to clients and to Petra | Configured with an API token and sender address (see below). |
| **Web address (domain)** | `risk.petrafinancial.com` | The intended public address | Currently disconnected due to DNS ownership changes; the app also works from its Vercel address. See `POSTMARK_SETUP.md`. |

**How a client's results flow through the system:**

1. Client completes the assessment on the website.
2. The app calculates the score and shows results on screen.
3. The app sends the results (with a PDF) by email — to Petra's advisor inbox, and to the client if they opted in.
4. Petra can also open a secure review link, or use the on-screen **Advisor View** (unlocked by a passcode — see [Section 4](#the-advisor-passcode)).

**Key files, in plain terms** (all in the repo):

| File | What's in it |
|------|--------------|
| `script.js` | The brain of the app — the questions, the scoring, and the written result summaries. |
| `index.html` | The page layout and the fixed on-screen text (headings, explanations, disclaimers). |
| `email-template.html` / `api/sendResults.js` | The wording and layout of the emails. |
| `pdf-generator.js` / `api/templates/results-pdf.html` | The wording and layout of the PDF. |
| `style.css` / `style-additions.css` | Colors, fonts, and visual styling. |
| `DATA_STRUCTURE.md` | A technical "single source of truth" reference for how scores and text stay consistent across screen, email, and PDF. |
| `POSTMARK_SETUP.md` | Step-by-step email configuration and the plan to reconnect the custom domain. |

---

## 2. The questions and answers

The assessment asks **32 questions**, shown in three sections in this order. The list below is exactly what a client sees. (Wording is stored in `script.js`, starting around line 290, in a block called `questions`.)

For rating-scale questions, the answer choices are shown left-to-right as a 1–5 scale. For "choose one" questions, the choices are listed. The **Investment Knowledge** section has right/wrong answers — those are marked, but note they are a **diagnostic only and do not change the client's Risk Alignment Score.**

### Section 1 — Investment Mindset (17 questions)

1. **If you try a new restaurant and it's disappointing, how likely are you to try another new place next time?**
   - Very unlikely — I'll stick to places I know
   - Somewhat hesitant but might try again
   - Still willing to explore new places

2. **When a favorite restaurant changes its menu, how do you react?**
   - Excited to try new options
   - Mixed feelings — some curiosity, some disappointment
   - Disappointed — I liked the old menu

3. **When assembling furniture or a home project, how often do you read the instructions first?**
   - Always read instructions thoroughly first
   - Skim instructions or refer to them as needed
   - Rarely read instructions — figure it out as I go

4. **When choosing a new show or book, how much does popularity influence you?**
   - I prefer to discover things on my own
   - Popularity is one factor among many
   - I often choose what's popular or trending

5. **When traveling, which best describes you?**
   - I love exploring new places and experiences
   - I mix familiar comforts with some new experiences
   - I prefer familiar places and routines

6. **If you're running late, how likely are you to assume you'll still make it?**
   - Very likely — I usually think I can make it
   - Sometimes optimistic, sometimes realistic
   - Usually realistic about being late

7. **With a gift card, do you buy something you need, something fun, or often forget it?**
   - Use it for something practical I need
   - Buy something fun or special
   - Often forget about it or let it expire

8. **When information contradicts my view, I...**
   - Tend to dismiss it or look for information that supports my view
   - Feel uncomfortable but don't always change my mind
   - Consider it carefully and sometimes adjust my view
   - Actively seek out and carefully consider opposing viewpoints

9. **I feel more confident in decisions when many others are doing the same.**
   - *Rating scale:* Strongly disagree → Disagree → Neutral → Agree → Strongly agree

10. **If you've had two rainy weekends in a row, how much would you agree with planning an outdoor event this weekend?**
    - *Rating scale:* Strongly disagree → Disagree → Neutral → Agree → Strongly agree

11. **When reviewing market updates or investment commentary, I notice that I am drawn to sources that confirm my current views.**
    - *Rating scale:* Strongly disagree → Disagree → Neutral → Agree → Strongly agree

12. **My family tends to live into their late 80s or 90s.**
    - *Rating scale:* Strongly disagree → Disagree → Neutral → Agree → Strongly agree
    - *(Planning flag — helps flag longevity considerations for the advisor.)*

13. **I expect I may need to support loved ones financially or with caregiving.**
    - *Rating scale:* Strongly disagree → Disagree → Neutral → Agree → Strongly agree
    - *(Planning flag — helps flag caregiving considerations for the advisor.)*

14. **If you receive a $5,000 tax refund, what are you most likely to do?**
    - Spend it quickly on something I want
    - Use it for immediate needs or small purchases
    - Split between spending and saving
    - Save most of it for future goals
    - Invest it or add to long-term savings

15. **How confident are you in your ability to spot a 'good investment'?**
    - *Rating scale:* Not at all confident → Slightly confident → Moderately confident → Very confident → Extremely confident

16. **When you experience investment losses, what do you typically do?**
    - Sell immediately to prevent further losses
    - Consider selling but often wait to see if it recovers
    - Hold and reassess based on fundamentals
    - View it as a buying opportunity if fundamentals are strong

17. **When making investment decisions, how much do you let recent performance sway you?**
    - I focus on long-term fundamentals, not recent performance
    - Recent performance has some influence on my decisions
    - Recent performance significantly influences my choices
    - I primarily base decisions on what's performed well recently

### Section 2 — Traditional Risk Assessment (7 questions)

1. **If your long-term portfolio dropped 25% and financial headlines were negative, which response fits you best?**
   - *Rating scale:* Move to cash immediately → Reduce exposure → Wait before making any changes → Stay invested but uneasy → Stay invested confidently

2. **Choose between: A) 6% average annual return with a −20% worst year; B) 9% average annual return with a −35% worst year. How likely are you to choose B?**
   - *Rating scale:* Definitely A → Probably A → Unsure → Probably B → Definitely B

3. **When markets swing sharply, I feel...**
   - *Rating scale:* Very anxious → Somewhat anxious → Neutral → Somewhat excited → Very excited

4. **I would stick with my long-term plan during a significant decline.**
   - *Rating scale:* Strongly disagree → Disagree → Neutral → Agree → Strongly agree

5. **When will you likely begin using a significant portion of this money?**
   - *Rating scale:* Within 1 year → In 1–3 years → In 4–7 years → In 8–15 years → More than 15 years

6. **Experiencing several losing months in a row would not lead me to abandon my long-term strategy.**
   - *Rating scale:* Strongly disagree → Disagree → Neutral → Agree → Strongly agree

7. **I am willing to accept large temporary losses in pursuit of higher long-term returns.**
   - *Rating scale:* Strongly disagree → Disagree → Neutral → Agree → Strongly agree

### Section 3 — Investment Knowledge (8 questions)

*This section is a diagnostic overlay for the advisor. It does not affect the Risk Alignment Score.*

1. **How comfortable are you with financial terminology and concepts (e.g., stocks, bonds, commodities, volatility, inflation, diversification, dollar-cost averaging, etc.)?**
   - *Rating scale:* Not comfortable → Slightly → Moderately → Very → Extremely

2. **How confident are you evaluating a new investment for fit?**
   - *Rating scale:* Not confident → Slightly → Moderately → Confident → Very confident

3. **Over a 20-year period, which approach has historically been most effective at protecting purchasing power?**
   - Savings account paying 2%
   - Gold
   - Cash kept in a safe
   - Certificate of Deposit (CD)
   - Just stocks ✅ *(correct)*

4. **Which best describes diversification?**
   - Guarantees no loss
   - Spreads risk across investments ✅ *(correct)*
   - Higher return with no extra risk
   - Mainly for short-term investors

5. **In general, higher potential return means:**
   - Lower risk
   - Same risk
   - Higher risk ✅ *(correct)*
   - No relationship

6. **If the stock market falls 15% in a month, which is most accurate?**
   - Sell quickly before more losses
   - Market swings are expected over the long term ✅ *(correct)*
   - Market won't recover
   - Do what most investors are doing

7. **If interest rates rise, what happens to existing bond prices?**
   - They rise
   - Stay the same
   - They fall ✅ *(correct)*
   - No impact

8. **Which best describes your investing experience? (Choose all that apply)**
   - Never beyond savings or CDs
   - Mutual funds / ETFs
   - Traded stocks or bonds
   - Individual stocks
   - Options or derivatives
   - Alternative investments (real estate, private credit, commodities, etc.)

### The result summaries (written text)

After the questions, the app shows five written sections. These are **generated by the app** from the client's answers, so they are not fixed sentences — they change based on the responses. The section headings are:

1. **What Your Score Reflects**
2. **Behavioral Tendencies and Investment Mindset**
3. **Time Horizon and Risk Capacity**
4. **How These Elements Work Together**
5. **How Petra Uses This Information**

If leadership ever wants to change *how* these summaries read, that is a text change in `script.js` (see the note in the next section about generated text). The fixed headings and explanatory paragraphs are in `index.html`.

---

## 3. How to edit any of the text

Any wording in the app can be changed. **Where** you change it depends on which text it is:

| Text you want to change | File to edit |
|-------------------------|--------------|
| A question or an answer choice | `script.js` (the `questions` block near line 290) |
| A fixed on-screen heading, explanation, or disclaimer | `index.html` |
| The wording of the emailed results | `email-template.html` and/or `api/sendResults.js` |
| The wording of the PDF | `pdf-generator.js` and/or `api/templates/results-pdf.html` |
| The generated result summaries (the five sections above) | `script.js` (the functions `generateOverallSummary`, `generateMindsetInsight`, `generateTraditionalInsight`, `generateAlignmentCheck`, `generatePlanningRelevance`) |

> **Important:** The score summaries, emails, and PDF are designed to pull from the same source so they stay consistent. Before changing generated summary text, read `DATA_STRUCTURE.md` — it explains how to change wording in one place so the screen, email, and PDF all stay in sync.

### The simple way — editing directly on GitHub (no software to install)

This works well for small wording changes (fixing a typo, rewording a question).

1. Go to `https://github.com/cleowblankinship-tech/petra-risk-app`.
2. Click the file you want to change (e.g. `script.js`).
3. Click the **pencil icon** (✏️, "Edit this file") in the top-right of the file view.
4. Use your browser's **Find** (Ctrl-F / Cmd-F) to locate the exact text. Change only the words between the quotation marks — leave the surrounding code (commas, brackets, quotes) alone.
5. Scroll down, add a short note describing the change (e.g. "Reworded restaurant question"), and click **Commit changes**.
6. If asked whether to commit to `main` directly or open a "pull request," committing to `main` publishes it; a pull request lets someone review it first. For a small fix, committing to `main` is fine.
7. The live site updates automatically a minute or two later (Vercel rebuilds when `main` changes). Refresh the site to confirm.

> **Tip:** Change text only — the words inside quotes. If you accidentally delete a quote mark, comma, or bracket, the app can break. When in doubt, make one small change, publish, and check the site before making the next one.

### The developer way — for a technical person

Clone the repo, edit locally, and push:

```bash
git clone https://github.com/cleowblankinship-tech/petra-risk-app.git
cd petra-risk-app
npm install          # installs dependencies (jsPDF, Postmark)
npm run dev          # runs the site locally via Vercel to preview changes
# ...make edits...
git add -A
git commit -m "Describe the change"
git push
```

Pushing to `main` triggers a Vercel deployment. For anything larger than a wording tweak, open a pull request so the change can be reviewed before it goes live.

### After any edit — quick checklist

- [ ] The live site loads and the changed text appears.
- [ ] If you changed a question, run through the assessment once to confirm it still calculates a score.
- [ ] If you changed email or PDF text, send yourself a test result to confirm formatting.

---

## 4. Access and continuity (if someone leaves)

This is the most important section for leadership. Today the app depends on a handful of online accounts. If the person who set them up became unavailable, **Petra needs to already have its own access.** Below is what exists and what to secure.

### ⚠️ Action items for leadership to secure now

1. **The GitHub repository is currently under an individual account** (`cleowblankinship-tech`), not a Petra-owned organization. This is the single biggest continuity risk. Recommended fixes, in order of preference:
   - **Best:** Create a Petra-owned GitHub Organization and **transfer** this repository into it, so ownership belongs to the company, not a person.
   - **At minimum:** Add a second Petra-controlled GitHub account as an **Owner/Admin** of the repository, and make sure a Petra email address can recover the account.
2. **Vercel** (the hosting): confirm the Vercel account/team that hosts the live site is owned by Petra, or add a Petra-controlled account as a member with admin rights. Vercel is linked to the GitHub repo, so whoever controls GitHub effectively controls deployments.
3. **Postmark** (the email service): confirm Petra controls the Postmark account and knows where the **API token** and **sender address** are stored. These live as environment variables in Vercel (`POSTMARK_SERVER_TOKEN`, `POSTMARK_FROM`, `ADVISOR_EMAIL`). See `POSTMARK_SETUP.md`.
4. **The domain** `risk.petrafinancial.com`: confirm Petra controls the DNS for `petrafinancial.com` so the custom web address can be reconnected. The reconnection steps are documented in `POSTMARK_SETUP.md`.

### What Petra would need to take over the code

Because the code lives in Git (a version-control system), **the entire app — every file and its full history — can be copied in one command** by anyone with access:

```bash
git clone https://github.com/cleowblankinship-tech/petra-risk-app.git
```

As long as at least one Petra-controlled account has access to the repository (see action item #1), the code can never be lost. It is not trapped on any individual's computer — the authoritative copy is on GitHub, and it can be cloned, transferred, or handed to a new developer at any time.

**A practical safety net:** periodically download a full copy of the repository (GitHub → **Code** → **Download ZIP**, or a `git clone`) and store it somewhere Petra controls, such as a company drive. This guarantees an offline backup even if account access lapses.

### The list of accounts to hand over

If the current maintainer ever leaves, the handover checklist is:

| Account / service | What to transfer | Where it's documented |
|-------------------|------------------|-----------------------|
| GitHub | Ownership/admin of `petra-risk-app` | This document |
| Vercel | Team/project ownership + environment variables | `POSTMARK_SETUP.md`, `.env.example` |
| Postmark | Account login + API token | `POSTMARK_SETUP.md` |
| Domain / DNS | Control of `petrafinancial.com` DNS records | `POSTMARK_SETUP.md` |

### The advisor passcode

The on-screen **Advisor View** (extra detail shown to Petra staff on the results page) is unlocked by a passcode. It is currently set in `script.js` near the top of the file (`ADVISOR_PASSCODE`). Two notes for leadership:

- Make sure the current passcode is recorded somewhere Petra controls (e.g. a shared password manager).
- Because it lives in the site's code, it is a light gate for convenience, not strong security — don't treat the Advisor View as a place for anything truly sensitive, and change the passcode if it's ever shared too widely.

---

## Quick reference

- **Repository:** `https://github.com/cleowblankinship-tech/petra-risk-app`
- **Hosting:** Vercel (auto-deploys when `main` is updated)
- **Email:** Postmark (config in `POSTMARK_SETUP.md` and Vercel environment variables)
- **Intended domain:** `risk.petrafinancial.com` (reconnect steps in `POSTMARK_SETUP.md`)
- **Questions live in:** `script.js` (the `questions` block, ~line 290)
- **Consistency rules for screen/email/PDF text:** `DATA_STRUCTURE.md`
