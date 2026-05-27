/**
 * prisma/seed.ts — Gymora starter data
 *
 * Run with:  npx ts-node prisma/seed.ts
 *
 * Seeds badges, rewards, challenges, trainers, classes, and schedules.
 * Safe to run multiple times — uses upsert so it won't create duplicates.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function setHour(base: Date, h: number, m = 0) {
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

async function main() {
  // ── Badges ────────────────────────────────────────────────────────
  console.log('Seeding badges...');
  const badges = [
    { name: 'First Step',    description: 'Checked in for the first time' },
    { name: 'Bronze Streak', description: 'Maintained a 3-day check-in streak' },
    { name: 'Week Warrior',  description: 'Maintained a 7-day check-in streak' },
    { name: 'Iron Regular',  description: 'Checked in 10 times total' },
    { name: 'Century Club',  description: 'Earned 100 XP' },
  ];
  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: { description: badge.description },
      create: badge,
    });
    console.log(`  ✓ Badge: ${badge.name}`);
  }

  // ── Rewards ───────────────────────────────────────────────────────
  console.log('\nSeeding rewards...');
  const rewards = [
    { name: 'Free Protein Drink', description: 'A free protein shake at the gym bar', xpCost: 0, stock: 9999 },
    { name: 'Guest Pass',         description: 'Bring a friend for one free visit', xpCost: 50, stock: 100 },
    { name: 'Gymora Water Bottle', description: 'Branded stainless steel water bottle', xpCost: 200, stock: 50 },
    { name: 'One Month Premium Upgrade', description: 'Upgrade your membership to PREMIUM for one month', xpCost: 500, stock: 20 },
  ];
  for (const reward of rewards) {
    const existing = await prisma.reward.findFirst({ where: { name: reward.name } });
    if (!existing) {
      await prisma.reward.create({ data: reward });
      console.log(`  ✓ Reward: ${reward.name}`);
    } else {
      console.log(`  – Reward already exists: ${reward.name}`);
    }
  }

  // ── Challenges ────────────────────────────────────────────────────
  console.log('\nSeeding challenges...');
  const challenges = [
    { name: 'Gym Rookie',       description: 'Check in 5 times to prove you mean business', xpReward: 30, target: 5, durationDays: 30 },
    { name: 'Dedicated Member', description: 'Check in 10 times — consistency is the key',  xpReward: 75, target: 10, durationDays: 30 },
    { name: 'Class Enthusiast', description: 'Check in to any class 3 times',               xpReward: 40, target: 3, durationDays: 14 },
  ];
  for (const challenge of challenges) {
    const existing = await prisma.challenge.findFirst({ where: { name: challenge.name } });
    if (!existing) {
      await prisma.challenge.create({ data: challenge });
      console.log(`  ✓ Challenge: ${challenge.name}`);
    } else {
      console.log(`  – Challenge already exists: ${challenge.name}`);
    }
  }

  // ── Trainers ──────────────────────────────────────────────────────
  console.log('\nSeeding trainers...');
  const trainers = [
    {
      name: 'Alex Rivera',
      email: 'alex.rivera@gymora.com',
      specialty: 'Strength & Conditioning',
      bio: 'NSCA-certified strength coach with 8 years of experience. Specialises in powerlifting and athletic performance.',
    },
    {
      name: 'Maya Patel',
      email: 'maya.patel@gymora.com',
      specialty: 'Yoga & Mindfulness',
      bio: 'RYT-500 yoga instructor. Combines traditional yoga philosophy with modern anatomy for safe and effective practice.',
    },
    {
      name: 'Jordan Kim',
      email: 'jordan.kim@gymora.com',
      specialty: 'HIIT & Functional Training',
      bio: 'Former competitive athlete turned HIIT specialist. Creates challenging yet scalable workouts for all fitness levels.',
    },
  ];

  const trainerIds: Record<string, string> = {};
  for (const trainer of trainers) {
    const t = await prisma.trainer.upsert({
      where: { email: trainer.email },
      update: { name: trainer.name, specialty: trainer.specialty, bio: trainer.bio, isActive: true },
      create: { ...trainer, isActive: true },
    });
    trainerIds[trainer.email] = t.id;
    console.log(`  ✓ Trainer: ${trainer.name}`);
  }

  // ── Classes ───────────────────────────────────────────────────────
  console.log('\nSeeding classes...');
  const classDefinitions = [
    { name: 'Morning Yoga',       description: 'A calming morning yoga flow to energise your day.', difficulty: 'BEGINNER' as const,      durationMinutes: 60, capacity: 15, caloriesEstimate: 200 },
    { name: 'HIIT Blast',         description: 'High-intensity interval training to torch calories.',  difficulty: 'INTERMEDIATE' as const, durationMinutes: 45, capacity: 20, caloriesEstimate: 450 },
    { name: 'Power Lifting 101',  description: 'Learn the big three lifts with perfect form.',         difficulty: 'BEGINNER' as const,      durationMinutes: 75, capacity: 10, caloriesEstimate: 300 },
    { name: 'Advanced CrossFit',  description: 'Functional fitness for experienced athletes.',          difficulty: 'ADVANCED' as const,     durationMinutes: 60, capacity: 12, caloriesEstimate: 550 },
  ];

  const classIds: Record<string, string> = {};
  for (const cls of classDefinitions) {
    const existing = await prisma.class.findFirst({ where: { name: cls.name, isActive: true } });
    if (!existing) {
      const created = await prisma.class.create({ data: cls });
      classIds[cls.name] = created.id;
      console.log(`  ✓ Class: ${cls.name}`);
    } else {
      classIds[cls.name] = existing.id;
      console.log(`  – Class already exists: ${cls.name}`);
    }
  }

  // ── Schedules ─────────────────────────────────────────────────────
  // Only create schedules if none exist yet
  console.log('\nSeeding schedules...');
  const existingScheduleCount = await prisma.schedule.count({ where: { isActive: true } });

  if (existingScheduleCount > 0) {
    console.log(`  – ${existingScheduleCount} schedules already exist. Skipping.`);
  } else {
    const now = new Date();
    // Reset to start of today for clean date math
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const scheduleTemplate = [
      // Day +1
      { classKey: 'Morning Yoga',      trainerEmail: 'maya.patel@gymora.com',  dayOffset: 1, startHour: 7,  duration: 60 },
      { classKey: 'HIIT Blast',        trainerEmail: 'jordan.kim@gymora.com',  dayOffset: 1, startHour: 9,  duration: 45 },
      { classKey: 'Power Lifting 101', trainerEmail: 'alex.rivera@gymora.com', dayOffset: 1, startHour: 11, duration: 75 },
      // Day +2
      { classKey: 'Morning Yoga',      trainerEmail: 'maya.patel@gymora.com',  dayOffset: 2, startHour: 7,  duration: 60 },
      { classKey: 'Advanced CrossFit', trainerEmail: 'jordan.kim@gymora.com',  dayOffset: 2, startHour: 10, duration: 60 },
      { classKey: 'HIIT Blast',        trainerEmail: 'alex.rivera@gymora.com', dayOffset: 2, startHour: 18, duration: 45 },
      // Day +3
      { classKey: 'Power Lifting 101', trainerEmail: 'alex.rivera@gymora.com', dayOffset: 3, startHour: 9,  duration: 75 },
      { classKey: 'Morning Yoga',      trainerEmail: 'maya.patel@gymora.com',  dayOffset: 3, startHour: 7,  duration: 60 },
      // Day +5
      { classKey: 'HIIT Blast',        trainerEmail: 'jordan.kim@gymora.com',  dayOffset: 5, startHour: 7,  duration: 45 },
      { classKey: 'Advanced CrossFit', trainerEmail: 'alex.rivera@gymora.com', dayOffset: 5, startHour: 18, duration: 60 },
      { classKey: 'Morning Yoga',      trainerEmail: 'maya.patel@gymora.com',  dayOffset: 5, startHour: 9,  duration: 60 },
      // Day +7
      { classKey: 'Power Lifting 101', trainerEmail: 'alex.rivera@gymora.com', dayOffset: 7, startHour: 10, duration: 75 },
      { classKey: 'HIIT Blast',        trainerEmail: 'jordan.kim@gymora.com',  dayOffset: 7, startHour: 18, duration: 45 },
      // Day +8
      { classKey: 'Morning Yoga',      trainerEmail: 'maya.patel@gymora.com',  dayOffset: 8, startHour: 7,  duration: 60 },
      { classKey: 'Advanced CrossFit', trainerEmail: 'jordan.kim@gymora.com',  dayOffset: 8, startHour: 10, duration: 60 },
    ];

    for (const tpl of scheduleTemplate) {
      const classId = classIds[tpl.classKey];
      const trainerId = trainerIds[tpl.trainerEmail];
      if (!classId || !trainerId) continue;

      const startTime = setHour(addDays(today, tpl.dayOffset), tpl.startHour);
      const endTime = new Date(startTime.getTime() + tpl.duration * 60 * 1000);

      await prisma.schedule.create({
        data: { classId, trainerId, startTime, endTime, isActive: true },
      });
      console.log(`  ✓ Schedule: ${tpl.classKey} on day+${tpl.dayOffset} at ${tpl.startHour}:00`);
    }
  }

  console.log('\nSeed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
