# SOLUTIONS.md — Lenda Codebase Code Review

---

## Problem 1 — Sidebar wipes after profile update

### Root Cause

There is a **response-shape mismatch** between what the backend returns and what the frontend expects when updating a profile.

**Backend** (`services/auth-service/src/controllers/profile.controller.ts`, line 18–19):
```ts
const user = await updateProfile(userId, req.body);
res.json({ user });   // ← wrapped: { user: AuthUser }
```

**Frontend** (`apps/web/src/pages/dashboard/DashboardProfile.tsx`, lines 80–84):
```ts
mutationFn: (data: ProfileForm) =>
  api.patch<AuthUser>("/profiles/me", data, accessToken, AUTH_URL),
//          ^^^^^^^^ typed as flat AuthUser, but response is { user: AuthUser }
onSuccess: (updated) => {
  updateUser(updated);   // ← passes the wrapper object as the user
```

The `updateUser` action in the store (`apps/web/src/store/auth.store.ts`, line 29):
```ts
updateUser: (user) => set((state) => ({ ...state, user })),
```

So the store's `user` becomes `{ user: { id, email, roles, ... } }` — an object with a `user` key nested inside it.

The sidebar then reads `user.roles` (which is `undefined` since the real roles are at `user.user.roles`) and `user.fullName` (also `undefined`), causing:
- `userRoles = user?.roles ?? []` → empty array → no nav items rendered
- Avatar fallback: `user?.fullName?.[0] ?? user?.email?.[0]?.toUpperCase() ?? "U"` → resolves to `"U"` because `user.fullName` and `user.email` are both `undefined` on the wrapper

### Files Involved

| File | Line(s) | Role |
|---|---|---|
| `services/auth-service/src/controllers/profile.controller.ts` | 18–19 | Wraps response in `{ user }` |
| `apps/web/src/pages/dashboard/DashboardProfile.tsx` | 80–84 | Types as `AuthUser`, not `{ user: AuthUser }` |
| `apps/web/src/store/auth.store.ts` | 29 | Blindly replaces `user` with whatever is passed |
| `apps/web/src/pages/dashboard/DashboardSidebar.tsx` | 85, 118 | Reads `user.roles` and `user.fullName` which become `undefined` |

**Secondary inconsistency**: The `getProfileMeHandler` (profile.controller.ts line 31–32) returns the user **flat** (`res.json(user)`), while `updateProfileHandler` and `addRoleHandler` return it **wrapped** (`res.json({ user })`). This inconsistency is also what makes `uploadPhoto`'s `onSuccess` correctly use `data.user.photoUrl` (line 107 of DashboardProfile.tsx) while `updateProfile`'s `onSuccess` incorrectly uses `updated` directly.

### Proposed Fix

**Option A (minimal — fix the frontend only):**

In `apps/web/src/pages/dashboard/DashboardProfile.tsx`, change the `updateProfile` mutation to unwrap correctly:

```diff
- mutationFn: (data: ProfileForm) =>
-   api.patch<AuthUser>("/profiles/me", data, accessToken, AUTH_URL),
- onSuccess: (updated) => {
-   updateUser(updated);
+ mutationFn: (data: ProfileForm) =>
+   api.patch<{ user: AuthUser }>("/profiles/me", data, accessToken, AUTH_URL),
+ onSuccess: (data) => {
+   updateUser(data.user);
```

**Option B (cleaner — standardize the backend):**

Make `updateProfileHandler` return a flat user (consistent with `getProfileMeHandler`):

```diff
// services/auth-service/src/controllers/profile.controller.ts
  const user = await updateProfile(userId, req.body);
- res.json({ user });
+ res.json(user);
```

Then update the frontend type back to `api.patch<AuthUser>`. This also fixes `addRoleHandler` if you apply the same normalization there.

**Option A is safer** since it doesn't touch the API contract that other clients may depend on.

### Risk Assessment

- **Option A**: Touching only the frontend mutation. No risk to the backend or other consumers. The `queryClient.invalidateQueries` that follows already re-fetches, so even if `updateUser` were wrong, the UI would self-correct on the next render. Low risk.
- **Option B**: Changes the backend response shape. Any other client (mobile app, admin tools, tests) calling `PATCH /profiles/me` that currently expects `{ user: ... }` would break. Audit all callers before applying. Medium risk.

---

## Problem 2 — Stale access token roles after role upgrade

### Root Cause

There are two distinct sub-issues:

#### Sub-issue 2a — Incomplete user object returned by login and token refresh

Both `login()` and `refreshTokens()` in `services/auth-service/src/services/auth.service.ts` return a user object that is **missing** `fullName`, `photoUrl`, `bio`, and `location`:

```ts
// auth.service.ts — login() lines 168–179, refreshTokens() lines 229–241
return {
  user: {
    id: user.id,
    email: user.email,
    phone: user.phone,
    roles: user.roles,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    kycStatus: user.kycStatus,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    // ← fullName, photoUrl, bio, location are all MISSING
  },
```

Compare this with `getMe()` (lines 280–298) which correctly selects all profile fields. The `AuthUser` type in the frontend (`apps/web/src/api/auth.ts`) declares `fullName`, `photoUrl`, `bio`, `location` as required fields, but the actual payload on login never populates them.

Effect: immediately after login, `user.fullName` in the store is `undefined`, so the sidebar shows the first letter of the user's email instead of their name. After a token auto-refresh via 401 (in `apps/web/src/api/client.ts` lines 45–48), if the code were ever changed to write `refreshData.user` to the store, those profile fields would be wiped.

#### Sub-issue 2b — Access token not refreshed after role upgrade (was fixed in recent commit)

The current code in `DashboardProfile.tsx` (lines 46–50) does this after `addRole`:
```ts
const refreshed = await authApi.refresh(tokens?.refreshToken ?? "");
setAuth({ ...user!, roles: data.user.roles }, refreshed.tokens);
```

This correctly:
1. Gets a new access token with the HOST role baked into the JWT
2. Merges roles from the `addRole` response with the rest of the existing stored user

However, there is a **latent correctness concern**: `authApi.refresh()` (`apps/web/src/api/auth.ts` line 72) returns `AuthResponse` which has a `user` field. That `user` field from the refresh response is missing `fullName`, `photoUrl`, `bio`, `location` (as shown in 2a). The current code ignores `refreshed.user` and uses the spread `{ ...user! }` instead, which is correct. But if a future developer changes this to `setAuth(refreshed.user, refreshed.tokens)`, profile fields will be silently wiped again.

### Files Involved

| File | Line(s) | Role |
|---|---|---|
| `services/auth-service/src/services/auth.service.ts` | 168–179, 229–241 | login/refresh omit profile fields from user object |
| `services/auth-service/src/services/auth.service.ts` | 280–298 | `getMe()` correctly selects all fields — this is the model to follow |
| `apps/web/src/api/auth.ts` | 3–18 | `AuthUser` type includes `fullName`, `photoUrl` etc. — these are never populated from login |
| `apps/web/src/pages/dashboard/DashboardProfile.tsx` | 43–56 | Role upgrade flow — correct now but fragile |
| `apps/web/src/api/client.ts` | 45–48 | Auto-refresh preserves stored user, not refresh response user — currently correct |

### Proposed Fix

**Fix 2a — Add missing profile fields to login and refresh responses:**

In `services/auth-service/src/services/auth.service.ts`, update the Prisma query in both `login()` and `refreshTokens()` to fetch profile fields and include them in the returned user object:

```diff
// In both login() and refreshTokens(), update the prisma.user.findUnique call:
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },  // (or { email: data.email } in login)
+   select: {
+     id: true,
+     email: true,
+     phone: true,
+     roles: true,
+     emailVerified: true,
+     phoneVerified: true,
+     kycStatus: true,
+     isActive: true,
+     fullName: true,
+     photoUrl: true,
+     bio: true,
+     location: true,
+     createdAt: true,
+     updatedAt: true,
+   },
  });

// Then include them in the returned user:
  return {
    user: {
      ...
+     fullName: user.fullName,
+     photoUrl: user.photoUrl,
+     bio: user.bio,
+     location: user.location,
    },
    tokens: { ... },
  };
```

Alternatively, extract a shared `userSelect` constant and reuse it across `getMe()`, `login()`, and `refreshTokens()` to prevent future drift.

**Fix 2b — Make the role upgrade `setAuth` call resilient:**

Add a comment or type guard to make the intent explicit, and avoid relying on `refreshed.user`:

```ts
// The refresh response user is incomplete — always merge with existing store user
setAuth({ ...user!, roles: data.user.roles }, refreshed.tokens);
// Do NOT use refreshed.user here — it is missing fullName, photoUrl, bio, location
```

### Risk Assessment

- **Fix 2a**: Adding fields to the login/refresh response is purely additive. Existing frontend code that ignored these fields will now receive them. Low risk. The only concern is a slight performance increase from the larger DB SELECT — negligible.
- **Fix 2b**: Code comment only. Zero risk.
- If 2a is NOT fixed, the sidebar will work correctly (because the profile query independently fetches data), but any code path that relies solely on the auth store user for profile display will be incorrect until the profile query loads.

---

## Problem 3 — Navbar overlaps page content on mobile

### Root Cause

The navbar is `position: fixed` at `top: 0` with `h-16` (64px) in `apps/web/src/components/Navigation.tsx` (line 77):
```ts
className="fixed top-0 left-0 right-0 z-50 ..."
```

Most pages using `<Navigation />` add enough top padding on their first section to clear the navbar. However, two issues exist:

**Issue 3a — Scroll-anchor sections are not offset**

The `handleNavClick` function in `Navigation.tsx` (lines 51–70) uses `scrollIntoView({ behavior: "smooth" })` for section anchors (`#how-it-works`, `#host`). This scrolls the section to the top of the **viewport**, which places the section title directly behind the 64px navbar. On mobile this is especially noticeable because content is taller and sections fill more of the viewport height.

**Issue 3b — Auth pages vertically center content without navbar clearance**

Auth pages (Login, Register, VerifyEmail, ForgotPassword, ResetPassword) use:
```ts
className="min-h-screen dark-section flex items-center justify-center ..."
```

These pages do **not** render `<Navigation />`, so there is no fixed navbar to conflict with — this is not a bug. However, they do not include `py-16` or `pt-16` which means if the content is taller than the viewport (e.g., RegisterPage on a small phone), it may clip at the top because there is no top padding.

**Pages with adequate padding (no overlap issue):**
| Page | First-section top padding |
|---|---|
| `ListingsPage.tsx` (line 182) | `pt-28` (112px) ✓ |
| `ListingDetailPage.tsx` (line 231) | `pt-24` (96px) ✓ |
| `PartnerPage.tsx` (line 123) | `pt-32` (128px) ✓ |
| `JoinTeamPage.tsx` (line 162) | `pt-32` (128px) ✓ |

**Pages with potential issues:**
| Page | Issue |
|---|---|
| `LoginPage.tsx` | No top padding, full-screen centered — works only if no Navigation is rendered (currently safe) |
| `RegisterPage.tsx` | Only `py-12` — clipping on small screens with tall content |
| `VerifyEmailPage.tsx` | No top or bottom padding at all — clips on small screens |
| `HomePage.tsx` | Anchor sections use `scrollIntoView` without scroll-margin — navbar covers section headings |

### Files Involved

| File | Line | Issue |
|---|---|---|
| `apps/web/src/components/Navigation.tsx` | 65 | `scrollIntoView` without offset |
| `apps/web/src/pages/auth/RegisterPage.tsx` | 71 | `py-12` only — may clip on small screens |
| `apps/web/src/pages/auth/VerifyEmailPage.tsx` | 107 | No vertical padding at all |
| `apps/web/src/pages/HomePage.tsx` | (section anchors) | `scrollIntoView` scrolls section under fixed nav |

### Proposed Fix

**Fix 3a — Global scroll-margin for anchor targets:**

Add to `apps/web/src/index.css`:
```css
html {
  scroll-padding-top: 4rem; /* 64px — matches h-16 navbar */
}
```

Or apply `scroll-mt-16` to each anchored section element (`id="how-it-works"`, `id="host"`).

**Fix 3b — Add padding to auth pages:**

```diff
// VerifyEmailPage.tsx
- <div className="min-h-screen dark-section flex items-center justify-center relative overflow-hidden">
+ <div className="min-h-screen dark-section flex items-center justify-center relative overflow-hidden py-12">

// RegisterPage.tsx already has py-12 — safe
```

### Risk Assessment

- **Fix 3a**: CSS `scroll-padding-top` is purely additive. No visual change except anchor scroll targets land below the navbar. Very low risk.
- **Fix 3b**: Adding `py-12` to VerifyEmailPage adds vertical breathing room and prevents clipping. No visual regression on normal screens. Low risk.
- Do NOT add `pt-16` to auth pages while they don't render `<Navigation />` — if Navigation were added later, you'd want the padding, but today it would add unnecessary whitespace.

---

## Problem 4 — Dark mode inconsistency and light mode broken on Android

### Root Cause

There are two separate root causes.

#### Root Cause 4a — `enableSystem` causes Android to use OS preference, ignoring the toggle

In `apps/web/src/main.tsx` (line 23):
```tsx
<ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
```

`enableSystem={true}` makes `next-themes` respect the OS-level `prefers-color-scheme` media query. On Android, this means:
- If the device is in dark mode → the app stays dark regardless of the toggle
- If the device is in light mode → the app loads light even though `defaultTheme="dark"`
- The user's manual toggle is saved to `localStorage`, but `enableSystem` can override it on re-hydration depending on browser behavior

On Android Chrome specifically, `prefers-color-scheme` is tied to the system theme. The toggle in `ThemeToggle.tsx` (line 6: `setTheme(resolvedTheme === "dark" ? "light" : "dark")`) does update the theme in session, but after a reload, `enableSystem` can pull the system theme back, overriding the saved preference. This is why Android users see "only a slight shade difference" — the manual toggle appears to work but reverts.

#### Root Cause 4b — `light-section` and associated utilities don't respond to the dark theme

In `apps/web/src/index.css`, the `--lenda-light` CSS variable is defined **identically** in both `:root` and `.dark`:
```css
:root {
  --lenda-light: 220 20% 97%;   /* near-white */
}
.dark {
  --lenda-light: 220 20% 97%;   /* same near-white — never changes */
}
```

The utility class `light-section` uses this variable:
```css
.light-section {
  background-color: hsl(var(--lenda-light));   /* always near-white */
  @apply text-foreground;
}
```

In **dark mode**, `text-foreground` resolves to `hsl(220 20% 97%)` — nearly **white**. So `light-section` in dark mode renders **white text on a white/near-white background** → invisible text.

The classes `section-heading-light` and `section-body-light` apply `text-foreground` and `text-foreground/60` respectively. In dark mode, these are white/near-white on the near-white `light-section` background.

**Pages affected:**
- `apps/web/src/pages/HomePage.tsx` (lines 154, 293) — `section-heading-light` in `bg-background` sections (less severe since `bg-background` is dark in dark mode, but heading text is still intended for light backgrounds)
- `apps/web/src/pages/PartnerPage.tsx` (lines 145–234) — multiple `light-section` sections with `section-heading-light` and `section-body-light`
- `apps/web/src/pages/JoinTeamPage.tsx` (lines 184–278) — same pattern

The `dark-section` class is intentionally always dark (`background-color: hsl(var(--lenda-dark))`) — that is by design. But `light-section` should adapt to the current theme.

### Files Involved

| File | Line(s) | Role |
|---|---|---|
| `apps/web/src/main.tsx` | 23 | `enableSystem` causes OS override on Android |
| `apps/web/src/index.css` | 29, 55 | `--lenda-light` is identical in `:root` and `.dark` |
| `apps/web/src/index.css` | 110–113 | `.light-section` uses `--lenda-light` — doesn't adapt to dark mode |
| `apps/web/src/index.css` | 158–168 | `section-heading-light`, `section-body-light` — white text in dark mode |
| `apps/web/src/pages/HomePage.tsx` | 154, 293 | Uses `section-heading-light` |
| `apps/web/src/pages/PartnerPage.tsx` | 145–234 | Uses `light-section`, `section-heading-light`, `section-body-light` |
| `apps/web/src/pages/JoinTeamPage.tsx` | 184–278 | Same |

### Proposed Fix

**Fix 4a — Disable `enableSystem` to let the user's toggle be authoritative:**

```diff
// apps/web/src/main.tsx
- <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
+ <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
```

This makes the app always default to dark on first visit, and respects the user's manual toggle persistently via `localStorage`. If OS-level theme following is a desired feature, it should be implemented with an explicit "follow system" option in settings rather than silently overriding the toggle.

**Fix 4b — Make `light-section` dark-mode aware:**

Option A — Add a `.dark` override in `index.css`:
```diff
  .light-section {
    background-color: hsl(var(--lenda-light));
    @apply text-foreground;
  }

+ .dark .light-section {
+   background-color: hsl(var(--background));
+   @apply text-foreground;
+ }
```

Option B — Replace `.light-section` with `bg-background` (the Tailwind CSS variable already adapts to theme):
```diff
// In PartnerPage.tsx, JoinTeamPage.tsx, etc.
- <section className="flowing-section light-section">
+ <section className="flowing-section bg-background">
```

And update `section-heading-light` and `section-body-light` to use adaptive colors rather than `text-foreground` when placed on light backgrounds:

Option C — In `index.css`, rename to make intent explicit, and add dark mode overrides:
```css
.section-heading-light {
  @apply text-section-title text-4xl md:text-5xl text-foreground;
}
/* text-foreground is already adaptive — no change needed here.
   The bug is the background, not the text class itself. Fix the background. */
```

The cleanest fix is **Option B**: replace explicit `light-section` class with `bg-background` on the section and `container` elements. `bg-background` already adapts correctly — dark in dark mode, light in light mode. This removes the need for the non-adaptive `--lenda-light` variable entirely on these sections.

### Risk Assessment

- **Fix 4a**: Removing `enableSystem` will break theme following for users who expect the app to match their OS preference. Users who had `enableSystem` respect their dark system and see a dark app may now see "always dark" initially. Since `defaultTheme="dark"` remains, this is an acceptable trade-off for Android compatibility. Medium risk (intentional UX change).
- **Fix 4b Option A**: Adding `.dark .light-section` is additive. Existing light-mode appearance is unchanged. Dark-mode appearance improves. Low risk.
- **Fix 4b Option B**: Replacing `light-section` with `bg-background` — functional equivalent but removes the `--lenda-light` background. If `--background` in light mode differs from `--lenda-light`, section backgrounds will change slightly in light mode. Both are near-white (`220 20% 97%` vs potentially different `--background` light value). In `index.css`, `:root --background: 220 20% 97%` — **same value** as `--lenda-light`. So there is no visual difference in light mode. Low risk.
- **Fix 4b Option C**: No-op for the heading utilities — the real fix is the background. Correctly identifies that the `text-foreground` classes are not wrong; the wrong element is the white background in dark mode. Low risk.

---

## Batch 2

---

## Problem 5 — KYC flow not implemented

### Root Cause

The DB schema has a `kycStatus` field on `User` (enum: `PENDING`, `APPROVED`, `REJECTED`) but **no KYC documents table**. There is nowhere to store uploaded NRC scans, proof-of-residence files, or the required selfie photo. The entire KYC flow is a status flag with no supporting document infrastructure.

The admin backend can already change the status (via `approveKyc` / `rejectKyc` in `admin.service.ts`) and the admin UI has "Approve KYC" / "Reject KYC" buttons — but admins are approving blind: they cannot see any submitted documents because none are stored.

The listing creation gate already enforces KYC (`listing.service.ts` line 25: `if (host.kycStatus !== "APPROVED") throw new AppError(403, ...)`), so the enforcement side is in place. Only the submission pipeline is missing.

### Files and Functions Involved

| File | Line(s) | Relevant detail |
|---|---|---|
| `packages/database/prisma/schema.prisma` | 18–22, 103–142 | `KycStatus` enum exists; no `KycDocument` model |
| `services/auth-service/src/routes/profile.routes.ts` | entire file | No KYC upload route |
| `services/auth-service/src/services/profile.service.ts` | entire file | No KYC upload function |
| `services/auth-service/src/lib/upload.ts` | 1–22 | Multer, memory storage, 10 MB limit, **image only** — PDFs not allowed |
| `services/auth-service/src/lib/supabase.ts` | 1–7 | Supabase client exists and is used for profile photos |
| `services/auth-service/src/services/admin.service.ts` | 4–71 | `approveKyc` / `rejectKyc` exist; notification logic for KYC_APPROVED / KYC_REJECTED already wired |
| `services/booking-service/src/services/listing.service.ts` | 25–27 | Listing creation blocked unless `kycStatus === "APPROVED"` |
| `apps/web/src/pages/dashboard/DashboardProfile.tsx` | entire file | No KYC document upload section |
| `apps/web/src/pages/admin/AdminUserDetail.tsx` | 448–463 | Approve/Reject buttons exist but no document viewer |

### What Is Missing

**Backend:**
1. A `KycDocument` Prisma model (requires DB migration) to store: `userId`, `type` (enum: `NRC_FRONT`, `NRC_BACK`, `PROOF_OF_RESIDENCE`, `SELFIE`), `url`, `uploadedAt`.
2. A `POST /profiles/me/kyc/:docType` endpoint (or a single endpoint accepting type in the body) using the existing `upload` multer middleware, uploading to Supabase bucket `kyc-documents` (a new bucket with private ACL).
3. PDF support added to `upload.ts` file filter (NRC / proof of residence may be PDF scans).
4. A `GET /admin/users/:id/kyc-documents` endpoint so admins can retrieve the document URLs for review.
5. A status transition guard: KYC status should only be changeable from PENDING → APPROVED or PENDING/APPROVED → REJECTED, not backwards without documented reason.

**Frontend:**
1. A KYC upload section in `DashboardProfile.tsx` (visible only to HOSTs with `kycStatus !== "APPROVED"`), showing upload slots for each document type with status indicators.
2. A "pending approval" state shown after all documents are uploaded.
3. An admin document viewer in `AdminUserDetail.tsx` (image previews + PDF links) placed between the profile header and the action buttons.

### Proposed Approach

**Step 1 — Add Prisma model (new migration required):**
```prisma
enum KycDocType {
  NRC_FRONT
  NRC_BACK
  PROOF_OF_RESIDENCE
  SELFIE
}

model KycDocument {
  id         String     @id @default(uuid())
  userId     String
  user       User       @relation(fields: [userId], references: [id])
  type       KycDocType
  url        String
  uploadedAt DateTime   @default(now())

  @@unique([userId, type])   // one doc per type per user
  @@map("kyc_documents")
}
```
And add `kycDocuments KycDocument[]` relation on `User`.

**Step 2 — Add upload endpoint in profile.routes.ts:**
```ts
router.post(
  "/me/kyc",
  authenticate,
  upload.single("document"),
  uploadKycDocumentHandler,
);
```

**Step 3 — Upload handler using Supabase (mirrors uploadProfilePhoto pattern):**
```ts
export async function uploadKycDocument(userId: string, docType: string, file: Express.Multer.File) {
  const path = `${userId}/${docType.toLowerCase()}.${ext}`;
  const { error } = await supabase.storage.from("kyc-documents").upload(path, buffer, { upsert: true });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("kyc-documents").getPublicUrl(path); // or signed URL for privacy
  await prisma.kycDocument.upsert({
    where: { userId_type: { userId, type: docType as KycDocType } },
    create: { userId, type: docType as KycDocType, url: data.publicUrl },
    update: { url: data.publicUrl, uploadedAt: new Date() },
  });
}
```

**Step 4 — Frontend upload UI in DashboardProfile:**
For each of the 4 document types, show an upload button with a tick/pending indicator. After all 4 are uploaded, show a "Submitted — pending admin review" banner.

**Step 5 — Admin document viewer:**
In `AdminUserDetail.tsx`, fetch `GET /admin/users/:id/kyc-documents` and render thumbnails/links for each document type next to the approve/reject buttons.

### Dependencies

- Depends on **Problem 7** (host onboarding restructure) for the correct UI placement.
- Depends on **Problem 8** (admin KYC approval) — the admin viewer needs to surface documents.
- Must be completed before **Problem 7 Step 5** (KYC pending state) can be shown.

### Risk Assessment

- **DB migration**: Adding a new table is non-destructive. Running `prisma migrate` in production requires a maintenance window to be safe, but the migration itself has no risk of data loss.
- **Supabase bucket**: If the bucket is set to public, KYC document URLs would be guessable. Use signed URLs or private bucket with server-side presigned URL generation.
- **Upload file type expansion** (adding PDF to `upload.ts`): Currently all upload routes (profile photo + listing images) share the same `upload` middleware. Adding PDF support would affect all routes. Create a separate `uploadDocuments` multer instance for the KYC route, leaving the existing `upload` image-only.
- **Overwriting documents**: The `@@unique([userId, type])` constraint + `upsert` means re-uploading replaces the previous document. If KYC was rejected and the user re-submits, the old rejected documents are lost. Consider adding a `replacedAt` audit trail or soft-deleting old records.

---

## Problem 6 — Role-aware dashboard

### Root Cause

The sidebar already performs role-based nav item filtering correctly (lines 87–89 of `DashboardSidebar.tsx`). The bug is that there is **no concept of an active role** — a user with both GUEST and HOST roles sees all nav items for both roles simultaneously, with no way to switch between a "guest view" and a "host view". The dashboard content (Home, profile stats) is uniform regardless of which role the user is currently acting as.

Additionally, KYC status is not considered in what HOST features are accessible — a user could have the HOST role but be KYC PENDING. The sidebar shows "My Listings" and "Subscription" to them even though `createListing` will reject their attempts with a 403.

### Files and Functions Involved

| File | Line(s) | Relevant detail |
|---|---|---|
| `apps/web/src/store/auth.store.ts` | entire | No `activeRole` field in state |
| `apps/web/src/pages/dashboard/DashboardPage.tsx` | 35–38 | Reads `user` from store, passes directly to sidebar — no role-toggle state |
| `apps/web/src/pages/dashboard/DashboardSidebar.tsx` | 85–89 | Filters nav items based on ALL user roles (not an active role) |
| `apps/web/src/pages/dashboard/DashboardHome.tsx` | 75, 145–161 | `isHost` check shows conditional stat cards but no active-role awareness |

### What Is Missing

1. **Active role state**: A `activeRole: 'GUEST' | 'HOST'` field in the auth store (or local state in `DashboardPage`) defaulting to the highest-privilege role the user holds.
2. **Role toggle UI**: A visual switcher in the sidebar or top bar showing "Acting as: GUEST / HOST" for dual-role users.
3. **Sidebar respects active role**: `visibleNavItems` should filter by `activeRole`, not all roles.
4. **KYC gate in sidebar**: HOST nav items (My Listings, Subscription, Float) should be hidden or shown as locked if `user.kycStatus !== "APPROVED"`.
5. **Host-specific home content**: Earnings summary card, incoming booking requests panel, listing quick-stats — none exist today.

### Proposed Approach

**Active role in the auth store (or local state):**

The simplest approach is a local state variable in `DashboardPage` to avoid persisting role toggle to localStorage (the role context is session-specific):

```tsx
// DashboardPage.tsx
const [activeRole, setActiveRole] = useState<'GUEST' | 'HOST'>(() =>
  user?.roles.includes('HOST') ? 'HOST' : 'GUEST'
);
```

Pass `activeRole` and `setActiveRole` into `DashboardSidebar` and child pages.

**Role toggle UI in the sidebar (DashboardSidebar.tsx):**

```tsx
// Show only if user has both roles
{userRoles.includes('GUEST') && userRoles.includes('HOST') && (
  <div className="px-4 py-3 border-b border-white/10">
    <div className="flex rounded-lg overflow-hidden border border-white/10">
      {(['GUEST', 'HOST'] as const).map((role) => (
        <button
          key={role}
          onClick={() => onRoleChange(role)}
          className={cn(
            "flex-1 text-xs font-semibold py-1.5 transition-colors",
            activeRole === role
              ? "bg-gold text-lenda-dark"
              : "text-white/40 hover:text-white",
          )}
        >
          {role}
        </button>
      ))}
    </div>
  </div>
)}
```

**Filter sidebar nav by active role AND KYC status:**

```ts
const visibleNavItems = navItems.filter((item) => {
  if (!item.roles.includes(activeRole)) return false;
  // HOST-only items require KYC approval
  if (item.roles.every(r => r === 'HOST') && user.kycStatus !== 'APPROVED') {
    return false; // or show as locked: { ...item, locked: true }
  }
  return true;
});
```

**Host dashboard home additions:**

In `DashboardHome.tsx`, when `activeRole === 'HOST'`, show additional panels: query for host's listings, show earnings summary from float account, show pending booking requests addressed to this host.

### Dependencies

- Soft dependency on **Problem 5** (KYC flow) — the KYC gate in the sidebar is only meaningful once KYC submission exists.
- Soft dependency on **Problem 7** (host onboarding) — the role toggle should only appear once KYC is approved; this links to the pending state UI.

### Risk Assessment

- Changing `visibleNavItems` logic is low risk — worst case is a nav item disappearing for a user who should see it. Can be guarded with a feature flag or gradual rollout.
- Using local component state for `activeRole` (vs store) means role toggle resets on page reload. Acceptable for now; can persist to `sessionStorage` later if needed.
- Adding KYC gate to HOST nav items may confuse users who just upgraded. Needs clear messaging: "Complete KYC to unlock" rather than silently hiding items.

---

## Problem 7 — Host onboarding restructure

### Root Cause

The current "Become a Host" flow is a single button inside `DashboardProfile.tsx` that directly calls `addRole("HOST")`. There is no multi-step process, no host type selection, no profile field collection, no KYC submission step, and no pending state. The flow terminates immediately with the HOST role being granted — before any verification.

Deeper issues:
1. The `User` model has **no field to store host type** (RENTAL vs SERVICE). The `Pillar` enum exists but is only on `Listing`. There is no `metadata` or `hostType` on `User`.
2. The multi-step form doesn't exist at all in the frontend.
3. Role upgrade currently grants HOST unconditionally — the correct flow should not add the HOST role yet; it should initiate KYC submission and let admin approval trigger the role grant (or make the role conditional on KYC approval).

### Files and Functions Involved

| File | Line(s) | Relevant detail |
|---|---|---|
| `packages/database/prisma/schema.prisma` | 103–142 | `User` has no `hostType` field; no `metadata` on User |
| `services/auth-service/src/services/profile.service.ts` | 142–174 | `addRole` immediately grants the role to the user |
| `services/auth-service/src/controllers/profile.controller.ts` | 95–108 | `addRoleHandler` — no multi-step logic |
| `apps/web/src/pages/dashboard/DashboardProfile.tsx` | 43–56 | Single-button upgrade flow, immediately calls `addRole` |
| `apps/web/src/pages/dashboard/DashboardHome.tsx` | 248–268 | "Become a Host" CTA links to `/dashboard/profile?upgrade=host` |
| `apps/web/src/components/Navigation.tsx` | 55–58 | Authenticated "Become a Host" nav click goes to `/dashboard/profile?upgrade=host` |

### What Is Missing

**DB:**
1. A `hostType` field on `User` — e.g. `hostType Pillar?` (nullable, null = not a host, set during onboarding).
2. Optionally a `kycSubmittedAt DateTime?` field to track when submission happened (for admin SLA tracking).

**Backend:**
1. A `POST /profiles/me/host-intent` endpoint (or extend `PATCH /profiles/me`) to save `hostType` and other host-specific profile fields (bio, services description) without granting the HOST role yet.
2. Modify the KYC approval flow in `admin.service.ts` `approveKyc` to also add the HOST role if the user was in pending-host state.
3. Alternatively, keep `addRole` but gate it: only allow `addRole("HOST")` if the user has submitted KYC documents and an admin has approved.

**Frontend:**
1. A dedicated multi-step page or route: `/dashboard/become-a-host` with steps:
   - Step 1: Confirm intent
   - Step 2: Choose host type (RENTAL or SERVICE)
   - Step 3: Host profile fields (bio, skills/services description)
   - Step 4: KYC document upload (delegated to Problem 5 component)
   - Step 5: Submitted / pending review screen
2. Update all "Become a Host" entry points (`Navigation.tsx`, `DashboardHome.tsx`) to point to `/dashboard/become-a-host` instead of `/dashboard/profile?upgrade=host`.
3. Remove the upgrade card from `DashboardProfile.tsx` (replaced by the new page).

### Proposed Approach

**DB migration — add hostType to User:**
```prisma
model User {
  ...
  hostType         Pillar?      // null = not initiated, set during step 2
  kycSubmittedAt   DateTime?    // set when all KYC docs uploaded
  ...
}
```

**New route in `App.tsx`:**
```tsx
<Route
  path="/dashboard/become-a-host"
  element={
    <ProtectedRoute>
      <BecomeAHostPage />
    </ProtectedRoute>
  }
/>
```

**Multi-step component structure:**
```tsx
// apps/web/src/pages/dashboard/BecomeAHostPage.tsx
const STEPS = ['confirm', 'host-type', 'profile', 'kyc', 'pending'] as const;
type Step = typeof STEPS[number];

export default function BecomeAHostPage() {
  const [step, setStep] = useState<Step>('confirm');

  if (user?.roles.includes('HOST') && user.kycStatus === 'APPROVED') {
    return <Navigate to="/dashboard" replace />;  // already a host
  }

  if (user?.roles.includes('HOST') && user.kycStatus !== 'APPROVED') {
    return <PendingApprovalScreen />;  // submitted, waiting
  }

  return <StepRenderer step={step} onNext={...} />;
}
```

**Step 3 — host profile: use existing PATCH /profiles/me endpoint** (already accepts `bio`).

**Step 4 — KYC upload: reuse the KYC upload component from Problem 5**.

**Step 5 — Pending state:**
After all KYC docs uploaded, call a new `POST /profiles/me/host-intent` or a flag on the profile to mark submission. Show a persistent banner in the dashboard until KYC is APPROVED.

**Modify `addRole` gate on the backend:**
```ts
// profile.service.ts - addRole
// Only allow HOST role addition if kycSubmittedAt is set (docs uploaded)
// The HOST role should ultimately be granted by admin approval, not self-service
// OR: keep self-service addRole but block listing creation behind kycStatus (already done)
```

The cleanest approach given the existing code: keep `addRole("HOST")` as-is (role is self-granted) but make all meaningful HOST actions require `kycStatus === "APPROVED"`. The new onboarding flow becomes the required UI path before `addRole` is called.

### Dependencies

- Directly depends on **Problem 5** (KYC document upload infrastructure must exist for Step 4).
- After this is implemented, **Problem 6** role toggle should only appear once `kycStatus === "APPROVED"`.

### Risk Assessment

- **DB migration** adding nullable columns to `User` is safe and backward-compatible.
- **Removing the upgrade card from DashboardProfile**: Any user currently on `/dashboard/profile?upgrade=host` would lose the upgrade UI. Redirect that URL param to the new page to preserve backward compatibility.
- **Changing entry points** in Navigation.tsx and DashboardHome.tsx: Low risk — just URL target change.
- **Not changing the backend `addRole` semantics** (keeping self-service): Means hosts technically get the role without submitting KYC first if they call the API directly. This is acceptable because all HOST actions are gated on `kycStatus === "APPROVED"` at the backend level anyway.

---

## Problem 8 — Admin KYC approval and role assignment

### Root Cause

KYC approval and rejection already work end-to-end — the backend `admin.service.ts` has `approveKyc` and `rejectKyc`, the routes are wired in `admin.routes.ts`, and the admin UI in both `AdminUsers.tsx` and `AdminUserDetail.tsx` has the buttons. This part is **complete**.

What is genuinely missing:

1. **Role assignment**: There is no endpoint to add or remove roles from a user. Admins cannot promote a user to ADMIN, grant HOST to a user without them self-upgrading, or remove a role. The admin service has no `setRoles` or `addRole` function.
2. **Rejection reason input**: `rejectKyc` accepts a `reason` parameter but the frontend confirmation dialog does not include a text field for the reason. Rejections always go through without a reason.
3. **KYC document viewer**: As described in Problem 5, admins approve/reject blind — no document viewer in `AdminUserDetail.tsx`.
4. **Self-protection safeguard**: No guard preventing an admin from removing the ADMIN role from themselves or the last admin account.
5. **No audit trail**: `approveKyc` receives `adminId` but never writes it to any log. There is no record of which admin made a KYC decision.

### Files and Functions Involved

| File | Line(s) | Relevant detail |
|---|---|---|
| `services/auth-service/src/routes/admin.routes.ts` | entire | No role assignment route exists |
| `services/auth-service/src/services/admin.service.ts` | entire | No `setRoles` / `assignRole` function; `approveKyc` takes `adminId` but doesn't log it |
| `services/auth-service/src/controllers/admin.controller.ts` | entire | No role assignment handler |
| `apps/web/src/pages/admin/AdminUsers.tsx` | 159–177 | Reject dialog has no reason input |
| `apps/web/src/pages/admin/AdminUserDetail.tsx` | 301–308 | Same — reject dialog has no reason field |
| `apps/web/src/pages/admin/AdminUserDetail.tsx` | 390–445 | No role management section in the profile detail view |

### What Is Missing

**Backend:**
```
PATCH /admin/users/:id/roles   — set/update user roles
```
Required body: `{ roles: Role[] }` — set the complete roles array (safer than add/remove individually).

Service function shape:
```ts
export async function setUserRoles(userId: string, adminId: string, roles: Role[]) {
  if (userId === adminId && !roles.includes(Role.ADMIN)) {
    throw new AppError("Admins cannot remove their own ADMIN role", 400);
  }
  const adminCount = await prisma.user.count({
    where: { roles: { has: Role.ADMIN }, deletedAt: null, isActive: true }
  });
  if (adminCount === 1 && !roles.includes(Role.ADMIN)) {
    // check if target user is the last admin
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { roles: true } });
    if (target?.roles.includes(Role.ADMIN as any)) {
      throw new AppError("Cannot remove the last admin account", 400);
    }
  }
  return prisma.user.update({
    where: { id: userId },
    data: { roles: roles as unknown as any[] },
    select: { id: true, email: true, roles: true },
  });
}
```

**Frontend additions:**
1. A "Manage Roles" section in `AdminUserDetail.tsx` — a multi-checkbox or pill toggle for GUEST / HOST / ADMIN roles, with a "Save Roles" button.
2. A rejection reason text input in both `AdminUsers.tsx` and `AdminUserDetail.tsx` reject confirmation dialogs.

**Rejection reason UI (AdminUsers.tsx and AdminUserDetail.tsx):**
The current `setConfirmState` approach with a static message needs to be extended to support a dynamic reason string. The simplest approach: add a `reason` field to `ConfirmState` that is editable within the confirm dialog.

### Proposed Approach

**Add route to admin.routes.ts:**
```ts
router.patch("/users/:id/roles", setUserRolesHandler);
```

**AdminUserDetail.tsx role management section:**
```tsx
{/* Role Management */}
<div className="glass-card p-5 border border-border">
  <h3 className="font-display font-bold text-sm uppercase tracking-tight text-foreground mb-3">
    Roles
  </h3>
  <div className="flex gap-2 flex-wrap">
    {(['GUEST', 'HOST', 'ADMIN'] as const).map((role) => (
      <button
        key={role}
        onClick={() => toggleRole(role)}
        className={cn(
          "px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors",
          user.roles.includes(role)
            ? "bg-gold/20 border-gold/50 text-gold"
            : "border-border text-foreground/40 hover:border-gold/30"
        )}
      >
        {role}
      </button>
    ))}
  </div>
  <Button variant="gold" size="sm" className="mt-3" onClick={saveRoles}>
    Save Roles
  </Button>
</div>
```

### Dependencies

- No hard dependencies. Can be implemented independently.
- The role assignment feature becomes more critical once **Problem 7** is implemented (admin grants HOST role post-KYC-review instead of self-service).

### Risk Assessment

- **Role assignment endpoint**: High impact if misused — an admin could accidentally grant ADMIN to a guest. Must require re-authentication or a 2-step confirmation ("type the email to confirm").
- **Self-removal safeguard**: Critical to implement before exposing the role management UI. Without it, an admin could lock everyone out.
- **Last-admin check**: The count query is not atomic — two admins could simultaneously try to demote each other. Use a DB transaction with `SELECT FOR UPDATE` or simply always keep at least 2 admin accounts as an operational policy.
- **Rejection reason**: Low risk — purely additive. The backend already accepts it; only the frontend is missing the input.

---

## Problem 9 — Service pricing modes

### Root Cause

The `Listing` model has a single `pricePerDay: Decimal @db.Decimal(10, 2)` field with no pricing mode concept. There is no `pricingMode` enum, no `pricePerHour`, and no support for negotiable pricing. The `CreateListingSchema` requires `pricePerDay` as a positive number, enforcing a daily-rate model even for listings with `pillar: "SERVICE"`.

The `Listing.metadata: Json @default("{}")` field exists and could theoretically store pricing mode as a workaround, but it is untyped, unindexed, and bypasses Zod validation — not a sustainable solution.

The `Booking` model stores `priceSnapshot: Decimal` and `totalAmount: Decimal` — both required and non-nullable. If pricing were NEGOTIABLE, there is no mechanism to negotiate a price and then create a booking with the agreed price.

### Files and Functions Involved

| File | Line(s) | Relevant detail |
|---|---|---|
| `packages/database/prisma/schema.prisma` | 144–169 | `pricePerDay` only; `metadata` JSON exists but untyped |
| `packages/schemas/src/index.ts` | 45–57, 84–95 | `CreateListingSchema` and `UpdateListingSchema` require/accept `pricePerDay` only |
| `services/booking-service/src/services/listing.service.ts` | 54–68 | `createListing` stores `pricePerDay` from input directly |
| `services/booking-service/src/controllers/listing.controller.ts` | 12–24 | `createListingHandler` passes body directly to service |
| `apps/web/src/pages/dashboard/DashboardListings.tsx` | 199–201 | Displays `{listing.currency} {listing.pricePerDay}/day` — always "/day" |

### What Is Missing

**DB (migration required):**
```prisma
enum PricingMode {
  DAILY      // existing behavior — pricePerDay is the rate
  HOURLY     // pricePerDay interpreted as pricePerHour (or add pricePerHour field)
  FIXED      // flat rate for the entire booking regardless of duration
  NEGOTIABLE // no locked price at creation; agreed price set at booking time
}
```

Add to `Listing`:
```prisma
pricingMode  PricingMode  @default(DAILY)
```

**Schema changes (packages/schemas/src/index.ts):**
```ts
export const CreateListingSchema = z.object({
  ...
  pricingMode: z.enum(['DAILY', 'HOURLY', 'FIXED', 'NEGOTIABLE']).default('DAILY'),
  pricePerDay: z.number().positive().optional(), // optional if NEGOTIABLE
  // validation: pricePerDay required unless pricingMode === 'NEGOTIABLE'
}).refine(
  (d) => d.pricingMode === 'NEGOTIABLE' || d.pricePerDay !== undefined,
  { message: 'Price is required for non-negotiable listings', path: ['pricePerDay'] }
);
```

**Booking schema for NEGOTIABLE:**

The `Booking.priceSnapshot` and `totalAmount` are required non-nullable decimals. For NEGOTIABLE listings, the booking flow would need to either:
- Option A: Require a proposed price in the booking request, which the host accepts/counters.
- Option B: Allow `priceSnapshot = 0` initially and update it after negotiation.
- Option C: Block bookings on NEGOTIABLE listings entirely until the host sends a custom quote.

Option A is the most practical for MVP: add an optional `proposedPrice` field to `CreateBookingSchema`, and validate that it is provided when the listing's `pricingMode === "NEGOTIABLE"`.

**Display change (DashboardListings.tsx):**
```tsx
// Replace hardcoded "/day"
const priceLabel = listing.pricingMode === 'NEGOTIABLE'
  ? 'Negotiable'
  : listing.pricingMode === 'HOURLY'
  ? `${listing.currency} ${listing.pricePerDay}/hr`
  : listing.pricingMode === 'FIXED'
  ? `${listing.currency} ${listing.pricePerDay} flat`
  : `${listing.currency} ${listing.pricePerDay}/day`;
```

### Dependencies

- **Problem 7 (host onboarding)**: The listing creation UI (not fully built yet) would need the pricing mode field from day one.
- **Booking service changes**: NEGOTIABLE pricing requires booking flow changes. This should be scoped after the core pricing modes (DAILY, HOURLY, FIXED) are working.

### Risk Assessment

- **DB migration**: Adding a non-nullable enum with a default (`DAILY`) is backward-compatible — existing listings get `DAILY` automatically. Low risk.
- **Schema change (`pricePerDay` becoming optional)**: The `Booking.priceSnapshot` field captures price at booking time. Existing bookings are unaffected. New bookings on NEGOTIABLE listings need careful handling to prevent zero-amount bookings.
- **NEGOTIABLE pricing complexity**: This mode is architecturally different from the others — it requires a negotiation sub-flow. Recommend implementing DAILY, HOURLY, FIXED first and treating NEGOTIABLE as a separate feature increment.
- **Frontend display**: The `/day` suffix in `DashboardListings.tsx` is hardcoded but the fix is trivial. Risk of missing display sites: also check `ListingsPage.tsx` and `ListingDetailPage.tsx` where price is displayed.

---

## Problem 10 — Redirect after login

### Root Cause

`ProtectedRoute.tsx` correctly passes the user's intended destination using React Router's `state` prop (line 25):
```ts
return <Navigate to="/login" state={{ from: location }} replace />;
```

`LoginPage.tsx` (line 42) **ignores** this state and always navigates to `/dashboard`:
```ts
onSuccess: (data) => {
  setAuth(data.user, data.tokens);
  navigate("/dashboard");  // ← from state is never read
},
```

The mechanism is 90% implemented — the destination is correctly stored, but the consuming side never reads it.

### Files and Functions Involved

| File | Line(s) | Role |
|---|---|---|
| `apps/web/src/components/ProtectedRoute.tsx` | 25 | Correctly stores `from: location` in navigate state — **working** |
| `apps/web/src/pages/auth/LoginPage.tsx` | 42 | Ignores `location.state.from`, always navigates to `/dashboard` — **the bug** |
| `apps/web/src/components/GuestRoute.tsx` | 7 | Redirects logged-in users to `/dashboard` (no `from` state needed here — this direction is correct) |

### What Is Missing

In `LoginPage.tsx`: read `useLocation()` and check for `state.from` after a successful login.

### Proposed Fix

```diff
// apps/web/src/pages/auth/LoginPage.tsx
+ import { useNavigate, useLocation } from "react-router-dom";

  export default function LoginPage() {
    const navigate = useNavigate();
+   const location = useLocation();
    const { setAuth } = useAuth();

    const { mutate: login, isPending } = useMutation({
      mutationFn: authApi.login,
      onSuccess: (data) => {
        setAuth(data.user, data.tokens);
        toast.success(...);
-       navigate("/dashboard");
+       const from = (location.state as { from?: Location })?.from?.pathname ?? "/dashboard";
+       navigate(from, { replace: true });
      },
```

The `replace: true` flag prevents the login page from remaining in the browser history (so the back button after login doesn't return to the login page).

**Type safety note**: `location.state` is typed as `unknown` in React Router v6. Cast it or guard it:
```ts
const from = location.state?.from?.pathname ?? "/dashboard";
```

**Security note**: The `from` path comes from the URL state set by the app's own router, not from user input or the URL query string — it cannot be used for open redirect attacks since it's only set by `ProtectedRoute` with the actual `location` object.

### Dependencies

None. This is a self-contained two-line fix.

### Risk Assessment

- **Very low risk.** The change only affects where the user lands after login — a better UX, no functionality change.
- **Edge case**: If a user navigates directly to `/login` (not via a redirect from a protected route), `location.state` will be `null` and `from` will be `undefined`, so the fallback `"/dashboard"` applies. This is the correct existing behavior.
- **Edge case**: If `from` points to a route that requires a role the user doesn't have (e.g., the user bookmarked `/admin` and then logged in as a non-admin), `AdminRoute` / `ProtectedRoute` will catch it and redirect to `/dashboard` as before. No new vulnerability introduced.
