# Lenda - Complete Deployment & Architecture Guide

> This document is the single source of truth for understanding, deploying, and managing the Lenda platform. It is written for a developer joining the project with no prior context. Read it from top to bottom before touching any code or server.

-

## Table of Contents

1. [What is Lenda?](#1-what-is-lenda)
2. [The Big Picture - How Everything Connects](#2-the-big-picture)
3. [The Tech Stack - Every Tool Explained](#3-the-tech-stack)
4. [The Monorepo Structure](#4-the-monorepo-structure)
5. [Local Development Setup](#5-local-development-setup)
6. [The Database - Schema and Design Decisions](#6-the-database)
7. [The Backend Services](#7-the-backend-services)
8. [The Frontend](#8-the-frontend)
9. [Oracle Cloud - The Server](#9-oracle-cloud)
10. [Server Setup - Step by Step](#10-server-setup)
11. [Nginx - The Gatekeeper](#11-nginx)
12. [PM2 - The Process Manager](#12-pm2)
13. [SSL - HTTPS with Certbot](#13-ssl)
14. [The Domain - lenda.work](#14-the-domain)
15. [Full Deployment Flow - Code to Live](#15-full-deployment-flow)
16. [How Requests Flow at Runtime](#16-how-requests-flow-at-runtime)
17. [What Happens When the Server Restarts](#17-what-happens-when-the-server-restarts)
18. [Server Management - Day to Day Commands](#18-server-management)
19. [Environment Variables - Complete Reference](#19-environment-variables)
20. [ARM Migration - When the Hunt Succeeds](#20-arm-migration)
21. [Troubleshooting Guide](#21-troubleshooting-guide)

-

## 1. What is Lenda?

Lenda is a peer-to-peer rental and services marketplace built for Zambia. It is owned and operated by Pietrols Enterprise Ltd, trading as Lenda.

The platform has two pillars:

- **RENTAL** - users rent physical items (cars, equipment, property, bikes)
- **SERVICE** - users hire people for jobs (cleaning, repairs, delivery, errands, tutoring)

There are three roles:

- **GUEST** - a user who makes bookings
- **HOST** - a user who lists items or services
- **ADMIN** - a platform administrator with full control

The core booking lifecycle is:

```
PENDING → CONFIRMED → EN_ROUTE → HANDED_OVER → ACTIVE → RETURN_PENDING → RETURNED → COMPLETED
```

With side states: `CANCELLED`, `DISPUTED`

-

## 2. The Big Picture

Here is how every piece of the system connects:

```
USER'S BROWSER
     │
     │  visits https://lenda.work
     ▼
NGINX on Oracle Server (serves static React files AND proxies API)
     │
     ├── Static files at /var/www/lenda (or ~/lenda/apps/web/dist via symlink)
     │
     ├── routes /api/auth/    → auth-service:3001
     └── routes /api/booking/ → booking-service:3002
          │
          ▼
ORACLE AMD MICRO VM (129.151.136.212)
     │
     ├── auth-service (port 3001)
     │     handles: register, login, logout, profile, KYC, float, admin
     │     reads/writes: PostgreSQL, Redis
     │     file storage: Cloudflare R2 (KYC docs, host portfolio images)
     │
     ├── booking-service (port 3002)
     │     handles: listings, bookings, reviews, messages, handovers, notifications
     │     reads/writes: PostgreSQL, Redis
     │     file storage: Cloudflare R2 (listing images)
     │
     ├── PostgreSQL (port 5432)
     │     the main database - all persistent data
     │
     └── Redis (port 6380, Docker container)
           caches sessions, refresh tokens, rate limits
```

**Note:** The frontend is no longer hosted on Netlify. It is served as static files directly by Nginx on the Oracle server. Every `pnpm -filter web build` followed by `scp` to the server updates the live site.

Image uploads go directly from the browser to **Cloudflare R2** via pre-signed URLs or multipart form posts through the backend. Supabase Storage is still used for profile photos only.

-

## 3. The Tech Stack

### Why Each Tool Was Chosen

#### Node.js + TypeScript

Node.js runs JavaScript on the server. TypeScript adds static typing on top, catching bugs at compile time rather than at runtime. Every file in this project is TypeScript.

#### Express

A minimal web framework for Node.js. It handles routing, middleware, and request/response objects.

#### Prisma

An ORM (Object Relational Mapper). Instead of writing raw SQL, you write TypeScript like `prisma.user.findUnique({ where: { id } })`. Prisma generates the SQL, handles connection pooling, and keeps your database schema in sync with your TypeScript types.

#### PostgreSQL

A production-grade relational database. All Lenda data lives here. PostgreSQL was chosen for its superior JSON support (the `metadata` column on listings is a JSONB field), array types (user roles are stored as a PostgreSQL array), and custom enum types.

#### Redis

A key-value store that lives entirely in memory. Used for storing refresh tokens, rate limiting, and session caching. Runs inside a Docker container on port 6380.

#### Cloudflare R2

Object storage (like AWS S3 but with no egress fees). Lenda uses three R2 buckets:

- `lenda-kyc` — private bucket, signed URL access, stores NRC, proof of residence, and selfie documents uploaded during KYC
- `lenda-listing` — public bucket, stores listing images uploaded during listing creation
- `lenda-host-images` — public bucket, stores host portfolio images shown on public profiles

R2 credentials are shared between auth-service and booking-service via their respective `.env` files.

#### pnpm

A package manager like npm or yarn, but faster. This project uses pnpm workspaces to manage the monorepo.

#### Turborepo

A build system for monorepos. Figures out which packages depend on which others and builds them in the correct order.

#### React + Vite

React is the UI library. Vite is the build tool — dramatically faster than webpack because it uses native ES modules in development and Rollup for production builds.

#### TanStack Query

Manages server state in the frontend — fetching, caching, and synchronising API data.

#### Zustand

A simple global state manager. Used for the auth store — storing the current user and tokens in memory.

#### Tailwind CSS + shadcn/ui

Tailwind is a utility-first CSS framework. shadcn/ui is a component library built on top of Tailwind and Radix UI.

#### Supabase Storage

Still used for profile photos only (`profiles` bucket). All other file storage has migrated to Cloudflare R2.

#### Nginx

Web server and reverse proxy. In production, Nginx serves the static React frontend files AND proxies API requests to the correct Node.js service. Also terminates SSL.

#### PM2

A process manager for Node.js. Keeps services running as background processes, restarts them if they crash, and starts them on server reboot.

#### Certbot + Let's Encrypt

Automatically obtains and renews free SSL certificates. Certificates expire every 90 days and a systemd timer renews them automatically.

#### Docker

Used only for Redis. Runs in an isolated Docker container for easy management.

-

## 4. The Monorepo Structure

```
lenda/
├── apps/
│   └── web/                    # React frontend (Vite + TypeScript)
│       ├── src/
│       │   ├── api/            # API client functions
│       │   ├── components/     # Reusable UI components
│       │   ├── hooks/          # Custom React hooks
│       │   ├── pages/          # Page components (one per route)
│       │   ├── store/          # Zustand global state
│       │   └── lib/            # Utilities (cn, formatters)
│       └── public/
│           └── fonts/          # Self-hosted Montserrat + Space Grotesk
│
├── services/
│   ├── auth-service/           # Express service on port 3001
│   │   └── src/
│   │       ├── controllers/    # Request handlers
│   │       ├── services/       # Business logic
│   │       ├── routes/         # Route definitions
│   │       ├── middleware/     # Auth, validation, upload
│   │       └── lib/            # JWT, Redis, R2, Supabase clients
│   │
│   └── booking-service/        # Express service on port 3002
│       └── src/
│           ├── controllers/
│           ├── services/
│           ├── routes/
│           └── lib/
│
├── packages/
│   ├── @lenda/types/           # Shared TypeScript types
│   ├── @lenda/schemas/         # Shared Zod validation schemas
│   └── @lenda/database/        # Prisma client + schema + migrations
│       └── prisma/
│           ├── schema.prisma   # The database schema definition
│           └── migrations/     # SQL migration files (one per schema change)
│
├── ecosystem.config.js         # PM2 configuration
├── pnpm-workspace.yaml         # Declares all workspace packages
├── turbo.json                  # Turborepo build configuration
└── package.json                # Root package.json
```

-

## 5. Local Development Setup

### Prerequisites

- **Node.js 24** (project uses v24)
- **pnpm 10** — `npm install -g pnpm@10`
- **Postgres.app** — download from postgresapp.com (runs PostgreSQL on port 5432)
- **Docker Desktop** — for Redis
- **Git**

### Important: Port Conflict

Postgres.app and Docker PostgreSQL conflict on port 5432. Use Postgres.app directly; Docker is for Redis only. Never run a PostgreSQL Docker container alongside Postgres.app.

### First Time Setup

```bash
# 1. Clone the repository
git clone https://github.com/Pietrols/lenda.git
cd lenda

# 2. Install all dependencies
pnpm install

# 3. Create local environment files
cp deploy/auth.env.template services/auth-service/.env
cp deploy/booking.env.template services/booking-service/.env
# Fill in real values including R2 credentials

# 4. Start PostgreSQL (open Postgres.app and click Start)
psql -U postgres -c "CREATE DATABASE lenda_dev;"

# 5. Start Redis via Docker
docker run -d \
  -name lenda_redis_dev \
  -restart unless-stopped \
  -p 6380:6379 \
  redis:7-alpine

# 6. Run migrations and generate Prisma client
cd packages/database
npx prisma migrate dev
cd ../..

# 7. Build shared packages (must be done before running services)
pnpm -filter @lenda/types build
pnpm -filter @lenda/schemas build
pnpm -filter @lenda/database build

# 8. Start all services
# Terminal 1
pnpm -filter auth-service dev

# Terminal 2
pnpm -filter booking-service dev

# Terminal 3
pnpm -filter web dev
```

Frontend: `http://localhost:5173` | Auth: `http://localhost:3001` | Booking: `http://localhost:3002`

-

## 6. The Database

### Migration Workflow

**CRITICAL — LOW RAM SERVER CONSTRAINT:**

The Oracle AMD micro (1GB RAM) cannot run `npx prisma migrate deploy` or `npx prisma generate` directly because `npx` tries to download Prisma v7 which OOMs the server. The correct workflow is:

**Locally (generates the migration):**

```bash
cd packages/database
npx prisma migrate dev -name describe_your_change
cd ../..
```

**On the server (applies the migration):**

```bash
# 1. Copy the generated migration SQL to the server
scp -i ~/.ssh/lenda-oracle.key \
  packages/database/prisma/migrations/TIMESTAMP_migration_name/migration.sql \
  ubuntu@129.151.136.212:~/migration.sql

# 2. Apply the SQL directly via psql (no Node.js required)
ssh -i ~/.ssh/lenda-oracle.key ubuntu@129.151.136.212 \
  "PGPASSWORD=LendaProd2026! psql -h localhost -U lenda -d lenda_prod -f ~/migration.sql"

# 3. Record the migration in Prisma's tracking table
ssh -i ~/.ssh/lenda-oracle.key ubuntu@129.151.136.212 \
  "PGPASSWORD=LendaProd2026! psql -h localhost -U lenda -d lenda_prod -c \
  \"INSERT INTO \\\"_prisma_migrations\\\" (id, checksum, migration_name, started_at, finished_at, applied_steps_count) \
  VALUES (gen_random_uuid(), 'manual', 'TIMESTAMP_migration_name', now(), now(), 1) ON CONFLICT DO NOTHING;\""

# 4. Regenerate the Prisma client on the server (uses already-installed pnpm workspace Prisma v6)
ssh -i ~/.ssh/lenda-oracle.key ubuntu@129.151.136.212 \
  "cd ~/lenda && pnpm -filter @lenda/database exec prisma generate"

# 5. Restart affected services
ssh -i ~/.ssh/lenda-oracle.key ubuntu@129.151.136.212 \
  "pm2 restart lenda-auth && pm2 restart lenda-booking"
```

**Never use `npx prisma` on the server.** Always use `pnpm -filter @lenda/database exec prisma generate` for client regeneration.

### Applied Migrations

| Migration                                                       | Description                                                                                      |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 20260319210048_init                                             | All initial tables: User, Listing, ListingImage, Booking, BookingStatusHistory, Handover, Review |
| 20260319215351_add_profile_fields_and_listing_tier              | fullName, bio, location, photoUrl, listingTier, subscriptionPlan                                 |
| 20260320125410_add_subscriptions_discovery_badges_notifications | Badge, Notification models; discoveryScore, responseRate on Listing                              |
| 20260401114223_add_float_account_system                         | FloatAccount, FloatTransaction, FloatWithdrawal models                                           |
| 20260401115532_add_float_low_balance_notification               | FLOAT_LOW_BALANCE notification type                                                              |
| 20260402113817_add_booking_messages                             | BookingMessage model                                                                             |
| 20260428172603_add_portfolio_images                             | PortfolioImage model (host work portfolio)                                                       |
| 20260430162144_add_pricing_mode                                 | PricingMode enum (FIXED, HOURLY, NEGOTIABLE) on Listing                                          |

### Key Schema Design Decisions

**Price locking** — `priceSnapshot` on Booking stores the price per day at booking creation. Host price changes never affect confirmed bookings.

**Pricing modes** — Listings support FIXED (per day), HOURLY (per hour), or NEGOTIABLE (contact host). The `pricingMode` column defaults to FIXED for backward compatibility.

**Portfolio images** — The `PortfolioImage` model stores up to 5 public R2 image URLs per host, displayed on their public profile page.

**Status history** — Every booking status change is recorded in `BookingStatusHistory` with who changed it, from what, to what, and when. Immutable audit trail.

**Dual-confirm handover** — The Handover model has `guestConfirmed` and `hostConfirmed` boolean fields. Both must confirm for a handover to be complete.

**JSONB metadata** — Listings have a `metadata` JSONB column for pillar-specific data.

**Soft deletes** — Listings have a `deletedAt` timestamp. Never deleted from the database.

-

## 7. The Backend Services

### Auth Service (Port 3001)

Handles identity, users, KYC, float, and admin.

| Endpoint                              | Method | Purpose                                                    |
| ------------------------------------- | ------ | ---------------------------------------------------------- |
| `/auth/register`                      | POST   | Create a new user account                                  |
| `/auth/verify-email`                  | POST   | Verify email with OTP                                      |
| `/auth/login`                         | POST   | Log in, receive access + refresh tokens                    |
| `/auth/refresh`                       | POST   | Exchange refresh token for new access token                |
| `/auth/logout`                        | POST   | Invalidate refresh token in Redis                          |
| `/auth/me`                            | GET    | Get current user                                           |
| `/profiles/me`                        | GET    | Get current user profile                                   |
| `/profiles/me`                        | PATCH  | Update profile                                             |
| `/profiles/me/photo`                  | POST   | Upload profile photo (Supabase)                            |
| `/profiles/me/kyc`                    | POST   | Upload KYC document (R2 private)                           |
| `/profiles/me/kyc`                    | GET    | Get KYC documents with signed URLs                         |
| `/profiles/me/kyc/resubmit`           | PATCH  | Resubmit after rejection                                   |
| `/profiles/me/portfolio`              | POST   | Upload portfolio image (R2 public)                         |
| `/profiles/me/portfolio`              | GET    | Get portfolio images                                       |
| `/profiles/me/portfolio/:imageId`     | DELETE | Delete portfolio image                                     |
| `/profiles/me/role`                   | PATCH  | Add role (GUEST or HOST)                                   |
| `/profiles/:id`                       | GET    | Public profile with stats and portfolio                    |
| `/float/setup`                        | POST   | Create float account                                       |
| `/float/me`                           | GET    | Get own float account (returns `{ float: null }` if none)  |
| `/float/withdraw`                     | POST   | Request withdrawal                                         |
| `/float/admin/:id`                    | GET    | Get any user's float (ADMIN only)                          |
| `/float/admin/:id/topup`              | PATCH  | Top up a user's float (ADMIN only)                         |
| `/float/admin/:id/approve-withdrawal` | PATCH  | Approve withdrawal (ADMIN only)                            |
| `/admin/users`                        | GET    | List all users                                             |
| `/admin/users/:id`                    | GET    | Get full user detail                                       |
| `/admin/users/:id/kyc`                | PATCH  | Approve or reject KYC                                      |
| `/admin/users/:id/kyc-documents`      | GET    | Get KYC documents for review                               |
| `/admin/users/:id/badge`              | POST   | Award a badge                                              |
| `/admin/users/:id/suspend`            | PATCH  | Suspend or unsuspend                                       |
| `/admin/users/:id/roles`              | PATCH  | Assign roles (ADMIN assignment restricted to master admin) |
| `/admin/users/:id/grant-pro`          | POST   | Grant Pro subscription                                     |
| `/admin/users/:id/revoke-pro`         | POST   | Revoke Pro subscription                                    |
| `/admin/users/:id/listing-tier`       | PATCH  | Adjust listing tier (0-3)                                  |

### Master Admin Guard

Only the email defined in `MASTER_ADMIN_EMAIL` (currently `kabambapeter3@gmail.com`) can assign or remove the ADMIN role. Regular admins receive a 403 if they attempt this. Enforced in `admin.service.ts → assignRoles()`.

### Booking Service (Port 3002)

Handles listings, bookings, reviews, messages, notifications.

| Endpoint                           | Method | Purpose                                |
| ---------------------------------- | ------ | -------------------------------------- |
| `/listings`                        | GET    | Browse listings with filters           |
| `/listings`                        | POST   | Create a listing (HOST + KYC approved) |
| `/listings/mine`                   | GET    | Get current host's listings            |
| `/listings/:id`                    | GET    | Get a single listing                   |
| `/listings/:id`                    | PATCH  | Update a listing                       |
| `/listings/:id`                    | DELETE | Soft delete a listing                  |
| `/listings/:id/images`             | POST   | Upload listing image (R2 public)       |
| `/bookings`                        | POST   | Create a booking                       |
| `/bookings`                        | GET    | Get bookings for current user          |
| `/bookings/:id`                    | GET    | Get single booking with history        |
| `/bookings/:id/status`             | PATCH  | Transition booking status              |
| `/reviews`                         | POST   | Submit a review                        |
| `/reviews/listing/:id`             | GET    | Get reviews for a listing              |
| `/reviews/user/:id`                | GET    | Get reviews for a user                 |
| `/notifications`                   | GET    | Get notifications                      |
| `/notifications/unread-count`      | GET    | Get unread count                       |
| `/notifications/mark-read`         | POST   | Mark notifications as read             |
| `/admin/listings`                  | GET    | All listings (ADMIN)                   |
| `/admin/bookings`                  | GET    | All bookings (ADMIN)                   |
| `/admin/reviews`                   | GET    | All reviews (ADMIN)                    |
| `/admin/users/:id/discovery-boost` | PATCH  | Boost listing discovery score (ADMIN)  |

### Authentication Flow

1. User logs in → server verifies bcrypt password hash
2. Server issues access token (15m JWT) and refresh token (7d)
3. Refresh token stored in Redis
4. Frontend stores both tokens in Zustand (memory, not localStorage)
5. Every API call includes `Authorization: Bearer <token>`
6. On 401, frontend auto-retries with refresh token once
7. On logout, refresh token deleted from Redis

**Important:** The 401 retry only triggers when a token was originally sent with the request. Login/register requests with wrong credentials show the error directly without triggering a redirect loop.

-

## 8. The Frontend

### Routing

```
/                       HomePage
/listings               ListingsPage
/listings/:id           ListingDetailPage
/profiles/:id           ProfilePage (public host profile)
/login                  LoginPage
/register               RegisterPage
/privacy                PrivacyPage
/terms                  TermsPage
/partner                PartnerPage
/join                   JoinPage
/dashboard              DashboardPage
/dashboard/bookings     DashboardBookings
/dashboard/listings     DashboardListings
/dashboard/listings/create  DashboardCreateListing
/dashboard/profile      DashboardProfile
/dashboard/float        DashboardFloat
/dashboard/notifications DashboardNotifications
/dashboard/become-a-host BecomeAHostPage
/admin                  AdminLayout
/admin/users            AdminUsers
/admin/users/:id        AdminUserDetail
/admin/bookings         AdminBookings
/admin/listings         AdminListings
/admin/kyc              AdminKyc
*                       NotFoundPage
```

### Dashboard Role Switching

The dashboard supports dual-role users (GUEST + HOST). `DashboardPage` maintains `activeRole` state. When a user has both roles and KYC is approved, they can toggle between GUEST view (bookings, KYC status, notifications) and HOST view (active bookings, completed bookings, listings count, float balance, new listing CTA).

### Chatbot

`LendaChat.tsx` uses the Groq API (llama-3.3-70b-versatile) with a comprehensive system prompt covering all Lenda features. The API key is stored in `VITE_GROQ_API_KEY`.

### Environment Variables

```
VITE_API_AUTH_URL      - base URL for auth service (https://lenda.work/api/auth)
VITE_API_BOOKING_URL   - base URL for booking service (https://lenda.work/api/booking)
VITE_GROQ_API_KEY      - API key for the AI chatbot
```

-

## 9. Oracle Cloud

### Current Instance

- **Type:** AMD micro (VM.Standard.E2.1.Micro)
- **Specs:** 1 OCPU, 1GB RAM
- **IP:** 129.151.136.212
- **Region:** me-abudhabi-1 (UAE Central)
- **SSH:** `ssh -i ~/.ssh/lenda-oracle.key ubuntu@129.151.136.212`

### ARM Migration

An ARM instance (VM.Standard.A1.Flex, 2 OCPU+, 12GB+ RAM) would significantly improve performance. When ARM capacity becomes available in the region, migrate following Section 20. Oracle PAYG upgrade is also planned to unlock larger instances.

### RAM Constraints

The 1GB RAM limit affects the deployment workflow throughout:

- TypeScript compilation (`tsc`) happens locally, not on the server
- `npx prisma` is forbidden on the server (downloads Prisma v7, OOMs)
- All builds are done locally and `scp dist/` to the server
- `pnpm -filter @lenda/database exec prisma generate` is the only safe way to regenerate the Prisma client on the server (uses already-installed v6)

-

## 10. Server Setup

### SSH Access

```bash
ssh -i ~/.ssh/lenda-oracle.key ubuntu@129.151.136.212
```

### Installing Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Installing pnpm and PM2

```bash
sudo npm install -g pnpm pm2
```

### Installing Nginx

```bash
sudo apt install -y nginx
```

### Installing Docker and Starting Redis

```bash
sudo apt install -y docker.io
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ubuntu

sudo docker run -d \
  -name lenda_redis \
  -restart unless-stopped \
  -p 6380:6379 \
  redis:7-alpine
```

### Installing and Configuring PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql

sudo -u postgres psql << 'SQL'
CREATE USER lenda WITH PASSWORD 'LendaProd2026!';
CREATE DATABASE lenda_prod OWNER lenda;
GRANT ALL PRIVILEGES ON DATABASE lenda_prod TO lenda;
SQL
```

### Opening OS Firewall Ports

Oracle has two layers of firewall — the cloud security list and OS-level iptables. Both must allow traffic.

```bash
sudo iptables -I INPUT 6 -m state -state NEW -p tcp -dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state -state NEW -p tcp -dport 443 -j ACCEPT
sudo netfilter-persistent save
```

**The REJECT rule problem** — Oracle's default iptables has a `REJECT all` rule. New rules must be inserted BEFORE it (at a lower line number). If HTTP/HTTPS rules appear after the REJECT rule they are never reached.

```bash
# Check rule order
sudo iptables -L INPUT -line-numbers

# If REJECT appears before your ACCEPT rules, delete and re-add at bottom
sudo iptables -D INPUT <REJECT_line_number>
sudo iptables -A INPUT -j REJECT -reject-with icmp-host-prohibited
sudo netfilter-persistent save
```

-

## 11. Nginx

### Configuration File

Location: `/etc/nginx/sites-available/lenda`

```nginx
server {
    listen 80;
    server_name lenda.work www.lenda.work api.lenda.work 129.151.136.212;

    # API routes — proxied to Node.js services
    location /api/auth/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/booking/ {
        proxy_pass http://localhost:3002/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static frontend files
    location / {
        root /home/ubuntu/lenda/apps/web/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

After certbot runs, it automatically adds SSL configuration blocks. The `try_files ... /index.html` directive handles React Router's client-side routing — any URL that doesn't match a file falls back to index.html.

### Testing and Reloading

```bash
sudo nginx -t                    # test config for syntax errors
sudo systemctl reload nginx      # zero-downtime reload
sudo systemctl restart nginx     # full restart (brief downtime)
```

-

## 12. PM2

### Configuration File

`~/lenda/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: "lenda-auth",
      cwd: "/home/ubuntu/lenda/services/auth-service",
      script: "dist/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "400M",
      env: { NODE_ENV: "production", PORT: 3001 },
    },
    {
      name: "lenda-booking",
      cwd: "/home/ubuntu/lenda/services/booking-service",
      script: "dist/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "400M",
      env: { NODE_ENV: "production", PORT: 3002 },
    },
  ],
};
```

### Essential PM2 Commands

```bash
pm2 status                          # check all processes
pm2 logs lenda-auth -lines 30      # view recent logs
pm2 logs lenda-auth -nostream      # view logs without tailing
pm2 restart lenda-auth              # restart a service
pm2 restart lenda-auth -update-env # restart and reload .env
pm2 restart all                     # restart everything
pm2 save                            # persist process list across reboots
pm2 startup                         # generate systemd startup script
```

-

## 13. SSL

```bash
sudo certbot -nginx -d lenda.work -d www.lenda.work
```

Certificates are auto-renewed by a systemd timer. Check status:

```bash
sudo certbot renew -dry-run
systemctl status certbot.timer
```

-

## 14. The Domain

`lenda.work` registered at Namecheap.

### DNS Records

| Type     | Host | Value           | Purpose                         |
| -------- | ---- | --------------- | ------------------------------- |
| A Record | @    | 129.151.136.212 | Points lenda.work to server     |
| A Record | www  | 129.151.136.212 | Points www.lenda.work to server |
| A Record | api  | 129.151.136.212 | Points api.lenda.work to server |

-

## 15. Full Deployment Flow - Code to Live

### Standard Frontend + Backend Deploy

```bash
# 1. Build everything locally
pnpm -filter @lenda/schemas build
pnpm -filter @lenda/database build
pnpm -filter auth-service build       # if auth changed
pnpm -filter booking-service build    # if booking changed
pnpm -filter web build

# 2. Commit and push
git add .
git commit -m "feat: describe your change"
git push origin main

# 3. Deploy backend services (if changed)
scp -i ~/.ssh/lenda-oracle.key -r services/auth-service/dist \
  ubuntu@129.151.136.212:~/lenda/services/auth-service/
ssh -i ~/.ssh/lenda-oracle.key ubuntu@129.151.136.212 "pm2 restart lenda-auth"

scp -i ~/.ssh/lenda-oracle.key -r services/booking-service/dist \
  ubuntu@129.151.136.212:~/lenda/services/booking-service/
ssh -i ~/.ssh/lenda-oracle.key ubuntu@129.151.136.212 "pm2 restart lenda-booking"

# 4. Deploy frontend
scp -i ~/.ssh/lenda-oracle.key -r apps/web/dist \
  ubuntu@129.151.136.212:~/lenda/apps/web/
ssh -i ~/.ssh/lenda-oracle.key ubuntu@129.151.136.212 "sudo systemctl reload nginx"
```

### For Database Schema Changes

```bash
# 1. Update packages/database/prisma/schema.prisma locally

# 2. Generate and apply migration locally
cd packages/database
npx prisma migrate dev -name describe_change
cd ../..

# 3. Commit and push
git add .
git commit -m "feat: schema change description"
git push origin main

# 4. Copy migration SQL to server
scp -i ~/.ssh/lenda-oracle.key \
  packages/database/prisma/migrations/TIMESTAMP_name/migration.sql \
  ubuntu@129.151.136.212:~/migration.sql

# 5. Apply SQL on server
ssh -i ~/.ssh/lenda-oracle.key ubuntu@129.151.136.212 \
  "PGPASSWORD=LendaProd2026! psql -h localhost -U lenda -d lenda_prod -f ~/migration.sql"

# 6. Record in Prisma migrations table
ssh -i ~/.ssh/lenda-oracle.key ubuntu@129.151.136.212 \
  "PGPASSWORD=LendaProd2026! psql -h localhost -U lenda -d lenda_prod -c \
  \"INSERT INTO \\\"_prisma_migrations\\\" (id, checksum, migration_name, started_at, finished_at, applied_steps_count) \
  VALUES (gen_random_uuid(), 'manual', 'TIMESTAMP_name', now(), now(), 1) ON CONFLICT DO NOTHING;\""

# 7. Regenerate Prisma client on server
ssh -i ~/.ssh/lenda-oracle.key ubuntu@129.151.136.212 \
  "cd ~/lenda && pnpm -filter @lenda/database exec prisma generate"

# 8. Build and deploy affected services
pnpm -filter @lenda/database build
pnpm -filter auth-service build
pnpm -filter booking-service build

scp -i ~/.ssh/lenda-oracle.key -r packages/database/dist \
  ubuntu@129.151.136.212:~/lenda/packages/database/
scp -i ~/.ssh/lenda-oracle.key -r services/auth-service/dist \
  ubuntu@129.151.136.212:~/lenda/services/auth-service/
scp -i ~/.ssh/lenda-oracle.key -r services/booking-service/dist \
  ubuntu@129.151.136.212:~/lenda/services/booking-service/

ssh -i ~/.ssh/lenda-oracle.key ubuntu@129.151.136.212 \
  "pm2 restart lenda-auth && pm2 restart lenda-booking"
```

### Critical Deployment Gotcha

`@lenda/schemas` dist **must be copied to the server separately** from service rebuilds whenever schemas change. If booking-service uses new schema types that aren't on the server yet, it will crash on startup with a module resolution error.

```bash
scp -i ~/.ssh/lenda-oracle.key -r packages/schemas/dist \
  ubuntu@129.151.136.212:~/lenda/packages/schemas/
```

-

## 16. How Requests Flow at Runtime

### Example: User logs in

1. User submits login form at `https://lenda.work/login`
2. React sends `POST https://lenda.work/api/auth/auth/login`
3. Nginx receives on port 443, decrypts SSL, sees `/api/auth/`, forwards to `localhost:3001/auth/login`
4. auth-service verifies password with bcrypt
5. Issues access token (JWT, 15m) and refresh token (7d stored in Redis)
6. Returns `{ user, tokens }` — React stores in Zustand, navigates to `/dashboard`

### Example: Host creates a listing

1. Host submits 4-step create listing form
2. React sends `POST https://lenda.work/api/booking/listings` with form data + pricingMode
3. Nginx forwards to `localhost:3002/listings`
4. booking-service middleware verifies JWT, checks HOST role and KYC APPROVED
5. Creates listing in PostgreSQL with status ACTIVE
6. Returns `{ listing: { id } }`
7. React then uploads images one by one to `POST /listings/:id/images` (each goes to Cloudflare R2)

-

## 17. What Happens When the Server Restarts

When the Oracle VM reboots:

1. Ubuntu boots → systemd initialises
2. PostgreSQL starts automatically (enabled via systemctl)
3. Docker starts automatically → Redis container restarts (`-restart unless-stopped`)
4. PM2 starts via systemd → reads saved process list → starts `lenda-auth` and `lenda-booking`
5. Nginx starts automatically → serves static files and proxies API

All services back up within ~30 seconds. No manual intervention needed.

### Verifying After a Restart

```bash
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql
sudo docker ps
curl https://lenda.work/api/auth/health
curl https://lenda.work/api/booking/health
```

-

## 18. Server Management

### Checking Server Health

```bash
free -h                    # memory usage
df -h                      # disk usage
pm2 status                 # process status
pm2 monit                  # live resource monitor
```

### Viewing Logs

```bash
pm2 logs lenda-auth -lines 50 -nostream
pm2 logs lenda-booking -lines 50 -nostream
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Connecting to PostgreSQL

```bash
psql postgresql://lenda:LendaProd2026!@localhost:5432/lenda_prod

# Useful commands
\dt              # list tables
\d listings      # describe listings table
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM bookings;
\q               # quit
```

### Checking Redis

```bash
sudo docker exec -it lenda_redis redis-cli
PING             # returns PONG
KEYS *           # list all keys
\q
```

-

## 19. Environment Variables - Complete Reference

### Auth Service (`services/auth-service/.env`)

```env
NODE_ENV=production
PORT=3001
AUTH_PORT=3001
DATABASE_URL=postgresql://lenda:LendaProd2026!@localhost:5432/lenda_prod
REDIS_URL=redis://localhost:6380
JWT_ACCESS_SECRET=<32+ character random string>
JWT_REFRESH_SECRET=<different 32+ character random string>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
OTP_EXPIRES_MINUTES=10
OTP_MAX_ATTEMPTS=5
RESEND_API_KEY=<resend api key>
EMAIL_FROM=noreply@lenda.work
CORS_ORIGINS=https://lenda.work,https://www.lenda.work
SUPABASE_URL=https://tfdbgtwlqhozmewatcpm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<supabase service role key>
R2_ACCOUNT_ID=<cloudflare account id>
R2_ACCESS_KEY_ID=<r2 access key>
R2_SECRET_ACCESS_KEY=<r2 secret key>
R2_KYC_BUCKET=lenda-kyc
R2_HOST_IMAGES_BUCKET=lenda-host-images
R2_HOST_IMAGES_PUBLIC_URL=https://pub-xxxxxxxx.r2.dev
MASTER_ADMIN_EMAIL=kabambapeter3@gmail.com
```

### Booking Service (`services/booking-service/.env`)

```env
NODE_ENV=production
PORT=3002
DATABASE_URL=postgresql://lenda:LendaProd2026!@localhost:5432/lenda_prod
REDIS_URL=redis://localhost:6380
JWT_ACCESS_SECRET=<same as auth service>
JWT_REFRESH_SECRET=<same as auth service>
CORS_ORIGINS=https://lenda.work,https://www.lenda.work
R2_ACCOUNT_ID=<cloudflare account id>
R2_ACCESS_KEY_ID=<r2 access key>
R2_SECRET_ACCESS_KEY=<r2 secret key>
R2_LISTING_BUCKET=lenda-listing
R2_LISTING_PUBLIC_URL=https://pub-xxxxxxxx.r2.dev
```

### Frontend (`.env.production` or Vite env)

```env
VITE_API_AUTH_URL=https://lenda.work/api/auth
VITE_API_BOOKING_URL=https://lenda.work/api/booking
VITE_GROQ_API_KEY=<groq api key>
```

-

## 20. ARM Migration

When an ARM instance (VM.Standard.A1.Flex) becomes available:

### 1. Set Up the ARM Instance

Run the full setup from Section 10 on the new instance.

### 2. Transfer Environment Files

```bash
scp -i ~/.ssh/lenda-oracle.key ubuntu@AMD_IP:~/lenda/services/auth-service/.env ./auth.env
scp -i ~/.ssh/lenda-oracle.key ubuntu@AMD_IP:~/lenda/services/booking-service/.env ./booking.env
scp -i ~/.ssh/lenda-oracle.key ./auth.env ubuntu@ARM_IP:~/lenda/services/auth-service/.env
scp -i ~/.ssh/lenda-oracle.key ./booking.env ubuntu@ARM_IP:~/lenda/services/booking-service/.env
```

### 3. Export and Import the Database

```bash
# On AMD
pg_dump -U lenda -d lenda_prod -h localhost > /tmp/lenda_backup.sql

# Transfer
scp -i ~/.ssh/lenda-oracle.key ubuntu@AMD_IP:/tmp/lenda_backup.sql ./lenda_backup.sql
scp -i ~/.ssh/lenda-oracle.key ./lenda_backup.sql ubuntu@ARM_IP:/tmp/lenda_backup.sql

# On ARM
psql postgresql://lenda:LendaProd2026!@localhost:5432/lenda_prod < /tmp/lenda_backup.sql
```

### 4. Update DNS

Update the A records at Namecheap to point to the ARM instance's public IP.

### 5. Terminate AMD Instance

Once ARM is confirmed working, terminate the AMD micro in the Oracle Console.

-

## 21. Troubleshooting Guide

### PM2 service won't start / immediately crashes with empty error log

Most common cause: config validation fails at startup due to missing env vars. The process calls `process.exit(1)` before any logger runs, so error logs are empty.

```bash
# Check env file exists and has required vars
cat ~/lenda/services/auth-service/.env | grep R2
cat ~/lenda/services/booking-service/.env | grep R2

# Check dist exists
ls ~/lenda/services/auth-service/dist/index.js
ls ~/lenda/services/booking-service/dist/index.js
```

After adding missing env vars, always restart with `-update-env`:

```bash
pm2 restart lenda-auth -update-env
```

### Prisma unknown model / field error after schema change

The Prisma client on the server is stale. Regenerate it:

```bash
cd ~/lenda
pnpm -filter @lenda/database exec prisma generate
pm2 restart lenda-auth -update-env
pm2 restart lenda-booking -update-env
```

Never use `npx prisma generate` — it tries to download Prisma v7 and OOMs the server.

### 502 Bad Gateway from Nginx

The Node.js service is down. Check:

```bash
pm2 status
pm2 logs lenda-auth -lines 30 -nostream
pm2 logs lenda-booking -lines 30 -nostream
```

### Frontend CORS errors on booking service routes

The new dist is deployed but Prisma client on the server doesn't know about new schema fields. Regenerate as above, then restart.

### Database connection error (peer authentication failed)

Always use `-h localhost` to force TCP authentication:

```bash
PGPASSWORD=LendaProd2026! psql -h localhost -U lenda -d lenda_prod -c "SELECT 1"
```

Connecting without `-h localhost` uses Unix socket authentication which fails for non-postgres users.

### Redis connection error

```bash
sudo docker ps | grep lenda_redis
sudo docker start lenda_redis        # if stopped
sudo docker exec -it lenda_redis redis-cli ping
```

### SSL certificate expired

```bash
sudo certbot renew
sudo systemctl reload nginx
```

### Out of disk space

```bash
df -h
pm2 flush                  # clear PM2 logs
sudo apt autoremove
sudo apt clean
```

-

## Summary - Deployed Infrastructure

| Component        | Technology                        | Location                  | Purpose                             |
| ---------------- | --------------------------------- | ------------------------- | ----------------------------------- |
| Frontend         | React + Vite (static files)       | Oracle AMD via Nginx      | User interface                      |
| Auth API         | Node.js + Express                 | Oracle AMD (port 3001)    | Identity + users + KYC + float      |
| Booking API      | Node.js + Express                 | Oracle AMD (port 3002)    | Marketplace logic                   |
| Database         | PostgreSQL 14                     | Oracle AMD (port 5432)    | Persistent data                     |
| Cache            | Redis 7 (Docker)                  | Oracle AMD (port 6380)    | Sessions + rate limiting            |
| Reverse Proxy    | Nginx                             | Oracle AMD (ports 80/443) | SSL + routing + static files        |
| Process Manager  | PM2                               | Oracle AMD                | Keep services running               |
| SSL Certificate  | Let's Encrypt + Certbot           | Oracle AMD                | HTTPS encryption                    |
| KYC Storage      | Cloudflare R2 (lenda-kyc)         | Cloudflare                | Private signed-URL document storage |
| Listing Images   | Cloudflare R2 (lenda-listing)     | Cloudflare                | Public listing photo storage        |
| Portfolio Images | Cloudflare R2 (lenda-host-images) | Cloudflare                | Public host portfolio storage       |
| Profile Photos   | Supabase Storage                  | Supabase cloud            | User avatar storage                 |
| Domain           | lenda.work                        | Namecheap                 | Human-readable address              |
| Source Control   | Git + GitHub                      | github.com/Pietrols/Lenda | Code versioning                     |

-

_Document last updated: May 2026. Maintained by Pietrols Enterprise Ltd._
