# Code structure

`app/` owns Next.js routes and layouts. The home route renders the farm feature;
the separate `/auth/*` and `/protected` routes retain the Supabase starter flows.

`features/farm/` owns the game:

- `types.ts` describes session snapshots, pets, and screen state. Database column
  names intentionally remain in snake case so the mapping is explicit.
- `constants.ts` contains content and asset mappings, plus clock formatting.
- `repository.ts` loads saved state and wraps transactional database functions.
  Query errors propagate to the controller instead of silently producing an
  apparently empty farm. Its TypeScript assertions describe the SQL contract;
  they are not runtime validation of server responses.
- `storage.ts` handles user-scoped cosmetic preferences, break deadlines, and
  walkthrough completion. Missing, malformed, or blocked storage uses defaults.
- `use-farm.ts` coordinates state transitions and user actions. `activeUser`
  prevents an in-flight farm load from applying after logout. `busy` disables
  actions during requests; the egg animation also keeps controls disabled until
  reveal. Welcome and hatch timeouts are disposed on unmount and logout.
- `use-focus-music.ts` owns the audio lifecycle. Track changes preserve current
  mute and volume settings; leaving focus or reaching its deadline disposes audio.
- `components/` contains screen views, dialogs, and sprite primitives. Each view
  declares only the controller properties it consumes using `Pick`.

`lib/supabase/` contains browser, request, and server clients. Server clients must
be created per request, since their cookies belong to that request. The proxy
refreshes authentication cookies before protected routes render.

`components/ui/` and the remaining top-level components are shared primitives and
starter authentication/tutorial views. Keep game behavior in the farm feature.

## State and invariants

Supabase is authoritative for coin balances, hatch results, session deadlines,
and rewards. `supabase/schema.sql` grants read access through owner-scoped row
level security and performs writes through three database functions:

- `start_focus` serializes starts and returns an existing unclaimed session.
- `reap_focus` locks the session and claims it at most once. Early claims earn
  zero coins; completed claims increment the balance and completed session count.
- `pull_egg` deducts ten coins and inserts the pet in one transaction.

The browser's clock only displays elapsed or remaining time. Timer expiry does
not grant rewards; REAP does. Break deadlines are local browser timestamps.
Local preferences must never decide earned coins or authorize writes.

## Extending the app

Add database operations to the repository and handle their failures in the
controller. Add new screens as view components, with explicit props and callbacks.
Document units, null states, side effects, and ownership rules where they matter;
avoid comments that merely repeat a function's name.

When changing asset frame counts, update both the sprite dimensions and CSS
animation offsets. Pixel sprites and animated GIFs intentionally use native
image rendering; do not change their animation or sampling while reorganizing UI.

Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build` before
shipping changes. The automated tests cover timer formatting and resilient
preference storage. Auth, reward transactions, and persistence across refreshes
also need verification against a configured Supabase project.

For a manual smoke test: sign up and confirm your email, log in, start a short
focus session, refresh during it, reap once, start a break and refresh, hatch a
pet, inspect the collection, and log out. Verify that changing volume survives
the next track and that logout closes dialogs and stops delayed reveals.
