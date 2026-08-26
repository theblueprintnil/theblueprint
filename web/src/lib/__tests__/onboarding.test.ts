import { describe, expect, it } from 'vitest'
import { WORKSPACE_TYPES, slugFromName, validateOnboardingInput } from '../onboarding'

describe('slugFromName', () => {
  it('lowercases and hyphenates names', () => {
    expect(slugFromName('  Jordan Carter Studios ')).toBe('jordan-carter-studios')
  })

  it('collapses repeated separators and trims edges', () => {
    expect(slugFromName('Apex -- & NIL!')).toBe('apex-nil')
  })

  it('caps length at 40 characters', () => {
    expect(slugFromName('a'.repeat(80)).length).toBeLessThanOrEqual(40)
  })

  it('returns empty for symbol-only names', () => {
    expect(slugFromName('!!! ???')).toBe('')
  })
})

describe('validateOnboardingInput', () => {
  const valid = { name: 'Carter Collective', workspaceType: WORKSPACE_TYPES[0]!.value }

  it('accepts a valid submission', () => {
    expect(validateOnboardingInput(valid)).toBeNull()
  })

  it('rejects short and long names', () => {
    expect(validateOnboardingInput({ ...valid, name: 'A' })).toContain('at least 2')
    expect(validateOnboardingInput({ ...valid, name: 'x'.repeat(61) })).toContain('60 characters')
  })

  it('rejects names without any alphanumeric character', () => {
    expect(validateOnboardingInput({ ...valid, name: '---' })).toContain('letters or numbers')
  })

  it('rejects missing or unknown workspace types', () => {
    expect(validateOnboardingInput({ name: valid.name })).toContain('workspace type')
    expect(
      validateOnboardingInput({ name: valid.name, workspaceType: 'SHIPYARD' as never }),
    ).toContain('Unknown workspace type')
  })
})
