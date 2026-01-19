'use client'

import type { HallOfFameHonor } from '@/lib/mock'
import VipSignatureGallery from '../VipSignatureGallery'

interface TributeSignaturesSectionProps {
  donorName: string
  signatures?: HallOfFameHonor['exclusiveSignatures']
  isOwner?: boolean
  onLockedClick?: () => void
}

export default function TributeSignaturesSection({
  donorName,
  signatures,
  isOwner = false,
  onLockedClick,
}: TributeSignaturesSectionProps) {
  return (
    <VipSignatureGallery
      donorName={donorName}
      signatures={signatures}
      isOwner={isOwner}
      onLockedClick={onLockedClick}
    />
  )
}
