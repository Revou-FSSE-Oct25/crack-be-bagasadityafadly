/**
 * prisma/seed.ts — GymFlow starter data
 *
 * Run with:  npx ts-node prisma/seed.ts
 *
 * Seeds the badges, rewards, and challenges that the gamification system
 * needs to function. Safe to run multiple times — uses upsert so it won't
 * create duplicates.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding badges...');

  // ── Badges ────────────────────────────────────────────────────────
  // These names must match exactly what BadgesService.evaluateCondition() checks.
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
    {
      name: 'Free Protein Drink',
      description: 'A free protein shake at the gym bar — earned by hitting a 7-day streak',
      xpCost: 0,   // 0 = granted automatically by streak, not purchased
      stock: 9999,
    },
    {
      name: 'Guest Pass',
      description: 'Bring a friend for one free visit',
      xpCost: 50,
      stock: 100,
    },
    {
      name: 'GymFlow Water Bottle',
      description: 'Branded stainless steel water bottle',
      xpCost: 200,
      stock: 50,
    },
    {
      name: 'One Month Premium Upgrade',
      description: 'Upgrade your membership to PREMIUM for one month',
      xpCost: 500,
      stock: 20,
    },
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
    {
      name: 'Gym Rookie',
      description: 'Check in 5 times to prove you mean business',
      xpReward: 30,
      target: 5,
      durationDays: 30,
    },
    {
      name: 'Dedicated Member',
      description: 'Check in 10 times — consistency is the key',
      xpReward: 75,
      target: 10,
      durationDays: 30,
    },
    {
      name: 'Class Enthusiast',
      description: 'Check in to any class 3 times',
      xpReward: 40,
      target: 3,
      durationDays: 14,
    },
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

  console.log('\nSeed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
