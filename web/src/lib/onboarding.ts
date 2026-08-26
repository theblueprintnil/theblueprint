import type { WorkspaceType } from '@prisma/client'
import { slugFromName } from './slug'

export { slugFromName }

export const WORKSPACE_TYPES: Array<{
  value: WorkspaceType
  label: string
  description: string
}> = [
  {
    value: 'ATHLETE_STUDIO',
    label: 'Athlete Studio',
    description: 'Build your brand, manage content, and review opportunities.',
  },
  {
    value: 'AGENCY_WORKSPACE',
    label: 'Agency Workspace',
    description: 'Manage an athlete roster, deal pipeline, and contracts.',
  },
  {
    value: 'GUARDIAN_PORTAL',
    label: 'Guardian Portal',
    description: 'Approve deals and oversee a minor athlete’s commercial activity.',
  },
]

export interface OnboardingInput {
  name: string
  workspaceType: WorkspaceType
}

export function validateOnboardingInput(input: Partial<OnboardingInput>): string | null {
  const name = (input.name ?? '').trim()
  if (name.length < 2) return 'Organization name must be at least 2 characters.'
  if (name.length > 60) return 'Organization name must be 60 characters or fewer.'
  if (!slugFromName(name)) {
    return 'Organization name must include letters or numbers.'
  }
  if (!input.workspaceType) return 'Choose a workspace type.'
  if (!WORKSPACE_TYPES.some((t) => t.value === input.workspaceType)) {
    return 'Unknown workspace type.'
  }
  return null
}
