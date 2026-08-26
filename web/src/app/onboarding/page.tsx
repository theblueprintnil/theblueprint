import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { OnboardingForm } from '@/components/onboarding-form'
import { getSessionUser } from '@/lib/session'
import { getUserOrganizations } from '@/lib/organizations'

export const metadata: Metadata = {
  title: 'Set up your workspace — The Blueprint',
}

export default async function OnboardingPage() {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login')
  }
  const organizations = await getUserOrganizations(user.id)
  if (organizations.length > 0) {
    redirect('/app/dashboard')
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <p className="text-xl font-bold tracking-tight text-zinc-900">The Blueprint</p>
          <p className="mt-1 text-sm text-zinc-500">
            Welcome, {user.name}. Create your workspace to get started.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <OnboardingForm userName={user.name} />
        </div>
        <p className="mt-4 text-center text-sm text-zinc-500">Signed in as {user.email}</p>
      </div>
    </div>
  )
}
