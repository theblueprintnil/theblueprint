import { randomUUID } from 'node:crypto'
import { prismaAuth } from './db'
import { slugFromName } from './slug'
import type { MembershipRole, WorkspaceType } from '@prisma/client'
import { DEMO_DURATION_DAYS, PLANS } from './billing/plans'

export interface UserOrganization {
  id: string
  name: string
  slug: string
  workspaceType: WorkspaceType
  role: MembershipRole
}

export async function getUserOrganizations(userId: string): Promise<UserOrganization[]> {
  const rows = await prismaAuth.membership.findMany({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: 'asc' },
  })
  return rows.map((row) => ({
    id: row.organization.id,
    name: row.organization.name,
    slug: row.organization.slug,
    workspaceType: row.organization.workspaceType,
    role: row.role,
  }))
}

export async function getMembershipRole(
  userId: string,
  organizationId: string,
): Promise<MembershipRole | null> {
  const membership = await prismaAuth.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  })
  return membership?.role ?? null
}

export async function resolveActiveOrganization(
  userId: string,
  preferredOrganizationId?: string | null,
): Promise<UserOrganization | null> {
  const organizations = await getUserOrganizations(userId)
  if (organizations.length === 0) return null
  if (preferredOrganizationId) {
    const preferred = organizations.find((org) => org.id === preferredOrganizationId)
    if (preferred) return preferred
  }
  await prismaAuth.user
    .update({
      where: { id: userId },
      data: { currentOrganizationId: organizations[0].id },
    })
    .catch(() => undefined)
  return organizations[0]
}

export interface CreateOrganizationInput {
  userId: string
  name: string
  workspaceType: WorkspaceType
}

export async function createOrganizationWithOwner(
  input: CreateOrganizationInput,
): Promise<UserOrganization> {
  const base = slugFromName(input.name)
  let slug = `${base}-${randomUUID().slice(0, 6)}`
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const clash = await prismaAuth.organization.findUnique({ where: { slug } })
    if (!clash) break
    slug = `${base}-${randomUUID().slice(0, 6)}`
  }
  const created = await prismaAuth.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: input.name.trim(),
        slug,
        workspaceType: input.workspaceType,
        createdById: input.userId,
        demoExpiresAt: new Date(Date.now() + DEMO_DURATION_DAYS * 24 * 60 * 60 * 1000),
        memberships: {
          create: { userId: input.userId, role: 'OWNER' },
        },
        entitlement: {
          create: {
            plan: PLANS.DEMO.id,
            seatsLimit: PLANS.DEMO.seatsLimit,
            aiCreditsMonthly: PLANS.DEMO.aiCreditsMonthly,
            modules: PLANS.DEMO.modules,
          },
        },
      },
    })
    await tx.user.update({
      where: { id: input.userId },
      data: { currentOrganizationId: organization.id },
    })
    await tx.auditLog.create({
      data: {
        action: 'ORGANIZATION_CREATED',
        entityType: 'Organization',
        entityId: organization.id,
        actorId: input.userId,
        organizationId: organization.id,
        details: `Created organization "${organization.name}" (${organization.workspaceType})`,
      },
    })
    await tx.auditLog.create({
      data: {
        action: 'BILLING_DEMO_STARTED',
        entityType: 'Organization',
        entityId: organization.id,
        organizationId: organization.id,
        details: `Demo plan granted for ${DEMO_DURATION_DAYS} days.`,
      },
    })
    return organization
  })
  return {
    id: created.id,
    name: created.name,
    slug: created.slug,
    workspaceType: created.workspaceType,
    role: 'OWNER',
  }
}
