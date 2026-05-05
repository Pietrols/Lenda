# Lenda

Zambia's peer-to-peer rental and services marketplace. Built as a TypeScript monorepo with a microservices architecture.

---

## Project Status

**Phase 1 - Backend: Complete**
**Phase 2 - Web App: In Progress**
**Phase 3 - Deployment: Live**

---

## Live

| Service  | URL                    |
| -------- | ---------------------- |
| Frontend | https://lenda.work     |
| API      | https://api.lenda.work |

---

## Architecture

### Monorepo Structure

```
lenda/
├── apps/
│   └── web/                     # React web app (Vite + TypeScript)
├── services/
│   ├── auth-service/            # Identity, auth, profiles, KYC, subscriptions (port 3001)
│   └── booking-service/         # Listings, bookings, reviews, likes, notifications (port 3002)
├── packages/
│   ├── @lenda/types             # Shared TypeScript interfaces and enums
│   ├── @lenda/schemas           # Shared Zod validation schemas
│   └── @lenda/database          # Unified Prisma schema and client
├── docker-compose.yml           # Redis for local development
├── package.json                 # Monorepo root
├── pnpm-workspace.yaml          # pnpm workspace config
├── turbo.json                   # Turborepo task config
└── tsconfig.base.json           # Shared TypeScript config
```

### Tech Stack

| Layer               | Technology                                         |
| ------------------- | -------------------------------------------------- |
| Language            | TypeScript 5.9                                     |
| Runtime             | Node.js 20                                         |
| Package Manager     | pnpm 10 (workspaces)                               |
| Build Orchestration | Turborepo                                          |
| Web Framework       | Express                                            |
| Database            | PostgreSQL 14                                      |
| Cache / Sessions    | Redis (Docker)                                     |
| ORM                 | Prisma 6                                           |
| Validation          | Zod                                                |
| Authentication      | JWT (access + refresh token rotation)              |
| Password Hashing    | bcryptjs (cost factor 12)                          |
| Email               | Resend (console logging in development)            |
| Profile Storage     | Supabase Storage                                   |
| KYC Storage         | Supabase Storage (private bucket)                  |
| Host Images         | Cloudflare R2 (planned)                            |
| Frontend            | React 18, Vite, Tailwind CSS, shadcn/ui, GSAP      |
| State Management    | Zustand (auth), TanStack Query (server state)      |
| AI Chatbot          | Groq (llama-3.3-70b-versatile)                     |
| Frontend Hosting    | Cloudflare Pages                                   |
| Backend Hosting     | Oracle Cloud Always Free (AMD micro, Ubuntu 22.04) |
| Web Server          | Nginx + PM2                                        |
| DNS                 | Cloudflare                                         |

---

## Roles

| Role    | Description                                              |
| ------- | -------------------------------------------------------- |
| `GUEST` | Browses listings, makes bookings, leaves reviews         |
| `HOST`  | Lists assets or services, manages bookings and handovers |
| `ADMIN` | Platform administration, KYC verification, moderation    |

---

## Pillars

| Pillar    | Description                                                  |
| --------- | ------------------------------------------------------------ |
| `RENTAL`  | Rent vehicles, property, equipment - full handover lifecycle |
| `SERVICE` | Hire professionals for jobs - simpler booking flow           |

---

## Auth Service (Port 3001)

### Endpoints

| Method | Route                      | Auth      | Description                                  |
| ------ | -------------------------- | --------- | -------------------------------------------- |
| POST   | `/auth/register`           | Public    | Create account, sends email OTP              |
| POST   | `/auth/verify-email`       | Public    | Verify email with OTP                        |
| POST   | `/auth/resend-email-otp`   | Public    | Resend email OTP                             |
| POST   | `/auth/resend-otp`         | Public    | Resend OTP (alias)                           |
| POST   | `/auth/send-phone-otp`     | Public    | Send phone verification OTP                  |
| POST   | `/auth/verify-phone`       | Public    | Verify phone with OTP                        |
| POST   | `/auth/login`              | Public    | Login, returns access and refresh tokens     |
| POST   | `/auth/refresh`            | Public    | Rotate refresh token, issue new access token |
| POST   | `/auth/logout`             | Protected | Blacklist access token, revoke refresh token |
| POST   | `/auth/forgot-password`    | Public    | Send password reset OTP                      |
| POST   | `/auth/reset-password`     | Public    | Reset password with OTP                      |
| GET    | `/auth/me`                 | Protected | Get current user (basic fields)              |
| GET    | `/profiles/me`             | Protected | Get full profile                             |
| PATCH  | `/profiles/me`             | Protected | Update profile                               |
| POST   | `/profiles/me/photo`       | Protected | Upload profile photo                         |
| PATCH  | `/profiles/me/photo-url`   | Protected | Save photo URL after direct upload           |
| PATCH  | `/profiles/me/role`        | Protected | Add role to account (GUEST → HOST)           |
| POST   | `/profiles/me/kyc`         | Protected | Upload KYC document                          |
| GET    | `/profiles/:id`            | Public    | Get public profile                           |
| GET    | `/subscriptions/status`    | Protected | Get subscription status                      |
| POST   | `/subscriptions/upgrade`   | Protected | Upgrade to Pro plan                          |
| POST   | `/subscriptions/cancel`    | Protected | Cancel subscription                          |
| PATCH  | `/admin/users/:id/kyc`     | Admin     | Approve or reject KYC                        |
| POST   | `/admin/users/:id/badge`   | Admin     | Award badge to user                          |
| PATCH  | `/admin/users/:id/suspend` | Admin     | Suspend user account                         |

---

## Booking Service (Port 3002)

### Endpoints

| Method | Route                            | Auth      | Description                           |
| ------ | -------------------------------- | --------- | ------------------------------------- |
| POST   | `/listings`                      | HOST      | Create listing                        |
| GET    | `/listings`                      | Public    | Browse listings (paginated, filtered) |
| GET    | `/listings/:id`                  | Public    | Get listing with host info            |
| PATCH  | `/listings/:id`                  | HOST      | Update listing                        |
| DELETE | `/listings/:id`                  | HOST      | Soft delete listing                   |
| POST   | `/listings/:id/images`           | HOST      | Upload listing image                  |
| DELETE | `/listings/:id/images/:imageId`  | HOST      | Delete listing image                  |
| POST   | `/bookings`                      | GUEST     | Create booking (price locked)         |
| GET    | `/bookings`                      | Protected | Get bookings (role-filtered)          |
| GET    | `/bookings/:id`                  | Protected | Get booking with full history         |
| PATCH  | `/bookings/:id/status`           | Protected | Transition booking status             |
| POST   | `/bookings/:id/handover/confirm` | Protected | Dual-confirm handover                 |
| POST   | `/reviews`                       | Protected | Create review                         |
| GET    | `/reviews/listing/:id`           | Public    | Get reviews for listing               |
| GET    | `/reviews/user/:id`              | Public    | Get reviews for user                  |
| POST   | `/likes`                         | Protected | Toggle like                           |
| GET    | `/likes/:targetType/:targetId`   | Public    | Get like count                        |
| GET    | `/notifications`                 | Protected | Get notifications                     |
| GET    | `/notifications/unread-count`    | Protected | Get unread count                      |
| PATCH  | `/notifications/read`            | Protected | Mark notifications as read            |
| PATCH  | `/admin/listings/:id/verify`     | Admin     | Verify listing                        |
| PATCH  | `/admin/listings/:id/suspend`    | Admin     | Suspend listing                       |
| PATCH  | `/admin/reviews/:id/remove`      | Admin     | Remove review                         |

---

## Booking State Machine

**RENTAL:** `PENDING → CONFIRMED → EN_ROUTE → HANDED_OVER → ACTIVE → RETURN_PENDING → RETURNED → COMPLETED`

**SERVICE:** `PENDING → CONFIRMED → ACTIVE → COMPLETED`

Both support `CANCELLED` and `DISPUTED` from applicable states.

---

## KYC Flow

Hosts must complete KYC verification before listing. Documents are uploaded to a private Supabase bucket and reviewed by an admin.

| Document              | Type                      |
| --------------------- | ------------------------- |
| NRC / National ID     | `NRC_FRONT` or `NRC_BACK` |
| Proof of Residence    | `PROOF_OF_RESIDENCE`      |
| Recent Photo (Selfie) | `SELFIE`                  |

KYC Status: `PENDING` → `APPROVED` / `REJECTED`

---

## Subscription Plans

| Plan        | Commission | Extra Listing Slots | Discovery Boost |
| ----------- | ---------- | ------------------- | --------------- |
| FREE        | 15%        | +0                  | Standard        |
| PRO_MONTHLY | 10%        | +3                  | Boosted         |
| PRO_ANNUAL  | 10%        | +3                  | Boosted         |

---

## Listing Tiers

| Tier | Base Limit | How to Reach              |
| ---- | ---------- | ------------------------- |
| 0    | 0          | Default (unverified)      |
| 1    | 2          | KYC approved              |
| 2    | 5          | 10+ bookings, 4.0+ rating |
| 3    | Unlimited  | 30+ bookings, 4.5+ rating |

Pro subscription adds 3 slots on top of the tier base limit.

---

## Local Development Setup

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker Desktop (for Redis)
- Postgres.app (macOS)

### Getting Started

**1. Clone the repository**

```bash
git clone https://github.com/Pietrols/Lenda.git
cd Lenda
```

**2. Install dependencies**

```bash
pnpm install
```

**3. Set up environment variables**

Create `.env` files in both service directories:

```
services/auth-service/.env
services/booking-service/.env
```

**4. Start Redis**

```bash
docker compose up -d
```

**5. Start Postgres.app**

Open Postgres.app and ensure it is running on port 5432. Then create the database:

```bash
psql -U postgres -c "CREATE DATABASE lenda_dev;"
```

**6. Run database migrations**

```bash
pnpm --filter database exec prisma migrate dev
```

**7. Start all services**

```bash
pnpm dev
```

Services run at:

- Auth service: `http://localhost:3001`
- Booking service: `http://localhost:3002`
- Web app: `http://localhost:5173`

---

## Deployment

### Infrastructure

| Component           | Provider                                                 |
| ------------------- | -------------------------------------------------------- |
| Frontend            | Cloudflare Pages                                         |
| Backend             | Oracle Cloud Always Free (AMD micro)                     |
| Database            | PostgreSQL 14 on Oracle server                           |
| Cache               | Redis (Docker) on Oracle server                          |
| DNS                 | Cloudflare                                               |
| SSL                 | Let's Encrypt (api subdomain) + Cloudflare (main domain) |
| Profile/KYC Storage | Supabase Storage                                         |
| Host Images         | Cloudflare R2                                            |

### Production Deploy

```bash
ssh -i ~/.ssh/lenda-oracle.key ubuntu@129.151.136.212
cd ~/lenda
git pull origin main
packages/database/node_modules/.bin/prisma migrate deploy --schema packages/database/prisma/schema.prisma
pnpm --filter auth-service build
pnpm --filter booking-service build
pm2 restart all
```

---

## Testing

```bash
# Run all tests
pnpm test

# Run auth service tests only
pnpm --filter auth-service test

# Run booking service tests only
pnpm --filter booking-service test
```

---

## Commit Convention

```
feat: add new feature
fix: fix a bug
refactor: restructure code
test: add or update tests
chore: tooling, config, dependencies
docs: documentation updates
```

---

## Roadmap

### Done

- [x] Auth service - register, verify, login, refresh, logout, forgot password, reset password
- [x] Profile management - photo upload, bio, location, phone
- [x] KYC document upload - NRC, proof of residence, selfie
- [x] Role management - GUEST → HOST upgrade, token refresh on role change
- [x] Booking service - listings, bookings, handover, reviews, likes, notifications
- [x] Subscriptions - FREE, PRO_MONTHLY, PRO_ANNUAL
- [x] Web app - homepage, auth pages, dashboard redesign
- [x] Dashboard - role-aware sidebar, become-a-host multi-step flow, KYC upload UI
- [x] Dark/light mode toggle
- [x] Cloudflare Pages deployment
- [x] Custom domain - lenda.work
- [x] Lenda AI chatbot (Groq)
- [x] Forgot password / reset password flow

### In Progress

- [ ] Host portfolio images (Cloudflare R2)
- [ ] Admin KYC approval UI with document viewer
- [ ] Role-aware host dashboard view
- [ ] Service pricing modes (FIXED / HOURLY / NEGOTIABLE)
- [ ] FAQ page
- [ ] Admin role assignment in dashboard

### Planned

- [ ] Mobile app (React Native / Expo)
- [ ] Payment integration (mobile money)
- [ ] ARM instance migration (Oracle VM.Standard.A1.Flex)
- [ ] CI/CD (GitHub Actions)

Author - Pietrols.
Made with love.
