import { hash as bcryptHash } from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEMO_PASSWORD = 'Password123!'

async function main() {
  console.log('Seeding NIL Athlete Promotion Site database...')

  await prisma.auditLog.deleteMany()
  await prisma.session.deleteMany()
  await prisma.deal.deleteMany()
  await prisma.opportunity.deleteMany()
  await prisma.athlete.deleteMany()
  await prisma.brand.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcryptHash(DEMO_PASSWORD, 10)

  const athleteUser = await prisma.user.create({
    data: {
      email: 'jordan.carter@state.edu',
      name: 'Jordan Carter',
      role: 'ATHLETE',
      passwordHash,
      athlete: {
        create: {
          name: 'Jordan Carter',
          sport: 'Basketball',
          school: 'State University',
          bio: 'Point guard with a passion for fitness, tech, and community engagement.',
          avatarUrl: '/avatars/jordan.jpg',
          followerCount: 125000,
          verificationStatus: 'VERIFIED',
        },
      },
    },
  })

  await prisma.user.create({
    data: {
      email: 'partnerships@apexnutrition.com',
      name: 'Apex Nutrition',
      role: 'BRAND',
      passwordHash,
      brand: {
        create: {
          name: 'Apex Nutrition',
          industry: 'Sports Performance',
          logoUrl: '/brands/apex.png',
          verified: true,
        },
      },
    },
  })

  await prisma.opportunity.create({
    data: {
      title: 'Fall Hydration Campaign Ambassador',
      brandName: 'Apex Nutrition',
      payout: 3500.0,
      sport: 'Basketball',
      location: 'National',
      deadline: '2026-09-15',
      status: 'OPEN',
      description: 'Promote our new electrolyte hydration lineup across Instagram & TikTok.',
      ownerUserId: athleteUser.id,
    },
  })

  await prisma.opportunity.create({
    data: {
      title: 'Local Apparel Shoot & Social Takeover',
      brandName: 'UrbanFit Co.',
      payout: 1800.0,
      sport: 'All Sports',
      location: 'Austin, TX',
      deadline: '2026-09-01',
      status: 'APPLIED',
      description:
        '1-day local studio shoot and 24hr Instagram takeover featuring our fall collection.',
      ownerUserId: athleteUser.id,
    },
  })

  const deal1 = await prisma.deal.create({
    data: {
      title: 'Apex Electrolyte Launch',
      brandName: 'Apex Nutrition',
      athleteName: 'Jordan Carter',
      amount: 3500.0,
      status: 'ACTIVE',
      stage: 'negotiation',
      deliverables: 3,
      startDate: '2026-08-01',
      endDate: '2026-09-30',
      ownerUserId: athleteUser.id,
    },
  })

  await prisma.deal.create({
    data: {
      title: 'TechGear Pro Endorsement',
      brandName: 'TechGear',
      athleteName: 'Jordan Carter',
      amount: 5000.0,
      status: 'COMPLETED',
      stage: 'closed',
      deliverables: 5,
      startDate: '2026-06-01',
      endDate: '2026-07-31',
      ownerUserId: athleteUser.id,
    },
  })

  await prisma.auditLog.create({
    data: {
      action: 'DEAL_CREATED',
      entityType: 'Deal',
      entityId: deal1.id,
      actorId: athleteUser.id,
      details: `Created deal "${deal1.title}" with payout $${deal1.amount}`,
    },
  })

  console.log('Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
