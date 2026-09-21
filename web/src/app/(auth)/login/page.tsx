import type { Metadata } from 'next'
import { SignIn } from '@clerk/nextjs'

export const metadata: Metadata = {
  title: 'Sign in',
}

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams
  const fallbackRedirectUrl = next && next.startsWith('/') ? next : '/app/dashboard'
  return <SignIn signUpUrl="/signup" fallbackRedirectUrl={fallbackRedirectUrl} />
}
