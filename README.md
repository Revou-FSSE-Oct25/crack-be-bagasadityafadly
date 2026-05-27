# 🏋 Gymora — Backend API

> REST API for the **Gymora** gym management and booking platform  
> Built with **NestJS 11** · **Prisma v5** · **PostgreSQL (Supabase)** · Deployed on **Render**

[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs)](https://nestjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?logo=supabase)](https://supabase.com)
[![Deploy](https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render)](https://render.com)

| | Link |
|---|---|
| 🔗 **API Base URL** | `https://gymora-api.onrender.com/api/v1` |
| 📖 **Swagger Docs** | `https://gymora-api.onrender.com/api/docs` |
| 🖥️ **Frontend** | [https://crack-fe-bagasadityafadly.vercel.app](https://crack-fe-bagasadityafadly.vercel.app) |

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Database Design](#database-design)
4. [Database Models](#database-models)
5. [API Modules & Endpoints](#api-modules--endpoints)
6. [Request & Response Format](#request--response-format)
7. [Authentication Flow](#authentication-flow)
8. [Role-Based Access Control](#role-based-access-control)
9. [Key Design Decisions](#key-design-decisions)
10. [Project Structure](#project-structure)
11. [Local Development](#local-development)
12. [Environment Variables](#environment-variables)
13. [Default Seeded Accounts](#default-seeded-accounts)
14. [Swagger Documentation](#swagger-documentation)
15. [Scripts](#scripts)
16. [Deployment](#deployment)
17. [Security Measures](#security-measures)
18. [Author](#author)

---

## Overview

Gymora is a full-stack gym management application. This repository contains the **backend REST API** responsible for:

- **Authentication** — JWT-based register/login, forgot & reset password
- **Membership management** — TRIAL, BASIC, PREMIUM plans with expiry tracking
- **Bookings** — GYM visits, GROUP classes, and PERSONAL TRAINING with capacity enforcement
- **Guest booking** — Public endpoint allowing non-registered users to book a gym visit and receive a QR entry code
- **XP & gamification** — XP points, levels, streaks, leaderboard, badges, rewards, challenges
- **Personalised recommendations** — Class suggestions based on body assessment data
- **Google Calendar sync** — OAuth 2.0 integration to add bookings as calendar events
- **Admin panel** — Full CRUD for users, memberships, bookings, classes, schedules, and trainers

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | NestJS | 11 |
| Language | TypeScript | 5.7 |
| ORM | Prisma | 5.22 |
| Database | PostgreSQL (Supabase) | 15 |
| Auth | JWT (`@nestjs/jwt` + `passport-jwt`) | — |
| Password hashing | bcrypt | 6 |
| Validation | class-validator + class-transformer | — |
| API docs | Swagger (`@nestjs/swagger`) | — |
| Security | Helmet + CORS + Throttler | — |
| Compression | compression (gzip) | — |
| Deployment | Render (free tier) | — |

---

## Database Design

> 📸 **Place your database schema screenshot below.**  
> Recommended: open **Prisma Studio** (`npx prisma studio`) or export an ERD from [dbdiagram.io](https://dbdiagram.io), take a screenshot, save it as `docs/db-schema.png`, and replace the placeholder below.

<!-- ================================================================
     SCREENSHOT PLACEHOLDER
     1. Create the folder:   mkdir -p docs
     2. Save your image as:  docs/db-schema.png
     3. The line below will then display it automatically
     ================================================================ -->

![Database Schema — Entity Relationship Diagram](docs/db-schema.png)

*Entity-Relationship Diagram — 16 tables, their columns, data types, and foreign-key relationships.*

---

## Database Models

The schema contains **16 models** split across three functional areas.

### Core Models

| Model | Table | Description |
|---|---|---|
| `User` | `users` | Platform accounts. Stores XP total, level, streak, Google OAuth tokens, and password-reset state. |
| `Membership` | `memberships` | A user's subscription record (TRIAL / BASIC / PREMIUM). One user can have multiple records; only `ACTIVE` ones count. |
| `Trainer` | `trainers` | Personal trainers who lead class sessions and PT bookings. |
| `Class` | `classes` | A class type (e.g. *Morning Yoga*) with capacity, difficulty, duration, and calorie estimate. |
| `Schedule` | `schedules` | A specific occurrence of a class at a date/time, with a trainer and optional room/zone. |
| `Booking` | `bookings` | A user's reservation — type `GYM`, `CLASS`, or `PT`. Stores QR code and Google Calendar event ID. |
| `AttendanceLog` | `attendance_logs` | Records each physical check-in (QR scan or manual), and the XP awarded. |

### XP & Gamification Models

| Model | Table | Description |
|---|---|---|
| `XpHistory` | `xp_histories` | Audit trail of every XP gain (source: BOOKING, ATTENDANCE, STREAK, CHALLENGE, BONUS, ASSESSMENT). |
| `Badge` | `badges` | Achievements that can be earned (e.g. *First Step*, *Week Warrior*). |
| `UserBadge` | `user_badges` | Join table tracking which badges each user has earned and when. |
| `Reward` | `rewards` | Redeemable perks (e.g. protein drink, guest pass) with XP cost and stock. |
| `UserReward` | `user_rewards` | Records of reward redemptions, including generated coupon codes. |
| `Challenge` | `challenges` | Goal-based tasks (e.g. *Check in 10 times in 30 days*) with XP rewards. |
| `ChallengeProgress` | `challenge_progress` | Tracks each user's progress and completion status per challenge. |

### Fitness Profile Models

| Model | Table | Description |
|---|---|---|
| `BodyAssessment` | `body_assessments` | Optional user-submitted fitness data: weight, height, body-fat %, goal, workout level, and preferred session time. Used to generate personalised class recommendations. |
| `WorkoutProgram` | `workout_programs` | Personalised workout plans stored as structured JSON. |

### Enum Reference

| Enum | Values |
|---|---|
| `Role` | `ADMIN` · `MEMBER` · `NON_MEMBER` |
| `MembershipType` | `BASIC` · `PREMIUM` · `TRIAL` · `NONE` |
| `MembershipStatus` | `ACTIVE` · `EXPIRED` · `SUSPENDED` · `CANCELLED` |
| `BookingType` | `GYM` · `CLASS` · `PT` |
| `BookingStatus` | `PENDING` · `CONFIRMED` · `CANCELLED` · `COMPLETED` · `NO_SHOW` |
| `WorkoutLevel` | `BEGINNER` · `INTERMEDIATE` · `ADVANCED` |
| `GoalType` | `MUSCLE_GAIN` · `FAT_LOSS` · `MAINTAIN` · `ENDURANCE` · `FLEXIBILITY` |
| `PreferredTime` | `MORNING` · `AFTERNOON` · `EVENING` · `FLEXIBLE` |
| `XPSource` | `BOOKING` · `ATTENDANCE` · `STREAK` · `CHALLENGE` · `BONUS` · `ASSESSMENT` |

---

## API Modules & Endpoints

All routes are prefixed with `/api/v1`.

> 🌐 Public &nbsp;|&nbsp; 🔒 Requires JWT &nbsp;|&nbsp; 🛡️ ADMIN role required

---

### Auth — `/api/v1/auth`

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/auth/register` | 🌐 | Create a new account. Returns `access_token` + user object. |
| `POST` | `/auth/login` | 🌐 | Login with email + password. Returns `access_token` + user object. |
| `GET` | `/auth/me` | 🔒 | Returns the authenticated user's full profile. |
| `POST` | `/auth/forgot-password` | 🌐 | Generates a password-reset token and stores it in the database. |
| `POST` | `/auth/reset-password` | 🌐 | Accepts `token` + new `password`, updates the account. |

---

### Users — `/api/v1/users`

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/users/me` | 🔒 | Returns the current user's profile including their active membership details. |

---

### Bookings — `/api/v1/bookings`

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/bookings` | 🔒 | Create a booking. `GYM` — any logged-in user. `CLASS` / `PT` — MEMBER or ADMIN only. |
| `GET` | `/bookings/my` | 🔒 | List all bookings belonging to the authenticated user. |
| `GET` | `/bookings/:id` | 🔒 | Get a single booking. Users can only fetch their own bookings. |
| `PATCH` | `/bookings/:id/cancel` | 🔒 | Cancel a PENDING or CONFIRMED booking. Cannot cancel past sessions. |
| `POST` | `/bookings/guest` | 🌐 | **Guest booking** — no login required. Supports 3 flows (see below). |

**Guest Booking Flows (`POST /bookings/guest`)**

| Flow | Condition | What happens |
|---|---|---|
| **Anonymous** | No `email` in body, `planType: NONE` | Creates throwaway account `guest_*@gymora.guest`, returns QR code, no JWT issued |
| **Register** | `email` + `password`, account does not exist | Creates new account + assigns membership, returns JWT |
| **Login** | `email` + `password`, account exists | Verifies credentials, optionally upgrades plan, returns JWT |

```json
// Example request body
{
  "planType": "NONE",
  "name": "Bagas",
  "email": "optional@example.com",
  "password": "Optional123!",
  "visitDate": "2026-06-01",
  "visitHour": 9
}
```

---

### Classes — `/api/v1/classes`

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/classes` | 🌐 | List all active gym class types (Morning Yoga, HIIT Blast, etc.). |

---

### Schedules — `/api/v1/schedules`

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/schedules` | 🔒 | List upcoming active sessions. Optional filters: `?classId=` `?trainerId=`. Each item includes `spotsLeft`. |

---

### Trainers — `/api/v1/trainers`

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/trainers` | 🔒 | List all active personal trainers with their specialty and bio. |

---

### XP & Leaderboard — `/api/v1/xp`

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/xp/my` | 🔒 | Returns XP total, level, streak count, and full XP history for the current user. |
| `GET` | `/xp/leaderboard` | 🌐 | Top users ranked by XP. Optional `?limit=10` (max 100). |

---

### Recommendations — `/api/v1/recommendations`

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/recommendations/assessment` | 🔒 | Submit or update a body assessment (weight, height, goal, level, preferred time). |
| `GET` | `/recommendations/assessment` | 🔒 | Get the user's most recent assessment. Returns `null` if none submitted yet. |
| `GET` | `/recommendations/me` | 🔒 | Get personalised class recommendations based on the user's assessment profile. |

---

### Calendar — `/api/v1/calendar`

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/calendar/connect` | 🔒 | Returns the Google OAuth consent URL. The frontend redirects the user to this URL. |
| `GET` | `/calendar/callback` | 🌐 | OAuth redirect handler — Google calls this after the user approves. Stores access + refresh tokens. |
| `GET` | `/calendar/status` | 🔒 | Returns `{ connected: boolean }` — used by the frontend to show Connect / Disconnect UI. |
| `DELETE` | `/calendar/disconnect` | 🔒 | Revokes Google Calendar access and clears all stored tokens. |

---

### Admin — `/api/v1/admin`

> All admin endpoints require **ADMIN** role + valid JWT.  
> Authenticate first via `POST /auth/login`, then pass the token as `Authorization: Bearer <token>`.

#### Stats

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/stats` | Dashboard counts: total users, active members, non-members, bookings, check-ins, estimated revenue. |

#### User Management

| Method | Path | Body | Description |
|---|---|---|---|
| `GET` | `/admin/users` | — | List all users with active membership and booking count. |
| `PATCH` | `/admin/users/:id/role` | `{ "role": "ADMIN" }` | ⭐ Change a user's role to `ADMIN`, `MEMBER`, or `NON_MEMBER`. |
| `POST` | `/admin/users/:id/membership` | `{ "type": "BASIC", "durationDays": 30 }` | Assign a membership plan. Cancels any existing active plan first. |
| `PATCH` | `/admin/users/:id/deactivate` | — | Soft-delete: sets `isActive = false`. User can no longer log in. |

#### Booking Management

| Method | Path | Body | Description |
|---|---|---|---|
| `GET` | `/admin/bookings` | — | List recent bookings (`?limit=50`, capped at 200). |
| `PATCH` | `/admin/bookings/:id/status` | `{ "status": "COMPLETED" }` | Manually update a booking's status. |

#### Class Management

| Method | Path | Body | Description |
|---|---|---|---|
| `POST` | `/admin/classes` | See below | Create a new class type. |
| `DELETE` | `/admin/classes/:id` | — | Soft-delete a class (`isActive = false`). Existing bookings are unaffected. |

```json
// POST /admin/classes
{
  "name": "Boxing Basics",
  "description": "Learn proper stance and combinations.",
  "difficulty": "BEGINNER",
  "durationMinutes": 60,
  "capacity": 15,
  "caloriesEstimate": 400
}
```

#### Schedule Management

| Method | Path | Body | Description |
|---|---|---|---|
| `GET` | `/admin/schedules` | — | List all upcoming active schedules with booking counts. |
| `POST` | `/admin/schedules` | See below | Create a new session for a class. |
| `DELETE` | `/admin/schedules/:id` | — | Cancel a session (`isActive = false`). |

```json
// POST /admin/schedules
{
  "classId": "clxxx...",
  "trainerId": "clyyy...",
  "startTime": "2026-06-10T07:00:00.000Z",
  "endTime": "2026-06-10T08:00:00.000Z",
  "roomOrZone": "Studio A"
}
```

#### Trainer Management

| Method | Path | Body | Description |
|---|---|---|---|
| `GET` | `/admin/trainers` | — | List all trainers with schedule count. |
| `POST` | `/admin/trainers` | See below | Add a new trainer. |
| `PATCH` | `/admin/trainers/:id` | See below | Update details or toggle active status. |

```json
// POST /admin/trainers
{ "name": "Rina Santoso", "email": "rina@gymora.com", "specialty": "Pilates", "bio": "Certified..." }

// PATCH /admin/trainers/:id  (all fields optional)
{ "specialty": "Pilates & Yoga", "isActive": false }
```

#### Membership Management

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/memberships` | List all active memberships with user info and days remaining. |
| `DELETE` | `/admin/memberships/:id` | Cancel a membership. If no active plans remain, user's role is downgraded to `NON_MEMBER` automatically. |

---

## Request & Response Format

### Response Envelope

Every response from this API is wrapped in a consistent envelope format:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "OK",
  "data": { ... }
}
```

On errors:

```json
{
  "success": false,
  "statusCode": 404,
  "message": "User not found",
  "timestamp": "2026-05-27T10:00:00.000Z",
  "path": "/api/v1/admin/users/bad-id"
}
```

### Authentication Header

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Authentication Flow

```
Client                              API
  │                                   │
  ├─ POST /auth/login ───────────────►│
  │  { email, password }              │  1. Load user by email
  │                                   │  2. bcrypt.compare(password, hash)
  │                                   │  3. Sign JWT { sub, email, role }
  │◄─ { access_token, user } ─────────┤
  │                                   │
  ├─ GET /users/me ──────────────────►│
  │  Authorization: Bearer <jwt>      │  4. JwtStrategy verifies token
  │                                   │  5. Injects user into request
  │◄─ { user profile } ───────────────┤
```

- **Algorithm**: HS256 with `JWT_SECRET` from environment (never hardcoded)
- **Expiry**: Configured via `JWT_EXPIRES_IN` (default `7d`)
- **Password storage**: bcrypt, 12 salt rounds — plain-text passwords are never written to the database
- **User enumeration prevention**: Login always returns `Invalid credentials` regardless of whether the email exists

---

## Role-Based Access Control

| Role | Assigned when | Gym Visit | Classes / PT | Admin Panel |
|---|---|---|---|---|
| `NON_MEMBER` | Default at registration, or no active plan | ✅ | ❌ (upgrade prompt) | ❌ |
| `MEMBER` | Active TRIAL / BASIC / PREMIUM plan | ✅ | ✅ | ❌ |
| `ADMIN` | Manually set via admin panel or Supabase SQL | ✅ | ✅ | ✅ |

Guards applied in controllers:

```typescript
@UseGuards(JwtAuthGuard)                // verify JWT only
@UseGuards(JwtAuthGuard, RolesGuard)   // verify JWT + check role
@Roles(Role.ADMIN)                      // restrict to ADMIN
```

---

## Key Design Decisions

### 1. Atomic Capacity Enforcement

CLASS and PT bookings use `prisma.$transaction` so the capacity check and booking creation are a single atomic database operation — no overbooking is possible even under concurrent traffic:

```
┌─ $transaction ──────────────────────────────────────────────────────┐
│  1. SELECT schedule + class capacity                                  │
│  2. COUNT existing bookings WHERE status IN [PENDING, CONFIRMED]     │
│  3. IF count >= capacity → throw 409 ConflictException              │
│  4. INSERT new booking                                               │
└──────────────────────────────────────────────────────────────────────┘
```

A `@@unique([userId, scheduleId])` constraint on the `Booking` model is a secondary safeguard — even if two transactions race perfectly, the database rejects the second INSERT with a unique violation (mapped to HTTP 409).

### 2. Guest Booking (No Login Required)

`POST /bookings/guest` supports three paths based on what the client sends:

```
No email provided  →  Anonymous path
                        - Creates throwaway user: guest_<timestamp>_<random>@gymora.guest
                        - Satisfies the Booking.userId FK without exposing real data
                        - Returns QR code + no JWT
                        - isAnonymous: true in response

Email provided,     →  Register path
new account             - Hashes password, creates User, assigns Membership
                        - Returns JWT

Email provided,     →  Login path
existing account        - bcrypt.compare verifies password
                        - Optionally upgrades plan, returns JWT
```

### 3. Google Calendar Sync (Best-Effort)

Calendar events are created **after** the booking transaction commits, wrapped in a `try/catch`. A Google API failure never rolls back or hides a confirmed booking:

```typescript
// Transaction committed — booking is permanent
try {
  await calendarService.createEvent(userId, booking.id);
} catch (err) {
  this.logger.warn(`Calendar sync failed: ${err.message}`);
  // deliberately not re-thrown — booking still succeeds
}
return booking; // always returned
```

### 4. Prisma Binary Targets

The schema includes multiple binary targets so the generated Prisma Client works on both local macOS and Render's Debian Linux environment:

```prisma
generator client {
  binaryTargets = ["native", "linux-musl-openssl-3.0.x", "debian-openssl-3.0.x"]
}
```

### 5. Supabase PgBouncer Compatibility

Supabase's PgBouncer (transaction mode, port 6543) does not support Prisma schema migration operations. Two separate URLs are used:

| Use case | URL type | Port |
|---|---|---|
| App queries at runtime | Pooler (PgBouncer) | `6543` |
| `prisma db push` / schema migrations | Direct connection | `5432` |

### 6. `@nestjs/cli` in `dependencies`

Render runs `npm install` with `NODE_ENV=production`, which skips `devDependencies`. Since the build command requires `nest build` (the NestJS CLI), `@nestjs/cli` must be listed under `dependencies` — not `devDependencies` — so it is installed and available at build time.

### 7. Global Response Envelope

A `ResponseInterceptor` wraps every successful response in `{ success, statusCode, message, data }`. An `AllExceptionsFilter` catches all thrown exceptions and returns the same envelope format for errors. This gives the frontend a single, consistent shape to handle.

---

## Project Structure

```
crack-be-bagasadityafadly/
├── docs/
│   └── db-schema.png          # ← Place your database ERD screenshot here
├── prisma/
│   ├── schema.prisma          # All 16 models + enums
│   └── seed.ts                # Seeds: badges, rewards, challenges,
│                              #   3 trainers, 4 classes, 15 schedules
├── src/
│   ├── admin/                 # Admin CRUD (users, bookings, classes,
│   │   ├── admin.controller.ts  #   schedules, trainers, memberships)
│   │   ├── admin.service.ts
│   │   ├── admin.module.ts
│   │   └── dto/admin.dto.ts
│   ├── analytics/             # Usage analytics (stub)
│   ├── attendance/            # QR check-in and attendance logging
│   ├── auth/
│   │   ├── auth.controller.ts # Register, login, forgot/reset password
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   ├── dto/
│   │   │   ├── register.dto.ts
│   │   │   ├── login.dto.ts
│   │   │   └── forgot-password.dto.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   └── strategies/
│   │       └── jwt.strategy.ts
│   ├── badges/                # Badge definitions and award logic
│   ├── bookings/
│   │   ├── bookings.controller.ts  # GYM / CLASS / PT + guest endpoint
│   │   ├── bookings.service.ts     # $transaction capacity enforcement
│   │   ├── bookings.module.ts
│   │   └── dto/
│   │       ├── create-booking.dto.ts
│   │       └── guest-booking.dto.ts
│   ├── calendar/              # Google Calendar OAuth integration
│   ├── challenges/            # Challenge definitions and progress
│   ├── classes/               # Class type catalogue
│   ├── common/
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts  # Global error handler
│   │   └── interceptors/
│   │       └── response.interceptor.ts   # Response envelope wrapper
│   ├── config/
│   │   └── configuration.ts   # Typed config factory (reads .env)
│   ├── notifications/         # In-app notification stubs
│   ├── prisma/
│   │   ├── prisma.service.ts  # @Global() singleton PrismaClient
│   │   └── prisma.module.ts
│   ├── recommendations/       # Personalised class suggestions
│   ├── rewards/               # Reward catalogue and redemption
│   ├── roles/                 # Role management utilities
│   ├── schedules/             # Schedule listing with spotsLeft
│   ├── trainers/              # Trainer listing
│   ├── users/                 # User profile
│   ├── xp/                    # XP summary and leaderboard
│   ├── app.module.ts          # Root module (registers all child modules)
│   ├── app.controller.ts      # Health check — GET /
│   └── main.ts                # Bootstrap: CORS, global pipes,
│                              #   Swagger, Helmet, compression
├── render.yaml                # Render deployment config
├── package.json
└── tsconfig.json
```

---

## Local Development

### Prerequisites

- **Node.js** 18 or higher (`node --version`)
- **PostgreSQL** — local install, Docker, or a Supabase project

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/Revou-FSSE-Oct25/crack-be-bagasadityafadly.git
cd crack-be-bagasadityafadly

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
# Then edit .env with your own values (see Environment Variables section)

# 4. Push the schema to your database
#    ⚠️  Supabase users: use the DIRECT URL (port 5432), not the pooler (port 6543)
npx prisma db push

# 5. Create the default admin and member accounts
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
async function main() {
  const adminPw  = await bcrypt.hash('Admin123!', 12);
  const memberPw = await bcrypt.hash('Member123!', 12);
  await prisma.user.upsert({
    where: { email: 'admin@gymora.com' },
    update: {},
    create: { name: 'Gymora Admin', email: 'admin@gymora.com', password: adminPw, role: 'ADMIN' },
  });
  await prisma.user.upsert({
    where: { email: 'member@gymora.com' },
    update: {},
    create: { name: 'Demo Member', email: 'member@gymora.com', password: memberPw, role: 'MEMBER' },
  });
  console.log('Users created successfully.');
}
main().catch(console.error).finally(() => prisma.\$disconnect());
"

# 6. Seed trainers, classes, schedules, badges, rewards, and challenges
npx ts-node prisma/seed.ts

# 7. Start the development server (hot reload)
npm run start:dev
```

- **API**: [http://localhost:3000/api/v1](http://localhost:3000/api/v1)
- **Swagger UI**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

---

## Environment Variables

| Variable | Required | Example | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql://user:pass@host:5432/db` | PostgreSQL connection string. For Supabase runtime use the pooler URL; for `db push` use the direct URL (port 5432). |
| `JWT_SECRET` | ✅ | `a-very-long-random-secret-key` | Signs and verifies JWT tokens. Must stay private — rotating this invalidates all active sessions. |
| `JWT_EXPIRES_IN` | ✅ | `7d` | Token expiry. Accepts `ms` format: `1h`, `7d`, `30d`. |
| `NODE_ENV` | ✅ | `development` / `production` | Affects error detail level and some library behaviours. |
| `PORT` | | `3000` | HTTP server port. Defaults to `3000`. |
| `FRONTEND_URL` | | `https://crack-fe-bagasadityafadly.vercel.app` | CORS allowed origin. Set to your frontend's URL. Requests from other origins are blocked. |
| `GOOGLE_CLIENT_ID` | | `xxx.apps.googleusercontent.com` | From Google Cloud Console. Required only for Calendar integration. |
| `GOOGLE_CLIENT_SECRET` | | `GOCSPX-...` | From Google Cloud Console. Required only for Calendar integration. |
| `GOOGLE_REDIRECT_URI` | | `https://api.example.com/api/v1/calendar/callback` | Must match exactly what is registered in Google Cloud Console. |

### `.env.example` template

```dotenv
# ─── Server ───────────────────────────────────────────────
PORT=3000
NODE_ENV=development

# ─── Database ─────────────────────────────────────────────
# Supabase pooler URL (port 6543) — use for app runtime
# Use direct URL (port 5432) for prisma db push
DATABASE_URL="postgresql://postgres.PROJECT:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# ─── JWT ──────────────────────────────────────────────────
JWT_SECRET="replace-with-at-least-32-random-characters"
JWT_EXPIRES_IN=7d

# ─── CORS ─────────────────────────────────────────────────
FRONTEND_URL=http://localhost:3002

# ─── Google Calendar (optional) ───────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/calendar/callback
```

---

## Default Seeded Accounts

| Role | Email | Password |
|---|---|---|
| `ADMIN` | `admin@gymora.com` | `Admin123!` |
| `MEMBER` | `member@gymora.com` | `Member123!` |

> ⚠️ Change these credentials before sharing database access with anyone outside your team.

**To promote any user to ADMIN via SQL** (Supabase SQL Editor):

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';
```

**To promote via Swagger** (no SQL access needed):

1. Login as admin → copy `access_token`
2. Authorize in Swagger UI
3. `GET /api/v1/admin/users` → find the user's `id`
4. `PATCH /api/v1/admin/users/{id}/role` with `{ "role": "ADMIN" }`

---

## Swagger Documentation

The interactive API documentation is available at:

| Environment | URL |
|---|---|
| Local | [http://localhost:3000/api/docs](http://localhost:3000/api/docs) |
| Production | [https://gymora-api.onrender.com/api/docs](https://gymora-api.onrender.com/api/docs) |

### How to authenticate in Swagger

1. Open the Swagger UI
2. Expand **`POST /api/v1/auth/login`** → **Try it out** → enter:
   ```json
   { "email": "admin@gymora.com", "password": "Admin123!" }
   ```
3. Click **Execute** → copy the `access_token` from the response
4. Click **Authorize 🔓** (top right of the page)
5. In the `JWT-auth` field, paste the token → **Authorize**
6. All subsequent requests will automatically include `Authorization: Bearer <token>`

---

## Scripts

```bash
# ── Development ──────────────────────────────────────────────
npm run start:dev       # Hot-reload dev server (ts-node watch)
npm run start:debug     # Dev server with Node.js debugger on port 9229

# ── Production ───────────────────────────────────────────────
npm run build           # Compile TypeScript → dist/
npm run start:prod      # Run the compiled build

# ── Database ─────────────────────────────────────────────────
npx prisma db push                  # Sync schema to DB (no migration files)
npx prisma studio                   # GUI browser at http://localhost:5555
npx ts-node prisma/seed.ts          # Seed trainers, classes, schedules, etc.

# ── Code Quality ─────────────────────────────────────────────
npm run lint            # ESLint with auto-fix
npm run format          # Prettier format all TypeScript files

# ── Tests ────────────────────────────────────────────────────
npm run test            # Unit tests (Jest)
npm run test:cov        # Unit tests with HTML coverage report
npm run test:e2e        # End-to-end tests
```

---

## Deployment

### Architecture

```
Browser / Mobile
       │
       ▼
  Vercel (Frontend)
  Next.js 15
       │
       │ HTTPS API calls
       ▼
  Render (Backend)         ←── This repository
  NestJS API
  node dist/src/main
  Port 3000 · Singapore
       │
       │ TCP (PgBouncer pooler, port 6543)
       ▼
  Supabase (Database)
  PostgreSQL 15
  AWS ap-southeast-2
```

### Render Configuration (`render.yaml`)

```yaml
services:
  - type: web
    name: gymora-api
    env: node
    region: singapore
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm run start:prod
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000
      - key: JWT_EXPIRES_IN
        value: 7d
      # Set manually in Render dashboard:
      # DATABASE_URL  →  Supabase pooler connection string
      # JWT_SECRET    →  long random secret
      # FRONTEND_URL  →  https://crack-fe-bagasadityafadly.vercel.app
```

### Deploy your own instance

```bash
# Step 1 — Fork this repository on GitHub

# Step 2 — Create a PostgreSQL database on https://supabase.com
#   - Project Settings → Database → Connection string
#   - Get both the Pooler URL (port 6543) and the Direct URL (port 5432)

# Step 3 — Create a Web Service on https://render.com
#   - Connect your forked GitHub repo
#   - Build Command:  npm install && npm run build
#   - Start Command:  npm run start:prod
#   - Add environment variables (see table above)

# Step 4 — Push schema via Render Shell (use direct URL for this)
npx prisma db push

# Step 5 — Seed the database
npx ts-node prisma/seed.ts

# Step 6 — Create admin user via Supabase SQL Editor
```

```sql
-- Run in Supabase → SQL Editor
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@gymora.com';
```

### Important: Supabase Connection URLs

| Purpose | Host | Port | Add to URL |
|---|---|---|---|
| App runtime (queries) | `*.pooler.supabase.com` | `6543` | `?pgbouncer=true&connection_limit=1` |
| Schema operations (`db push`) | `db.PROJECT.supabase.co` | `5432` | `?sslmode=require` |

---

## Security Measures

| Measure | Detail |
|---|---|
| **Password hashing** | bcrypt with 12 salt rounds — plain-text passwords are never stored or logged |
| **JWT signing** | HS256, secret read from `ConfigService` at runtime — never hardcoded in source |
| **No password in responses** | Every `select` statement explicitly excludes the `password` field |
| **User enumeration prevention** | Login and forgot-password return the same message regardless of whether the email exists |
| **CORS** | Restricted to `FRONTEND_URL` — all cross-origin requests from unknown origins are blocked |
| **Security headers** | `helmet` adds `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, etc. |
| **Rate limiting** | `@nestjs/throttler` prevents brute-force and abuse |
| **gzip compression** | All responses are compressed, reducing payload size |
| **Input validation** | `class-validator` with `whitelist: true` strips unknown fields and rejects invalid payloads with HTTP 400 |
| **`.env` never committed** | `.env` is in `.gitignore` — no secrets are ever pushed to GitHub |

---

## Related

| | |
|---|---|
| **Frontend repo** | [crack-fe-bagasadityafadly](../crack-fe-bagasadityafadly) — Next.js 15 on Vercel |
| **Live frontend** | [https://crack-fe-bagasadityafadly.vercel.app](https://crack-fe-bagasadityafadly.vercel.app) |
| **Live API docs** | [https://gymora-api.onrender.com/api/docs](https://gymora-api.onrender.com/api/docs) |
| **Database** | Supabase — PostgreSQL 15, AWS ap-southeast-2 |

---

## Author

**Bagas Aditya Fadly** — Built for RevoU Crack Assignment  
GitHub: [@Revou-FSSE-Oct25](https://github.com/Revou-FSSE-Oct25)
