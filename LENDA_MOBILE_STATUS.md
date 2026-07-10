# Lenda Mobile App — Status & Tracking

_Last updated: overnight session, July 4-7, 2026_

Tracked per **Feature-Complete Progressive Learning**: each item below is either a fully verified end-to-end capability, or explicitly flagged as unverified/not started. No item is marked done unless it has been tested, not just written.

**Companion document:** see `LENDA_MOBILE_ROADMAP.md` for the phased plan covering everything from here forward — this file is the "where we are," the roadmap is the "what's next, in what order, and why."

---

## Design Direction — Important Context for Everything Below

A full design pass was run through Claude Design (wireframe → visual direction → full system) and **approved**: direction **1B — Warm/Textured**, a pivot from the app's current dark theme to a light, off-white background with a confident gold used as a supplementary accent (not a dominant color). Exact palette, component library (buttons, inputs, status badges, chips, tab bar), and all five core screens plus empty states were designed and signed off.

**Critically: this is an approved design, not yet a built reality.** Every screen listed as "✅ Verified" below is verified against the **old dark theme** — the app running on your phone right now does not yet reflect the new design. A full theme-pivot prompt is written and ready to run (Phase 1 of the roadmap) but has not been executed. Do not confuse "verified working" with "verified in the final visual direction" — they are currently two different things.

---

## Foundation (fully verified, rock solid)

| Piece | Status | Notes |
|---|---|---|
| expo-router file-based routing | ✅ Verified | Metro resolver fix (`extraNodeModules`) required to unblock this |
| Theme system (colors, fonts, spacing) | ✅ Verified (old dark theme) | Token-based architecture confirmed sound — proven by how cleanly Phase 1 can swap every color from one file |
| API client (single-flight 401 refresh) | ✅ Verified | Ported from web, works against real backend |
| Auth store (zustand + SecureStore) | ✅ Verified | Async storage adapter, hydration guard |
| Route protection | ✅ Verified | `Stack.Protected` guards, tested cold-start + logout + re-login |

---

## Auth & Identity

| Capability | Status |
|---|---|
| Register → OTP verify → login → logout | ✅ Verified end-to-end on iOS |
| Forgot password / reset password | ⚠️ Screens built, never actually tested (only discovered OTP is console-logged, not emailed, in dev) |
| GUEST → HOST role upgrade | ✅ Verified, including the token-refresh gotcha |
| KYC document upload | ⚠️ Built against real endpoints, **never actually tested** — approval was faked via direct DB edit tonight |
| Mobile Terms/Privacy/consent | ⚠️ Built, not verified (routes may not even render yet — untested) |

---

## Marketplace — Guest Side

| Capability | Status |
|---|---|
| Browse listings + pillar filter | ✅ Verified |
| Listing detail screen | ✅ Verified |
| Booking creation (dates, pickup type, live price calc, price-lock) | ✅ Verified — confirmed correct row in `Booking` table |
| Bookings list + detail + status timeline | ✅ Verified |

---

## Marketplace — Host Side

| Capability | Status |
|---|---|
| My Listings screen | ✅ Verified |
| Create Listing | ✅ Verified — confirmed a real listing appeared in Browse search |
| Confirm / decline a PENDING booking | ⚠️ Built, never tested |
| Push notification token registration | ⚠️ Built, never tested (real endpoint confirmed to exist: `POST /device-tokens`) |

---

## Design System

| Capability | Status |
|---|---|
| Wireframe layout (Stage 1) | ✅ Approved |
| Visual direction (Stage 2 — 1B Warm/Textured chosen) | ✅ Approved |
| Full 5-screen system + component library + empty states (Stage 3) | ✅ Approved |
| Theme pivot implemented in the real app | ⛔ Not started — prompt written, ready to run (Roadmap Phase 1) |

---

## Not Yet Started

| Capability | Why it matters | Roadmap phase |
|---|---|---|
| **Handover dual-confirm** (pickup/return) | Without this, every booking dead-ends at CONFIRMED — it can never reach ACTIVE or COMPLETED. Prompt fully written, ready to run. | Phase 2 |
| Get directions, Help & Safety, delivery fee | Small, contained usability gaps exposed by the design pass | Phase 3 |
| **Reviews** | Blocks the tier-progression design — a host can never exceed tier 1 without completed-booking + rating data | Phase 4 |
| Saved listings | Engagement feature, `Like` model already exists | Phase 5 |
| Transaction history | User-facing need, also useful for Quantic's own bookkeeping | Phase 6 |
| Message host (real chat) | Large feature, `BookingMessage` model exists with zero working API/UI | Phase 7 |
| Negotiation flow | Schema fields exist (`isNegotiable`, `budgetMin/Max`, `currentOffer`, counter counts), zero UI | Phase 8 |
| **Payment methods** | **Blocked pending a legal decision** — this is what triggers Bank of Zambia financial-services licensing exposure. Do not build, even as a UI shell, without a conscious decision made first. | Blocked, see roadmap |

---

## The Honest Read

Per the Feature-Complete Progressive Learning standard — *"test immediately after each step to confirm it works"* — there is a real, named gap right now between "built" and "verified" on four items (Phase 0 in the roadmap), and the entire visual identity of the app is about to change (Phase 1). Both of these should be closed **before** any of Phases 2 onward begin, so that new feature work is built on a confirmed-solid, final-visual-direction foundation rather than layered onto uncertainty.

## Recommended Next Session Order

Matches the roadmap exactly:
1. **Phase 0** — verify the four unverified items (host confirm/decline, push tokens, compliance screens, real KYC upload)
2. **Phase 1** — run the theme pivot, full regression pass across the entire existing user journey
3. **Phase 2** — handover dual-confirm flow (prompt ready)
4. From there, follow the roadmap's phase order — Reviews (Phase 4) is the highest-priority *new* feature since it unblocks the tier system, even though smaller wins (Phase 3) are cheaper to clear first

---

## Backend Security & Operations Pass (separate session — see `docs/SESSION-REPORT-2026-07.md`)

A later session ran a security/reliability audit and shipped fixes directly. This work is **not mobile UI** — it's backend hardening and infra — but it materially changes what's safe to launch. Full detail lives in the committed report; the essentials:

| Area | What shipped | Verified how |
|---|---|---|
| Dependency vulnerabilities | 52 → 24 (remainder is dev-toolchain only, nothing that ships to users) | Full rebuild + 69/69 tests + a live KYC upload through the rebuilt multer/aws-sdk path |
| Auth brute-force protection | 30-req/15min per-IP limiter on all 8 credential/OTP endpoints | Live check: `RateLimit-Limit: 30` header confirmed on login |
| Nightly DB backups (P0 from the audit) | `pg_dump` → gzip → R2, 14-day retention pruning, idempotent cron installer | Real dump against dev DB, real upload to R2, prune pass exercised, object downloaded back and integrity-checked, test object cleaned up |
| Production deploy | A failed prod migration is fixed by the next push | Confirm this has actually been pushed — was time-sensitive as of the report |

**Outstanding manual steps to actually activate backups (code is done, activation is not):**
1. Create the `lenda-backups` bucket in the Cloudflare R2 dashboard.
2. On the server: `bash ~/lenda/deploy/install-backup-cron.sh` (one-time).
3. **Schedule a real restore drill within the week.** Download an object, `gunzip -c file | psql` into a scratch database, check row counts. An untested backup is a hope, not a backup — this has not been done yet.

**Standing recommendations from that audit, in priority order:**
1. ✅ Backups — done (pending activation above)
2. Uptime monitoring + Sentry — free tier, ~1 hour of work, turns "users tell you it's down" into "you knew first"
3. Availability-search query optimization — `NOT EXISTS` + a `@@index([startDate, endDate])` once booking volume grows
4. PM2 cluster mode — first real throughput lever; pair with a Redis-backed rate limiter store
5. Cloudflare CDN in front, pgbouncer later

This pass does not change any of the mobile capability tracking above — it's an orthogonal reliability layer under the same app. Both must be true before a real launch: the mobile app's user-facing capabilities verified end-to-end (tracked above), and the backend proven resilient (tracked here).

---

## Known Gotchas to Remember

- Run mobile dev from `apps/mobile` directory — never the repo root.
- Clear Metro cache after any native dependency install.
- `.env` LAN IP must match current `ipconfig getifaddr en0` — changes across networks/sessions.
- Redis for Lenda is on port **6380** (`lenda_redis`), not 6379 (`drivelink_redis` — a different project).
- `react-native-keyboard-controller` is permanently incompatible with this RN 0.81.5 / SDK 54 setup (reanimated 4.4.1 peer dep needs RN 0.83+). Use `KeyboardAvoidingView` + `ScrollView` instead — do not revisit this library.
- OTP emails are console-logged in local dev, never actually sent — check the `auth-service` terminal, not a real inbox.
- KYC approval requires **both** `kycStatus: APPROVED` **and** `listingTier >= 1` set together when hand-editing in Prisma Studio — the real admin-approval endpoint bumps both atomically; a manual edit only touches the one field you change.
- Android testing on a physical Samsung S22 Ultra failed once (untriaged) — iOS-only confirmed working so far. Revisit before assuming cross-platform parity.
- The approved design system introduces new price-breakdown line items (service fee, refundable deposit shown separately from the non-refundable total) — when implementing Phase 1, make sure these reconcile against real server-calculated values, not the mockup's illustrative numbers.
