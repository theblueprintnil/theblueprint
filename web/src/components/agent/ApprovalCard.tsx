'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { approveAgentExecution, requestAgentRevision } from '@/lib/agent/actions'
import type { AgentExecutionView, ComplianceFlag, RiskSeverity, RiskType } from '@/lib/agent/types'
import { cn } from '@/lib/cn'

const SEVERITY_STYLES: Record<RiskSeverity, string> = {
  LOW: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  MEDIUM: 'border-amber-200 bg-amber-50 text-amber-700',
  HIGH: 'border-orange-200 bg-orange-50 text-orange-700',
  CRITICAL: 'border-red-200 bg-red-50 text-red-700',
}

const RISK_LABELS: Record<RiskType, string> = {
  ftc_disclosure: 'FTC disclosure',
  ncaa_eligibility: 'NCAA eligibility',
  brand_exclusivity: 'Brand exclusivity',
  state_law: 'State law',
  platform_policy: 'Platform policy',
}

function scoreTone(score: number): string {
  if (score >= 0.8) return 'bg-emerald-500'
  if (score >= 0.6) return 'bg-amber-400'
  return 'bg-red-400'
}

function ComplianceFlagRow({ flag }: { flag: ComplianceFlag }) {
  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
            SEVERITY_STYLES[flag.severity],
          )}
        >
          {flag.severity}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {RISK_LABELS[flag.riskType]}
        </span>
      </div>
      <p className="mt-2 text-sm text-zinc-700">{flag.flagMessage}</p>
      {flag.recommendedEdit ? (
        <p className="mt-2 rounded-lg bg-brand-tint px-3 py-2 text-xs text-brand-deep">
          <span className="font-semibold">Recommended edit: </span>
          {flag.recommendedEdit}
        </p>
      ) : null}
    </li>
  )
}

export function ApprovalCard({ execution }: { execution: AgentExecutionView }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const brief = execution.inputRef
  const score = execution.complianceScore

  async function copyCaption(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      setNotice({ tone: 'error', text: 'Clipboard access is unavailable in this browser.' })
    }
  }

  function run(action: 'approve' | 'revision') {
    if (action === 'revision' && !feedback.trim()) {
      setNotice({ tone: 'error', text: 'Add reviewer feedback before requesting a revision.' })
      return
    }
    startTransition(async () => {
      const result =
        action === 'approve'
          ? await approveAgentExecution({ executionId: execution.id })
          : await requestAgentRevision({
              executionId: execution.id,
              feedback: feedback.trim(),
            })
      if (result.ok) {
        setNotice({
          tone: 'success',
          text:
            action === 'approve'
              ? 'Approved. The publisher agent is resuming.'
              : 'Revision requested. The content agent will redraft.',
        })
        router.refresh()
      } else {
        setNotice({ tone: 'error', text: result.error })
      }
    })
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-zinc-900">
            {brief?.brand ?? 'Content generation'}
          </span>
          {brief?.campaignTitle ? (
            <span className="text-sm text-zinc-500">· {brief.campaignTitle}</span>
          ) : null}
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
            Pending approval
          </span>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-zinc-900">{execution.athlete.name}</p>
          <p className="text-xs text-zinc-500">
            {execution.athlete.sport}
            {execution.athlete.school ? ` · ${execution.athlete.school}` : ''}
          </p>
        </div>
      </header>

      <div className="grid gap-6 p-5 lg:grid-cols-2">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Caption drafts
          </h2>
          <ul className="mt-3 space-y-3">
            {execution.captions.length === 0 ? (
              <li className="text-sm text-zinc-500">No captions generated yet.</li>
            ) : (
              execution.captions.map((caption) => (
                <li key={caption.id} className="rounded-xl border border-zinc-200 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-brand-deep">
                      {caption.platform}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyCaption(caption.id, caption.text)}
                      className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:border-brand/40 hover:text-brand"
                    >
                      {copiedId === caption.id ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-800">{caption.text}</p>
                  {caption.hashtags.length > 0 ? (
                    <p className="mt-2 text-xs text-zinc-500">{caption.hashtags.join(' ')}</p>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Compliance score
              </h2>
              {score !== null ? (
                <span className="text-sm font-bold text-zinc-900">{Math.round(score * 100)}%</span>
              ) : null}
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-100">
              <div
                className={cn('h-full rounded-full transition-all', scoreTone(score ?? 0))}
                style={{ width: `${Math.round((score ?? 0) * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Compliance flags
            </h2>
            {execution.complianceFlags.length === 0 ? (
              <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                No compliance flags detected. Content is ready for final human review.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {execution.complianceFlags.map((flag) => (
                  <ComplianceFlagRow
                    key={`${flag.riskType}-${flag.severity}-${flag.flagMessage}`}
                    flag={flag}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <footer className="space-y-4 border-t border-zinc-200 p-5">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Reviewer feedback
          </span>
          <textarea
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            rows={3}
            placeholder="Optional notes for the content agent, e.g. keep it shorter and add #ad."
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition focus:border-brand/60 focus:ring-2 focus:ring-brand/20"
          />
        </label>

        {notice ? (
          <p
            className={cn(
              'rounded-xl px-3 py-2 text-sm',
              notice.tone === 'success'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700',
            )}
          >
            {notice.text}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() => run('revision')}
            className="rounded-full border border-zinc-300 bg-white px-5 py-2 text-sm font-semibold text-zinc-700 transition hover:border-brand/50 hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
          >
            Request revision
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => run('approve')}
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? 'Resuming…' : 'Approve & publish'}
          </button>
        </div>
      </footer>
    </article>
  )
}
