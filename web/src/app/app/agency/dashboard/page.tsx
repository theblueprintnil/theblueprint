import { DealPipeline } from '@/components/deal-pipeline'
import { EmptyState } from '@/components/state'

export default function AgencyDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Agency dashboard</h1>
        <p className="text-sm text-zinc-500">
          Roster health, deal velocity, and what needs your attention.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DealPipeline />
        </div>
        <div className="space-y-6">
          <section className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="text-base font-semibold text-zinc-900">Roster summary</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500">Athletes</dt>
                <dd className="font-medium text-zinc-900">3</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500">Active deals</dt>
                <dd className="font-medium text-zinc-900">5</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500">Awaiting approval</dt>
                <dd className="font-medium text-zinc-900">1</dd>
              </div>
            </dl>
          </section>
          <section className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="text-base font-semibold text-zinc-900">Pending approvals</h2>
            <div className="mt-4">
              <EmptyState
                title="Approval queue empty"
                description="Guardian and client approvals will land here."
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
