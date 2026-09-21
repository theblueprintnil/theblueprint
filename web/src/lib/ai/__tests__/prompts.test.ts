import { describe, expect, it } from 'vitest'
import { renderPrompt, getPromptTemplate, listPromptTemplates } from '../prompts/registry'
import '../prompts/templates'

describe('prompt template registry', () => {
  it('registers built-in templates', () => {
    const keys = listPromptTemplates().map((t) => t.featureKey)
    expect(keys).toContain('opportunity.summary')
    expect(keys).toContain('media-kit.bio')
    expect(keys).toContain('deals.review')
  })

  it('renders opportunity.summary messages', () => {
    const { template, messages } = renderPrompt('opportunity.summary', {
      opportunityTitle: 'Test',
      brandName: 'Brand',
      payout: 100,
      sport: 'Soccer',
      description: 'Desc',
      deadline: '2026-12-01',
    })
    expect(template.version).toBe('1.0.0')
    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('system')
    expect(messages[1].content).toContain('Test')
    expect(messages[1].content).toContain('Brand')
  })

  it('throws for an unknown feature key', () => {
    expect(() => getPromptTemplate('does.not.exist')).toThrow(/No prompt template/)
  })

  it('flags the deal review template as high-risk', () => {
    const template = getPromptTemplate('deals.review')
    expect(template.highRisk).toBe(true)
  })
})
