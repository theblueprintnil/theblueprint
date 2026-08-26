import type { MembershipRole as PrismaMembershipRole, Role, WorkspaceType } from '@prisma/client'

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface OrganizationRow {
  id: string
  name: string
  slug: string
  workspaceType: WorkspaceType
  createdById: string | null
  createdAt: string
  updatedAt: string
}

export interface MembershipRow {
  id: string
  userId: string
  organizationId: string
  role: PrismaMembershipRole
  createdAt: string
  updatedAt: string
}

export interface UserRow {
  id: string
  email: string
  name: string
  role: Role
  currentOrganizationId: string | null
  createdAt: string
  updatedAt: string
}

export interface OpportunityRow {
  id: string
  title: string
  brandName: string
  payout: number
  sport: string
  location: string
  deadline: string
  status: 'OPEN' | 'APPLIED' | 'ACCEPTED' | 'CLOSED'
  description: string
  ownerUserId: string | null
  organizationId: string | null
  createdAt: string
  updatedAt: string
}

export interface DealRow {
  id: string
  title: string
  brandName: string
  athleteName: string
  amount: number
  status: 'DRAFT' | 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  stage: string
  deliverables: number
  startDate: string
  endDate: string
  ownerUserId: string | null
  organizationId: string | null
  createdAt: string
  updatedAt: string
}

export interface Database {
  public: {
    Tables: {
      Organization: {
        Row: OrganizationRow
        Insert: Omit<OrganizationRow, 'id' | 'createdAt' | 'updatedAt'>
        Update: Partial<Omit<OrganizationRow, 'id' | 'createdAt'>>
      }
      Membership: {
        Row: MembershipRow
        Insert: Omit<MembershipRow, 'id' | 'createdAt' | 'updatedAt'>
        Update: Partial<Omit<MembershipRow, 'id' | 'createdAt'>>
      }
      User: {
        Row: UserRow
        Insert: Omit<UserRow, 'createdAt' | 'updatedAt'>
        Update: Partial<Omit<UserRow, 'id' | 'createdAt'>>
      }
      Opportunity: {
        Row: OpportunityRow
        Insert: Omit<OpportunityRow, 'id' | 'createdAt' | 'updatedAt'>
        Update: Partial<Omit<OpportunityRow, 'id' | 'createdAt'>>
      }
      Deal: {
        Row: DealRow
        Insert: Omit<DealRow, 'id' | 'createdAt' | 'updatedAt'>
        Update: Partial<Omit<DealRow, 'id' | 'createdAt'>>
      }
    }
  }
}
