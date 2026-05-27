# 🏋 Gymora — Backend API

> REST API for the Gymora gym management platform, built with NestJS + Prisma + PostgreSQL

**Frontend Live Demo → [https://crack-fe-bagasadityafadly.vercel.app](https://crack-fe-bagasadityafadly.vercel.app)**

---

## Overview

This is the backend API for Gymora, a smart gym booking and management platform. It handles authentication, membership management, class/schedule/trainer management, booking with capacity enforcement, XP & streak tracking, and admin operations.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | NestJS 11 |
| Language | TypeScript |
| ORM | Prisma v5 |
| Database | PostgreSQL (Supabase) |
| Auth | JWT (passport-jwt) |
| Password | bcrypt |
| Validation | class-validator + class-transformer |
| Deployment | Render |

---

## API Modules

| Module | Base Path | Description |
|--------|-----------|-------------|
| Auth | `/api/v1/auth` | Register, login, forgot/reset password |
| Users | `/api/v1/users` | Profile, update |
| Bookings | `/api/v1/bookings` | Create, cancel, list — GYM / CLASS / PT |
| Bookings (Guest) | `/api/v1/bookings/guest` | Public booking without login |
| Classes | `/api/v1/classes` | List gym classes |
| Schedules | `/api/v1/schedules` | List upcoming sessions |
| Trainers | `/api/v1/trainers` | List active trainers |
| XP | `/api/v1/xp` | User XP, level, leaderboard |
| Recommendations | `/api/v1/recommendations` | Personalised class suggestions |
| Calendar | `/api/v1/calendar` | Google Calendar OAuth integration |
| Admin | `/api/v1/admin` | Full admin CRUD (ADMIN role only) |

---

## Key Design Decisions

### Atomic capacity enforcement
CLASS and PT bookings use `prisma.$transaction` to read + write atomically. A `@@unique([userId, scheduleId])` constraint on the Booking model is a secondary safeguard against duplicate bookings.

### Guest booking (no login)
`POST /bookings/guest` is a public endpoint that supports three paths:
- **Anonymous** — name only, no email → creates a throwaway user, returns QR code, no JWT
- **Register** — email + password (new account) → creates account, returns JWT
- **Login** — email + password (existing account) → verifies, returns JWT

### Role-based access
Three roles: `NON_MEMBER`, `MEMBER`, `ADMIN`. Guards enforce:
- GYM bookings: any authenticated user
- CLASS/PT bookings: `MEMBER` or `ADMIN` only
- Admin endpoints: `ADMIN` only

### Calendar sync (best-effort)
Google Calendar events are created after the booking transaction commits. Failure to sync never rolls back or hides the booking.

---

## Project Structure

```
src/
├── admin/          # Admin CRUD: users, bookings, classes, schedules, trainers, memberships
├── auth/           # JWT auth, guards, decorators, forgot/reset password
├── bookings/       # Booking service + guest booking
├── calendar/       # Google Calendar OAuth + event management
├── classes/        # GymClass entity
├── config/         # Configuration factory (reads .env)
├── prisma/         # PrismaService (global)
├── recommendations/# Personalised class recommendations
├── schedules/      # Schedule entity + spots-left calculation
├── trainers/       # Trainer entity
├── users/          # User profile
└── xp/             # XP, level, streak, leaderboard
prisma/
├── schema.prisma   # Full database schema
└── seed.ts         # Dev seed: admin, 3 trainers, 4 classes, 15 schedules
```

---

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL running locally (or a Supabase/Neon connection string)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env

# 3. Edit .env with your values
DATABASE_URL="postgresql://user:password@localhost:5432/gymora"
JWT_SECRET="your-secret-key"
FRONTEND_URL="http://localhost:3002"

# 4. Push schema to database
npx prisma db push

# 5. Seed database (creates admin + sample data)
npx prisma db seed

# 6. Start development server
npm run start:dev
```

API available at [http://localhost:3000/api/v1](http://localhost:3000/api/v1)

### Default Seeded Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@gymora.com` | `Admin123!` |
| Member | `member@gymora.com` | `Member123!` |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Secret key for signing JWT tokens |
| `JWT_EXPIRES_IN` | ✅ | Token expiry e.g. `7d` |
| `NODE_ENV` | ✅ | `development` or `production` |
| `PORT` | | Server port, default `3000` |
| `FRONTEND_URL` | | CORS allowed origin |
| `GOOGLE_CLIENT_ID` | | For Google Calendar integration |
| `GOOGLE_CLIENT_SECRET` | | For Google Calendar integration |
| `GOOGLE_REDIRECT_URI` | | OAuth callback URL |

---

## Scripts

```bash
npm run start:dev    # Development with hot reload
npm run build        # Compile TypeScript → dist/
npm run start:prod   # Run compiled production build
npx prisma studio    # Open Prisma GUI database browser
npx prisma db push   # Push schema changes (no migration history)
npx prisma db seed   # Run seed script
```

---

## Deployment

This API is deployed on **Render** (free tier) connected to a **Supabase** PostgreSQL database.

To deploy your own instance:
1. Fork this repo
2. Create a project on [Render](https://render.com)
3. Set build command: `npm install && npm run build`
4. Set start command: `npm run start:prod`
5. Add environment variables in Render dashboard
6. Run `npx prisma db push` and `npx prisma db seed` once via Render Shell

---

## Related

- **Frontend** → [crack-fe-bagasadityafadly](../crack-fe-bagasadityafadly) — Next.js on Vercel
- **Live Frontend** → [https://crack-fe-bagasadityafadly.vercel.app](https://crack-fe-bagasadityafadly.vercel.app)
- **Database** — Supabase (PostgreSQL)

---

## Author

**Bagas Aditya Fadly** — Built for RevoU Crack Assignment
