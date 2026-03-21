export interface SocialLinks {
  pandatv?: string
  youtube?: string
  instagram?: string
}

export interface ProfileInfo {
  mbti?: string
  bloodType?: string
  height?: number
  weight?: number
  birthday?: string
}

export interface OrgMember {
  id: number
  profileId: string | null
  name: string
  unit: 'excel' | 'crew'
  role: string
  positionOrder: number
  parentId: number | null
  socialLinks: SocialLinks | null
  profileInfo: ProfileInfo | null
  imageUrl: string | null
  isLive: boolean
}

export interface Profile {
  id: string
  nickname: string
}

export type ViewMode = 'table' | 'tree'
