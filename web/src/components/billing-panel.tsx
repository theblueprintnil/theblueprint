'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'
import type { BillingStatus, PlanType } from '@prisma/client'
import type { MembershipRole } from '@/lib/permissions'

export type BillingSnapshotStatus =
  | BillingStatus
  | 'demo_active'
  | 'demo_expired'
  | 'canceled'
  | 'unpaid'
  | 'past_due'

export interface EntitlementSnapshot {
  plan: PlanType
  seatsLimit: number
  aiCreditsMonthly: number
  aiCreditsUsed: number
  modules: string[]
  status: BillingSnapshotStatus
  demoExpiresAt: string | null
  currentPeriodEnd: string | null
  trialEnd: string | null
  cancelAtPeriodEnd: boolean
}

export interface BillingPlan {
  id: PlanType
  label: string
  description: string
  seatsLimit: number
  aiCreditsMonthly: number
  modules: string[]
  highlight: boolean
  priceConfigured: boolean
}

interface BillingPanelProps {
  snapshot: EntitlementSnapshot | null
  role: MembershipRole | null
  plans: BillingPlan[]
  demoPlan: { label: string; description: string; seatsLimit: number; aiCreditsMonthly: number }
  stripeConfigured: boolean
  statusParam?: string
}

const STATUS_LABEL: Record<EntitlementSnapshot['status'], string> = {
  demo_active: 'Demo active',
  demo_expired: 'Demo expired',
  canceled: 'Canceled',
  unpaid: 'Unpaid',
  past_due: 'Past due',
  INCOMPLETE: 'Incomplete',
  INCOMPLETE_EXPIRED: 'Incomplete expired',
  TRIALING: 'Trialing',
  ACTIVE: 'Active',
  PAST_DUE: 'Past due',
  CANCELED: 'Canceled',
  UNPAID: 'Unpaid',
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function BillingPanel({
  snapshot,
  role,
  plans,
  demoPlan,
  stripeConfigured,
  statusParam,
}: BillingPanelProps) {
  const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canManage = role === 'OWNER'

  async function startCheckout(plan: PlanType) {
    setError(null)
    setLoadingPlan(plan)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null
      if (!res.ok || !data?.url) {
        throw new Error(data?.error ?? 'Unable to start checkout.')
      }
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed.')
      setLoadingPlan(null)
    }
  }

  async function openPortal() {
    setError(null)
    setPortalLoading(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null
      if (!res.ok || !data?.url) {
        throw new Error(data?.error ?? 'Unable to open the billing portal.')
      }
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Portal failed.')
      setPortalLoading(false)
    }
  }

  if (!snapshot) {
    return <p className="text-sm text-zinc-500">No billing data found for this organization.</p>
  }

  const isDemo = snapshot.plan === 'DEMO'

  return (
    <div className="space-y-6">
      {statusParam === 'success' && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          Thanks! Your subscription is being confirmed. Entitlements update once Stripe confirms.
        </div>
      )}
      {statusParam === 'canceled' && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
          Checkout was canceled. No changes were made.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Current plan</p>
            <p className="mt-1 text-xl font-semibold text-zinc-900">
              {isDemo ? demoPlan.label : snapshot.plan}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Status: <span className="font-medium text-zinc-700">{STATUS_LABEL[snapshot.status]}</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-zinc-500">Seats</p>
              <p className="font-semibold text-zinc-900">{snapshot.seatsLimit}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">AI credits</p>
              <p className="font-semibold text-zinc-900">
                {snapshot.aiCreditsUsed} / {snapshot.aiCreditsMonthly}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">{isDemo ? 'Demo ends' : 'Period ends'}</p>
              <p className="font-semibold text-zinc-900">
                {formatDate(isDemo ? snapshot.demoExpiresAt : snapshot.currentPeriodEnd)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Trial ends</p>
              <p className="font-semibold text-zinc-900">{formatDate(snapshot.trialEnd)}</p>
            </div>
          </div>
        </div>
        {snapshot.cancelAtPeriodEnd && (
          <p className="mt-3 text-xs text-amber-700">
            Subscription is set to cancel at the end of the current period.
          </p>
        )}
        {!stripeConfigured && (
          <p className="mt-3 text-xs text-amber-700">
            Stripe price IDs are not configured. Set them in <code>.env</code> to enable upgrades.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-900">Available plans</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = snapshot.plan === plan.id
            const disabled = !canManage || !plan.priceConfigured || loadingPlan !== null
            return (
              <div
                key={plan.id}
                className={cn(
                  'flex flex-col rounded-xl border bg-white p-5',
                  plan.highlight ? 'border-zinc-900' : 'border-zinc-200',
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="text-lg font-semibold text-zinc-900">{plan.label}</p>
                  {plan.highlight && (
                    <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Popular
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-zinc-500">{plan.description}</p>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Seats</dt>
                    <dd className="font-medium text-zinc-900">{plan.seatsLimit}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">AI credits / mo</dt>
                    <dd className="font-medium text-zinc-900">{plan.aiCreditsMonthly}</dd>
                  </div>
                </dl>
                <ul className="mt-4 space-y-1 text-xs text-zinc-500">
                  {plan.modules.map((m) => (
                    <li key={m} className="flex items-center gap-1.5">
                      <span aria-hidden>✓</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex-1" />
                {isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-500"
                  >
                    Current plan
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => startCheckout(plan.id)}
                    className={cn(
                      'w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      plan.highlight
                        ? 'bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50'
                        : 'border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 disabled:opacity-50',
                    )}
                  >
                    {loadingPlan === plan.id ? 'Redirecting…' : `Upgrade to ${plan.label}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>
        {!canManage && (
          <p className="mt-3 text-xs text-zinc-500">
            Only the organization owner can upgrade or manage billing.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold text-zinc-900">Manage billing</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Update payment methods, invoices, and cancel via the Stripe customer portal.
        </p>
        <button
          type="button"
          disabled={!canManage || portalLoading || isDemo}
          onClick={openPortal}
          className="mt-3 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
        >
          {portalLoading ? 'Opening…' : 'Open Stripe portal'}
        </button>
        {isDemo && (
          <p className="mt-2 text-xs text-zinc-500">
            The portal is available after you upgrade from the demo plan.
          </p>
        )}
      </section>
    </div>
  )
}
