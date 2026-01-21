/**
 * BJ 감사 메시지 Mock 데이터
 *
 * VIP 후원자에게 BJ 멤버들이 남긴 감사 메시지
 * 각 VIP에게 2-3개의 샘플 메시지 (텍스트/이미지/영상 혼합)
 */

import type { BjThankYouMessageWithMember } from '@/types/database'
import { getMemberAvatar } from './utils'
import { rankedProfiles } from './profiles'

// VIP 프로필 ID (rankedProfiles 상위 20명)
const VIP_PROFILE_IDS = rankedProfiles.slice(0, 20).map(p => p.id)

// BJ 멤버 정보 (organization 데이터 기준)
const BJ_MEMBERS_INFO = [
  { id: 1, name: '가애', imageKey: 'gaea' },
  { id: 2, name: '린아', imageKey: 'rina' },
  { id: 3, name: '월아', imageKey: 'wola' },
  { id: 4, name: '채은', imageKey: 'chaeeun' },
  { id: 5, name: '가윤', imageKey: 'gayun' },
  { id: 6, name: '설윤', imageKey: 'seolyun' },
  { id: 7, name: '한세아', imageKey: 'hansea' },
  { id: 8, name: '청아', imageKey: 'cheonga' },
  { id: 9, name: '손밍', imageKey: 'sonming' },
  { id: 10, name: '해린', imageKey: 'haerin' },
  { id: 11, name: '키키', imageKey: 'kiki' },
  { id: 12, name: '한백설', imageKey: 'hanbaekseol' },
  { id: 13, name: '홍서하', imageKey: 'hongseoha' },
  { id: 14, name: '퀸로니', imageKey: 'queenroni' },
]

// 샘플 텍스트 메시지
const SAMPLE_TEXT_MESSAGES = [
  '항상 응원해주셔서 정말 감사해요! 덕분에 힘이 나요 💕',
  '소중한 후원 감사드립니다. 앞으로도 좋은 방송으로 보답할게요!',
  '시청해주시고 후원해주셔서 너무 감사해요. 사랑합니다! 🥰',
  '함께해주셔서 감사합니다. 항상 건강하시고 행복하세요!',
  '정말 감사해요! 방송할 때 힘이 되는 분이에요 ✨',
  '따뜻한 응원 덕분에 오늘도 행복해요. 감사합니다!',
  '최고의 서포터분이에요! 항상 고마워요 💖',
  '후원 감사합니다! 앞으로도 재밌는 방송 할게요~',
]

// 샘플 이미지 URL (플레이스홀더)
const SAMPLE_IMAGE_URLS = [
  'https://picsum.photos/seed/thankyou1/400/300',
  'https://picsum.photos/seed/thankyou2/400/300',
  'https://picsum.photos/seed/thankyou3/400/300',
  'https://picsum.photos/seed/thankyou4/400/300',
  'https://picsum.photos/seed/thankyou5/400/300',
]

// 샘플 영상 URL (YouTube 플레이스홀더)
const SAMPLE_VIDEO_URLS = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://drive.google.com/file/d/example1/view',
  'https://www.youtube.com/watch?v=example2',
]

// 랜덤 선택 헬퍼
const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const getRandomDate = (daysAgo: number): string => {
  const date = new Date()
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo))
  return date.toISOString()
}

// Mock BJ 감사 메시지 생성
let messageIdCounter = 1

function generateBjMessages(): BjThankYouMessageWithMember[] {
  const messages: BjThankYouMessageWithMember[] = []

  // 상위 10명의 VIP에게 각각 2-4개의 메시지 생성
  VIP_PROFILE_IDS.slice(0, 10).forEach((vipProfileId, vipIndex) => {
    // VIP 순위에 따라 메시지 개수 조절 (상위일수록 더 많은 메시지)
    const messageCount = vipIndex < 3 ? 4 : vipIndex < 6 ? 3 : 2

    // 해당 VIP에게 보낼 BJ 멤버 랜덤 선택 (중복 없이)
    const shuffledBjs = [...BJ_MEMBERS_INFO].sort(() => Math.random() - 0.5)
    const selectedBjs = shuffledBjs.slice(0, messageCount)

    selectedBjs.forEach((bj, msgIndex) => {
      // 메시지 타입 결정 (텍스트 60%, 이미지 25%, 영상 15%)
      const typeRoll = Math.random()
      let messageType: 'text' | 'image' | 'video'
      let contentText: string | null = null
      let contentUrl: string | null = null

      if (typeRoll < 0.6) {
        messageType = 'text'
        contentText = getRandomItem(SAMPLE_TEXT_MESSAGES)
      } else if (typeRoll < 0.85) {
        messageType = 'image'
        contentUrl = getRandomItem(SAMPLE_IMAGE_URLS)
        contentText = '소중한 후원 감사합니다! 💕'
      } else {
        messageType = 'video'
        contentUrl = getRandomItem(SAMPLE_VIDEO_URLS)
        contentText = '감사 영상을 준비했어요!'
      }

      const createdAt = getRandomDate(90) // 최근 90일 내

      messages.push({
        id: messageIdCounter++,
        vip_profile_id: vipProfileId,
        bj_member_id: bj.id,
        message_type: messageType,
        content_text: contentText,
        content_url: contentUrl,
        is_public: true,
        is_deleted: false,
        created_at: createdAt,
        updated_at: createdAt,
        // JOIN 데이터
        bj_member: {
          name: bj.name,
          image_url: getMemberAvatar(bj.imageKey),
        },
      })
    })
  })

  // 날짜순 정렬 (최신순)
  return messages.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

export const mockBjThankYouMessages = generateBjMessages()

// 특정 VIP의 메시지 조회
export const getBjMessagesByVipId = (
  vipProfileId: string
): BjThankYouMessageWithMember[] => {
  return mockBjThankYouMessages.filter(
    (msg) => msg.vip_profile_id === vipProfileId && !msg.is_deleted
  )
}

// 특정 BJ가 작성한 메시지 조회
export const getBjMessagesByBjId = (
  bjMemberId: number
): BjThankYouMessageWithMember[] => {
  return mockBjThankYouMessages.filter(
    (msg) => msg.bj_member_id === bjMemberId && !msg.is_deleted
  )
}

// 메시지 개수 조회
export const getBjMessageCountByVipId = (vipProfileId: string): number => {
  return getBjMessagesByVipId(vipProfileId).length
}

// VIP가 BJ 메시지를 받았는지 확인
export const hasReceivedBjMessages = (vipProfileId: string): boolean => {
  return getBjMessageCountByVipId(vipProfileId) > 0
}
