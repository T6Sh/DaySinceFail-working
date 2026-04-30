# DaysSinceFail — Build Plan

A "days since" tracker styled like a factory safety sign, but modern minimal. Users sign up, create counters for their bad habits, hit a big "I failed" reset button, and (optionally) make their counter public so the world can shame or cheer them.

## What gets built

### Pages
- **/** — Landing page. Pitch, sample counter animation, CTA to sign up. Shows a teaser of the global leaderboard.
- **/auth** — Email/password + Google sign-in (single page, toggle between sign in / sign up).
- **/dashboard** — Logged-in user's counters. Grid of cards. "+ New counter" button.
- **/counter/:id** — Full-screen counter view. Big LED-style day count, reset button (owner only), history log, reactions, milestones earned. Public if opted in; otherwise owner-only.
- **/u/:username** — Public profile showing that user's public counters.
- **/leaderboard** — Global ranking of longest active streaks across all public counters, filterable by category.
- **/reset-password** — Required for password reset flow.

### Counter features
- **Reset button** — owner taps "I failed today", optionally adds a note. Resets `started_at` to now, logs the previous streak length to history.
- **Current streak** — days since `started_at`.
- **Best streak** — max streak ever recorded for this counter.
- **Milestones** — auto-awarded badges at 1, 7, 30, 100, 365 days. Shown as a row of unlockable chips on the counter page; locked ones are greyed.
- **Reactions** — any logged-in user viewing a public counter can tap 🔥 (cheer) or 💀 (shame). One of each per user per counter, toggleable. Counts shown on card.
- **History log** — list of past resets: date + streak length reached + optional note. Visible to anyone who can see the counter.
- **Category** — short tag like "fitness", "diet", "productivity" — used for leaderboard filtering.
- **Public toggle** — per counter; default private.

### Dashboard (private, /dashboard)
- Grid of the user's counters, each card showing title, current streak (big number), best streak (small), public/private indicator, reaction totals.

### Leaderboard (public, /leaderboard)
- Sorted by current streak desc, public counters only.
- Category filter pills + search by title.
- Each row: rank, counter title, owner username, current streak, best streak, reactions.

## Visual design (modern minimal)
- Light theme with optional dark, neutral surfaces, one bold accent color for the streak number.
- Rounded cards with soft shadows, generous whitespace, Inter for body, a tabular-nums display font for the big day count.
- Subtle animation when the counter ticks up; a brief confetti + toast when a milestone is hit; a dramatic "0" flip animation when the user resets.
- All colors driven by semantic tokens in `index.css` + `tailwind.config.ts` (no hardcoded colors in components).

## Technical details

### Backend (Lovable Cloud / Supabase)
Auth: email/password + Google OAuth, plus password reset page.

Schema:
- `profiles` — `id` (FK auth.users), `username` (unique), `display_name`, `avatar_url`, `created_at`. Auto-created via trigger on signup.
- `counters` — `id`, `owner_id`, `title`, `category`, `description`, `started_at`, `best_streak_days`, `is_public` (default false), `created_at`.
- `counter_resets` — `id`, `counter_id`, `reset_at`, `streak_days` (length reached), `note`.
- `counter_reactions` — `id`, `counter_id`, `user_id`, `kind` ('cheer'|'shame'), unique(counter_id, user_id, kind).
- `milestones` — derived/computed from current streak; no table needed (or optionally a `counter_milestones` cache).

RLS:
- `profiles` — anyone can read; users can update only their own.
- `counters` — readable if `is_public=true` OR `owner_id = auth.uid()`; insert/update/delete only by owner.
- `counter_resets` — readable when parent counter is readable; insert only by counter owner. A trigger updates `counters.best_streak_days` and resets `started_at` atomically.
- `counter_reactions` — readable when parent counter is public; insert/delete only by the reacting user; only on public counters.
- Roles stored in a separate `user_roles` table per security policy (used later for moderation; not exposed in MVP UI).

Computed views/RPCs:
- `leaderboard` — view selecting public counters with current streak (`extract(day from now() - started_at)`), joined to `profiles`, with reaction counts.

### Frontend
- React Router routes added in `App.tsx`; `/dashboard`, `/counter/:id` (when private), `/u/:username` (own edit affordances) wrapped in an auth guard.
- Auth: `onAuthStateChange` listener set up before `getSession()`; session stored in a context.
- Data fetching via `@tanstack/react-query`; mutations for reset, react, toggle public.
- Reusable components: `CounterCard`, `BigDayDisplay`, `ResetButton` (with confirm dialog + optional note), `MilestoneRow`, `ReactionBar`, `HistoryList`, `LeaderboardTable`, `CategoryFilter`, `AuthForm`, `ProtectedRoute`.
- Design tokens added to `index.css` (HSL): neutral background/foreground, accent for streak digits, success/warn for milestone states.

### Out of scope for v1
- Comments, follows, notifications, mobile push, weekly email digests, admin moderation UI (roles table seeded but unused in UI).

## Build order
1. Cloud + auth (email/password + Google) + profiles table + `/auth` + `/reset-password` + auth context + protected routes.
2. Counters schema + RLS + reset trigger; `/dashboard` with create/list/edit/delete.
3. `/counter/:id` page: big display, reset flow, history log, milestone row.
4. Public visibility toggle + `/u/:username` public profile.
5. Reactions table + reaction bar on public counters.
6. `/leaderboard` page with category filter.
7. Landing page polish + design pass + milestone animations.
