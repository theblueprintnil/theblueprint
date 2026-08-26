import type { SessionUser } from '../session'

type FetchFn = typeof fetch

export interface AuthPayload {
  user: SessionUser | null
}

export interface AuthResult<T = AuthPayload> {
  data: T
  error: { message: string } | null
}

export interface BrowserDataClient {
  auth: {
    signInWithPassword(credentials: { email: string; password: string }): Promise<AuthResult>
    signUp(credentials: { email: string; password: string; name: string }): Promise<AuthResult>
    signOut(): Promise<AuthResult>
    getUser(): Promise<AuthResult>
  }
  from(table: 'opportunities' | 'deals'): {
    select(): {
      eq(
        column: string,
        value: string,
      ): PromiseLike<{ data: unknown[]; error: { message: string } | null }>
    }
  }
}

async function postJson<T>(doFetch: FetchFn, url: string, body: unknown): Promise<AuthResult<T>> {
  try {
    const response = await doFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null
    if (!response.ok) {
      return { data: payload ?? ({} as T), error: { message: payload?.error ?? 'Request failed.' } }
    }
    return { data: (payload ?? {}) as T, error: null }
  } catch {
    return { data: {} as T, error: { message: 'Network request failed.' } }
  }
}

export function createBrowserDataClient(doFetch: FetchFn = fetch): BrowserDataClient {
  return {
    auth: {
      signInWithPassword: ({ email, password }) =>
        postJson<AuthPayload>(doFetch, '/api/auth/login', { email, password }),
      signUp: ({ email, password, name }) =>
        postJson<AuthPayload>(doFetch, '/api/auth/register', { email, password, name }),
      signOut: () => postJson(doFetch, '/api/auth/logout', {}),
      getUser: async () => {
        try {
          const response = await doFetch('/api/auth/me')
          const payload = (await response.json().catch(() => null)) as AuthPayload | null
          if (!response.ok || !payload?.user) {
            return { data: { user: null }, error: { message: 'Not signed in.' } }
          }
          return { data: { user: payload.user }, error: null }
        } catch {
          return { data: { user: null }, error: { message: 'Network request failed.' } }
        }
      },
    },
    from: (table) => ({
      select: () => ({
        eq: async (column, value) => {
          try {
            const response = await doFetch(`/api/${table}?${column}=${encodeURIComponent(value)}`)
            const payload = (await response.json().catch(() => null)) as {
              items?: unknown[]
              error?: string
            } | null
            if (!response.ok) {
              return { data: [], error: { message: payload?.error ?? 'Request failed.' } }
            }
            return { data: payload?.items ?? [], error: null }
          } catch {
            return { data: [], error: { message: 'Network request failed.' } }
          }
        },
      }),
    }),
  }
}
