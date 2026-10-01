import { afterEach, describe, expect, it, vi } from 'vitest'
import { createServerSupabaseClient, createStorageBrowserClient } from '../supabase/sdk'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('createStorageBrowserClient', () => {
  it('throws when the project URL is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
    expect(() => createStorageBrowserClient()).toThrow('NEXT_PUBLIC_SUPABASE_URL')
  })

  it('throws when the publishable key is blank', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '   ')
    expect(() => createStorageBrowserClient()).toThrow('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  })

  it('creates a client exposing storage and realtime surfaces', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
    const client = createStorageBrowserClient()
    expect(typeof client.storage.from).toBe('function')
    expect(typeof client.channel).toBe('function')
  })
})

describe('createServerSupabaseClient', () => {
  it('throws when the service role key is absent', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    expect(() => createServerSupabaseClient()).toThrow('SUPABASE_SERVICE_ROLE_KEY')
  })

  it('creates a client when the service role key is present', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'sb_secret_test')
    const client = createServerSupabaseClient()
    expect(typeof client.storage.from).toBe('function')
  })
})
