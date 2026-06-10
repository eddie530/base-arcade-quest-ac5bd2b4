# Production Smoke Test Checklist

Run through this end-to-end after every production deploy. Use a fresh
incognito window so cached sessions don't mask regressions. Record the
build/commit you tested against.

Prereqs:
- Production URL open in incognito
- A test account you can sign in as (email/password or Google)
- A second account (or willingness to wait 24h) to re-verify cooldowns

---

## 1. Login

- [ ] Visit `/` — landing page renders, no console errors
- [ ] Click **Sign in** → routed to `/auth`
- [ ] Sign in with email/password
  - [ ] Invalid password shows an inline error, no app crash
  - [ ] Valid credentials redirect into `/app/...` (protected area)
- [ ] Sign in with Google
  - [ ] OAuth popup/redirect completes
  - [ ] `state` param round-trips (no "invalid state" error in console)
  - [ ] Lands on authenticated route with profile loaded (username visible)
- [ ] Refresh the page while signed in — session persists, no redirect to `/auth`
- [ ] Sign out — redirected to `/auth`, back button does NOT restore protected view
- [ ] Network tab: no 401s on protected serverFn calls while signed in

## 2. Daily Bonus Claim

- [ ] Navigate to the daily bonus / claim screen
- [ ] **Claim** button is enabled on first visit of the day
- [ ] Click **Claim**
  - [ ] XP increments by the expected amount (UI + leaderboard)
  - [ ] `streak` increments by 1
  - [ ] `last_claim_at` updates to ~now (verify via profile UI)
  - [ ] Toast / success state appears
- [ ] Immediately click **Claim** again
  - [ ] Button is disabled OR server rejects with "already claimed today"
  - [ ] XP does NOT double-increment (verify on refresh)
- [ ] Refresh the page — claimed state persists, button still disabled

## 3. Lucky Spin Cooldown

- [ ] Navigate to `/app/spin`
- [ ] **Spin** button enabled on first visit
- [ ] Click **Spin**
  - [ ] Wheel animates, lands on a reward label
  - [ ] XP increments by the reward amount
  - [ ] `last_spin_at` updates
  - [ ] New row appears in spin history (own rows only — confirm RLS)
- [ ] Immediately click **Spin** again
  - [ ] Button shows cooldown timer (countdown to next allowed spin)
  - [ ] Server rejects a forced retry (check Network tab — 4xx, not 200)
  - [ ] No XP awarded on the rejected attempt
- [ ] Refresh — cooldown timer persists and counts down correctly

## 4. Coin Flip Cooldown

- [ ] Navigate to `/app/flip`
- [ ] Choose **Heads** or **Tails** — flip button enabled
- [ ] Click **Flip**
  - [ ] Result animation plays, `won` reflects guess vs result
  - [ ] XP increments only on a win (and matches configured reward)
  - [ ] `last_flip_at` updates
  - [ ] New row appears in flip history (own rows only)
- [ ] Immediately attempt a second flip
  - [ ] Cooldown timer shown, button disabled
  - [ ] Forced serverFn call rejected (Network tab — 4xx)
  - [ ] No XP awarded, no history row inserted
- [ ] Refresh — cooldown persists

## 5. Cross-Cutting Checks

- [ ] Leaderboard reflects the new XP totals within one refresh
- [ ] Admin wallet account sees admin-only UI; non-admin account does not
- [ ] No `Unauthorized`, `permission denied`, or `relation does not exist`
      errors in the browser console or server function logs during the run
- [ ] All four flows complete without a full-page error boundary

---

**Sign-off:** _tester / date / build SHA_