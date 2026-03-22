# Lenda

Zambia's peer-to-peer rental and services marketplace. Built as a TypeScript monorepo with a microservices architecture.

---

## Project Status

**Phase 1 - Backend: Complete**
**Phase 2 - Web App: In Progress**

Auth service, booking service, subscriptions, image uploads, and the web app scaffold are all built and running. The frontend is actively being developed.

---

## Architecture

### Monorepo Structure

```
lenda/
├── apps/
│   └── web/                     # React web app (Vite + TypeScript)
├── services/
│   ├── auth-service/            # Identity, auth, profiles, subscriptions (port 3001)
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

| Layer               | Technology                                    |
| ------------------- | --------------------------------------------- |
| Language            | TypeScript 5.9                                |
| Runtime             | Node.js 24                                    |
| Package Manager     | pnpm 10 (workspaces)                          |
| Build Orchestration | Turborepo                                     |
| Web Framework       | Express                                       |
| Database            | PostgreSQL (Postgres.app locally)             |
| Cache / Sessions    | Redis (Docker)                                |
| ORM                 | Prisma 6                                      |
| Validation          | Zod                                           |
| Authentication      | JWT (access + refresh token rotation)         |
| Password Hashing    | bcryptjs (cost factor 10)                     |
| Email               | SendGrid (console logging in development)     |
| Image Storage       | Cloudinary (HEIC/JPEG support)                |
| Frontend            | React 18, Vite, Tailwind CSS, shadcn/ui, GSAP |
| State Management    | Zustand (auth), TanStack Query (server state) |

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

| Method | Route                           | Auth      | Description                                  |
| ------ | ------------------------------- | --------- | -------------------------------------------- |
| POST   | `/auth/register`                | Public    | Create account, sends email OTP              |
| POST   | `/auth/verify-email`            | Public    | Verify email with OTP                        |
| POST   | `/auth/resend-email-otp`        | Public    | Resend email OTP                             |
| POST   | `/auth/resend-otp`              | Public    | Resend OTP (alias)                           |
| POST   | `/auth/send-phone-otp`          | Public    | Send phone verification OTP                  |
| POST   | `/auth/verify-phone`            | Public    | Verify phone with OTP                        |
| POST   | `/auth/login`                   | Public    | Login, returns access and refresh tokens     |
| POST   | `/auth/refresh`                 | Public    | Rotate refresh token, issue new access token |
| POST   | `/auth/logout`                  | Protected | Blacklist access token, revoke refresh token |
| GET    | `/auth/me`                      | Protected | Get current user (basic fields)              |
| GET    | `/profiles/me`                  | Protected | Get full profile                             |
| PATCH  | `/profiles/me`                  | Protected | Update profile                               |
| POST   | `/profiles/me/photo`            | Protected | Upload profile photo (server-side)           |
| GET    | `/profiles/me/upload-signature` | Protected | Get Cloudinary signed upload URL             |
| PATCH  | `/profiles/me/photo-url`        | Protected | Save Cloudinary URL after direct upload      |
| GET    | `/profiles/:id`                 | Public    | Get public profile                           |
| GET    | `/subscriptions/status`         | Protected | Get subscription status                      |
| POST   | `/subscriptions/upgrade`        | Protected | Upgrade to Pro plan                          |
| POST   | `/subscriptions/cancel`         | Protected | Cancel subscription                          |
| PATCH  | `/admin/users/:id/kyc`          | Admin     | Approve or reject KYC                        |
| POST   | `/admin/users/:id/badge`        | Admin     | Award badge to user                          |
| PATCH  | `/admin/users/:id/suspend`      | Admin     | Suspend user account                         |

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

- Node.js 24+
- pnpm 10+
- Docker Desktop
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

Copy `.env.example` to `.env` at the root and fill in the required values.

```bash
cp .env.example .env
```

**4. Start Redis**

```bash
docker compose up -d
```

**5. Start Postgres.app**

Open Postgres.app and ensure it is running on port 5432. Then create the database:

```bash
psql -c "CREATE DATABASE lenda_dev;"
```

**6. Run database migrations**

```bash
cd packages/database && pnpm migrate
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

## Environment Variables

Key variables required in root `.env`:

```bash
DATABASE_URL="postgresql://localhost:5432/lenda_dev"
REDIS_URL="redis://localhost:6380"
JWT_ACCESS_SECRET="64-byte-hex-string"
JWT_REFRESH_SECRET="64-byte-hex-string"
SENDGRID_API_KEY="your-sendgrid-key"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
VITE_API_AUTH_URL="http://localhost:3001"
VITE_API_BOOKING_URL="http://localhost:3002"
```

Generate JWT secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
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

Current test coverage: **36/36 passing**

---

## Commit Convention

All commits follow the Conventional Commits format:

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

- [x] Auth service - register, verify, login, refresh, logout, profile, KYC, badges
- [x] Booking service - listings, bookings, handover, reviews, likes, notifications, discovery, admin
- [x] Subscriptions - FREE, PRO_MONTHLY, PRO_ANNUAL with commission and listing slot logic
- [x] Cloudinary image uploads - JPEG and HEIC support
- [x] Web app scaffold - Vite, React, Tailwind, shadcn/ui, GSAP, TanStack Query, Zustand
- [x] Homepage - hero, pillars, how it works, host section, footer
- [x] Auth pages - login, register, verify email
- [x] Dashboard - layout, overview, profile

### In Progress

- [ ] Dashboard - notifications, bookings, listings, subscription pages
- [ ] Client-side Cloudinary upload
- [ ] Partner and Join Our Team pages
- [ ] Lenda chatbot

### Upcoming

- [ ] Listings browse page
- [ ] Listing detail page
- [ ] Stripe payment integration
- [ ] Mobile app (React Native / Expo)
- [ ] Deployment (Railway → Oracle Cloud)
- [ ] CI/CD (GitHub Actions)
