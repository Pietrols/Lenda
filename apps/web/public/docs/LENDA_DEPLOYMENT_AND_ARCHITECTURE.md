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
15. [The Frontend Host - Netlify](#15-the-frontend-host)
16. [Full Deployment Flow - Code to Live](#16-full-deployment-flow)
17. [How Requests Flow at Runtime](#17-how-requests-flow-at-runtime)
18. [What Happens When the Server Restarts](#18-what-happens-when-the-server-restarts)
19. [Server Management - Day to Day Commands](#19-server-management)
20. [Environment Variables - Complete Reference](#20-environment-variables)
21. [ARM Migration - When the Hunt Succeeds](#21-arm-migration)
22. [Troubleshooting Guide](#22-troubleshooting-guide)

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
     │  visits https://lendaapp.netlify.app
     ▼
NETLIFY (Frontend CDN)
     │  serves static React files (HTML, CSS, JS)
     │  when user logs in or makes a booking,
     │  the React app makes API calls to:
     ▼
https://lenda.work/api/auth/...    ──► NGINX on Oracle Server
https://lenda.work/api/booking/... ──► NGINX on Oracle Server
     │
     ▼
ORACLE AMD MICRO VM (129.151.136.212)
     │
     ├── NGINX (port 80/443)
     │     routes /api/auth/ → auth-service:3001
     │     routes /api/booking/ → booking-service:3002
     │
     ├── auth-service (port 3001)
     │     handles: register, login, logout, profile, KYC, admin
     │     reads/writes: PostgreSQL, Redis
     │
     ├── booking-service (port 3002)
     │     handles: listings, bookings, reviews, messages, handovers
     │     reads/writes: PostgreSQL, Redis
     │
     ├── PostgreSQL (port 5432)
     │     the main database - all persistent data
     │
     └── Redis (port 6380, Docker container)
           caches sessions, refresh tokens, rate limits
```

Image uploads (profile photos, listing images) go directly from the browser to **Supabase Storage** - the server is never involved in image uploads.

-

## 3. The Tech Stack

### Why Each Tool Was Chosen

#### Node.js + TypeScript

Node.js runs JavaScript on the server. TypeScript adds static typing on top, catching bugs at compile time rather than at runtime. Every file in this project is TypeScript.

#### Express

A minimal web framework for Node.js. It handles routing (which URL maps to which function), middleware (code that runs before or after request handlers), and request/response objects.

#### Prisma

An ORM (Object Relational Mapper). Instead of writing raw SQL like `SELECT * FROM users WHERE id = $1`, you write TypeScript like `prisma.user.findUnique({ where: { id } })`. Prisma generates the SQL, handles connection pooling, and keeps your database schema in sync with your TypeScript types.

#### PostgreSQL

A production-grade relational database. All Lenda data - users, listings, bookings, reviews, messages - lives here. PostgreSQL was chosen over MySQL for its superior JSON support (the `metadata` column on listings is a JSONB field), array types (user roles are stored as a PostgreSQL array), and custom enum types.

#### Redis

A key-value store that lives entirely in memory, making it extremely fast. Redis is used for:

- Storing refresh tokens (so we can invalidate them on logout)
- Rate limiting (preventing brute force login attacks)
- Session caching (avoiding repeated database queries)

Redis is run inside a Docker container on port 6380 (not the default 6379, to avoid conflicts with DriveLink on the same machine in dev).

#### pnpm

A package manager like npm or yarn, but faster and more disk-efficient. It uses a content-addressable store - packages are stored once on your machine and hard-linked into each project. This project uses pnpm workspaces to manage the monorepo.

#### Turborepo

A build system for monorepos. When you run `pnpm build` at the root, Turborepo figures out which packages depend on which others and builds them in the correct order, caching results so unchanged packages aren't rebuilt.

#### React + Vite

React is the UI library. Vite is the build tool and dev server - it is dramatically faster than webpack because it uses native ES modules in development and Rollup for production builds.

#### TanStack Query

Manages server state in the frontend - fetching, caching, and synchronising API data. When you fetch bookings, TanStack Query caches the result, shows it instantly on the next render, and refetches in the background to keep it fresh.

#### Zustand

A simple global state manager. Used for the auth store - storing the current user and tokens in memory so any component can access them.

#### Tailwind CSS + shadcn/ui

Tailwind is a utility-first CSS framework - you style elements by composing small class names rather than writing CSS files. shadcn/ui is a component library built on top of Tailwind and Radix UI (accessible headless components).

#### Supabase Storage

Supabase is a backend-as-a-service built on PostgreSQL. Lenda only uses its **Storage** feature - a managed file storage service similar to AWS S3. Profile photos go to a `profiles` bucket, listing images to a `listings` bucket. Images are compressed with `sharp` before upload (achieving ~93% file size reduction).

#### Nginx

A web server and reverse proxy. In production, Nginx sits in front of everything. It terminates SSL (handles the HTTPS encryption/decryption), serves no static files for the backend (the frontend is on Netlify), and forwards API requests to the correct Node.js service.

#### PM2

A process manager for Node.js. It keeps your Node services running as background processes, restarts them if they crash, logs their output, and starts them automatically when the server reboots.

#### Certbot + Let's Encrypt

Certbot is a tool that automatically obtains and renews free SSL certificates from Let's Encrypt. It also automatically configures Nginx to use those certificates. Certificates expire every 90 days and Certbot has a systemd timer that renews them automatically.

#### Docker

Used only for Redis. Rather than installing Redis directly on Ubuntu, it runs in an isolated Docker container. This makes it easy to update, restart, and configure Redis without affecting the host system.

#### Netlify

A static site hosting platform with a global CDN. The React frontend is deployed here. Netlify serves the built HTML/CSS/JS files from edge servers around the world, meaning users get fast load times regardless of where they are. Every push to the `main` branch on GitHub triggers an automatic redeploy.

-

## 4. The Monorepo Structure

A monorepo is a single Git repository that contains multiple related projects. This avoids duplicating shared code across separate repos.

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
│       ├── public/
│       │   └── fonts/          # Self-hosted Montserrat + Space Grotesk
│       └── .env.production     # Production environment variables
│
├── services/
│   ├── auth-service/           # Express service on port 3001
│   │   └── src/
│   │       ├── controllers/    # Request handlers
│   │       ├── services/       # Business logic
│   │       ├── routes/         # Route definitions
│   │       ├── middleware/      # Auth, validation, upload
│   │       └── lib/            # JWT, Redis, Supabase clients
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
├── deploy/                     # Deployment scripts and templates
├── ecosystem.config.js         # PM2 configuration
├── pnpm-workspace.yaml         # Declares all workspace packages
├── turbo.json                  # Turborepo build configuration
└── package.json                # Root package.json
```

-

## 5. Local Development Setup

### Prerequisites

Install these on your Mac before starting:

- **Node.js 20** - `brew install node@20`
- **pnpm** - `npm install -g pnpm@10`
- **Postgres.app** - download from postgresapp.com (runs PostgreSQL on port 5432)
- **Docker Desktop** - for Redis
- **Git** - `brew install git`

### First Time Setup

```bash
# 1. Clone the repository
git clone https://github.com/Pietrols/lenda.git
cd lenda

# 2. Install all dependencies across all packages
pnpm install

# 3. Approve build scripts (Prisma, sharp, esbuild need to run scripts)
pnpm approve-builds
# Press 'a' to select all, then Enter, then 'y' to confirm

# 4. Create your local environment files
# Copy the templates and fill in real values
cp deploy/auth.env.template services/auth-service/.env
cp deploy/booking.env.template services/booking-service/.env

# 5. Start PostgreSQL (open Postgres.app and click Start)
# Create the dev database
psql -U postgres -c "CREATE DATABASE lenda_dev;"

# 6. Start Redis via Docker
docker run -d \
  -name lenda_redis_dev \
  -restart unless-stopped \
  -p 6380:6379 \
  redis:7-alpine

# 7. Generate Prisma client and run migrations
cd packages/database
pnpm generate    # generates the TypeScript Prisma client
pnpm migrate     # applies all migrations to lenda_dev
cd ../..

# 8. Build shared packages (must be done before running services)
pnpm -filter @lenda/types build
pnpm -filter @lenda/schemas build
pnpm -filter @lenda/database build

# 9. Start all services
# Terminal 1 - auth service
pnpm -filter auth-service dev

# Terminal 2 - booking service
pnpm -filter booking-service dev

# Terminal 3 - frontend
pnpm -filter web dev
```

The frontend runs at `http://localhost:5173`.
Auth service runs at `http://localhost:3001`.
Booking service runs at `http://localhost:3002`.

### Running Tests

```bash
# All tests across all services
pnpm vitest run

# Just auth service
pnpm -filter auth-service test

# Just booking service
pnpm -filter booking-service test

# Just frontend
pnpm -filter web test
```

Total: 98 tests across auth, booking, listing, review, message, admin, and frontend utils/components.

-

## 6. The Database

### What is a Migration?

A migration is a versioned SQL file that changes the database schema. Instead of manually running `ALTER TABLE` commands, you write a Prisma schema change and Prisma generates the SQL. Every migration is committed to git, so the database schema has a full history.

Migration files live in `packages/database/prisma/migrations/`. Each folder is named with a timestamp and description, and contains a `migration.sql` file with the raw SQL.

### The 6 Migrations

1. **20260319210048_init** - Creates all initial tables: User, Listing, ListingImage, Booking, BookingStatusHistory, Handover, Review
2. **20260319215351_add_profile_fields_and_listing_tier** - Adds fullName, bio, location, photoUrl to User; adds listingTier, subscriptionPlan
3. **20260320125410_add_subscriptions_discovery_badges_notifications** - Adds Badge, Notification models; adds discoveryScore, responseRate to Listing
4. **20260401114223_add_float_account_system** - Adds FloatAccount, FloatTransaction for the commission/earnings system
5. **20260401115532_add_float_low_balance_notification** - Adds LOW_BALANCE notification type enum value
6. **20260402113817_add_booking_messages** - Adds BookingMessage model for in-booking chat

### Key Schema Design Decisions

**Price locking** - `priceSnapshot` on Booking stores the price per day at the time of booking. If a host later changes their listing price, existing bookings are unaffected. This is non-negotiable for legal integrity.

**Status history** - Every booking status change is recorded in `BookingStatusHistory` with who changed it, from what status, to what status, and when. This creates an immutable audit trail.

**Dual-confirm handover** - The Handover model has `guestConfirmed` and `hostConfirmed` boolean fields. A handover is only complete when both parties confirm. This protects both sides in disputes.

**JSONB metadata** - Listings have a `metadata` JSONB column for pillar-specific data (e.g., car listings store make, model, year; property listings store bedrooms, bathrooms). This avoids creating separate tables for each listing type.

**Soft deletes** - Listings have a `deletedAt` timestamp. When a listing is deleted, it is not removed from the database - `deletedAt` is set to the current time. All queries filter for `deletedAt IS NULL`. This preserves historical booking data.

-

## 7. The Backend Services

### Why Two Services Instead of One?

Auth and booking are separated because they have different concerns and could theoretically scale independently. The auth service handles identity and user management; the booking service handles the marketplace logic. In practice on the current server they run side by side.

### Auth Service (Port 3001)

Handles everything related to users and identity:

| Endpoint                   | Method | Purpose                                     |
| -------------------------- | ------ | ------------------------------------------- |
| `/auth/register`           | POST   | Create a new user account                   |
| `/auth/verify-email`       | POST   | Verify email with OTP code                  |
| `/auth/login`              | POST   | Log in, receive access + refresh tokens     |
| `/auth/refresh`            | POST   | Exchange refresh token for new access token |
| `/auth/logout`             | POST   | Invalidate refresh token in Redis           |
| `/auth/me`                 | GET    | Get current user profile                    |
| `/profile`                 | PATCH  | Update profile (name, bio, location, photo) |
| `/admin/users`             | GET    | List all users (admin only)                 |
| `/admin/users/:id`         | GET    | Get full user detail (admin only)           |
| `/admin/users/:id/kyc`     | PATCH  | Approve/reject KYC (admin only)             |
| `/admin/users/:id/badge`   | POST   | Award a badge (admin only)                  |
| `/admin/users/:id/suspend` | PATCH  | Suspend or unsuspend a user (admin only)    |

### Booking Service (Port 3002)

Handles everything related to the marketplace:

| Endpoint                        | Method | Purpose                                |
| ------------------------------- | ------ | -------------------------------------- |
| `/listings`                     | GET    | Browse listings with filters           |
| `/listings`                     | POST   | Create a new listing (HOST only)       |
| `/listings/:id`                 | GET    | Get a single listing                   |
| `/listings/:id`                 | PATCH  | Update a listing (owner only)          |
| `/listings/:id`                 | DELETE | Soft delete a listing (owner only)     |
| `/bookings`                     | POST   | Create a booking (GUEST only)          |
| `/bookings`                     | GET    | Get bookings for current user          |
| `/bookings/:id`                 | GET    | Get a single booking with full history |
| `/bookings/:id/status`          | PATCH  | Transition booking status              |
| `/bookings/:id/messages`        | POST   | Send a message                         |
| `/bookings/:id/messages`        | GET    | Get all messages                       |
| `/bookings/:id/messages/unread` | GET    | Get unread message count               |
| `/reviews`                      | POST   | Submit a review                        |
| `/reviews/user/:id`             | GET    | Get reviews for a user                 |
| `/admin/listings`               | GET    | Get all listings (admin only)          |
| `/admin/bookings`               | GET    | Get all bookings (admin only)          |

### Authentication Flow

Lenda uses JWT (JSON Web Tokens) for authentication. Here is how it works:

1. User logs in with email and password
2. Server verifies password with bcrypt (a one-way hashing algorithm - passwords are never stored in plain text)
3. Server issues two tokens:
   - **Access token** - expires in 15 minutes, used for API calls
   - **Refresh token** - expires in 7 days, stored in Redis
4. Frontend stores both tokens in Zustand (in memory, not localStorage)
5. Every API call includes the access token in the `Authorization: Bearer <token>` header
6. When the access token expires (401 response), the frontend automatically sends the refresh token to get a new access token
7. On logout, the refresh token is deleted from Redis, invalidating the session

### How Middleware Works

Middleware is code that runs between receiving a request and handling it. Think of it as a pipeline:

```
Request → authenticate → validate body → route handler → Response
```

The `authenticate` middleware:

1. Reads the `Authorization` header
2. Verifies the JWT signature and expiry
3. Attaches the decoded user (id, roles) to `req.user`
4. If invalid, returns 401 before the handler ever runs

The `requireRole` middleware:

1. Checks `req.user.roles` contains the required role
2. If not, returns 403 before the handler runs

-

## 8. The Frontend

### Routing

React Router handles client-side navigation. Key routes:

```
/                   HomePage
/listings           ListingsPage (browse + search + filter)
/listings/:id       ListingDetailPage
/login              LoginPage
/register           RegisterPage
/dashboard          DashboardPage (bookings list)
/dashboard/:id      DashboardBookingDetail (booking detail + messages + reviews)
/host/listings      HostListingsPage
/host/create        CreateListingPage
/admin              AdminLayout
/admin/users        AdminUsers
/admin/users/:id    AdminUserDetail
/admin/bookings     AdminBookings
/admin/listings     AdminListings
```

### The API Client

`apps/web/src/api/client.ts` is the single point of communication with the backend. It:

1. Reads `VITE_API_AUTH_URL` and `VITE_API_BOOKING_URL` from environment variables
2. Attaches the access token from Zustand to every request
3. If a 401 is returned, automatically tries to refresh the token once
4. If refresh fails, clears auth state and redirects to `/login`

All API calls go through this client - never call `fetch` directly in components.

### State Management

**Zustand** (`apps/web/src/store/auth.store.ts`) - holds:

- `user` - the current user object
- `tokens` - access token and refresh token
- `setAuth(user, tokens)` - called after login/register
- `clearAuth()` - called on logout

**TanStack Query** - manages server data:

- Listings, bookings, reviews, messages are all fetched and cached via TanStack Query
- Mutations (create booking, send message, etc.) invalidate the relevant caches
- 10-second polling is used for booking messages (no WebSocket needed for MVP)

### Environment Variables

The frontend uses Vite's env variable system. Variables must be prefixed with `VITE_` to be available in the browser (unprefixed variables are server-only).

```
VITE_API_AUTH_URL      - base URL for auth service
VITE_API_BOOKING_URL   - base URL for booking service
VITE_GROQ_API_KEY      - API key for the AI chatbot (Groq LLama)
```

In development: `apps/web/.env`
In production: `apps/web/.env.production`

-

## 9. Oracle Cloud

### What is Oracle Cloud?

Oracle Cloud Infrastructure (OCI) is a cloud computing platform - like AWS or Google Cloud but with a genuinely free permanent tier (Always Free).

### Always Free Tier

Oracle's Always Free tier includes:

- **2 AMD micro instances** (VM.Standard.E2.1.Micro) - 1 OCPU, 1GB RAM each
- **ARM Ampere instances** (VM.Standard.A1.Flex) - up to 4 OCPUs and 24GB RAM total, shared across all ARM instances
- **200GB block storage** total
- These resources never expire

Lenda currently runs on an AMD micro. An ARM instance hunt script is running in the background - when ARM capacity becomes available, Lenda will migrate to ARM for better performance.

### Understanding Oracle IDs

Oracle uses OCIDs (Oracle Cloud Identifiers) to uniquely identify every resource. They look like:

```
ocid1.instance.oc1.me-abudhabi-1.anqxkljrw5dtycqc3qlydugtq5hq2fe5uac6ynpnrj4znw56z7wdikg356fa
```

Breaking this down:

- `ocid1` - version of the OCID format
- `instance` - the resource type (could be subnet, vcn, tenancy, user, etc.)
- `oc1` - Oracle Cloud realm
- `me-abudhabi-1` - the region (UAE Central, Abu Dhabi)
- The rest - a unique hash for this specific resource

### Key Oracle Concepts

**Tenancy** - your Oracle Cloud account. Everything you create lives within your tenancy.

**Compartment** - a logical container for organising resources. Lenda uses the root compartment (`kabambapeter3`).

**Region** - a geographic location where Oracle operates data centres. Lenda is in `me-abudhabi-1` (UAE Central).

**Availability Domain (AD)** - a data centre within a region. UAE Central has one: `AD-1`. ARM capacity issues are per-AD.

**VCN (Virtual Cloud Network)** - a private network for your cloud resources, like a virtual LAN. Created as `vcn-20260404-1122`.

**Subnet** - a subdivision of the VCN. The server lives in `subnet-20260404-1122`.

**Security List** - a firewall at the VCN level that controls inbound and outbound traffic. Rules added:

- Port 22 (SSH) - to connect to the server remotely
- Port 80 (HTTP) - for web traffic
- Port 443 (HTTPS) - for secure web traffic

**OCPU** - Oracle Compute Unit. Approximately equivalent to 1 CPU thread on a modern Intel/AMD processor.

-

## 10. Server Setup

This section documents every command run during initial server setup, with explanations of what each does.

### SSH Access

SSH (Secure Shell) is how you connect to the remote server from your Mac. The `-i` flag specifies the private key file.

```bash
ssh -i ~/.ssh/lenda-oracle.key ubuntu@129.151.136.212
```

- `~/.ssh/lenda-oracle.key` - the private key downloaded from Oracle during instance creation
- `ubuntu` - the default username on Oracle Ubuntu instances
- `129.151.136.212` - the public IP address of the server

### Installing Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

- `curl` - a tool to download files from URLs
- `-fsSL` - flags: fail silently on error (`-f`), suppress progress (`-s`), follow redirects (`-L`), show errors (`-S`)
- `| sudo -E bash -` - pipe the downloaded script into bash, running it as root (`sudo`), preserving environment variables (`-E`)
- This adds the NodeSource repository and installs Node.js 20

### Installing pnpm and PM2

```bash
sudo npm install -g pnpm pm2
```

- `npm install -g` - install globally, making the command available system-wide
- `pnpm` - package manager (faster than npm)
- `pm2` - process manager for Node.js

### Installing Nginx

```bash
sudo apt install -y nginx
```

- `apt` - Ubuntu's package manager (Advanced Package Tool)
- `-y` - automatically answer yes to prompts
- Nginx starts automatically after installation and is enabled to start on reboot

### Installing Docker

```bash
sudo apt install -y docker.io
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ubuntu
```

- `systemctl enable docker` - tells systemd (Ubuntu's init system) to start Docker automatically on boot
- `systemctl start docker` - starts Docker immediately
- `usermod -aG docker ubuntu` - adds the `ubuntu` user to the `docker` group, allowing Docker commands without `sudo`. Requires logout/login to take effect.

### Starting Redis

```bash
sudo docker run -d \
  -name lenda_redis \
  -restart unless-stopped \
  -p 6380:6379 \
  redis:7-alpine
```

- `docker run` - create and start a container
- `-d` - detached mode (runs in the background)
- `-name lenda_redis` - gives the container a name so you can reference it later
- `-restart unless-stopped` - automatically restart the container if it crashes or the server reboots, unless you explicitly stop it
- `-p 6380:6379` - maps port 6380 on the host to port 6379 inside the container (format is `host:container`)
- `redis:7-alpine` - the Docker image to use (Redis version 7, alpine Linux base for small size)

### Installing and Configuring PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

Creating the database and user:

```bash
sudo -u postgres psql << 'SQL'
CREATE USER lenda WITH PASSWORD 'LendaProd2026!';
CREATE DATABASE lenda_prod OWNER lenda;
GRANT ALL PRIVILEGES ON DATABASE lenda_prod TO lenda;
SQL
```

- `sudo -u postgres` - run the following command as the `postgres` system user (PostgreSQL's default superuser)
- `psql` - PostgreSQL's command-line client
- `<< 'SQL' ... SQL` - a heredoc, a way to pass multiple lines of input to a command
- `CREATE USER` - creates a database user (separate from the Linux system user)
- `CREATE DATABASE ... OWNER lenda` - creates the database and sets the `lenda` user as its owner
- `GRANT ALL PRIVILEGES` - gives the `lenda` user full access to the database

### Opening OS Firewall Ports

Oracle has two layers of firewall - the cloud security list (configured in the Oracle Console) and the OS-level iptables firewall. Both must allow traffic.

```bash
sudo iptables -I INPUT 6 -m state -state NEW -p tcp -dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state -state NEW -p tcp -dport 443 -j ACCEPT
sudo netfilter-persistent save
```

- `iptables` - the Linux firewall tool
- `-I INPUT 6` - insert a rule at position 6 in the INPUT chain. CRITICAL: the default Oracle setup has a REJECT ALL rule. Rules are evaluated top to bottom, so position matters. New rules must go BEFORE the REJECT rule.
- `-m state -state NEW` - only match new connections (not established ones, which are handled by an earlier rule)
- `-p tcp` - match TCP protocol
- `-dport 80` - match traffic destined for port 80
- `-j ACCEPT` - the action: accept the packet
- `netfilter-persistent save` - saves the rules to disk so they survive a reboot

**The REJECT rule problem** - Oracle's default iptables configuration has a `REJECT all` rule that blocks everything not explicitly allowed above it. If your HTTP/HTTPS rules are inserted AFTER the REJECT rule, they are never reached. The symptom is: Nginx is running, but external requests fail. Fix:

```bash
# Check current rules with line numbers
sudo iptables -L INPUT -line-numbers

# If REJECT is at position 5 and your ACCEPT rules are at 6+, delete the REJECT rule
sudo iptables -D INPUT 5

# Re-add REJECT at the end (after your ACCEPT rules)
sudo iptables -A INPUT -j REJECT -reject-with icmp-host-prohibited

# Save
sudo netfilter-persistent save
```

### Running Database Migrations

```bash
cd packages/database
DATABASE_URL='postgresql://lenda:LendaProd2026!@localhost:5432/lenda_prod' pnpm migrate:deploy
```

- `DATABASE_URL=...` - sets an environment variable for this command only (overrides the .env file)
- Single quotes around the URL prevent bash from interpreting the `!` character as a history event
- `pnpm migrate:deploy` runs `prisma migrate deploy` which applies all pending migrations to the production database without prompting

-

## 11. Nginx

Nginx is the gateway to the entire server. Every request that arrives at port 80 or 443 goes through Nginx first.

### Configuration File

Location: `/etc/nginx/sites-available/lenda`

```nginx
server {
    listen 80;
    server_name lenda.work www.lenda.work 129.151.136.212;

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
}
```

After certbot runs, it automatically adds SSL configuration blocks to this file.

### Explaining the Config

- `listen 80` - listen on port 80 (HTTP). Certbot adds `listen 443 ssl` automatically.
- `server_name` - which domain names this server block handles
- `location /api/auth/` - match any request starting with `/api/auth/`
- `proxy_pass http://localhost:3001/` - forward the request to auth-service running locally on port 3001. The trailing slash is important - it strips the `/api/auth/` prefix before forwarding.
- `proxy_set_header` lines - pass the original client's IP and other info through to the Node service

### How the Symlink Works

Nginx reads configs from `/etc/nginx/sites-enabled/`. The actual file is in `sites-available/`. A symlink connects them:

```bash
sudo ln -s /etc/nginx/sites-available/lenda /etc/nginx/sites-enabled/
```

This pattern lets you disable a site by removing the symlink without deleting the config.

### Testing and Reloading Nginx

```bash
# Test the config for syntax errors (always do this before reloading)
sudo nginx -t

# Reload nginx with new config (zero downtime)
sudo systemctl reload nginx

# Full restart (causes brief downtime)
sudo systemctl restart nginx
```

-

## 12. PM2

PM2 keeps Node.js processes running as background system services.

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
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
    {
      name: "lenda-booking",
      cwd: "/home/ubuntu/lenda/services/booking-service",
      script: "dist/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
        PORT: 3002,
      },
    },
  ],
};
```

- `cwd` - the working directory the process runs in
- `script` - the entry point file (TypeScript is compiled to JavaScript in `dist/`)
- `autorestart` - restart the process if it crashes
- `max_memory_restart` - restart if memory usage exceeds 400MB (protects against memory leaks)
- `env` - environment variables set for this process

### Essential PM2 Commands

```bash
# Start all apps defined in ecosystem config
pm2 start ecosystem.config.js

# Check status of all running processes
pm2 status

# View logs for a specific app
pm2 logs lenda-auth
pm2 logs lenda-booking

# View last 100 lines of logs
pm2 logs lenda-auth -lines 100

# Restart a specific app
pm2 restart lenda-auth

# Restart all apps
pm2 restart all

# Stop an app
pm2 stop lenda-auth

# Delete an app from PM2 list
pm2 delete lenda-auth

# Save current process list (persist across reboots)
pm2 save

# Generate startup script (run once after initial setup)
pm2 startup
# Then run the command it outputs
```

### Startup on Reboot

PM2 uses systemd to ensure services start on server reboot:

```bash
pm2 startup
# This outputs a command like:
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu -hp /home/ubuntu

# Run that command, then save the process list
pm2 save
```

-

## 13. SSL

SSL (Secure Sockets Layer) / TLS encrypts traffic between the user's browser and the server. Without it, all data (including passwords) travels in plain text. HTTPS is SSL over HTTP.

### Certbot

Certbot is a free tool by the Electronic Frontier Foundation (EFF) that automates getting SSL certificates from Let's Encrypt.

```bash
sudo certbot -nginx -d lenda.work -d www.lenda.work
```

- `-nginx` - use the Nginx plugin, which automatically modifies the Nginx config to use the certificate
- `-d lenda.work -d www.lenda.work` - issue the certificate for both the bare domain and the www subdomain

Certbot places the certificate files at:

- `/etc/letsencrypt/live/lenda.work/fullchain.pem` - the certificate chain
- `/etc/letsencrypt/live/lenda.work/privkey.pem` - the private key

### Automatic Renewal

Certbot installs a systemd timer that runs twice daily and renews certificates that are within 30 days of expiry. Certificates expire every 90 days.

```bash
# Test that renewal would work (dry run, no actual renewal)
sudo certbot renew -dry-run

# Check certbot timer status
systemctl status certbot.timer
```

-

## 14. The Domain

`lenda.work` was registered at Namecheap for $3.18/year.

### DNS Records

Configured in Namecheap's Advanced DNS panel:

| Type     | Host | Value           | Purpose                             |
| -------- | ---- | --------------- | ----------------------------------- |
| A Record | @    | 129.151.136.212 | Points lenda.work to the server     |
| A Record | www  | 129.151.136.212 | Points www.lenda.work to the server |

An A record maps a domain name to an IPv4 address. The `@` symbol represents the root domain (`lenda.work`).

DNS changes propagate across the internet within minutes to hours. You can check propagation:

```bash
# From your Mac
nslookup lenda.work
dig lenda.work A
```

-

## 15. The Frontend Host - Netlify

The React frontend is hosted on Netlify at `https://lendaapp.netlify.app`.

### Why Not Serve Frontend from the Oracle Server?

The Oracle AMD micro has 1GB RAM. Building the React frontend (TypeScript compilation + Vite bundling) crashed the server due to insufficient memory. Netlify solves this - it builds and serves the frontend, the server only handles API requests.

### Automatic Deploys

Every push to the `main` branch on GitHub triggers a Netlify rebuild and deploy. The build command Netlify runs:

```
pnpm run build
```

The publish directory: `apps/web/dist`

### The `_redirects` File

React uses client-side routing - the browser never actually navigates to `/login`, it just updates the URL and React renders the login component. But if you refresh the page at `/login`, Netlify looks for a file at that path, finds nothing, and returns 404.

The `_redirects` file at `apps/web/public/_redirects` fixes this:

```
/* /index.html 200
```

This tells Netlify: for any URL, serve `index.html` with a 200 status. React Router then reads the URL and renders the correct page.

### Environment Variables

Set in Netlify dashboard → Site Configuration → Environment Variables:

```
VITE_API_AUTH_URL     = https://lenda.work/api/auth
VITE_API_BOOKING_URL  = https://lenda.work/api/booking
VITE_GROQ_API_KEY     = [secret]
```

-

## 16. Full Deployment Flow - Code to Live

This is the complete process for deploying a code change.

### For Frontend Changes

```bash
# 1. Make changes locally and test
pnpm -filter web dev

# 2. Run tests
pnpm -filter web test

# 3. Commit and push
git add .
git commit -m "feat: describe your change"
git push origin main

# Netlify automatically detects the push, builds, and deploys.
# Takes 2-3 minutes. Monitor at netlify.com dashboard.
```

### For Backend Changes

```bash
# 1. Make changes locally and test
pnpm -filter auth-service dev
pnpm -filter auth-service test

# 2. Commit and push
git add .
git commit -m "feat: describe your change"
git push origin main

# 3. SSH into the server
ssh -i ~/.ssh/lenda-oracle.key ubuntu@129.151.136.212

# 4. Pull the latest code
cd ~/lenda
git pull origin main

# 5. Build the changed service
pnpm -filter auth-service build
# or
pnpm -filter booking-service build

# 6. Restart the service
pm2 restart lenda-auth
# or
pm2 restart lenda-booking

# 7. Verify it's running
pm2 status
pm2 logs lenda-auth -lines 20
```

### For Database Schema Changes

```bash
# 1. Modify packages/database/prisma/schema.prisma locally

# 2. Generate and apply the migration locally
cd packages/database
pnpm migrate   # creates migration file and applies it to lenda_dev

# 3. Commit the migration file
git add .
git commit -m "feat: describe schema change"
git push origin main

# 4. SSH into server
ssh -i ~/.ssh/lenda-oracle.key ubuntu@129.151.136.212

# 5. Pull and apply migration
cd ~/lenda
git pull origin main
cd packages/database
DATABASE_URL='postgresql://lenda:LendaProd2026!@localhost:5432/lenda_prod' pnpm migrate:deploy

# 6. Rebuild and restart affected services
cd ~/lenda
pnpm -filter auth-service build
pnpm -filter booking-service build
pm2 restart all
```

-

## 17. How Requests Flow at Runtime

### Example: User logs in

1. User enters email and password at `https://lendaapp.netlify.app/login`
2. React calls `api.post('/auth/login', { email, password })` via the API client
3. API client sends `POST https://lenda.work/api/auth/auth/login`
4. Request arrives at Oracle server on port 443 (HTTPS)
5. Nginx decrypts the SSL, sees the path starts with `/api/auth/`, forwards to `localhost:3001/auth/login`
6. auth-service receives the request
7. auth-service queries PostgreSQL: `SELECT * FROM users WHERE email = ?`
8. bcrypt compares the submitted password with the stored hash
9. On success, auth-service generates an access token (JWT, expires 15m) and a refresh token
10. Refresh token is stored in Redis with the user ID
11. auth-service returns `{ user, tokens }` to Nginx
12. Nginx returns the response to the browser over HTTPS
13. React stores the user and tokens in Zustand
14. React Router navigates to `/dashboard`

### Example: Guest creates a booking

1. Guest selects dates and submits the booking form
2. React calls `api.post('/bookings', bookingData, accessToken)` with booking-service base URL
3. Request goes to `POST https://lenda.work/api/booking/bookings`
4. Nginx forwards to `localhost:3002/bookings`
5. booking-service middleware verifies the JWT
6. booking-service checks the listing exists and is ACTIVE
7. booking-service checks for overlapping bookings
8. booking-service creates the booking in a PostgreSQL transaction:
   - Creates the Booking record with status PENDING
   - Creates a BookingStatusHistory record
9. Returns the created booking
10. React updates the TanStack Query cache and shows the booking in the dashboard

-

## 18. What Happens When the Server Restarts

When the Oracle VM reboots (planned maintenance, power event, or manual restart):

1. **Ubuntu boots** - Linux starts, systemd initialises services
2. **PostgreSQL starts** - enabled with `systemctl enable postgresql`, starts automatically
3. **Docker starts** - enabled with `systemctl enable docker`, starts automatically
4. **Redis container starts** - the container has `-restart unless-stopped`, so Docker restarts it
5. **PM2 starts** - the `pm2-ubuntu` systemd service is enabled, it reads the saved process list and starts `lenda-auth` and `lenda-booking`
6. **Nginx starts** - enabled during installation, starts automatically and loads the lenda site config
7. All services are back up within ~30 seconds. No manual intervention needed.

### Verifying After a Restart

```bash
ssh -i ~/.ssh/lenda-oracle.key ubuntu@129.151.136.212

# Check all services
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql
sudo docker ps

# Test the API
curl https://lenda.work/api/auth/health
curl https://lenda.work/api/booking/health
```

-

## 19. Server Management

### Checking Server Health

```bash
# Memory usage
free -h

# Disk usage
df -h

# CPU and memory per process
top
# or for a better view:
htop

# Check all running services
pm2 status

# PM2 resource usage
pm2 monit
```

### Viewing Logs

```bash
# Live logs for auth service
pm2 logs lenda-auth

# Live logs for booking service
pm2 logs lenda-booking

# Last 50 lines
pm2 logs lenda-auth -lines 50

# Nginx access log
sudo tail -f /var/log/nginx/access.log

# Nginx error log
sudo tail -f /var/log/nginx/error.log

# PostgreSQL log
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### Restarting Services

```bash
# Restart a PM2 app (zero-downtime for the other service)
pm2 restart lenda-auth
pm2 restart lenda-booking
pm2 restart all

# Restart Nginx (use reload for zero-downtime config changes)
sudo systemctl reload nginx
sudo systemctl restart nginx

# Restart PostgreSQL
sudo systemctl restart postgresql

# Restart Redis container
sudo docker restart lenda_redis
```

### Connecting to PostgreSQL

```bash
# Connect as the lenda user
psql postgresql://lenda:LendaProd2026!@localhost:5432/lenda_prod

# Useful psql commands once connected
\dt              # list all tables
\d users         # describe the users table
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM bookings;
\q               # quit
```

### Checking Redis

```bash
sudo docker exec -it lenda_redis redis-cli

# Useful redis-cli commands
PING             # should return PONG
KEYS *           # list all keys
TTL key_name     # check remaining TTL on a key
\q               # quit
```

-

## 20. Environment Variables - Complete Reference

### Auth Service (`services/auth-service/.env`)

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://lenda:LendaProd2026!@localhost:5432/lenda_prod
REDIS_URL=redis://localhost:6380
JWT_ACCESS_SECRET=<32+ character random string>
JWT_REFRESH_SECRET=<different 32+ character random string>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
OTP_EXPIRES_MINUTES=10
OTP_MAX_ATTEMPTS=5
SENDGRID_API_KEY=<sendgrid api key>
EMAIL_FROM=noreply@lenda.work
CORS_ORIGINS=https://lendaapp.netlify.app,https://lenda.work
SUPABASE_URL=https://tfdbgtwlqhozmewatcpm.supabase.co
SUPABASE_ANON_KEY=<supabase anon key>
SUPABASE_SERVICE_ROLE_KEY=<supabase service role key>
```

### Booking Service (`services/booking-service/.env`)

```env
NODE_ENV=production
PORT=3002
DATABASE_URL=postgresql://lenda:LendaProd2026!@localhost:5432/lenda_prod
REDIS_URL=redis://localhost:6380
AUTH_URL=http://localhost:3001
JWT_ACCESS_SECRET=<same as auth service>
JWT_REFRESH_SECRET=<same as auth service>
CORS_ORIGINS=https://lendaapp.netlify.app,https://lenda.work
SUPABASE_URL=https://tfdbgtwlqhozmewatcpm.supabase.co
SUPABASE_ANON_KEY=<supabase anon key>
SUPABASE_SERVICE_ROLE_KEY=<supabase service role key>
```

### Frontend (set in Netlify Dashboard)

```env
VITE_API_AUTH_URL=https://lenda.work/api/auth
VITE_API_BOOKING_URL=https://lenda.work/api/booking
VITE_GROQ_API_KEY=<groq api key>
```

-

## 21. ARM Migration

An ARM instance (VM.Standard.A1.Flex, 2 OCPU, 12GB RAM) is far superior to the current AMD micro (1 OCPU, 1GB RAM). A hunt script runs on the developer's Mac to claim ARM capacity when it becomes available.

When the ARM instance is created, migrate as follows:

### 1. Set Up the ARM Instance

SSH into the new ARM instance and run the full setup from Section 10 (installing Node, pnpm, PM2, Nginx, Docker, PostgreSQL, Redis).

### 2. Transfer Environment Files

From your Mac:

```bash
# Copy env files from AMD to your Mac
scp -i ~/.ssh/lenda-oracle.key ubuntu@AMD_IP:~/lenda/services/auth-service/.env ./auth.env
scp -i ~/.ssh/lenda-oracle.key ubuntu@AMD_IP:~/lenda/services/booking-service/.env ./booking.env

# Copy env files from Mac to ARM
scp -i ~/.ssh/lenda-oracle.key ./auth.env ubuntu@ARM_IP:~/lenda/services/auth-service/.env
scp -i ~/.ssh/lenda-oracle.key ./booking.env ubuntu@ARM_IP:~/lenda/services/booking-service/.env
```

### 3. Export and Import the Database

On AMD server:

```bash
pg_dump -U lenda -d lenda_prod -h localhost > /tmp/lenda_backup.sql
```

Transfer to ARM:

```bash
scp -i ~/.ssh/lenda-oracle.key ubuntu@AMD_IP:/tmp/lenda_backup.sql ./lenda_backup.sql
scp -i ~/.ssh/lenda-oracle.key ./lenda_backup.sql ubuntu@ARM_IP:/tmp/lenda_backup.sql
```

On ARM server:

```bash
psql postgresql://lenda:LendaProd2026!@localhost:5432/lenda_prod < /tmp/lenda_backup.sql
```

### 4. Update DNS

In Namecheap Advanced DNS, update both A records to point to the ARM instance's public IP.

### 5. Terminate AMD Instance

Once confirmed working on ARM, terminate the AMD micro in the Oracle Console to avoid using both free tier allocations.

-

## 22. Troubleshooting Guide

### "Connection refused" on port 80/443

Check both firewall layers:

```bash
# OS firewall - check for misplaced REJECT rule
sudo iptables -L INPUT -line-numbers
# REJECT should be at the bottom, AFTER the ACCEPT rules for 80/443

# Nginx status
sudo systemctl status nginx
sudo nginx -t
```

### PM2 service won't start

```bash
# Check logs for the error
pm2 logs lenda-auth -lines 50

# Common causes:
# 1. Missing .env file
ls ~/lenda/services/auth-service/.env

# 2. TypeScript not compiled
ls ~/lenda/services/auth-service/dist/index.js

# 3. Wrong port already in use
sudo lsof -i :3001
sudo lsof -i :3002
```

### Database connection error

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection manually
psql 'postgresql://lenda:LendaProd2026!@localhost:5432/lenda_prod' -c "SELECT 1"
```

### Redis connection error

```bash
# Check Redis container is running
sudo docker ps | grep lenda_redis

# If stopped, restart it
sudo docker start lenda_redis

# Test connection
sudo docker exec -it lenda_redis redis-cli ping
```

### Frontend getting CORS errors

The backend CORS_ORIGINS must include the Netlify URL:

```bash
sudo nano ~/lenda/services/auth-service/.env
# CORS_ORIGINS=https://lendaapp.netlify.app,https://lenda.work

sudo nano ~/lenda/services/booking-service/.env
# Same CORS_ORIGINS

pm2 restart all
```

### SSL certificate expired

```bash
sudo certbot renew
sudo systemctl reload nginx
```

### Out of disk space

```bash
# Check disk usage
df -h

# Check what's using space
sudo du -sh /var/log/*
sudo du -sh ~/lenda/node_modules

# Clear PM2 logs
pm2 flush

# Clear old apt packages
sudo apt autoremove
sudo apt clean
```

-

## Summary - Deployed Infrastructure

| Component       | Technology              | Location                  | Purpose                  |
| --------------- | ----------------------- | ------------------------- | ------------------------ |
| Frontend        | React + Vite            | Netlify CDN               | User interface           |
| Auth API        | Node.js + Express       | Oracle AMD (port 3001)    | Identity + users         |
| Booking API     | Node.js + Express       | Oracle AMD (port 3002)    | Marketplace logic        |
| Database        | PostgreSQL 14           | Oracle AMD (port 5432)    | Persistent data          |
| Cache           | Redis 7 (Docker)        | Oracle AMD (port 6380)    | Sessions + rate limiting |
| Reverse Proxy   | Nginx                   | Oracle AMD (ports 80/443) | SSL + routing            |
| Process Manager | PM2                     | Oracle AMD                | Keep services running    |
| SSL Certificate | Let's Encrypt + Certbot | Oracle AMD                | HTTPS encryption         |
| Image Storage   | Supabase Storage        | Supabase cloud            | Profile + listing photos |
| Domain          | lenda.work              | Namecheap                 | Human-readable address   |
| Source Control  | Git + GitHub            | github.com/Pietrols/lenda | Code versioning          |

-

_Document last updated: April 2026. Maintained by Pietrols Enterprise Ltd._
