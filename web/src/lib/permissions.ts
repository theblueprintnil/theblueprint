export type MembershipRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'

export type Permission =
  | 'view'
  | 'edit_content'
  | 'manage_content'
  | 'invite_members'
  | 'manage_members'
  | 'manage_settings'
  | 'delete_organization'

const ROLE_PERMISSIONS: Record<MembershipRole, Permission[]> = {
  OWNER: [
    'view',
    'edit_content',
    'manage_content',
    'invite_members',
    'manage_members',
    'manage_settings',
    'delete_organization',
  ],
  ADMIN: [
    'view',
    'edit_content',
    'manage_content',
    'invite_members',
    'manage_members',
    'manage_settings',
  ],
  MEMBER: ['view', 'edit_content', 'manage_content'],
  VIEWER: ['view'],
}

export const ROLE_ORDER: MembershipRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']

export function can(role: MembershipRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

export function atLeast(role: MembershipRole, minimum: MembershipRole): boolean {
  return ROLE_ORDER.indexOf(role) <= ROLE_ORDER.indexOf(minimum)
}

export function roleLabel(role: MembershipRole): string {
  return role.charAt(0) + role.slice(1).toLowerCase()
}
