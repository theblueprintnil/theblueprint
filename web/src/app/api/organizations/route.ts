import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { createOrganizationWithOwner, getUserOrganizations } from '@/lib/organizations'
import { validateOnboardingInput } from '@/lib/onboarding'

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const organizations = await getUserOrganizations(user.id)
  return NextResponse.json({ items: organizations })
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const body = (await request.json().catch(() => null)) as {
    name?: string
    workspaceType?: string
  } | null
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const invalid = validateOnboardingInput(
    body.workspaceType
      ? { name: body.name ?? '', workspaceType: body.workspaceType as never }
      : { name: body.name ?? '' },
  )
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 })
  }
  const existing = await getUserOrganizations(user.id)
  if (existing.length > 0) {
    return NextResponse.json({ error: 'You already belong to an organization.' }, { status: 409 })
  }
  const organization = await createOrganizationWithOwner({
    userId: user.id,
    name: body.name ?? '',
    workspaceType: body.workspaceType as never,
  })
  return NextResponse.json({ organization }, { status: 201 })
}
