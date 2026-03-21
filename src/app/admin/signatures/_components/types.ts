export interface SignatureUI {
  id: number
  sigNumber: number
  title: string
  description: string
  thumbnailUrl: string
  unit: 'excel' | 'crew'
  isGroup: boolean
  videoCount: number
  createdAt: string
}
