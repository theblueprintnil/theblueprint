import { OpportunityInbox } from '@/components/opportunity-inbox'
import { EmptyState } from '@/components/state'

export default function AthleteDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Athlete dashboard</h1>
        <p className="text-sm text-zinc-500">
          Good to see you, Jordan. Here is what is happening with your brand.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OpportunityInbox />
        </div>
        <div className="space-y-6">
          <section className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="text-base font-semibold text-zinc-900">Brand snapshot</h2>
            <dl className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-zinc-500">Audience</dt>
                <dd className="mt-0.5 text-lg font-semibold text-zinc-900">18.4K</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Engagement</dt>
                <dd className="mt-0.5 text-lg font-semibold text-zinc-900">6.2%</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Media kit views</dt>
                <dd className="mt-0.5 text-lg font-semibold text-zinc-900">142</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Active offers</dt>
                <dd className="mt-0.5 text-lg font-semibold text-zinc-900">2</dd>
              </div>
            </dl>
          </section>
          <section className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="text-base font-semibold text-zinc-900">Recent activity</h2>
            <div className="mt-4">
              <EmptyState
                title="Nothing new yet"
                description="Sign-ins, brand updates, and deal events will appear here."
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
