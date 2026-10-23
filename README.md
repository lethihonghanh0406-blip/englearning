# LearnLang

A language-learning web app for Vietnamese learners, covering **English** (TOEIC, IPA, vocabulary, movie practice) and **Chinese** (pinyin, shadowing, character writing, textbooks, HSK vocabulary).

It is a plain HTML + ES-module single-page app with no build step, backed by [Supabase](https://supabase.com) (auth, database, storage, edge functions) and deployed on [Vercel](https://vercel.com).

## Features

| Area | Routes | Notes |
| --- | --- | --- |
| TOEIC | `/toeic`, `/toeic/listening`, `/toeic/reading`, `/toeic/speaking`, `/toeic/writing`, `/toeic/vocabulary`, `/toeic-lr` | Practice by skill, full L&R tests |
| Tests & quizzes | `/test`, `/quiz` | Login required |
| English | `/english/ipa`, `/english/movies`, `/english/practice` | IPA sounds, learning from YouTube clips with transcripts |
| Effortless English | `/english/effortless` (+ `/lessons`, `/lesson/<slug>`, `/vocabulary`, `/practice`, `/progress`, `/notes`) | Story lessons with auto-pause Q&A, practice modes; progress kept in localStorage. Code in `pages/effortless/`, data in `effortless_lessons` |
| English vocab | `/english/vocab`, `/english/vocab/body`, `/english/vocab/camping`, `/english/vocab/vegetables` | Topic-based illustrated vocab |
| Chinese | `/chinese/pinyin`, `/chinese/shadowing`, `/chinese/writing`, `/chinese/books` | Pinyin, shadowing, stroke writing, textbook reader |
| Spaced repetition | `/vocab/review`, `/my-vocab` | SRS review and personal word lists (login required) |
| Other | `/blog`, `/pricing`, `/dashboard.html`, `/login.html` | Payments via bank transfer (SePay/Casso webhook) |

Routes are defined in [router.js](router.js).

## Project structure

```
index.html            Landing page + SPA shell (#home / #app)
router.js             Client-side router; maps paths to page modules
dashboard.html        Logged-in dashboard (separate page)
login.html            Google sign-in via Supabase OAuth
pages/                One module per route; each exports `(container, params) => void`
components/           Shared UI (navbar, vocab scanner)
assets/css/           Styles and shared scripts (app, dashboard, quiz)
supabase/client.js    Supabase client (loaded from jsDelivr ESM)
supabase/functions/   Supabase Edge Functions (payment-webhook)
utils/auth.js         requireAuth() guard used by protected routes
config/env.js         Public Supabase URL + anon key
api/                  Vercel Edge Functions
  transcript.js       YouTube captions (Supadata → InnerTube fallback, cached in Supabase)
  images.js           Image search proxy (Pixabay)
scripts/              One-off Node maintenance scripts (e.g. fill-vocab-levels.js)
test-*.html           Manual test/prototype pages
```

## Running locally

No install or build is needed — the app runs directly in the browser. Serve the folder with any static server that falls back to `index.html` for unknown paths, since the router uses real URL paths.

The simplest option that also runs the `api/` functions:

```bash
npm i -g vercel
vercel dev
```

A plain static server (e.g. `npx serve -s .`) works for the frontend, but `/api/*` endpoints won't be available.

## Adding a page

1. Create `pages/my-page.js` exporting a default function that renders into the container:
   ```js
   export default function myPage(app, params) {
     app.innerHTML = `<h1>Hello</h1>`
   }
   ```
2. Import it in [router.js](router.js) and add a route. Wrap it in `requireAuth(() => ...)` if it needs a logged-in user.
3. Link to it with `navigate('/my-page')`.

## Backend (Supabase)

Main tables used by the app:

- **Content:** `tests`, `question_groups`, `questions`, `question_vocab`, `lessons`, `movie_lessons`, `shadowing_lessons`, `speaking_tasks`, `speaking_sentences`, `speaking_vocab`, `pronunciation`, `chinese_vocab`
- **User data:** `profiles`, `user_tests`, `user_answers`, `user_vocab_srs`, `user_vocab_learned`, `chinese_srs`, `vocab_decks`, `vocab_deck_items`, `user_devices`, `progress`
- **Billing:** `payments`
- **Cache:** `youtube_cache` (transcripts)

Auth is Google OAuth through Supabase. Configure the allowed redirect URLs (`/dashboard.html` and your site origin) in the Supabase dashboard.

### Payment webhook

```bash
supabase functions deploy payment-webhook
```

Point the SePay/Casso webhook at `https://<project>.supabase.co/functions/v1/payment-webhook` and send the `x-webhook-token` header. The function matches transfer descriptions of the form `LEARNLANG <number>` to records in `payments`.

## Environment variables

| Variable | Where | Used by |
| --- | --- | --- |
| `SUPADATA_KEY` | Vercel | `api/transcript.js` |
| `PIXABAY_API_KEY` | Vercel | `api/images.js` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WEBHOOK_SECRET` | Supabase function secrets | `payment-webhook` |

The Supabase URL and **anon** key in `config/env.js` are public by design; access control relies on Row Level Security policies. Never put the service-role key in frontend code or in committed files.

## Deployment

Hosted on Vercel (`vercel --prod`, or automatically through Vercel's Git integration if enabled). [vercel.json](vercel.json) rewrites all non-asset paths to `index.html` so client-side routes work on refresh (`_redirects` provides the same for Netlify-style hosts).

## Scripts

```bash
node scripts/fill-vocab-levels.js [--all] [--dry-run]
```

Fills CEFR levels (A1–C2) on `question_vocab` rows. Requires a service-role key — read it from an environment variable rather than hard-coding it.
