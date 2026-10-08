# Focus Farmer

A Next.js app built from the `with-supabase` starter. Focus sessions earn coins after REAP; coins buy penguins through the egg gacha.

## Set up

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql), then [`supabase/job_applications.sql`](supabase/job_applications.sql), in its SQL Editor.
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from **Project Settings → API**. Never put a service role key in this file.
3. In **Authentication → URL Configuration**, set the site URL to `http://localhost:3000` for local use and add `http://localhost:3000/auth/confirm` as a redirect URL. Add equivalent production URLs when deploying.
4. In **Authentication → Email Templates → Confirm signup**, use a confirmation link with the token hash callback:

   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email"
     >Confirm your email</a
   >
   ```

   Keep email confirmation enabled. The app asks new users to verify their email before logging in.

5. Run `npm install` and `npm run dev`.

Job application tracking also needs the Supabase **service role key** configured as the server-only `SUPABASE_SERVICE_ROLE_KEY` environment variable in your local runtime and deployment host. Keep it out of client-prefixed variables and source control. Server routes use it only after validating the user's Supabase session.

The app can show its title screen without Supabase credentials, but authentication and saved progress require steps 1–4. The original art and music are in `assets/`; copies in `public/assets/` are served by Next.js.

## Data and timers

- `progress` stores one balance and lifetime completed session count per auth user. `pets` stores every hatch, including duplicates. `focus_sessions` stores start/end times, settings, and the claimed reward.
- All tables use row level security with read access limited to the signed-in owner. The database functions `start_focus`, `reap_focus`, and `pull_egg` perform writes as transactions. `reap_focus` locks the session row so the same harvest cannot award twice. `pull_egg` deducts 10 coins only when the user has enough.
- Focus timers resume after refresh from their database end time. The timer display mode affects only the displayed clock. Expiry does not grant coins until REAP is pressed.
- Break timers resume after refresh from a per-user local storage end time. Outfit, music settings, and walkthrough completion are also saved per user in local storage. Back to Focus cancels a break.
- The page shifts to an animated pastel background after the first completed harvest.
- Job postings are fetched and checked server-side for reachable HTML and common job listing signals. If a site returns 403, the checker can accept a URL only when its path clearly identifies a specific role (for example, `/jobs/<id>/software-engineer-intern-2027-usa`). This is a heuristic: some sites block automated requests, while a non-job page can occasionally contain enough matching text. Marking a verified job as applied records the current UTC date; meeting the saved daily goal awards 10 coins per goal job once per UTC day. Cancelling today's goal deducts its potential reward only when the balance can cover the full fee; otherwise cancellation is free. It clears the saved goal and makes that day's reward unavailable. The user can set up another goal afterward.

## Checks

Use Node.js 22 or newer; the locked Supabase dependencies require it.

`npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` validate the app. Live auth and database flows require a configured Supabase project.

## Development

The game is organized under `features/farm/`, with separate screen components,
state orchestration, database access, browser storage, and audio lifecycle hooks.
See [the architecture guide](docs/architecture.md) for module responsibilities,
function contracts, persistence rules, and a manual smoke-test workflow.
