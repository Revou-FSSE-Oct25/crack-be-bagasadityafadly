# SYSTEM ARCHITECTURE — GYM SCHEDULE BOOKING MANAGEMENT SYSTEM
# Version: 1.0.0
# Last Updated: 2026-05-20
# Reference: Always read this file before any implementation phase.

---

## PROJECT IDENTITY

- **Name:** GymFlow — Gym Schedule Booking Management System
- **Type:** Gamified Fitness Booking Platform
- **Target Users:** Gen Z gym members, personal trainers, gym admins
- **Purpose:** RevoU bootcamp presentation + startup-style portfolio
- **Stack Level:** Production-style, not enterprise-overkill

---

## TECH STACK

### Frontend
| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | latest stable |
| Language | TypeScript | latest stable |
| Styling | TailwindCSS | latest stable |
| UI Components | shadcn/ui | latest stable |
| Animation | Framer Motion | latest stable |
| State Management | Zustand | latest stable |
| Form Handling | React Hook Form | latest stable |
| Validation | Zod | latest stable |
| Charts | Recharts | latest stable |
| Icons | Lucide React | latest stable |

### Backend
| Layer | Technology | Version |
|---|---|---|
| Framework | NestJS | latest stable |
| Language | TypeScript | latest stable |
| API Style | REST | — |
| ORM | Prisma | latest stable |
| Auth | JWT + RBAC | — |
| Rate Limiting | @nestjs/throttler | latest stable |
| Validation | class-validator + class-transformer | latest stable |

### Database
| Layer | Technology |
|---|---|
| Database | PostgreSQL |
| Provider | Supabase (Free Tier) |
| GUI | DBeaver or pgAdmin |

### Deployment
| Service | Platform |
|---|---|
| Frontend | Vercel Free |
| Backend | Render Free |
| Database | Supabase Free |
| CDN / Security | Cloudflare Free (DNS + HTTPS) |

### Integrations
| Feature | Service |
|---|---|
| Calendar sync | Google Calendar API (OAuth2) |
| Auth (optional) | Google OAuth |
| QR generation | qrcode npm package |

---

## REPOSITORY STRUCTURE

Two separate GitHub repositories — NO monorepo.

```
GitHub Organization: [your-username]
├── gym-booking-backend     → NestJS API
└── gym-booking-frontend    → Next.js App
```

Local workspace:
```
~/Desktop/PROJECT-GYM-REVOU/
├── system-architecture.md
├── gym-booking-backend/
└── gym-booking-frontend/
```

---

## USER ROLES & PERMISSIONS

### 1. ADMIN
- Full CRUD: members, trainers, schedules, classes, rewards, badges
- Manage trial programs and booking rules
- Analytics dashboard
- Trainer utilization + attendance monitoring
- PT pathway approval
- Export reports (CSV)

### 2. MEMBER (authenticated user)
- Book gym (date-based)
- Book class (date + time + trainer)
- Book PT session (date + time + duration + trainer)
- Fitness assessment (optional, self-initiated)
- AI-style adaptive recommendation
- QR check-in
- XP progression, badges, streaks
- Loyalty rewards
- Challenge participation
- Attendance heatmap
- 30-day analysis
- Google Calendar sync

### 3. NON-MEMBER (trial user)
- Free trial booking (limited)
- Limited class access
- Limited PT access
- Temporary badges
- Promotional offers
- Basic recommendations

---

## BOOKING SYSTEM RULES

### A. GYM-ONLY BOOKING
- Booking based on date only (no specific time slot)
- No PT or trainer conflict
- Capacity limited by gym max capacity (configurable by admin)
- Multiple users can book same date

### B. PT BOOKING
- Required fields: date, time, duration, trainer
- Default trainer capacity: 5 users per slot
- Admin can override trainer capacity
- Must prevent: overlapping PT schedules, duplicate bookings, trainer overcapacity
- Backend uses transaction + unique constraint validation

### C. CLASS BOOKING
- Required fields: date, time, trainer, class type
- Class properties: difficulty, calories estimate, capacity
- Prevent: class overflow, duplicate booking
- Supported types: yoga, HIIT, cardio, pilates, strength, calisthenics, Gen Z themed

### Smart Capacity Rules (Anti-Race Condition)
- Use Prisma transactions
- Use optimistic locking patterns
- Unique constraint on (user_id + booking_date + booking_type)
- Backend always validates before committing

---

## CLASS CATALOG

### Strength & Muscle
- Hypertrophy 101 (intermediate, 60 min)
- Powerlifting Basics (beginner-intermediate, 75 min)

### Cardio & HIIT
- Tabata Inferno (advanced, 45 min)
- MetCon Blast (intermediate, 50 min)

### Mind & Body
- Vinyasa Flow Yoga (beginner-intermediate, 60 min)
- Core Pilates (beginner, 45 min)

### Youth / Gen Z
- Calisthenics Skills (intermediate, 60 min)
- GenZ Power Hour (beginner-intermediate, 45 min)

Each class has: recommendation_score, trainer_requirements, adaptive_notes

---

## DATABASE ENTITIES

### Core Entities
```
users               → id, name, email, password_hash, role, membership_type, xp_total, streak_count, created_at
roles               → id, name (ADMIN | MEMBER | NON_MEMBER), permissions[]
memberships         → id, user_id, type, start_date, end_date, status
```

### Booking Entities
```
bookings            → id, user_id, booking_type (GYM|CLASS|PT), date, time, duration, trainer_id, class_id, status, created_at
trainers            → id, user_id, specialization, max_capacity, bio, avatar
schedules           → id, trainer_id, date, start_time, end_time, available
classes             → id, name, trainer_id, type, difficulty, duration, calories_est, capacity, description
```

### Attendance
```
attendance_logs     → id, user_id, booking_id, checked_in_at, method (QR|MANUAL), qr_token, qr_expires_at
```

### Gamification
```
xp_history          → id, user_id, amount, source (BOOKING|ATTENDANCE|STREAK|CHALLENGE|BONUS), multiplier, created_at
badges              → id, name, description, icon, condition_type, condition_value
user_badges         → id, user_id, badge_id, earned_at
rewards             → id, name, description, type, xp_cost, condition_bookings
user_rewards        → id, user_id, reward_id, redeemed_at
challenge_definitions → id, name, description, type, goal_value, xp_reward, duration_days
challenge_progress  → id, user_id, challenge_id, progress, status, started_at, completed_at
```

### Recommendation
```
body_assessments    → id, user_id, weight, height, body_fat_est, target_weight, goal, push_up_count, sit_up_count, workout_days_week, available_minutes, sleep_duration, preferred_time, created_at
recommendation_logs → id, user_id, assessment_id, program_name, notes, generated_at
workout_programs    → id, name, difficulty, target_goal, frequency, duration_minutes, description
```

### Integrations
```
calendar_sync_accounts → id, user_id, provider (GOOGLE), access_token, refresh_token, token_expires_at
trial_programs      → id, name, duration_days, max_bookings, class_access, pt_access
```

### Indexes & Constraints
- `bookings`: UNIQUE (user_id, booking_date, booking_type) — prevents duplicate bookings
- `attendance_logs`: UNIQUE (qr_token) — prevents duplicate QR scans
- `user_badges`: UNIQUE (user_id, badge_id) — prevents duplicate badge awards
- `challenge_progress`: UNIQUE (user_id, challenge_id) — one active per challenge
- All foreign keys enforced at DB level
- All timestamp fields: created_at, updated_at

---

## GAMIFICATION RULES

### XP Sources
| Action | XP Earned | Notes |
|---|---|---|
| Make any booking | +10 XP | |
| QR check-in (gym) | +20 XP | |
| QR check-in (class) | +30 XP | |
| QR check-in (PT) | +50 XP | |
| 3-day streak | +50 XP bonus | |
| 7-day streak | +150 XP bonus | |
| 30-day streak | +500 XP bonus | |
| Complete challenge | Varies | Per challenge definition |
| Happy Hour booking | 1.5x multiplier | Configurable time window |

### XP Levels
| Level | Name | XP Required |
|---|---|---|
| 1 | Rookie | 0 |
| 2 | Trainee | 500 |
| 3 | Athlete | 1,500 |
| 4 | Warrior | 3,500 |
| 5 | Champion | 7,000 |
| 6 | Legend | 15,000 |

### Badge Definitions
| Badge | Trigger Condition |
|---|---|
| First Booking | First booking ever |
| Gym Warrior | 10 gym check-ins |
| Consistency Master | 7-day streak |
| Class Enthusiast | 5 class bookings |
| PT Devotee | 5 PT sessions |
| Century Club | 100 total bookings |
| Elite Member | Level 5 reached |
| Challenge Crusher | 5 challenges completed |

### Streak Rules
- Streak increments on any QR check-in day
- Streak resets if user misses a day (no check-in)
- Streak freeze: members can freeze 1 day per week (premium feature)

### Loyalty Milestones
| Bookings | Reward |
|---|---|
| 10 | Welcome Pack badge |
| 100 | 10% membership discount |
| 250 | 1 free premium class |
| 500 | 1 free PT session |

### Happy Hour XP Multiplier
- Default window: 06:00–08:00 and 14:00–16:00
- Multiplier: 1.5x XP on all check-ins during window
- Admin configurable

### Social Leaderboard
- Top 10 by XP total
- Top 10 by challenge completion
- Top 10 by streak count
- Refreshed daily (cached)

---

## PT PATHWAY SYSTEM

Triggered automatically when user meets ALL conditions:
- Total XP >= 7,000 (Level 5)
- Attendance check-ins >= 50
- Active streak >= 14 days
- Challenges completed >= 3
- At least 2 "fitness" badges earned

System:
- Flags user as PT Candidate
- Admin reviews and approves via dashboard
- Approved users get TRAINER role and trainer profile

---

## FITNESS ASSESSMENT SYSTEM

### Access Flow
1. User registers normally (no forced questionnaire)
2. Dashboard shows "Activate Smart Recommendation" card
3. User clicks → assessment modal opens
4. User completes optional questionnaire
5. Backend calculates fitness scores
6. Recommendation engine activates

### Assessment Fields
```
Body Composition:    weight, height, body_fat_est, target_weight, goal, preference (GAIN|LOSE|MAINTAIN)
Workout Capability:  push_up_count, sit_up_count, duration_capability, workout_days_week, available_minutes, self_level (BEGINNER|INTERMEDIATE|ADVANCED)
Lifestyle:          sleep_duration, work_intensity, preferred_time (MORNING|AFTERNOON|EVENING), location_preference (HOME|GYM|BOTH)
```

### Fitness Scores (0–100)
| Score | Calculation Basis |
|---|---|
| Strength Score | push_up_count + sit_up_count normalized |
| Endurance Score | duration_capability + workout_days_week |
| Consistency Score | derived from attendance history |
| Recovery Score | sleep_duration + work_intensity inverse |
| Activity Score | compound of all above |
| Workout Readiness | final recommendation score |

### Recommendation Outputs
Based on scores:
- Program name (e.g., "Beginner Fat Loss Program")
- Frequency (e.g., "3x/week")
- Duration (e.g., "30 min/session")
- Class recommendations (from class catalog)
- Adaptive notes (updated monthly based on attendance)

### Adaptive Logic
Re-evaluate recommendations when:
- User misses 3+ consecutive bookings
- Streak resets
- User completes 30-day cycle
- User manually requests re-assessment

---

## QR CHECK-IN SYSTEM

### Flow
1. User opens booking detail page
2. Backend generates QR token (UUID, expires in 15 minutes)
3. QR code displayed on frontend
4. Staff/kiosk scans QR
5. Backend validates: token, expiry, not already scanned, booking status
6. On success: mark attendance, award XP, update streak
7. On failure: return specific error (expired, already scanned, invalid)

### Anti-Abuse Rules
- QR token is single-use (UNIQUE constraint on qr_token)
- Token expires 15 minutes after generation
- Regeneration requires active booking status
- Rate limit: max 3 QR regenerations per booking

---

## GOOGLE CALENDAR INTEGRATION

### Architecture
- User grants OAuth2 permission
- Backend stores encrypted access_token + refresh_token
- On booking confirmation: create Google Calendar event
- On booking cancellation: delete/update event
- Reminder: 1 hour before booking (Google Calendar native reminder)
- Backend remains source of truth — Calendar is sync-only

### Event Schema
```
title:       "[GymFlow] PT Session with {trainer_name}"
description: "Booking ID: {id} | Duration: {duration} | Location: GymFlow Fitness"
start:       booking_date + booking_time
end:         start + duration
reminders:   60 minutes before (popup)
colorId:     "5" (banana yellow for gym, "11" tomato for PT)
```

### Failure Handling
- If Google Calendar fails: booking still succeeds (DB is source of truth)
- Calendar sync retried via background job (max 3 retries)
- User notified if sync permanently fails

---

## BACKEND MODULE MAP

```
src/
├── auth/               → JWT strategy, login, register, refresh
├── users/              → user CRUD, profile, level calculation
├── roles/              → RBAC guards, permission checks
├── memberships/        → membership status, trial logic
├── bookings/           → gym/class/PT booking, conflict validation
├── trainers/           → trainer profiles, availability
├── schedules/          → trainer schedule management
├── classes/            → class catalog, capacity management
├── attendance/         → QR generation, check-in validation
├── gamification/       → XP engine, badge engine, streak logic
├── rewards/            → loyalty milestone checks, redemption
├── challenges/         → challenge definitions, progress tracking
├── recommendations/    → assessment intake, score engine, adaptive logic
├── analytics/          → dashboard stats, leaderboard, reports
├── notifications/      → in-app notification queue
├── calendar/           → Google Calendar OAuth, event sync
├── prisma/             → Prisma service wrapper
└── common/             → guards, interceptors, decorators, filters
```

---

## FRONTEND PAGE MAP

```
app/
├── (public)/
│   ├── page.tsx                  → Landing page
│   ├── login/page.tsx            → Login
│   └── register/page.tsx         → Register
│
├── (member)/
│   ├── dashboard/page.tsx        → Member dashboard + XP overview
│   ├── booking/
│   │   ├── gym/page.tsx          → Gym booking flow
│   │   ├── class/page.tsx        → Class booking flow
│   │   └── pt/page.tsx           → PT booking flow
│   ├── schedule/page.tsx         → My bookings + QR codes
│   ├── challenges/page.tsx       → Active challenges
│   ├── rewards/page.tsx          → Loyalty rewards
│   ├── progress/page.tsx         → Heatmap + 30-day analysis
│   ├── profile/page.tsx          → Profile + badges
│   └── assessment/page.tsx       → Fitness assessment
│
└── (admin)/
    ├── dashboard/page.tsx        → Admin analytics
    ├── members/page.tsx          → Member management
    ├── trainers/page.tsx         → Trainer management
    ├── classes/page.tsx          → Class management
    ├── bookings/page.tsx         → Booking monitoring
    ├── rewards/page.tsx          → Reward management
    ├── challenges/page.tsx       → Challenge management
    └── pt-pathway/page.tsx       → PT pathway approvals
```

---

## API ENDPOINT MAP

### Auth
```
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

### Bookings
```
POST   /bookings/gym
POST   /bookings/class
POST   /bookings/pt
GET    /bookings/my
GET    /bookings/:id
PATCH  /bookings/:id/cancel
GET    /bookings/admin/all        [ADMIN]
```

### Classes
```
GET  /classes
GET  /classes/:id
POST /classes                     [ADMIN]
PUT  /classes/:id                 [ADMIN]
```

### Trainers
```
GET  /trainers
GET  /trainers/:id/availability
```

### Attendance / QR
```
GET   /attendance/qr/:bookingId
POST  /attendance/checkin
GET   /attendance/my
```

### Gamification
```
GET  /gamification/xp
GET  /gamification/badges
GET  /gamification/leaderboard
GET  /gamification/streaks
```

### Challenges
```
GET  /challenges
POST /challenges/:id/join
GET  /challenges/my
```

### Rewards
```
GET  /rewards
POST /rewards/:id/redeem
GET  /rewards/my
```

### Recommendations
```
POST /recommendations/assessment
GET  /recommendations/my
```

### Analytics (Admin)
```
GET  /analytics/overview
GET  /analytics/trainer-utilization
GET  /analytics/booking-trends
GET  /analytics/member-retention
```

### Calendar
```
GET  /calendar/auth-url
GET  /calendar/callback
DELETE /calendar/disconnect
```

---

## SECURITY RULES

| Layer | Implementation |
|---|---|
| Auth | JWT Bearer tokens, 15-min access token, 7-day refresh token |
| RBAC | NestJS Guards + custom @Roles() decorator |
| Rate Limiting | @nestjs/throttler — 100 req/min general, 5 req/min for auth |
| Booking anti-spam | DB unique constraint + backend pre-check |
| QR anti-replay | Single-use token + expiry |
| Input validation | class-validator on all DTOs |
| Password | bcrypt with salt rounds = 12 |
| HTTPS | Enforced via Cloudflare + Render |
| CORS | Configured per environment |

---

## ERROR CODES (Standard)

```
AUTH_001  → Invalid credentials
AUTH_002  → Token expired
AUTH_003  → Insufficient permissions
BOOK_001  → Booking conflict (time overlap)
BOOK_002  → Trainer at capacity
BOOK_003  → Class at capacity
BOOK_004  → Duplicate booking
BOOK_005  → Invalid booking date (past date)
QR_001    → QR token expired
QR_002    → QR already scanned
QR_003    → Invalid QR token
CAL_001   → Google Calendar sync failed (non-blocking)
```

---

## GIT COMMIT CONVENTIONS

```
feat:     new feature
fix:      bug fix
refactor: code restructure without feature change
docs:     documentation only
chore:    build/config/tooling changes
test:     test files only
perf:     performance improvements
```

Examples:
```
feat: implement PT booking conflict validation
feat: add XP award on QR check-in
fix: resolve race condition in class capacity check
refactor: extract booking validation into service layer
docs: update system architecture with PT pathway rules
```

---

## PHASE CHECKLIST

- [x] Phase 0  — Requirement Analysis (this file)
- [ ] Phase 1  — Backend Foundation (NestJS + Prisma setup)
- [ ] Phase 2  — Frontend Foundation (Next.js + shadcn/ui setup)
- [ ] Phase 3  — Database + Authentication (schema + JWT)
- [ ] Phase 4  — Booking System (gym + class + PT)
- [ ] Phase 5  — Google Calendar Integration
- [ ] Phase 6  — Gamification System (XP + badges + streaks)
- [ ] Phase 7  — Recommendation Engine (assessment + adaptive)
- [ ] Phase 8  — Dashboard + UI Polish
- [ ] Phase 9  — Testing + Deployment
- [ ] Phase 10 — Presentation Preparation

---

## DECISION LOG

| Date | Decision | Reason |
|---|---|---|
| 2026-05-20 | Use Render instead of raw Cloudflare Workers | NestJS is a Node.js HTTP server; Workers have a different runtime |
| 2026-05-20 | No forced onboarding questionnaire | Better UX; assessment is opt-in from dashboard |
| 2026-05-20 | Two separate repos (not monorepo) | Simpler CI/CD, independent deploy cycles |
| 2026-05-20 | PostgreSQL via Supabase | Free managed DB, easy remote access |
| 2026-05-20 | Prisma transactions for booking | Prevents race conditions without distributed locks |

---

*End of system-architecture.md — Reference this file before every implementation phase.*
