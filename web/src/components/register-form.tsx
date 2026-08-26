'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function RegisterForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) {
        setError(data?.error ?? 'Registration failed. Please try again.')
        return
      }
      router.push('/onboarding')
      router.refresh()
    } catch {
      setError('Registration failed. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-700">
          Name
        </label>
        <input
          id="name"
          type="text"
          required
          minLength={2}
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900"
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900"
        />
        <p className="mt-1 text-xs text-zinc-500">At least 8 characters.</p>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? 'Creating account…' : 'Create account'}
      </button>
      <p className="text-center text-sm text-zinc-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-zinc-900 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
