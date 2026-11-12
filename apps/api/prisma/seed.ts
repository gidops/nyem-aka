import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient, RoleName } from '../src/generated/prisma/client.js';

// Reference data the app cannot run without: roles, categories and the first admin.
// Every write is an upsert, so running the seed twice changes nothing.

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Set DIRECT_URL or DATABASE_URL before seeding.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const roles: { name: RoleName; description: string }[] = [
  { name: RoleName.REQUESTER, description: 'Student or staff member who submits and tracks requests' },
  { name: RoleName.OFFICER, description: 'Maintenance officer who works on assigned requests' },
  { name: RoleName.ADMIN, description: 'Administrator who manages users, assignments and reports' },
];

const categories: { name: string; description: string }[] = [
  { name: 'Electrical', description: 'Lighting, sockets, power faults' },
  { name: 'Plumbing', description: 'Leaks, blocked drains, water supply' },
  { name: 'Carpentry', description: 'Doors, windows, furniture, locks' },
  { name: 'HVAC', description: 'Air conditioning, fans, ventilation' },
  { name: 'ICT / Network', description: 'Internet, projectors, lab computers' },
  { name: 'Cleaning', description: 'Waste, spills, sanitation' },
  { name: 'Other', description: 'Anything that does not fit another category' },
];

async function main() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { description: category.description },
      create: category,
    });
  }

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD before seeding.');
  }

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: RoleName.ADMIN },
  });

  // `update: {}` on purpose: re-seeding must never reset a password the admin has since changed.
  const admin = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {},
    create: {
      email: email.toLowerCase(),
      passwordHash: await argon2.hash(password),
      fullName: process.env.SEED_ADMIN_NAME ?? 'System Administrator',
      roleId: adminRole.id,
    },
  });

  console.log(
    `Seeded ${roles.length} roles, ${categories.length} categories, admin ${admin.email}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
