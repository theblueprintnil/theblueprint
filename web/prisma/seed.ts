import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding NIL Athlete Promotion Site database...')

  await prisma.auditLog.deleteMany()
  await prisma.session.deleteMany()
  await prisma.deal.deleteMany()
  await prisma.opportunity.deleteMany()
  await prisma.athlete.deleteMany()
  await prisma.brand.deleteMany()
  await prisma.invitation.deleteMany()
  await prisma.usageEvent.deleteMany()
  await prisma.aiRun.deleteMany()
  await prisma.project.deleteMany()
  await prisma.agentTaskExecution.deleteMany()

  await prisma.subscription.deleteMany()
  await prisma.entitlement.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany({ where: { slug: { startsWith: 'carter-athletics-demo' } } })

  const athleteUser = await prisma.user.create({
    data: {
      email: 'jordan.carter@state.edu',
      name: 'Jordan Carter',
      role: 'ATHLETE',
      passwordHash: 'clerk-managed',
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
      passwordHash: 'clerk-managed',
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

  const demoOrg = await prisma.organization.create({
    data: {
      name: 'Carter Athletics',
      slug: 'carter-athletics-demo',
      workspaceType: 'ATHLETE_STUDIO',
      createdById: athleteUser.id,
      memberships: {
        create: { userId: athleteUser.id, role: 'OWNER' },
      },
      subscription: {
        create: {
          stripeCustomerId: 'cus_demo',
          stripeSubscriptionId: 'sub_demo',
          stripePriceId: 'price_starter',
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      entitlement: {
        create: {
          plan: 'STARTER',
          seatsLimit: 3,
          aiCreditsMonthly: 100,
          aiCreditsUsed: 5,
          modules: { studio: true, content: true, media: true },
        },
      },
      invitations: {
        create: {
          email: 'creator@carterathletics.com',
          role: 'MEMBER',
          tokenHash: 'invite-demo',
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          invitedById: athleteUser.id,
        },
      },
      projects: {
        create: {
          name: 'Fall Campaign',
          slug: 'fall-campaign',
          status: 'ACTIVE',
          ownerUserId: athleteUser.id,
          metadata: { kind: 'campaign', deliverables: 3 },
        },
      },
      usageEvents: {
        create: {
          userId: athleteUser.id,
          eventType: 'AI_CREDIT_CONSUMED',
          quantity: 1,
          metadata: { aiRunKind: 'draft' },
        },
      },
      aiRuns: {
        create: {
          userId: athleteUser.id,
          status: 'SUCCEEDED',
          kind: 'draft',
          model: 'gpt-4o',
          inputTokens: 1200,
          outputTokens: 300,
          cost: 0.012,
          startedAt: new Date(),
          completedAt: new Date(),
        },
      },
    },
  })

  const athleteProfile = await prisma.athlete.findUniqueOrThrow({
    where: { userId: athleteUser.id },
  })

  await prisma.agentTaskExecution.create({
    data: {
      organizationId: demoOrg.id,
      athleteId: athleteProfile.id,
      graphKind: 'NIL_GENERATION',
      threadId: `demo-nil-apex-${athleteProfile.id}`,
      status: 'PENDING_APPROVAL',
      complianceScore: 0.66,
      complianceFlags: [
        {
          riskType: 'ftc_disclosure',
          severity: 'HIGH',
          flagMessage: 'Instagram caption does not contain an #ad or #sponsored disclosure.',
          recommendedEdit: 'Prepend "#ad" to the first line of the selected caption.',
        },
        {
          riskType: 'brand_exclusivity',
          severity: 'MEDIUM',
          flagMessage:
            '"Sports drink" may conflict with the exclusive beverage category in the Apex Nutrition deal.',
          recommendedEdit: 'Use only the approved talking points from the campaign brief.',
        },
        {
          riskType: 'ncaa_eligibility',
          severity: 'LOW',
          flagMessage: '"Join my team" could read as recruiting language.',
          recommendedEdit: 'Replace with "Tag a teammate who trains hard".',
        },
      ],
      captions: [
        {
          id: 'c1',
          platform: 'instagram',
          text: 'Game day prep is non-negotiable. Hydrating with Apex Electrolyte has been part of my routine all season — link in bio if you want to level up.',
          hashtags: ['#ApexNutrition', '#Hydration', '#GameDay'],
        },
        {
          id: 'c2',
          platform: 'tiktok',
          text: 'POV: you finally found a hydration routine that works. Apex Electrolyte keeps me locked in through practice, film, and everything in between.',
          hashtags: ['#ApexNutrition', '#HydrationRoutine'],
        },
        {
          id: 'c3',
          platform: 'x',
          text: 'Big news — I am partnering with Apex Nutrition this season. Their electrolyte lineup is a staple in my training bag.',
          hashtags: ['#ApexNutrition'],
        },
      ],
      inputRef: {
        brand: 'Apex Nutrition',
        campaignTitle: 'Apex Electrolyte Launch',
        athleteName: 'Jordan Carter',
        sport: 'Basketball',
        school: 'State University',
        contentGoal: 'Announce the partnership and drive awareness for the electrolyte lineup.',
        platforms: ['instagram', 'tiktok', 'x'],
        exclusivityTerms: ['gatorade', 'powerade', 'bodyarmor'],
        policySnapshotId: 'ncaa-nil-v1-2026',
        deliverablesCount: 3,
      },
      startedAt: new Date(),
    },
  })

  await prisma.auditLog.create({
    data: {
      action: 'ORGANIZATION_CREATED',
      entityType: 'Organization',
      entityId: demoOrg.id,
      actorId: athleteUser.id,
      organizationId: demoOrg.id,
      details: 'Created demo tenant Carter Athletics (ATHLETE_STUDIO)',
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
