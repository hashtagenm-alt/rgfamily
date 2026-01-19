/**
 * VIP Rewards & Images Mock Data
 *
 * vip_rewards: 시즌별 Top 50 후원자 보상 정보
 * vip_images: VIP 전용 갤러리 이미지
 *
 * Database 스키마와 일치하는 타입 사용
 */

import type { VipReward, VipImage } from '@/types/database'
import { rankedProfiles } from './profiles'

// Personal Messages for Top 3
const personalMessages: Record<number, string> = {
  1: `핑크하트님, 항상 최고의 응원을 보내주셔서 진심으로 감사합니다.

처음 방송을 시작했을 때부터 지금까지 변함없이 함께해주신 덕분에 매일 방송이 즐겁습니다. 힘들 때마다 핑크하트님의 따뜻한 메시지를 보며 힘을 얻곤 해요.

앞으로도 함께해주실 거죠? 사랑합니다!

- 나노 드림`,
  2: `gul***님, 변함없는 응원에 진심으로 감사드려요.

항상 채팅에서 응원해주시고, 다른 팬분들도 챙겨주시는 모습이 정말 따뜻해요. gul***님 덕분에 우리 방송 분위기가 항상 좋은 것 같아요.

앞으로도 함께 좋은 추억 많이 만들어요!

- 나노 드림`,
  3: `별빛수호자님, 따뜻한 응원 항상 감사합니다.

닉네임처럼 정말 별빛처럼 빛나는 서포터가 되어주시는 것 같아 감동이에요. 조용히 응원해주시는 모습이 정말 따뜻합니다.

앞으로도 좋은 방송으로 보답할게요!

- 나노 드림`,
}

// Dedication Video URLs for Top 3
const dedicationVideos: Record<number, string> = {
  1: 'https://example.com/tribute/gold-video.mp4',
  2: 'https://example.com/tribute/silver-video.mp4',
  3: 'https://example.com/tribute/bronze-video.mp4',
}

/**
 * VIP Rewards Mock Data
 * 시즌 4 기준 Top 50 후원자 보상 정보
 */
export const mockVipRewards: VipReward[] = rankedProfiles.slice(0, 50).map((profile, index) => {
  const rank = index + 1
  return {
    id: rank,
    profile_id: profile.id,
    season_id: 4, // 현재 시즌
    episode_id: null, // 직급전 회차 ID (목업에서는 null)
    rank,
    personal_message: rank <= 3 ? personalMessages[rank] : null,
    dedication_video_url: rank <= 3 ? dedicationVideos[rank] : null,
    created_at: new Date(2025, 0, 1).toISOString(),
  }
})

/**
 * VIP Images Mock Data
 * Top 3 후원자 전용 갤러리 이미지
 */
export const mockVipImages: VipImage[] = [
  // Gold (1등) 갤러리 - 4장
  {
    id: 1,
    reward_id: 1,
    image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=800&fit=crop',
    title: 'Gold Exclusive #1',
    order_index: 0,
    created_at: new Date(2025, 0, 1).toISOString(),
  },
  {
    id: 2,
    reward_id: 1,
    image_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&h=800&fit=crop',
    title: 'Gold Exclusive #2',
    order_index: 1,
    created_at: new Date(2025, 0, 1).toISOString(),
  },
  {
    id: 3,
    reward_id: 1,
    image_url: 'https://images.unsplash.com/photo-1634986666676-ec8fd927c23d?w=800&h=800&fit=crop',
    title: 'Gold Exclusive #3',
    order_index: 2,
    created_at: new Date(2025, 0, 1).toISOString(),
  },
  {
    id: 4,
    reward_id: 1,
    image_url: 'https://images.unsplash.com/photo-1618172193763-c511deb635ca?w=800&h=800&fit=crop',
    title: 'Gold Exclusive #4',
    order_index: 3,
    created_at: new Date(2025, 0, 1).toISOString(),
  },
  // Silver (2등) 갤러리 - 3장
  {
    id: 5,
    reward_id: 2,
    image_url: 'https://images.unsplash.com/photo-1633177317976-3f9bc45e1d1d?w=800&h=800&fit=crop',
    title: 'Silver Exclusive #1',
    order_index: 0,
    created_at: new Date(2025, 0, 1).toISOString(),
  },
  {
    id: 6,
    reward_id: 2,
    image_url: 'https://images.unsplash.com/photo-1614851099511-773084f6911d?w=800&h=800&fit=crop',
    title: 'Silver Exclusive #2',
    order_index: 1,
    created_at: new Date(2025, 0, 1).toISOString(),
  },
  {
    id: 7,
    reward_id: 2,
    image_url: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800&h=800&fit=crop',
    title: 'Silver Exclusive #3',
    order_index: 2,
    created_at: new Date(2025, 0, 1).toISOString(),
  },
  // Bronze (3등) 갤러리 - 2장
  {
    id: 8,
    reward_id: 3,
    image_url: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800&h=800&fit=crop',
    title: 'Bronze Exclusive #1',
    order_index: 0,
    created_at: new Date(2025, 0, 1).toISOString(),
  },
  {
    id: 9,
    reward_id: 3,
    image_url: 'https://images.unsplash.com/photo-1604076913837-52ab5629fba9?w=800&h=800&fit=crop',
    title: 'Bronze Exclusive #2',
    order_index: 1,
    created_at: new Date(2025, 0, 1).toISOString(),
  },
]

/**
 * 프로필 ID로 VIP Reward 조회
 */
export function getVipRewardByProfileId(profileId: string): VipReward | null {
  return mockVipRewards.find(r => r.profile_id === profileId) || null
}

/**
 * 순위로 VIP Reward 조회
 */
export function getVipRewardByRank(rank: number): VipReward | null {
  return mockVipRewards.find(r => r.rank === rank) || null
}

/**
 * Reward ID로 VIP Images 조회
 */
export function getVipImagesByRewardId(rewardId: number): VipImage[] {
  return mockVipImages.filter(img => img.reward_id === rewardId).sort((a, b) => a.order_index - b.order_index)
}

/**
 * 프로필 ID로 VIP Images 조회
 */
export function getVipImagesByProfileId(profileId: string): VipImage[] {
  const reward = getVipRewardByProfileId(profileId)
  if (!reward) return []
  return getVipImagesByRewardId(reward.id)
}

/**
 * Top 3 Rewards 조회
 */
export function getTop3Rewards(): VipReward[] {
  return mockVipRewards.filter(r => r.rank <= 3).sort((a, b) => a.rank - b.rank)
}

/**
 * Top 50 Rewards 조회
 */
export function getTop50Rewards(): VipReward[] {
  return mockVipRewards.filter(r => r.rank <= 50).sort((a, b) => a.rank - b.rank)
}
