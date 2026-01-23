/**
 * Mock Data Module
 *
 * 모든 Mock 데이터를 중앙에서 export
 * Clean Architecture 적용 - 도메인별 분리
 */

// ============================================
// Domain Data Exports
// ============================================
export { mockProfiles, mockAdminProfile, rankedProfiles } from './profiles'
export { mockSeasons } from './seasons'
export { mockOrganization } from './organization'
export {
  mockEpisodes,
  getEpisodesBySeason,
  getRankBattlesBySeason,
  getEpisodeById,
  getFinalizedRankBattles,
} from './episodes'
export { mockSignatures, mockSignatureData, signatureCategories, type SignatureData, type SignatureVideo } from './signatures'
export { mockSchedules } from './schedules'
export { mockTimelineEvents } from './timeline'
export { mockNotices } from './notices'
export { mockPosts } from './posts'
export {
  mockComments,
  getCommentsByPostId,
  getRootCommentsByPostId,
  getRepliesByParentId,
  getCommentById,
  getCommentCountByPostId,
} from './comments'
export { mockMediaContent } from './media'
export { mockLiveStatus } from './live-status'
export { mockBanners, type MockBanner } from './banners'
export {
  mockVipContent,
  mockVipMemberVideos,
  mockVipSignatures,
  mockVipRewards,
  getVipRewardByProfileId,
  getVipRewardByRank,
  type VipContent,
  type VipMemberVideo,
  type VipSignature,
  type VipRewardData,
} from './vip-content'

// Top 1-3 Tribute Page
export {
  mockVipTributeData,
  getVipTributeByRank,
  getVipTributeByUserId,
  isTop3Rank,
  getTributeThemeColors,
  getRankTheme,
  TRIBUTE_THEMES,
  TRIBUTE_COLORS,
} from './vip-tribute'

// Tribute Guestbook (방명록)
export {
  mockTributeGuestbook,
  getGuestbookByTributeUserId,
  getGuestbookByRank,
  getGuestbookCountByTributeUserId,
  getMemberGuestbookByTributeUserId,
  type GuestbookEntry,
} from './guestbook'

// VIP Rewards (Database Schema 기반)
export {
  mockVipRewards as mockVipRewardsDB,
  mockVipImages,
  getVipRewardByProfileId as getVipRewardDBByProfileId,
  getVipRewardByRank as getVipRewardDBByRank,
  getVipImagesByRewardId,
  getVipImagesByProfileId,
  getTop3Rewards,
  getTop50Rewards,
} from './vip-rewards'

// Hall of Fame (명예의 전당)
export {
  mockHallOfFameSeasons,
  mockHallOfFameEpisodes,
  getAllHallOfFameHonors,
  getHallOfFameByUserId,
  hasHonorPageQualification,
  getHonorPageQualifiedDonorIds,
  EPISODE_HIGH_DONOR_THRESHOLD,
  type HallOfFameHonor,
  type HallOfFameSeason,
  type HallOfFameEpisode,
  type TributeMemberVideo,
  type TributeSignature,
} from './hall-of-fame'

// BJ Profiles (BJ 멤버 계정)
export {
  BJ_MEMBERS,
  mockBjProfiles,
  organizationProfileMapping,
  generateBjProfileId,
  getOrgIdByProfileId,
  getProfileIdByOrgId,
  getBjProfileByEmail,
  isBjMemberByProfileId,
  getBjMemberInfo,
} from './bj-profiles'

// BJ Thank You Messages (BJ 감사 메시지)
export {
  mockBjThankYouMessages,
  getBjMessagesByVipId,
  getBjMessagesByBjId,
  getBjMessageCountByVipId,
  hasReceivedBjMessages,
} from './bj-messages'

// ============================================
// Utility Exports
// ============================================
export {
  getPlaceholderAvatar,
  getMemberAvatar,
  getVipAvatar,
  getUnsplashThumbnail,
  getPicsumThumbnail,
  getGradientPlaceholder,
  getMemberCharacterImage,
  getBannerBackground,
  getTimelinePlaceholder,
  getDateWithOffset,
  getCurrentTimestamp,
} from './utils'

// ============================================
// Helper Functions
// ============================================
import { mockOrganization } from './organization'
import { mockLiveStatus } from './live-status'

/**
 * 라이브 중인 멤버 정보 조회
 */
export const getLiveMembersWithInfo = () => {
  return mockLiveStatus
    .filter(status => status.is_live)
    .map(status => {
      const member = mockOrganization.find(m => m.id === status.member_id)
      return { ...status, member }
    })
}
