import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from '@/components/login-form'

export const metadata: Metadata = {
  title: 'Sign in — The Blueprint',
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-xl font-bold tracking-tight text-zinc-900">The Blueprint</p>
          <p className="mt-1 text-sm text-zinc-500">Sign in to your NIL workspace</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-4 text-center text-sm text-zinc-500">
          No account yet?{' '}
          <Link href="/register" className="font-medium text-zinc-900 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
