# Paid Spins & Redeemable Prizes — FUTURE SPEC (NOT ACTIVE)

**Status: disabled. No code path accepts payment, wagers, deposits, tokens, or pays out anything of value.**
Resident Slots today is free-to-play: 10 free spins per UTC day, XP points only, no monetary value,
not redeemable. The Resident Jackpot is a fixed 1,000 XP award (points only).

## Why this is not live
Paid, chance-based spins with prizes of value are gambling in most jurisdictions. The New York
State Gaming Commission states online casino gaming, including sweepstakes-style casino models,
is unlawful in New York. Other US states and countries have their own rules.

## Hard prerequisites before any work begins
1. Jurisdiction-by-jurisdiction legal review and any required gaming licenses.
2. Age verification (18+/21+ as required) and KYC.
3. Geolocation/IP geo-fencing that blocks prohibited jurisdictions (including New York).
4. Provably fair RNG (commit–reveal server seed + client seed, published audits).
5. Licensed payment processing, AML controls, payout infrastructure, tax reporting.
6. Responsible-gaming tools: deposit/loss limits, self-exclusion, cool-offs, help resources.
7. Terms of service, odds disclosure, and complaint handling reviewed by counsel.

## If approved, intended shape (for planning only)
- Separate feature flag, default OFF, only toggleable by admins after compliance sign-off.
- Paid credits kept in a separate ledger from free XP; XP never convertible to value.
- Server-authoritative outcomes via the existing atomic spin routine, extended with seed hashes.
- Free-to-play mode remains unchanged and available everywhere.

## Current UI
Admins see a locked "Paid spins & redeemable prizes — DISABLED" card on `/app/slots`.
The button is disabled and wired to nothing.
