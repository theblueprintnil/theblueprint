'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { WORKSPACE_TYPES, slugFromName } from '@/lib/onboarding'

export function OnboardingForm({ userName }: { userName: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [workspaceType, setWorkspaceType] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const slugPreview = useMemo(() => slugFromName(name), [name])
  const selectedType = WORKSPACE_TYPES.find((t) => t.value === workspaceType)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, workspaceType }),
      })
      const data = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) {
        setError(data?.error ?? 'Could not create your workspace. Please try again.')
        return
      }
      router.push('/app/dashboard')
      router.refresh()
    } catch {
      setError('Could not create your workspace. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-5">
      <ol
        className="flex items-center gap-2 text-xs font-medium text-zinc-400"
        aria-label="Progress"
      >
        <li className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-white">
            1
          </span>
          Workspace
        </li>
        <li aria-hidden className="h-px flex-1 bg-zinc-200" />
        <li className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300">
            2
          </span>
          Team
        </li>
      </ol>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <div>
          <label htmlFor="org-name" className="mb-1 block text-sm font-medium text-zinc-700">
            Organization name
          </label>
          <input
            id="org-name"
            name="org-name"
            type="text"
            required
            minLength={2}
            maxLength={60}
            autoComplete="organization"
            placeholder={userName ? `${userName.split(' ')[0]}’s Studio` : 'My Studio'}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900"
          />
          {slugPreview ? (
            <p className="mt-1 text-xs text-zinc-500">
              Shareable slug: <code className="rounded bg-zinc-100 px-1">{slugPreview}</code>
            </p>
          ) : null}
        </div>
        <fieldset>
          <legend className="mb-1 block text-sm font-medium text-zinc-700">Workspace type</legend>
          <div className="space-y-2">
            {WORKSPACE_TYPES.map((type) => (
              <label
                key={type.value}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                  workspaceType === type.value
                    ? 'border-zinc-900 bg-zinc-50'
                    : 'border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <input
                  type="radio"
                  name="workspace-type"
                  value={type.value}
                  checked={workspaceType === type.value}
                  onChange={() => setWorkspaceType(type.value)}
                  className="mt-0.5 accent-zinc-900"
                />
                <span>
                  <span className="block text-sm font-semibold text-zinc-900">{type.label}</span>
                  <span className="block text-xs text-zinc-500">{type.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="submit"
          disabled={pending || !selectedType}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? 'Creating workspace…' : 'Create workspace'}
        </button>
        <p className="text-center text-xs text-zinc-500">
          You will be the owner. Team invites arrive in a later step.{' '}
          <Link href="/" className="underline hover:text-zinc-700">
            Home
          </Link>
        </p>
      </form>
    </div>
  )
}
