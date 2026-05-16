import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ulid } from 'ulid';

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: 'income', name: 'Income', icon: '💷', colour: '#10b981' },
  { slug: 'housing', name: 'Housing', icon: '🏠', colour: '#3b82f6' },
  { slug: 'bills', name: 'Bills & Utilities', icon: '💡', colour: '#0ea5e9' },
  { slug: 'subscriptions', name: 'Subscriptions', icon: '📺', colour: '#8b5cf6' },
  { slug: 'groceries', name: 'Groceries', icon: '🛒', colour: '#22c55e' },
  { slug: 'eating_out', name: 'Eating Out', icon: '🍔', colour: '#f97316' },
  { slug: 'transport', name: 'Transport', icon: '🚆', colour: '#06b6d4' },
  { slug: 'health', name: 'Health & Fitness', icon: '🏥', colour: '#ec4899' },
  { slug: 'shopping', name: 'Shopping', icon: '🛍️', colour: '#f59e0b' },
  { slug: 'travel', name: 'Travel', icon: '✈️', colour: '#6366f1' },
  { slug: 'transfer', name: 'Transfer', icon: '↔️', colour: '#64748b' },
  { slug: 'cash', name: 'Cash', icon: '💵', colour: '#84cc16' },
  { slug: 'uncategorised', name: 'Uncategorised', icon: '❓', colour: '#94a3b8' },
];

async function main(): Promise<void> {
  // Categories - system-managed, upsert by slug.
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: { id: ulid(), ...c, isSystem: true },
      update: { name: c.name, icon: c.icon, colour: c.colour },
    });
  }

  // Demo user - only if not already present
  const existing = await prisma.user.findUnique({ where: { email: 'demo@finsight.app' } });
  if (existing) {
    console.log('Demo user already exists, skipping');
    return;
  }

  const user = await prisma.user.create({
    data: {
      id: ulid(),
      email: 'demo@finsight.app',
      passwordHash: await bcrypt.hash('Demo1234!', 12),
      displayName: 'Demo User',
    },
  });

  console.log(`Created demo user ${user.email} (password: Demo1234!).`);
  console.log('Now sign in and connect the Mock bank to populate transactions.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
