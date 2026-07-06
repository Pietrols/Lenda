# Lenda — Build Session Report (July 4–6, 2026)

_Operated by Quantic Engineering Limited (Reg No. 120261048940)._

This document records everything built, fixed, and discovered during the
multi-day session that took the **Lenda mobile app** from an auth-only shell to
near-complete feature parity with the web app and backend, plus the security,
operations, and reliability work that followed.

- **Scope:** 88 commits on `main` (`48be83f` … `df96dbc`).
- **Primary deliverable:** the Expo/React Native mobile app (`apps/mobile`).
- **Secondary:** backend endpoint additions, a production incident recovery,
  a dependency-security pass, and a disaster-recovery (backup) system.

---

## 1. Project at a glance (end of session)

| Metric | Value |
|---|---|
| TypeScript (excl. deps/build) | ~39,000 lines |
| Mobile app | ~14,000 lines / 55 files |
| Web app | ~16,900 lines / 60 files |
| Auth service | ~3,700 lines / 39 files |
| Booking service | ~4,400 lines / 50 files |
| Shared packages | ~500 lines / 4 files |
| API endpoints | 87 |
| Prisma models | 19 |
| Migrations | 14 |
| Integration tests | 69 (auth 29, booking 40) — all green |

**Tech stack:** pnpm 10 + Turborepo monorepo. Mobile: Expo SDK 54, React Native
0.81.5, expo-router, zustand + expo-secure-store. Backend: Express + Prisma +
PostgreSQL, Redis (OTP/sessions), Cloudflare R2 (uploads). Web: React + Vite +
Tailwind. Deploy: GitHub Actions → SSH/rsync to a single server, PM2, nginx.

---

## 2. What was built — mobile app

The mobile app now covers essentially the entire web/backend feature surface.
Grouped by capability:

### Foundation & auth
- Route protection and hydration guard; auth-aware home; tab scaffold.
- Auth-server-backed refresh of the current user on focus (keeps `kycStatus`,
  roles current without re-login).
- Session-expired notice on forced logout; resend cooldown on email
  verification; profile "about" footer (version + operator attribution).

### Marketplace — guest side
- **Browse:** listing grid, pillar filters, text search (debounced),
  location + min/max price filters, availability date filter (excludes
  already-booked listings), category chips, infinite scroll, skeletons.
- **Listing detail:** image gallery with page dots, host card (→ public
  profile), reviews + rating summary, share action, favorite (heart) toggle.
- **Booking creation:** date pickers, pickup type, live price calc, price-lock,
  negotiable-offer inputs, all known error cases mapped.
- **Bookings list/detail:** status timeline, role segments (All/guest/host),
  infinite scroll.

### Booking lifecycle (full state machine)
- Host confirm / decline (with reason).
- Status progression per pillar (RENTAL handover path vs SERVICE direct).
- **Handover dual-confirm** (pickup → ACTIVE, return → COMPLETED), reading the
  handovers array and driving the auto-transitions.
- Party cancellation (with reason); dispute raising (freezes for admin review).
- **Reviews:** leave a rating+comment on a completed booking; display on
  listing detail and public profiles.
- **Negotiation:** turn-based counter/accept panel with counter budget,
  2-hour window, and offer state.
- **Per-booking chat** between guest and host (5-second polling).

### Host side
- Role upgrade GUEST → HOST (with the mandatory token-refresh gotcha handled).
- KYC document upload (4 doc types, camera-for-selfie / gallery-for-docs).
- My Listings; Create Listing (with pricing-mode selector and
  suggest-a-category); Edit / Delete listing; listing image upload/delete.
- Float & earnings screen (setup, balance, withdraw, history).
- Subscription screen (status, upgrade, cancel).

### Identity, engagement & compliance
- Profile editing + profile photo upload; public profile screen (badges,
  portfolio, reviews).
- **Favorites:** heart toggle + count, dedicated Saved Listings screen.
- **Notifications tab** with unread badge, foreground push handling + tap
  routing, app-icon badge sync, device-token registration + logout cleanup.
- **Transaction history** (terminal bookings + float transactions + withdrawals,
  merged chronologically).
- In-app Terms & Privacy (public routes), registration consent checkbox,
  mobile-specific privacy addendum kept in sync with shipped features.

### App-wide resilience
- Shared `ErrorState` (retry) rolled out to ~10 screens; skeleton loaders;
  global `ErrorBoundary`; API-client request timeout; featured carousel on home.

---

## 3. What was built — backend

- **`GET /listings/mine`** already existed; added **`GET /likes/me/listings`**
  (my liked listings, for the Saved screen).
- No other new endpoints were required — the mobile work surfaced a large
  amount of **already-built-but-unused** backend surface (messaging, likes,
  negotiation, handovers, float, subscriptions, categories).

---

## 4. Incidents resolved

### 4.1 Android "stuck on Terms of Service" (`8c4d4e1`)
**Symptom:** on Android, cold start landed on Terms with a dead back button
(`GO_BACK` unhandled).
**Root cause:** the ungated `terms`/`privacy` screens were declared *before* the
`Stack.Protected` groups, so for a signed-out user (no persisted session) the
router's first-available fallback was `terms`, not `login`. iOS masked it via a
persisted session.
**Fix:** declare ungated screens *after* guarded groups; add
`router.canGoBack()` fallback on the legal back buttons.
**Rule learned:** in expo-router, ungated screens must come after guarded groups.

### 4.2 Sign-in "could not reach server" + expo-notifications crash (`602dcd7`)
- **Network:** `.env` hard-coded a stale LAN IP; the phone loaded the bundle
  fine (Metro URL from the QR) but API calls hit a dead IP. **Fix:** derive the
  dev API host from Metro's `hostUri`. The old "keep `.env` IP in sync" chore is
  now obsolete.
- **expo-notifications:** SDK 53+ removed remote push from **Expo Go on
  Android**, and merely importing the module logs a hard error. **Fix:**
  lazy-load it and no-op the whole push layer in that environment.

### 4.3 Password reset locked users out (`c1debbd`)
Entering the emailed reset OTP proves address ownership, yet `resetPassword`
left `emailVerified` false — so an unverified user stayed locked out after
proving ownership. **Fix:** a successful reset now also verifies the email.

### 4.4 Email case-sensitivity → duplicate accounts (`1c46bcd`)
Lookups were exact-string, so `Peter@x.com` and `peter@x.com` were two
accounts. **Fix:** normalize (trim + lowercase) at every entry point —
register, verify, resend, login, forgot, reset — plus a data migration to
lowercase existing rows.

### 4.5 Production deploy failure recovery (`d93e8b4`)
The email-normalization migration **failed in production** on a case-duplicate
of `kabambapeter24@gmail.com` and left a failed record in `_prisma_migrations`
(which blocks all future `migrate deploy`).
**Fix (two parts):**
1. The migration was rewritten to **quarantine** duplicates instead of failing:
   within each case group it keeps one account on the real address (verified
   first, then oldest) and renames the rest to `<email>.duplicate-<id8>`,
   preserving all their data for a deliberate manual merge/delete.
2. `deploy.yml` gained a **one-time idempotent** `migrate resolve --rolled-back`
   before `migrate deploy`, so the failed record clears on the next push.

> ⚠️ **Follow-up:** after the next green deploy, (a) remove the one-time
> `migrate resolve` line from `deploy.yml`, and (b) check prod for the
> quarantined account and decide its fate:
> `SELECT email, "emailVerified", "createdAt" FROM users WHERE email LIKE '%.duplicate-%';`

---

## 5. Security & operations pass (July 6)

### 5.1 Dependency vulnerabilities (`06c86f8`) — 52 → 24
All **production-runtime** findings fixed. Highlights:

| Package | Issue | Action |
|---|---|---|
| path-to-regexp | Express ReDoS (in request path of both services) | override → 0.1.13 |
| multer | upload DoS (KYC/photo endpoints) | → 2.2.0 |
| react-router-dom | 4 highs incl. RCE-class (web) | → 7.15.1 |
| uuid, aws-sdk chain | buffer bounds / XML | bumped |
| vite, postcss, vitest, turbo | dev + web | bumped |

The remaining **24 are dev-toolchain only** (Expo/Metro CLI, Prisma CLI config
loader, vitest) — they never reach the server or shipped bundles. They were
**deliberately not** force-overridden, because breaking Metro to silence
dev-only advisories is a bad trade; they clear with the next Expo SDK / Prisma
upgrade. Verified: full rebuild, 69/69 tests, live KYC upload to R2.

### 5.2 Auth hardening (`fae68a1`)
Added a **strict 30-request / 15-minute per-IP limiter** to all eight
credential/OTP endpoints (login, register, verify-email, resend ×2, phone OTP
×2, forgot/reset). The app-wide 1000/15min limiter stops floods, not 6-digit
OTP brute force or credential stuffing. Skipped under `NODE_ENV=test`. Booking
service also got an explicit JSON body limit + production log format.

**Baseline that was already good:** helmet, CORS allowlist, `trust proxy`, OTP
attempt caps, 15m/7d rotating JWTs, upload size limits + file filters, no stack
traces in prod, no real `.env` in git.

### 5.3 Nightly database backups (`df96dbc`) — closes the biggest risk
Before this, **there were no backups** — a disk failure would lose every user,
booking, and financial record.

- `deploy/backup-db.sh`: `pg_dump | gzip` → uploaded to a `backups/` prefix in
  R2 (reusing the auth service's aws-sdk + credentials), with **14-day**
  retention pruning.
- `deploy/install-backup-cron.sh`: idempotently installs a 03:00 UTC daily cron.
- **Verified end-to-end** against the dev DB and real R2 (dump = 20 tables /
  20 data blocks, gzip integrity checked, upload + prune exercised).

> ⚠️ **Two manual steps to activate:**
> 1. Create the `lenda-backups` bucket in the Cloudflare R2 dashboard.
> 2. On the server, once: `bash ~/lenda/deploy/install-backup-cron.sh`.
>
> Then schedule a **restore drill** within the week — a backup you have never
> restored is a hope, not a backup.

---

## 6. Findings & recommendations (prioritized)

### P0 — Backups ✅ (done this session; activate per §5.3)

### P1 — Observability (not yet done)
You currently learn about outages from users. Add, in order:
- External uptime monitor on both `/health` endpoints (UptimeRobot / Better
  Stack free tier).
- Error aggregation (Sentry or similar) in both services + web.
- `pm2 install pm2-logrotate` so logs don't fill the disk.

### P2 — Query efficiency (fix when volume grows)
- **Availability search:** `buildListingWhere` fetches *every* booking
  overlapping a date range across *all* listings, then `NOT IN`s the IDs. Fine
  at hundreds; a seq-scan problem at tens of thousands. Restructure to a
  `NOT EXISTS` correlated subquery and add `@@index([startDate, endDate])` on
  bookings. (The existing GiST exclusion constraint is for write-correctness,
  not this read path.)
- `getReviewsForListing` does a two-step booking-ID fetch that could be one
  join.

### P3 — Scale path (only as load demands, in order)
1. **PM2 cluster mode** (`instances: "max"`) — first free 4–8× on API
   throughput; both services look stateless (Redis holds OTP/sessions).
   **Prerequisite:** move the rate-limiters to a **Redis-backed store** so
   limits are shared across processes (they're per-process memory today).
2. **Cloudflare** in front of nginx — CDN for the web bundle + free DDoS
   absorption.
3. **pgbouncer** — Prisma's pool multiplies per PM2 instance; add pooling when
   you go cluster.
4. Separate DB host — much later.

Note: the deploy pipeline (build-in-CI, atomic dist swap, health-check
rollback) is already strong. The missing piece for **zero-downtime deploys** is
running two PM2 instances so restarts overlap.

### P4 — Housekeeping
- Remove the one-time `migrate resolve` line from `deploy.yml` after the next
  green deploy (§4.5).
- Verify something actually invokes `expireNegotiations` (looks like it needs a
  scheduler/cron).
- Email normalization has no case-insensitive DB constraint — a `citext` column
  or unique functional index would enforce at the DB level what the app now
  enforces in code.

---

## 7. Product opportunities (not yet built)

Small, high-value gaps the backend already supports:
- **Portfolio management** (upload/delete own portfolio images —
  `POST/DELETE /profiles/me/portfolio` exist, unused).
- **Host's other listings** on the public profile
  (`GET /listings/host/:hostId`, unused).
- **Phone verification** UI (`/auth/send-phone-otp`, `/auth/verify-phone`
  exist; no mobile UI).
- **Conversations inbox** — one screen listing all booking chats with unread
  badges (natural follow-on to the new chat feature).
- **Light theme** — deferred deliberately; ~40 screens use static
  `StyleSheet.create`, so a proper implementation is a ThemeProvider refactor
  worth its own session.

Product-completeness items that live **outside** the mobile codebase:
- **Push sending** — the backend only *stores* device tokens; nothing sends
  notifications. The mobile client half (registration, foreground display, tap
  routing) is done and waiting.
- **Subscription payments** — upgrade is currently a free plan-flip; no payment
  step exists yet.
- **Categories seeding** — the chips/suggest UI is live but the table is empty;
  verify slug-vs-name matching when seeding.
- **App-store readiness** — EAS project setup (real push tokens need a
  projectId), production icons/splash, bundle identifiers, store listings.

---

## 8. Verified backend contracts worth remembering

These were confirmed live during the session and repeatedly contradicted
intuition — keep them handy:

- **KYC upload is a direct multipart POST** (`document` + `docType`), *not* a
  signed-URL flow. Signed URLs appear only on download.
- **Admin KYC rejection resets `kycStatus` to PENDING** (not REJECTED), strips
  the HOST role, and deletes all docs; the reason goes to a notification only.
  So `PATCH /me/kyc/resubmit` (requires REJECTED) is unreachable via the normal
  admin flow.
- **Creating a listing needs BOTH `kycStatus=APPROVED` AND `listingTier>=1`**
  (the approve endpoint sets both; hand-editing one gives "listing limit of 0").
- **`POST /listings` creates status ACTIVE** immediately (not DRAFT);
  `metadata` is required.
- **`GET /listings?hostId=` is ignored** — use `GET /listings/mine`.
- **Refresh response's user object is incomplete** (missing
  fullName/photoUrl/bio/location) — take only `.tokens` from it.
- **Booking status auto-transitions** on the second handover confirm
  (PICKUP → ACTIVE, RETURN → COMPLETED); SERVICE pillar skips handover.
- **Device-token endpoint is `POST /auth/device-tokens`** (note the `/auth`
  prefix).

---

## 9. Local dev gotchas

- **Redis** is on port **6380** with a password (from
  `services/auth-service/.env`), *not* the 6379 container from another project.
- **OTP codes** are console-logged in dev (not emailed); retrievable from the
  Redis key `otp:email:<email>`.
- **`tsx watch` does not reliably pick up automated file edits** — `touch` the
  edited file (or `src/index.ts`) after backend changes and verify behavior
  live before trusting auto-reload.
- Editing an already-applied migration in dev requires deleting its
  `_prisma_migrations` row and re-running `migrate deploy`.
- The server `.env` contains secrets that break shell `source`-ing — extract
  keys with `grep`, never `source`.
- `"request timed out"` in Expo Go = the phone can't reach Metro
  (network / AP-isolation), not a code error — test `http://<mac-ip>:8081/status`
  from the phone browser.

---

## 10. Immediate action checklist

- [ ] Push the pending commits (also heals the failed prod migration — §4.5).
- [ ] Create the `lenda-backups` R2 bucket and run
      `install-backup-cron.sh` on the server (§5.3).
- [ ] Run a first backup + a restore drill.
- [ ] After the next green deploy: remove the one-time `migrate resolve` line
      and resolve the quarantined `%.duplicate-%` account (§4.5).
- [ ] Add uptime monitoring + Sentry (§P1).
- [ ] Device-test pass over the mobile features built this session (most are
      built + backend-verified, but not yet exercised on a physical device).
