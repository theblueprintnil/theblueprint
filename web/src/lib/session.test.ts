import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSessionUser } from './session'
import * as dbModule from './db'
import * as authModule from '@clerk/nextjs/server'

vi.mock('@clerk/nextjs/server')
vi.mock('./db')

describe('session.ts - Retry Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should retry on transient database errors (503)', async () => {
    const mockAuth = vi.mocked(authModule.auth)
    const mockCurrentUser = vi.mocked(authModule.currentUser)
    const mockDb = vi.mocked(dbModule)

    mockAuth.mockResolvedValue({ userId: 'test-user-123' } as any)
    mockCurrentUser.mockResolvedValue({
      id: 'clerk-123',
      emailAddresses: [{ id: 'email-1', emailAddress: 'test@example.com' }],
      primaryEmailAddressId: 'email-1',
      firstName: 'John',
      lastName: 'Doe',
    } as any)

    let attempt = 0
    const findUniqueFn = vi.fn(async () => {
      attempt += 1
      if (attempt < 3) {
        const error = new Error(
          "P1001: Can't reach database server at `aws-0-us-east-1.pooler.supabase.com`",
        )
        ;(error as any).code = 'P1001'
        throw error
      }
      return {
        id: 'user-123',
        email: 'test@example.com',
        name: 'John Doe',
        role: 'USER',
        currentOrganizationId: null,
      }
    })

    mockDb.prismaAuth = {
      user: {
        findUnique: findUniqueFn,
      },
    } as any

    const result = await getSessionUser()

    expect(attempt).toBe(3)
    expect(result).toEqual({
      id: 'user-123',
      email: 'test@example.com',
      name: 'John Doe',
      role: 'USER',
      currentOrganizationId: null,
    })
  })

  it('should fail after max retries on persistent transient errors', async () => {
    const mockAuth = vi.mocked(authModule.auth)
    const mockCurrentUser = vi.mocked(authModule.currentUser)
    const mockDb = vi.mocked(dbModule)

    mockAuth.mockResolvedValue({ userId: 'test-user-123' } as any)
    mockCurrentUser.mockResolvedValue({
      id: 'clerk-123',
      emailAddresses: [{ id: 'email-1', emailAddress: 'test@example.com' }],
      primaryEmailAddressId: 'email-1',
      firstName: 'John',
      lastName: 'Doe',
    } as any)

    const findUniqueFn = vi.fn().mockRejectedValue(new Error('503 Service Unavailable'))

    mockDb.prismaAuth = {
      user: {
        findUnique: findUniqueFn,
      },
    } as any

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await getSessionUser()

    expect(result).toBeNull()
    expect(findUniqueFn).toHaveBeenCalledTimes(4)
    expect(consoleSpy).toHaveBeenCalledWith(
      '[Session] Failed to retrieve session user:',
      expect.any(Error),
    )
    consoleSpy.mockRestore()
  })

  it('should not retry on non-transient errors', async () => {
    const mockAuth = vi.mocked(authModule.auth)
    const mockCurrentUser = vi.mocked(authModule.currentUser)
    const mockDb = vi.mocked(dbModule)

    mockAuth.mockResolvedValue({ userId: 'test-user-123' } as any)
    mockCurrentUser.mockResolvedValue({
      id: 'clerk-123',
      emailAddresses: [{ id: 'email-1', emailAddress: 'test@example.com' }],
      primaryEmailAddressId: 'email-1',
      firstName: 'John',
      lastName: 'Doe',
    } as any)

    const findUniqueFn = vi.fn().mockRejectedValue(new Error('Syntax error in query'))

    mockDb.prismaAuth = {
      user: {
        findUnique: findUniqueFn,
      },
    } as any

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await getSessionUser()

    expect(result).toBeNull()
    expect(findUniqueFn).toHaveBeenCalledTimes(1)
    consoleSpy.mockRestore()
  })

  it('should handle missing clerk user gracefully', async () => {
    const mockAuth = vi.mocked(authModule.auth)
    const mockCurrentUser = vi.mocked(authModule.currentUser)

    mockAuth.mockResolvedValue({ userId: 'test-user-123' } as any)
    mockCurrentUser.mockResolvedValue(null)

    const result = await getSessionUser()

    expect(result).toBeNull()
  })

  it('should handle missing email gracefully', async () => {
    const mockAuth = vi.mocked(authModule.auth)
    const mockCurrentUser = vi.mocked(authModule.currentUser)

    mockAuth.mockResolvedValue({ userId: 'test-user-123' } as any)
    mockCurrentUser.mockResolvedValue({
      id: 'clerk-123',
      emailAddresses: [],
      primaryEmailAddressId: null,
      firstName: 'John',
      lastName: 'Doe',
    } as any)

    const result = await getSessionUser()

    expect(result).toBeNull()
  })

  it('should create user on first login', async () => {
    const mockAuth = vi.mocked(authModule.auth)
    const mockCurrentUser = vi.mocked(authModule.currentUser)
    const mockDb = vi.mocked(dbModule)

    mockAuth.mockResolvedValue({ userId: 'test-user-123' } as any)
    mockCurrentUser.mockResolvedValue({
      id: 'clerk-123',
      emailAddresses: [{ id: 'email-1', emailAddress: 'newuser@example.com' }],
      primaryEmailAddressId: 'email-1',
      firstName: 'Jane',
      lastName: 'Smith',
    } as any)

    const findUniqueFn = vi.fn().mockResolvedValue(null)
    const createdUser = {
      id: 'user-456',
      email: 'newuser@example.com',
      name: 'Jane Smith',
      role: 'USER',
      currentOrganizationId: null,
    }
    const createFn = vi.fn().mockResolvedValue(createdUser)

    mockDb.prismaAuth = {
      user: {
        findUnique: findUniqueFn,
        create: createFn,
      },
    } as any

    const result = await getSessionUser()

    expect(findUniqueFn).toHaveBeenCalled()
    expect(createFn).toHaveBeenCalled()
    expect(result).toEqual({
      id: 'user-456',
      email: 'newuser@example.com',
      name: 'Jane Smith',
      role: 'USER',
      currentOrganizationId: null,
    })
  })
})
