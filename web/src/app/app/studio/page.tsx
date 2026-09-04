import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { ApprovalCard } from '@/components/agent/ApprovalCard'
import { EmptyState } from '@/components/state'
import { listPendingApprovals } from '@/lib/agent/queries'
import { resolveActiveOrganization } from '@/lib/organizations'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function StudioPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const store = await cookies()
  const org = await resolveActiveOrganization(
    user.id,
    store.get('blueprint_org')?.value ?? user.currentOrganizationId,
  )
  if (!org) redirect('/onboarding')
  const executions = await listPendingApprovals(user.id, org.id)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Content studio</h1>
          <p className="text-sm text-zinc-500">
            AI-generated content pauses here for compliance review and human approval before
            publishing.
          </p>
        </div>
        <p className="text-xs text-zinc-400">Refreshes automatically after each decision.</p>
      </div>

      {executions.length === 0 ? (
        <EmptyState
          title="Approval queue empty"
          description="New caption drafts from the content agent will appear here for your review."
        />
      ) : (
        <div className="space-y-6">
          {executions.map((execution) => (
            <ApprovalCard key={execution.id} execution={execution} />
          ))}
        </div>
      )}
    </div>
  )
}
