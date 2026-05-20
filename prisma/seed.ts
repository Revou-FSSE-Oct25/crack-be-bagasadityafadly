import { PrismaClient, ProgramCategory } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

// Helper: creates a Date object for X days from now at a specific time
function getDate(daysFromNow: number, hour: number, minute: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ─── CLEAN ALL TABLES ──────────────────────────────────────────────────
  // Delete in the correct order (children before parents)
  // to avoid foreign key constraint errors
  console.log('🗑️  Clearing existing data...');
  await prisma.userBadge.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.reward.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.program.deleteMany();
  await prisma.trainer.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Cleared\n');

  // ─── ADMIN USER ────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('admin123456', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@gymapp.com',
      password: adminPassword,
      name: 'Gym Administrator',
      role: 'ADMIN',
      phone: '+1800000000',
    },
  });
  console.log('👤 Admin user created:', admin.email);

  // ─── TEST MEMBER USER ──────────────────────────────────────────────────
  const memberPassword = await bcrypt.hash('member123456', 10);
  const member = await prisma.user.create({
    data: {
      email: 'john@example.com',
      password: memberPassword,
      name: 'John Smith',
      role: 'MEMBER',
      phone: '+1800000001',
    },
  });
  console.log('👤 Member user created:', member.email);

  // ─── TRAINERS ─────────────────────────────────────────────────────────
  console.log('\n🏋️  Creating trainers...');

  const [sarah, mike, emma] = await Promise.all([
    prisma.trainer.create({
      data: {
        name: 'Sarah Chen',
        email: 'sarah.chen@gymapp.com',
        phone: '+1800000002',
        speciality: 'Strength & Conditioning',
        bio: 'Sarah is a certified strength coach with 8 years of experience. She specializes in Olympic lifting, powerlifting, and building functional strength. Former national-level competitor.',
      },
    }),
    prisma.trainer.create({
      data: {
        name: 'Mike Thompson',
        email: 'mike.thompson@gymapp.com',
        phone: '+1800000003',
        speciality: 'Fat Loss & Cardio',
        bio: 'Mike is a HIIT and metabolic conditioning expert. He has helped 300+ clients achieve their weight loss goals with his high-energy, results-driven classes. NASM certified.',
      },
    }),
    prisma.trainer.create({
      data: {
        name: 'Emma Rodriguez',
        email: 'emma.rodriguez@gymapp.com',
        phone: '+1800000004',
        speciality: 'Beginner Fitness & Mobility',
        bio: 'Emma is passionate about helping beginners start their fitness journey safely and confidently. She focuses on building movement foundations, flexibility, and body awareness.',
      },
    }),
  ]);

  console.log('✅ Created 3 trainers: Sarah, Mike, Emma');

  // ─── PROGRAMS ─────────────────────────────────────────────────────────
  console.log('\n📋 Creating programs...');

  const [fatBurn, muscleBuilder, powerStrength, mobility] = await Promise.all([
    prisma.program.create({
      data: {
        name: 'Fat Burn Express',
        description:
          'High-intensity interval training (HIIT) designed to maximize calorie burn and boost your metabolism. You will alternate between intense bursts and short rest periods for maximum fat loss. No equipment needed — just your bodyweight and determination.',
        category: ProgramCategory.FAT_LOSS,
        duration: 60,
        maxCapacity: 20,
        price: 25,
      },
    }),
    prisma.program.create({
      data: {
        name: 'Muscle Builder',
        description:
          'Progressive resistance training program focused on hypertrophy (muscle growth). Each session targets specific muscle groups using compound and isolation exercises. Suitable for intermediate gym-goers.',
        category: ProgramCategory.MUSCLE_GAIN,
        duration: 75,
        maxCapacity: 15,
        price: 30,
      },
    }),
    prisma.program.create({
      data: {
        name: 'Power Strength',
        description:
          'Advanced barbell strength training built around the big three: squat, bench press, and deadlift. This program will add serious strength and build a powerful physique. Experience with barbells required.',
        category: ProgramCategory.STRENGTH,
        duration: 60,
        maxCapacity: 12,
        price: 35,
      },
    }),
    prisma.program.create({
      data: {
        name: 'Mobility & Recovery',
        description:
          'Gentle yoga-inspired stretching, foam rolling, and corrective exercises to improve flexibility and speed recovery between workouts. Great for all fitness levels, especially after intense training days.',
        category: ProgramCategory.MOBILITY,
        duration: 45,
        maxCapacity: 25,
        price: 20,
      },
    }),
  ]);

  console.log('✅ Created 4 programs');

  // ─── SCHEDULES (next 7 days) ───────────────────────────────────────────
  console.log('\n🗓️  Creating schedules for the next 7 days...');

  await prisma.schedule.createMany({
    data: [
      // ── Day 1 (Tomorrow) ──
      {
        trainerId: mike.id,
        programId: fatBurn.id,
        startTime: getDate(1, 6, 0),
        endTime: getDate(1, 7, 0),
        room: 'Studio A',
        notes: 'Bring a water bottle and towel',
      },
      {
        trainerId: emma.id,
        programId: mobility.id,
        startTime: getDate(1, 8, 0),
        endTime: getDate(1, 8, 45),
        room: 'Studio B',
      },
      {
        trainerId: sarah.id,
        programId: powerStrength.id,
        startTime: getDate(1, 18, 0),
        endTime: getDate(1, 19, 0),
        room: 'Weight Room',
      },

      // ── Day 2 ──
      {
        trainerId: sarah.id,
        programId: muscleBuilder.id,
        startTime: getDate(2, 7, 0),
        endTime: getDate(2, 8, 15),
        room: 'Weight Room',
      },
      {
        trainerId: mike.id,
        programId: fatBurn.id,
        startTime: getDate(2, 17, 30),
        endTime: getDate(2, 18, 30),
        room: 'Studio A',
      },

      // ── Day 3 ──
      {
        trainerId: emma.id,
        programId: mobility.id,
        startTime: getDate(3, 9, 0),
        endTime: getDate(3, 9, 45),
        room: 'Studio B',
      },
      {
        trainerId: sarah.id,
        programId: powerStrength.id,
        startTime: getDate(3, 19, 0),
        endTime: getDate(3, 20, 0),
        room: 'Weight Room',
      },

      // ── Day 5 ──
      {
        trainerId: mike.id,
        programId: fatBurn.id,
        startTime: getDate(5, 6, 0),
        endTime: getDate(5, 7, 0),
        room: 'Studio A',
        notes: 'Morning session — extra high energy!',
      },
      {
        trainerId: sarah.id,
        programId: muscleBuilder.id,
        startTime: getDate(5, 18, 0),
        endTime: getDate(5, 19, 15),
        room: 'Weight Room',
      },

      // ── Day 7 ──
      {
        trainerId: emma.id,
        programId: mobility.id,
        startTime: getDate(7, 10, 0),
        endTime: getDate(7, 10, 45),
        room: 'Studio B',
        notes: 'Weekend recovery session',
      },
      {
        trainerId: mike.id,
        programId: fatBurn.id,
        startTime: getDate(7, 15, 0),
        endTime: getDate(7, 16, 0),
        room: 'Studio A',
      },
    ],
  });

  console.log('✅ Created 11 schedules');

  // ─── BADGES ───────────────────────────────────────────────────────────
  console.log('\n🎖️  Creating badges...');

  await prisma.badge.createMany({
    data: [
      {
        name: 'First Step',
        description: 'Congratulations on attending your very first class!',
        requirement: 'Complete 1 class attendance',
      },
      {
        name: 'Week Warrior',
        description: 'You attended 5 classes in a single week!',
        requirement: 'Complete 5 classes within any 7-day period',
      },
      {
        name: 'Month Master',
        description: 'You attended 20 classes in a single month!',
        requirement: 'Complete 20 classes within any 30-day period',
      },
      {
        name: 'Early Bird',
        description: 'You love the morning grind!',
        requirement: 'Attend 3 classes that start before 7:00 AM',
      },
      {
        name: 'Strength Seeker',
        description: 'A true powerlifter in the making!',
        requirement: 'Complete 10 STRENGTH category classes',
      },
      {
        name: 'Burn Champion',
        description: 'The fat-burning machine!',
        requirement: 'Complete 10 FAT_LOSS category classes',
      },
      {
        name: 'Flexible Friend',
        description: 'Recovery is part of training too!',
        requirement: 'Complete 5 MOBILITY category classes',
      },
      {
        name: 'Loyal Member',
        description: 'You have been with us for 6 months!',
        requirement: 'Active membership for 180 days',
      },
    ],
  });

  console.log('✅ Created 8 badges');

  // ─── FINAL SUMMARY ─────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Database seeding complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🔑 Test Accounts:');
  console.log('   Admin  →  admin@gymapp.com  / admin123456');
  console.log('   Member →  john@example.com  / member123456');
  console.log('\n📊 Created:');
  console.log('   2 users (admin + member)');
  console.log('   3 trainers');
  console.log('   4 programs');
  console.log('   11 schedules (next 7 days)');
  console.log('   8 badges');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((error) => {
    console.error('\n❌ Seed failed!');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });