import { describe, expect, it } from 'vitest'
import { ROLE_ORDER, atLeast, can, roleLabel, type MembershipRole } from '../permissions'

const ALL_ACTIONS = [
  'view',
  'edit_content',
  'manage_content',
  'invite_members',
  'manage_members',
  'manage_settings',
  'delete_organization',
] as const

describe('can()', () => {
  it('allows OWNER to do everything', () => {
    for (const action of ALL_ACTIONS) expect(can('OWNER', action)).toBe(true)
  })

  it('restricts ADMIN to everything except deleting the organization', () => {
    expect(can('ADMIN', 'manage_settings')).toBe(true)
    expect(can('ADMIN', 'manage_members')).toBe(true)
    expect(can('ADMIN', 'delete_organization')).toBe(false)
  })

  it('gives MEMBER content rights but no member management', () => {
    expect(can('MEMBER', 'edit_content')).toBe(true)
    expect(can('MEMBER', 'manage_content')).toBe(true)
    expect(can('MEMBER', 'invite_members')).toBe(false)
    expect(can('MEMBER', 'manage_members')).toBe(false)
  })

  it('lets VIEWER only view', () => {
    for (const action of ALL_ACTIONS) {
      expect(can('VIEWER', action)).toBe(action === 'view')
    }
  })
})

describe('atLeast()', () => {
  it('orders roles strictly', () => {
    expect(atLeast('OWNER', 'ADMIN')).toBe(true)
    expect(atLeast('ADMIN', 'OWNER')).toBe(false)
    expect(atLeast('MEMBER', 'VIEWER')).toBe(true)
    expect(atLeast('VIEWER', 'MEMBER')).toBe(false)
  })

  it('is reflexive at each level', () => {
    for (const role of ROLE_ORDER) expect(atLeast(role, role as MembershipRole)).toBe(true)
  })
})

describe('roleLabel()', () => {
  it('humanizes role codes', () => {
    expect(roleLabel('OWNER')).toBe('Owner')
    expect(roleLabel('VIEWER')).toBe('Viewer')
  })
})
