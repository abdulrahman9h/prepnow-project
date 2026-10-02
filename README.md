# PrepNow

An AI-powered career-readiness platform that helps students assess their skills, follow a personalized training plan, and practice job interviews with automated AI feedback. Built as a graduation project at Shaqra University.

**Live demo:** https://abdulrahman9h.github.io/prepnow-project/

## Overview

PrepNow is a single-page web application written in vanilla JavaScript with a Supabase (PostgreSQL) backend. Interview answers are evaluated by OpenAI, called through a Supabase Edge Function so the API key stays server-side and never reaches the browser. The front end uses no framework and no build step — it runs as plain static files.

The platform targets university students preparing to enter the job market. A student signs up, measures their current level with skill assessments, receives a training plan built from their weakest areas, and then rehearses real interview questions with an AI coach that scores each answer and explains how to improve it.

## Features

- **Authentication** — email/password sign-up and sign-in via Supabase Auth, with profile metadata (full name, major, target role). A guest mode allows browsing without an account; guest data stays in the browser and the AI interview requires a real login.
- **Skill assessment** — separate technical and soft-skill assessments built from a randomized question bank (fetched via a `get_random_questions` SQL function). Results are scored per skill area and stored per user.
- **Personalized training plan** — generated from assessment results: weak skill areas are mapped to curated learning resources (videos, courses, interactive practice sites) loaded from the `training_resources` table, with progress tracking per item.
- **AI interview practice** — an interactive interview session (5 questions per round) with **voice input** via the browser's Web Speech API or plain text input. Each answer is sent to OpenAI through the `openai-proxy` Edge Function and returns structured feedback: a 0–100 score, overall assessment, strengths, improvements, missing points, an example strong answer, and tips.
- **Dashboard** — progress overview: latest assessment scores, interview averages, and training plan completion.
- **History** — a record of past assessments and interview attempts with scores and feedback.
- **Profile** — account details, major, and target job role.
- **Admin panel** — visible only to users with the `admin` role: manage the question bank and training resources, and review user activity (logins, assessments, interview attempts).

## Architecture

The app has three parts:

1. **Front end (static files)** — HTML/CSS/JS served by any static host (GitHub Pages in production, `python -m http.server` locally). All rendering is client-side; pages are drawn into a single `#mainContent` container by per-module render functions.
2. **Supabase** — PostgreSQL database, authentication, and Row Level Security. The browser talks to it directly with the public anon key; RLS policies decide what each user may read or write.
3. **OpenAI via Edge Function** — the browser never calls OpenAI directly. It invokes the `openai-proxy` Supabase Edge Function (Deno), which verifies the caller is a signed-in user, attaches the `OPENAI_API_KEY` secret server-side, builds the evaluation prompt, and forwards the request to the OpenAI Responses API (`gpt-5.4-mini`).

Request flow for AI feedback:

```
Browser (interview.js)
  -> supabase.functions.invoke('openai-proxy')   [user JWT attached automatically]
    -> Edge Function: verify role = authenticated, read OPENAI_API_KEY secret
      -> OpenAI Responses API (gpt-5.4-mini)
    <- structured JSON feedback
  <- rendered in the feedback panel
```

## Tech stack

| Layer | Technology |
|-------|------------|
| Front end | Vanilla JavaScript, HTML, CSS (no framework, no build tooling) |
| Backend / data | Supabase — PostgreSQL, Auth, Row Level Security |
| AI | OpenAI API (`gpt-5.4-mini`), called through a Supabase Edge Function (Deno) |
| Voice input | Web Speech API (built into Chrome/Edge) |
| Hosting | GitHub Pages (static front end); Supabase JS SDK loaded via CDN |

## Project structure

```
prepnow/
├── index.html              # App shell: sidebar, auth modal, script/style includes
├── css/
│   ├── styles.css          # Base styles and theme variables
│   ├── components.css      # Reusable UI components (cards, modals, toasts)
│   └── pages.css           # Page-specific styles
├── js/
│   ├── config.js           # Supabase URL + anon key (public — safe in the browser)
│   ├── app.js              # Bootstrap, routing, connection checks
│   ├── store.js            # Local state + localStorage persistence
│   ├── supabase-client.js  # Data-access layer over the Supabase SDK
│   ├── auth.js             # Supabase Auth (register/login), guest mode, session handling
│   ├── questions.js        # Local fallback question bank (used if Supabase is offline)
│   ├── assessment.js       # Technical & soft-skill assessments
│   ├── training.js         # Training plan generation and progress tracking
│   ├── interview.js        # Interview session, voice input, AI feedback via the proxy
│   ├── dashboard.js        # Progress dashboard
│   ├── history.js          # Assessment & interview history
│   ├── profile.js          # User profile
│   └── admin.js            # Admin panel (questions, resources, user activity)
├── sql/
│   └── prepnow-complete.sql    # Full schema, RLS policies, functions, and seed data
└── supabase/
    └── functions/
        └── openai-proxy/
            └── index.ts        # Edge Function — holds the OpenAI key, proxies requests
```

## Database

Everything lives in one idempotent script, `sql/prepnow-complete.sql` (safe to re-run). It creates:

- **11 tables** — `users`, `student_profile`, `login_history`, `questions`, `skills`, `assessments`, `assessment_skills`, `interview_attempts`, `training_plans`, `training_items`, `training_resources`.
- **Row Level Security on every table** — per-user policies (`auth.uid() = user_id`) so students only see their own data, plus admin policies via an `is_admin()` helper (`SECURITY DEFINER`, which avoids recursive policy lookups).
- **Functions & triggers** — a trigger that auto-creates a `users` row on Supabase Auth sign-up, and `get_random_questions(category, type, count)` for randomized question selection.
- **Seed data** — 180 questions across the assessment banks (60 technical + 60 soft) and the interview bank, the skills catalog, and 100+ curated training resources with links.

Users get the `student` role by default. To promote an admin, run in the Supabase SQL editor:

```sql
UPDATE users SET role = 'admin' WHERE email = 'the-admin@email.com';
```

## AI integration

`supabase/functions/openai-proxy/index.ts` is the only place the OpenAI key exists. It:

1. Answers CORS preflight requests.
2. Rejects callers whose JWT role is not `authenticated` (guests and anonymous requests get 401) — so strangers cannot spend the OpenAI balance.
3. Reads `OPENAI_API_KEY` from the function's secrets.
4. Builds the interview-coach prompt server-side (so the key cannot be repurposed for arbitrary OpenAI calls) and forwards the answer to the OpenAI Responses API.
5. Returns OpenAI's JSON response unchanged; failures are logged to the function's Logs tab.

## Getting started

The front end is plain static files — no build step, no package manager. The only server-side piece is the Edge Function.

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier is enough).
2. **Load the schema:** open the Supabase SQL editor and run the contents of `sql/prepnow-complete.sql`. This creates all tables, RLS policies, functions, and seed data.
3. **Set the front-end config:** in `js/config.js`, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` to your project's values (Project Settings → API). These are safe to commit — the anon key is public by design and constrained by RLS.
4. **Get an OpenAI key:** create an account at [platform.openai.com](https://platform.openai.com), add prepaid credit under Billing (the minimum is enough — `gpt-5.4-mini` is inexpensive), and create an API key.
5. **Deploy the OpenAI proxy:** in the Supabase dashboard go to **Edge Functions**, create a function named `openai-proxy`, paste in `supabase/functions/openai-proxy/index.ts`, and deploy. Then add a secret **`OPENAI_API_KEY`** set to your OpenAI key (Edge Functions → Secrets). Leave "Verify JWT" enabled. The key lives only here — never in the repo or the browser.
6. **Run locally** with any static server (must be HTTP, not `file://`):
   ```bash
   python -m http.server 8000
   ```
   Then open `http://localhost:8000`, register an account, and try the Voice Interview page.
7. **Publish (optional):** enable **GitHub Pages** (repo Settings → Pages → Deploy from branch → `main` / root) to serve the live site.

## Security model

- The **Supabase anon key** in `js/config.js` is intentionally public — it is meant to ship to the browser and is constrained by the Row Level Security policies in the schema. Students can only read and write their own rows; content tables (questions, resources) are read-only unless `is_admin()` passes.
- The **OpenAI API key** is never exposed to the browser or the repository: all OpenAI calls go through the `openai-proxy` Edge Function, which holds the key as a server-side secret and only serves signed-in users.
- **Admin access** is enforced in the database (RLS policies), not just hidden in the UI.

## Notes & limitations

This is an academic project, but it follows the same key-handling pattern a production app would use. Known limitations:

- Voice input depends on the Web Speech API, which works best in Chrome and Edge; other browsers fall back to text input.
- A public demo runs against a real Supabase project and a real OpenAI account, so usage is naturally bounded by those accounts' quotas and prepaid balance.
- Guest mode stores data only in the browser's localStorage; it is not synced to the database.

## License

Released for educational and portfolio purposes.
