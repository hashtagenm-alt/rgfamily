import type { SignatureVideoWithMember, OrgMemberItem } from '@/lib/actions/signatures'

export interface SignatureInfo {
  id: number
  sigNumber: number
  title: string
  description: string
  thumbnailUrl: string
  unit: 'excel' | 'crew'
}

export type { SignatureVideoWithMember, OrgMemberItem }
