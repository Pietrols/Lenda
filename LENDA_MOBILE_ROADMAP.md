# Lenda Mobile — Feature Roadmap

_A marathon, not a race. Each phase is a complete, testable capability — verify before moving to the next. No phase starts until the previous one is confirmed working with real data, not just "the code compiled."_

---

## How to Read This Document

Every phase below has the same five parts:

- **What it is** — the plain-language description of the capability
- **Why it matters** — what it unblocks or fixes, and why it's sequenced where it is
- **Backend work** — what has to change or be built in `auth-service` / `booking-service`
- **Mobile work** — what has to change or be built in `apps/mobile`
- **Verification checklist** — the concrete, specific things to test before calling the phase done

Phases are ordered by **dependency and risk**, not by how exciting they are. A few deliberately unglamorous phases (backlog verification, the theme pivot, handover) come before the more interesting ones (reviews, chat) because later work depends on them being solid.

---

## Phase 0 — Close the Existing Backlog (do this first, no exceptions)

**What it is:** Before any new feature work, verify the four things that were built earlier this session but never actually tested: host booking confirm/decline, push notification token registration, the compliance screens (Terms/Privacy/consent), and the real KYC upload flow (not the Prisma Studio shortcut).

**Why it matters:** This is the single most important phase in the whole document. Building six more features on top of four unverified ones compounds risk — if something in the unverified backlog is actually broken, every phase built after it inherits that uncertainty silently. This is exactly the discipline the whole project has been built around: test immediately, don't stack unverified work.

**Backend work:** None — this is pure verification of what already exists.

**Mobile work:** None — same reason.

**Verification checklist:**
- [ ] Create a fresh PENDING booking, log in as the host, confirm the Confirm/Decline buttons appear and actually transition status
- [ ] Confirm they do NOT appear for the guest viewing the same booking
- [ ] On a physical device, confirm a push token is actually acquired and sent to `POST /device-tokens` — check the `DeviceToken` table in Prisma Studio for a new row
- [ ] Confirm `/terms` and `/privacy` render correctly and are reachable before login
- [ ] Confirm registration blocks submission with an unchecked consent box, with a clear inline message
- [ ] Go through the **real** KYC upload screen with a fresh test account — all four document types, confirm rows appear in `KycDocument`, confirm the reject → resubmit-all-four path works

---

## Phase 1 — The Light/Gold Theme Pivot

**What it is:** The full re-skin from dark theme to the approved light-background, gold-accent design system (Stage 3 output from Claude Design), applied across every existing screen.

**Why it matters:** This comes before new features, not after, because every new screen built from here on should be built directly in the new visual language — building new features in the old dark theme just means re-skinning them again later. It's also the phase that exposed how much the current app was missing (trust badges, price breakdowns, empty states) — several of the phases below exist *because* this pivot surfaced them.

**Backend work:** None.

**Mobile work:** Theme token pivot, component library restyle, per-screen restyle (Home/Browse, Listing Detail, Booking Flow, Bookings, Profile), new calendar-range date picker (native month-grid component, no incompatible animation library), full regression pass across the entire existing user journey.

**Verification checklist:**
- [ ] Every existing screen renders correctly in the new palette — no leftover dark-theme hardcoded colors anywhere
- [ ] The full existing user journey (register → browse → book → view booking → host confirm) still works exactly as before, just restyled
- [ ] New calendar-range date picker produces correct ISO dates reaching the API — confirm a real booking created with it lands correctly in the `Booking` table
- [ ] No functional regression anywhere — colors changed, behavior didn't

_(This phase already has a full Fable 5 prompt written and ready to run — see prior session notes.)_

---

## Phase 2 — Handover Dual-Confirm Flow

**What it is:** The pickup/return confirmation flow that lets a booking actually progress from CONFIRMED through ACTIVE to COMPLETED.

**Why it matters:** Right now every booking dead-ends at CONFIRMED. This is not a nice-to-have — it's the missing middle of the booking lifecycle. Nothing past this point (reviews, transaction history) can be meaningfully tested with real data until bookings can actually complete.

**Backend work:** None — `POST /bookings/:id/handover/confirm` already exists and is confirmed working.

**Mobile work:** Host status-progression buttons (EN_ROUTE → HANDED_OVER for RENTAL pillar), dual-confirm UI card on the booking detail screen, SERVICE-pillar bookings correctly skip the handover step entirely.

**Verification checklist:**
- [ ] A RENTAL booking can be moved by the host from CONFIRMED through EN_ROUTE, HANDED_OVER
- [ ] Both guest and host can independently confirm pickup; booking auto-advances to ACTIVE only once both have confirmed
- [ ] The same dual-confirm pattern works for the return leg, advancing to RETURNED
- [ ] A booking can be manually or naturally driven to COMPLETED for testing later phases
- [ ] A SERVICE-pillar booking skips handover entirely and follows PENDING → CONFIRMED → ACTIVE → COMPLETED with no dual-confirm UI shown

_(This phase also already has a full Fable 5 prompt written and ready to run.)_

---

## Phase 3 — Small, Contained Wins

**What it is:** Three genuinely small, low-risk additions bundled together because none of them touch shared architecture: Get Directions, Help & Safety static content, and delivery fee support.

**Why it matters:** These are real usability gaps but don't require new data models or new screens of significant complexity. Good to clear before the larger features below.

### 3a — Get Directions
**Backend work:** None.
**Mobile work:** `Linking.openURL` with a maps search query built from the listing's location string, platform-branched (Apple Maps on iOS, Google Maps on Android).
**Verification:** Tapping "Get directions" on a real booking opens the correct native maps app with the listing's location pre-filled.

### 3b — Help & Safety
**Backend work:** None.
**Mobile work:** A static content screen — safety tips, how disputes work, how to contact support. Content should be written once, reviewed for accuracy, not placeholder text.
**Verification:** Screen renders, content is accurate and genuinely useful, reachable from Profile.

### 3c — Delivery Fee
**Backend work:** New field on `Listing` (e.g. `deliveryFee`, nullable — hosts opt in) or a flat platform-wide delivery fee, your call on the product decision; `CreateBookingSchema` and the price-calculation logic in `booking.service.ts` need to account for it when `pickupType === "HOST_TO_CLIENT"`.
**Mobile work:** Delivery fee displayed correctly in the price breakdown, sourced from the real server-calculated total — never a client-side estimate (this was the explicit constraint from the theme-pivot prompt, now made real).
**Verification checklist:**
- [ ] A booking created with self-pickup has no delivery fee anywhere in the total
- [ ] A booking created with delivery correctly includes the fee, and the total in the `Booking` table matches what the app displayed before submission
- [ ] Existing bookings (created before this change) are unaffected

---

## Phase 4 — Reviews

**What it is:** Guests and hosts rate each other after a booking reaches COMPLETED. `CreateReviewSchema` already exists in `@lenda/schemas`.

**Why it matters:** This is the highest-priority remaining feature, full stop. Your own tier-progression design (tier 2 requires 10+ completed bookings and a 4.0+ rating, tier 3 requires 30+ bookings and 4.5+) is **structurally unreachable** without this — every host in the system is currently capped at tier 1 (2 listings) forever, regardless of how many bookings they complete. This phase directly unblocks host growth.

**Backend work:** Confirm what already exists vs. needs building — endpoints for creating a review (tied to a COMPLETED booking, one review per party per booking), fetching reviews for a listing/host, and the aggregation logic that actually updates `listingTier` when a host crosses a threshold. Verify live before building the mobile side, same discipline as every other phase.

**Mobile work:** A review-prompt after a booking reaches COMPLETED (don't force it, but make it easy — a card on the booking detail screen), a star-rating + comment submission form, reviews displayed on listing detail and/or host profile.

**Verification checklist:**
- [ ] A completed booking can be reviewed by both guest and host independently
- [ ] A review actually appears on the relevant listing/profile after submission
- [ ] Crossing the tier-2 threshold (10 bookings, 4.0 rating) actually bumps `listingTier` — test this concretely, don't assume the aggregation logic exists just because the tier table was designed
- [ ] A host cannot review themselves, cannot review a non-completed booking, cannot submit two reviews for the same booking

---

## Phase 5 — Saved Listings

**What it is:** Guests can bookmark listings to revisit later. A `Like` model already exists in the schema.

**Why it matters:** Straightforward engagement feature, contained scope, no architectural risk. Good candidate for a single focused session.

**Backend work:** Confirm whether like/save endpoints already exist (check `Like` model usage in existing routes) or need building — create, list, delete.

**Mobile work:** A save/unsave toggle (heart icon) on listing cards and the listing detail screen, a "Saved Listings" screen reachable from Profile.

**Verification checklist:**
- [ ] Saving a listing persists and appears in the Saved Listings screen
- [ ] Unsaving removes it
- [ ] The saved state is correctly reflected on the listing card/detail screen after navigating away and back (not just held in local component state)

---

## Phase 6 — Transaction History

**What it is:** A screen showing a user's full financial history on the platform — completed bookings, amounts, commission where relevant (for hosts).

**Why it matters:** Real user-facing need, and — worth being direct about this — you'll also want this yourself for basic bookkeeping and tax record-keeping as a business, per the taxation discussion earlier this session. Marketplace-model tax treatment still means Quantic should be able to produce clean records of commission earned.

**Backend work:** Likely a new aggregation endpoint — a user's bookings filtered/summarized by date range and status, plus commission data from `CommissionLedger` for hosts. Check what's already queryable via existing endpoints before assuming a new one is needed.

**Mobile work:** A list screen, filterable by date range, showing completed transactions with amounts. For hosts, a running total of commission paid.

**Verification checklist:**
- [ ] A completed booking appears correctly in transaction history with the right amount
- [ ] Host commission figures match what's actually in `CommissionLedger` for the same booking
- [ ] Date-range filtering returns correct, complete results

---

## Phase 7 — Message Host (Real Chat)

**What it is:** Real in-app messaging between guest and host tied to a booking. The `BookingMessage` model exists in the schema but has zero working API or UI anywhere in the app right now.

**Why it matters:** This is a genuinely large feature, not a footnote — it needs its own dedicated session, not a slot in a bigger prompt. Real-time or near-real-time delivery, read receipts, and a proper chat UI are meaningfully more engineering than anything else in this document except the theme pivot.

**Backend work:** Endpoints to send a message, list a conversation's messages, mark as read. A decision on delivery mechanism — polling on an interval is the simpler, lower-risk starting point; WebSockets are a real upgrade for later, not a requirement for a first working version.

**Mobile work:** A chat screen tied to a booking, message list, composer, unread indicators on the Bookings list.

**Verification checklist:**
- [ ] A message sent by the guest appears for the host (and vice versa) within a reasonable time
- [ ] Messages persist correctly and are scoped to the right booking — no cross-booking leakage
- [ ] Unread state is accurate and clears correctly when a conversation is opened

---

## Phase 8 — Negotiation Flow

**What it is:** The counter-offer system already partially modeled in the schema (`isNegotiable`, `budgetMin`, `budgetMax`, `currentOffer`, `hostCounterCount`, `guestCounterCount`, `negotiationExpiresAt`) but with zero UI anywhere.

**Why it matters:** Real functionality sitting entirely unused. Lower urgency than the phases above since it's a refinement of the booking flow rather than a new capability users are blocked without — bookings work fine at a fixed price today.

**Backend work:** Verify what transition logic already exists for negotiation state (counter-offer submission, acceptance, expiry) versus what needs building.

**Mobile work:** A negotiation UI on listing detail or booking creation — propose a budget range, see counter-offers, accept/reject/counter again.

**Verification checklist:**
- [ ] A guest can submit a negotiable booking request with a budget range
- [ ] A host can counter, and the guest sees the counter and can accept or counter again
- [ ] `negotiationExpiresAt` is actually enforced — an expired negotiation cannot be accepted

---

## BLOCKED — Payment Methods (do not build without a legal decision first)

**What it is:** Linking a real payment method (Airtel/MTN Mobile Money) for guests to pay and hosts to receive payouts.

**Why this is different from everything above:** This is not an engineering sequencing question — it's a regulatory one. The moment Lenda holds or moves user money, even briefly, even just linking an account for payouts, is the trigger that pulls the platform into Bank of Zambia financial-services licensing under the 2026 Banking and Financial Services Act. Your own project notes already deliberately deferred this exact feature for this exact reason.

**What needs to happen before this phase can be scheduled at all:**
1. A conversation with a Zambian fintech lawyer about whether Lenda's specific payment model (float, escrow, commission deduction) triggers licensing requirements
2. Possibly an application to the Bank of Zambia regulatory sandbox, which is designed for exactly this kind of P2P platform testing
3. A conscious decision — made by you, not defaulted into by a late-night feature-catchup prompt — about whether to proceed

**Until that happens, this phase does not get scheduled, prompted, or built, even as a UI shell.**

---

## Suggested Sequencing Summary

```
Phase 0  — Verify existing backlog                    [do first, always]
Phase 1  — Theme pivot                                 [foundation for everything after]
Phase 2  — Handover dual-confirm                        [unblocks booking completion]
Phase 3  — Small wins (directions, help, delivery fee)  [low risk, quick]
Phase 4  — Reviews                                      [unblocks tier progression — high priority]
Phase 5  — Saved listings                                [contained, straightforward]
Phase 6  — Transaction history                           [contained, real business need too]
Phase 7  — Message host (real chat)                      [large, deserves its own session]
Phase 8  — Negotiation flow                              [refinement, lower urgency]
BLOCKED  — Payment methods                                [legal decision required first]
```

Each phase should end with a commit, a real device test, and an honest note on what's verified versus what still needs a second look — the same discipline that's carried this project from an empty repo to a working marketplace app in one extended session. Slow and verified beats fast and assumed.
