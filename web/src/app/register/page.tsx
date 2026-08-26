import type { Metadata } from 'next'
import { RegisterForm } from '@/components/register-form'

export const metadata: Metadata = {
  title: 'Create account — The Blueprint',
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-xl font-bold tracking-tight text-zinc-900">The Blueprint</p>
          <p className="mt-1 text-sm text-zinc-500">Create your NIL workspace account</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <RegisterForm />
        </div>
      </div>
    </div>
  )
}
