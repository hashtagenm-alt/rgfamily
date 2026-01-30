/**
 * Supabase Database Seeding Script
 * Mock 데이터를 실제 Supabase DB에 입력
 *
 * 사용법: npx tsx scripts/seed-database.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 환경변수가 설정되지 않았습니다.')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
})

// ============================================
// Seed Data
// ============================================

const seasonsData = [
  { id: 1, name: '시즌 1 - 시작의 불꽃', start_date: '2024-01-01', end_date: '2024-03-31', is_active: false },
  { id: 2, name: '시즌 2 - 성장의 계절', start_date: '2024-04-01', end_date: '2024-06-30', is_active: false },
  { id: 3, name: '시즌 3 - 빛나는 여름', start_date: '2024-07-01', end_date: '2024-09-30', is_active: false },
  { id: 4, name: '시즌 4 - 겨울의 축제', start_date: '2024-10-01', end_date: null, is_active: true },
]

const organizationData = [
  // R대표 - 린아
  { id: 1, unit: 'excel', name: '린아', role: 'R대표', position_order: 1, parent_id: null, social_links: { pandatv: 'https://www.pandalive.co.kr/rina' }, is_live: false, is_active: true },
  // G대표 - 가애
  { id: 2, unit: 'excel', name: '가애', role: 'G대표', position_order: 2, parent_id: null, social_links: { pandatv: 'https://www.pandalive.co.kr/gaea' }, is_live: false, is_active: true },
  // Excel Unit
  { id: 3, unit: 'excel', name: '나노', role: '팀장', position_order: 2, parent_id: 1, social_links: { pandatv: 'https://www.pandalive.co.kr/nano' }, is_live: false, is_active: true },
  { id: 4, unit: 'excel', name: '아이린', role: '멤버', position_order: 3, parent_id: 3, social_links: { pandatv: 'https://www.pandalive.co.kr/irene' }, is_live: false, is_active: true },
  { id: 5, unit: 'excel', name: '유나', role: '멤버', position_order: 4, parent_id: 3, social_links: { pandatv: 'https://www.pandalive.co.kr/yuna' }, is_live: false, is_active: true },
  { id: 6, unit: 'excel', name: '소아', role: '멤버', position_order: 5, parent_id: 3, social_links: { pandatv: 'https://www.pandalive.co.kr/soa' }, is_live: false, is_active: true },
  { id: 7, unit: 'excel', name: '나나', role: '멤버', position_order: 6, parent_id: 3, social_links: { pandatv: 'https://www.pandalive.co.kr/nana' }, is_live: false, is_active: true },
  { id: 8, unit: 'excel', name: '조이', role: '멤버', position_order: 7, parent_id: 3, social_links: { pandatv: 'https://www.pandalive.co.kr/joy' }, is_live: false, is_active: true },
  // Crew Unit
  { id: 9, unit: 'crew', name: '하린', role: '팀장', position_order: 1, parent_id: null, social_links: { pandatv: 'https://www.pandalive.co.kr/harin' }, is_live: false, is_active: true },
  { id: 10, unit: 'crew', name: '이태린', role: '멤버', position_order: 3, parent_id: 9, social_links: { pandatv: 'https://www.pandalive.co.kr/taerin' }, is_live: false, is_active: true },
  { id: 11, unit: 'crew', name: '지유', role: '멤버', position_order: 4, parent_id: 9, social_links: { youtube: 'https://youtube.com/@jiyu' }, is_live: false, is_active: true },
  { id: 12, unit: 'crew', name: '예린', role: '멤버', position_order: 5, parent_id: 9, social_links: { instagram: 'https://instagram.com/yerin' }, is_live: false, is_active: true },
  { id: 13, unit: 'crew', name: '시아', role: '멤버', position_order: 6, parent_id: 9, social_links: { youtube: 'https://youtube.com/@sia' }, is_live: false, is_active: true },
  { id: 14, unit: 'crew', name: '사라', role: '멤버', position_order: 7, parent_id: 9, social_links: { youtube: 'https://youtube.com/@sara' }, is_live: false, is_active: true },
]

// category: 'official' | 'excel' | 'crew'
const noticesData = [
  { id: 1, title: 'RG Family 커뮤니티 오픈!', content: 'RG Family 공식 커뮤니티가 오픈되었습니다. 많은 관심 부탁드립니다.', category: 'official', is_pinned: true, view_count: 1520, thumbnail_url: '/assets/notices/notice1.jpg' },
  { id: 2, title: '시즌 4 후원 랭킹 집계 안내', content: '시즌 4 후원 랭킹 집계가 시작되었습니다. VIP 특전을 확인하세요!', category: 'official', is_pinned: false, view_count: 892, thumbnail_url: '/assets/notices/notice2.jpg' },
  { id: 3, title: 'Excel Unit 새 멤버 합류', content: 'Excel Unit에 새로운 멤버들이 합류했습니다.', category: 'excel', is_pinned: false, view_count: 654, thumbnail_url: '/assets/notices/notice3.jpg' },
]

const donationsData = [
  // 시즌 4 후원 데이터
  { donor_name: '왕대박', amount: 5000000, season_id: 4, unit: 'excel', message: '항상 응원합니다!' },
  { donor_name: '럭키세븐', amount: 3500000, season_id: 4, unit: 'excel', message: 'RG 화이팅!' },
  { donor_name: '핑크하트', amount: 2800000, season_id: 4, unit: 'crew', message: '최고입니다' },
  { donor_name: '패밀리원', amount: 2200000, season_id: 4, unit: 'excel' },
  { donor_name: '열정팬', amount: 1800000, season_id: 4, unit: 'crew' },
  { donor_name: '응원단장', amount: 1500000, season_id: 4, unit: 'excel' },
  { donor_name: '베스트팬', amount: 1200000, season_id: 4, unit: 'excel' },
  { donor_name: '하트뿅뿅', amount: 1000000, season_id: 4, unit: 'crew' },
  { donor_name: '꿀단지', amount: 800000, season_id: 4, unit: 'excel' },
  { donor_name: '행운의별', amount: 600000, season_id: 4, unit: 'crew' },
]

const mediaContentData = [
  // Shorts
  { content_type: 'shorts', title: '린아 댄스 챌린지', description: '최신 댄스 챌린지', thumbnail_url: '/assets/thumbnails/shorts1.jpg', video_url: 'https://www.youtube.com/shorts/example1', unit: 'excel', duration: 60 },
  { content_type: 'shorts', title: '가애 일상 브이로그', description: '오늘의 하루', thumbnail_url: '/assets/thumbnails/shorts2.jpg', video_url: 'https://www.youtube.com/shorts/example2', unit: 'excel', duration: 45 },
  { content_type: 'shorts', title: '크루 합동 무대', description: '크루부 특별 무대', thumbnail_url: '/assets/thumbnails/shorts3.jpg', video_url: 'https://www.youtube.com/shorts/example3', unit: 'crew', duration: 55 },
  // VODs
  { content_type: 'vod', title: '시즌 4 오프닝 방송', description: '시즌 4 시작을 알리는 특별 방송', thumbnail_url: '/assets/thumbnails/vod1.jpg', video_url: 'https://www.youtube.com/watch?v=example1', unit: 'excel', duration: 7200 },
  { content_type: 'vod', title: '엑셀부 합동 생일파티', description: '멤버들의 합동 생일파티', thumbnail_url: '/assets/thumbnails/vod2.jpg', video_url: 'https://www.youtube.com/watch?v=example2', unit: 'excel', duration: 5400 },
  { content_type: 'vod', title: '크루부 콜라보 방송', description: '크루부 특별 콜라보', thumbnail_url: '/assets/thumbnails/vod3.jpg', video_url: 'https://www.youtube.com/watch?v=example3', unit: 'crew', duration: 4800 },
]

const timelineEventsData = [
  { event_date: '2024-01-01', title: 'RG Family 시즌 1 시작', description: 'RG Family의 첫 시즌이 시작되었습니다.', category: '시즌', season_id: 1, order_index: 1 },
  { event_date: '2024-02-14', title: '발렌타인 특별 이벤트', description: '멤버들과 함께하는 발렌타인 이벤트', category: '이벤트', season_id: 1, order_index: 2 },
  { event_date: '2024-04-01', title: '시즌 2 시작', description: '성장의 계절, 시즌 2가 시작되었습니다.', category: '시즌', season_id: 2, order_index: 3 },
  { event_date: '2024-07-01', title: '시즌 3 시작 - 빛나는 여름', description: '여름 특별 시즌이 시작되었습니다.', category: '시즌', season_id: 3, order_index: 4 },
  { event_date: '2024-08-15', title: '여름 합동 버스킹', description: '전 멤버가 참여한 여름 버스킹 이벤트', category: '이벤트', season_id: 3, order_index: 5 },
  { event_date: '2024-10-01', title: '시즌 4 시작 - 겨울의 축제', description: '현재 진행중인 시즌 4가 시작되었습니다.', category: '시즌', season_id: 4, order_index: 6 },
]

const schedulesData = [
  { title: '린아 정규 방송', description: '매주 월요일 정규 방송', unit: 'excel', event_type: 'broadcast', start_datetime: '2026-01-13T20:00:00+09:00', end_datetime: '2026-01-13T23:00:00+09:00', is_all_day: false, color: '#fd68ba' },
  { title: '가애 스페셜 방송', description: '특별 게스트와 함께하는 방송', unit: 'excel', event_type: 'broadcast', start_datetime: '2026-01-15T21:00:00+09:00', is_all_day: false, color: '#fd68ba' },
  { title: '크루부 합동 방송', description: '크루부 멤버 전체 합동 방송', unit: 'crew', event_type: 'collab', start_datetime: '2026-01-18T19:00:00+09:00', end_datetime: '2026-01-18T22:00:00+09:00', is_all_day: false, color: '#00d4ff' },
  { title: '시즌 4 팬미팅', description: 'VIP 팬분들을 위한 특별 팬미팅', event_type: 'event', start_datetime: '2026-01-25T14:00:00+09:00', end_datetime: '2026-01-25T17:00:00+09:00', is_all_day: false, color: '#ffd700' },
]

const bannersData = [
  { title: '시즌 4 오픈', image_url: '/assets/logo/rg_logo_3d_pink.png', link_url: '/ranking', display_order: 1, is_active: true },
  { title: 'VIP 특전 안내', image_url: '/assets/logo/rg_logo_flat.png', link_url: '/ranking/vip', display_order: 2, is_active: true },
]

const signaturesData = [
  { title: '진압해 (1212)', description: '린아의 시그니처 영상', unit: 'excel', member_name: '린아', media_type: 'video', media_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', thumbnail_url: 'https://picsum.photos/seed/1212/400/400', tags: ['진압해', '1212', '린아'], view_count: 15420, is_featured: true },
  { title: '첫눈 (1225)', description: '나노의 시그니처 영상', unit: 'excel', member_name: '나노', media_type: 'video', media_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', thumbnail_url: 'https://picsum.photos/seed/1225/400/400', tags: ['첫눈', '1225', '나노'], view_count: 8930, is_featured: false },
  { title: '내 얘길 들어봐 (1233)', description: '아이린의 시그니처 영상', unit: 'excel', member_name: '아이린', media_type: 'video', media_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', thumbnail_url: 'https://picsum.photos/seed/1233/400/400', tags: ['내 얘길 들어봐', '1233', '아이린'], view_count: 11200, is_featured: false },
  { title: 'taylor swift (1240)', description: '유나의 시그니처 영상', unit: 'excel', member_name: '유나', media_type: 'video', media_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', thumbnail_url: 'https://picsum.photos/seed/1240/400/400', tags: ['taylor swift', '1240', '유나'], view_count: 14500, is_featured: true },
  { title: '날라리 (1252)', description: '소아의 시그니처 영상', unit: 'excel', member_name: '소아', media_type: 'video', media_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', thumbnail_url: 'https://picsum.photos/seed/1252/400/400', tags: ['날라리', '1252', '소아'], view_count: 9500, is_featured: false },
  { title: 'candy thief (1279)', description: '하린의 시그니처 영상', unit: 'crew', member_name: '하린', media_type: 'video', media_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', thumbnail_url: 'https://picsum.photos/seed/1279/400/400', tags: ['candy thief', '1279', '하린'], view_count: 7200, is_featured: false },
  { title: '무아 (1333)', description: '이태린의 시그니처 영상', unit: 'crew', member_name: '이태린', media_type: 'video', media_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', thumbnail_url: 'https://picsum.photos/seed/1333/400/400', tags: ['무아', '1333', '이태린'], view_count: 10300, is_featured: true },
  { title: '하이라이트 (2500)', description: '지유의 시그니처 영상', unit: 'crew', member_name: '지유', media_type: 'video', media_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', thumbnail_url: 'https://picsum.photos/seed/2500/400/400', tags: ['하이라이트', '2500', '지유'], view_count: 18200, is_featured: true },
]

const liveStatusData = [
  { member_id: 1, platform: 'pandatv', stream_url: 'https://www.pandalive.co.kr/rina', thumbnail_url: 'https://picsum.photos/seed/live1/640/360', is_live: false, viewer_count: 0 },
  { member_id: 2, platform: 'pandatv', stream_url: 'https://www.pandalive.co.kr/gaea', thumbnail_url: 'https://picsum.photos/seed/live2/640/360', is_live: true, viewer_count: 1520 },
  { member_id: 3, platform: 'pandatv', stream_url: 'https://www.pandalive.co.kr/nano', thumbnail_url: 'https://picsum.photos/seed/live3/640/360', is_live: false, viewer_count: 0 },
  { member_id: 9, platform: 'pandatv', stream_url: 'https://www.pandalive.co.kr/harin', thumbnail_url: 'https://picsum.photos/seed/live9/640/360', is_live: true, viewer_count: 890 },
]

// Test Profile UUIDs (고정값 - VIP 보상과 연결용)
const TEST_PROFILE_IDS = {
  pinkHeart: '11111111-1111-1111-1111-111111111111',      // 1위 - 핑크하트
  gul: '22222222-2222-2222-2222-222222222222',            // 2위 - gul***
  eternalSupporter: '33333333-3333-3333-3333-333333333333', // 3위 - 영원한서포터
  wangDaebak: '44444444-4444-4444-4444-444444444444',      // 일반 후원자
  luckyNumber: '55555555-5555-5555-5555-555555555555',     // 일반 후원자
}

// VIP 테스트 프로필 데이터 (Top 3 후원자)
const vipProfilesData = [
  {
    id: TEST_PROFILE_IDS.pinkHeart,
    nickname: '핑크하트',
    role: 'vip',
    unit: 'crew',
    total_donation: 45000000
  },
  {
    id: TEST_PROFILE_IDS.gul,
    nickname: 'gul***',
    role: 'vip',
    unit: 'excel',
    total_donation: 38002000
  },
  {
    id: TEST_PROFILE_IDS.eternalSupporter,
    nickname: '영원한서포터',
    role: 'vip',
    unit: 'excel',
    total_donation: 30000000
  },
  {
    id: TEST_PROFILE_IDS.wangDaebak,
    nickname: '왕대박',
    role: 'member',
    unit: 'excel',
    total_donation: 5000000
  },
  {
    id: TEST_PROFILE_IDS.luckyNumber,
    nickname: '럭키세븐',
    role: 'member',
    unit: 'excel',
    total_donation: 3500000
  },
]

// VIP 보상 데이터 (Top 1-3 후원자용)
const vipRewardsData = [
  {
    id: 1,
    profile_id: TEST_PROFILE_IDS.pinkHeart,
    season_id: 4,
    rank: 1,
    personal_message: `핑크하트님, 항상 최고의 응원을 보내주셔서 진심으로 감사합니다.

처음 방송을 시작했을 때부터 지금까지 변함없이 함께해주신 덕분에 매일 방송이 즐겁습니다. 힘들 때마다 핑크하트님의 따뜻한 메시지를 보며 힘을 얻곤 해요.

앞으로도 함께해주실 거죠? 사랑합니다!

- 나노 드림`,
    dedication_video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  {
    id: 2,
    profile_id: TEST_PROFILE_IDS.gul,
    season_id: 4,
    rank: 2,
    personal_message: `gul***님, 변함없는 응원에 진심으로 감사드려요.

항상 채팅에서 응원해주시고, 다른 팬분들도 챙겨주시는 모습이 정말 따뜻해요. gul***님 덕분에 우리 방송 분위기가 항상 좋은 것 같아요.

앞으로도 함께 좋은 추억 많이 만들어요!

- 나노 드림`,
    dedication_video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  {
    id: 3,
    profile_id: TEST_PROFILE_IDS.eternalSupporter,
    season_id: 4,
    rank: 3,
    personal_message: `영원한서포터님, 따뜻한 응원 항상 감사합니다.

닉네임처럼 정말 영원한 서포터가 되어주시는 것 같아 감동이에요. 조용히 응원해주시는 모습이 정말 따뜻합니다.

앞으로도 좋은 방송으로 보답할게요!

- 나노 드림`,
    dedication_video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
]

// VIP 이미지 데이터 (보상별 갤러리)
const vipImagesData = [
  // 1위 - 핑크하트 (4장)
  { reward_id: 1, image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=800&fit=crop', title: 'Gold Exclusive #1', order_index: 1 },
  { reward_id: 1, image_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&h=800&fit=crop', title: 'Gold Exclusive #2', order_index: 2 },
  { reward_id: 1, image_url: 'https://images.unsplash.com/photo-1634986666676-ec8fd927c23d?w=800&h=800&fit=crop', title: 'Gold Exclusive #3', order_index: 3 },
  { reward_id: 1, image_url: 'https://images.unsplash.com/photo-1618172193763-c511deb635ca?w=800&h=800&fit=crop', title: 'Gold Exclusive #4', order_index: 4 },
  // 2위 - gul*** (3장)
  { reward_id: 2, image_url: 'https://images.unsplash.com/photo-1633177317976-3f9bc45e1d1d?w=800&h=800&fit=crop', title: 'Silver Exclusive #1', order_index: 1 },
  { reward_id: 2, image_url: 'https://images.unsplash.com/photo-1614851099511-773084f6911d?w=800&h=800&fit=crop', title: 'Silver Exclusive #2', order_index: 2 },
  { reward_id: 2, image_url: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800&h=800&fit=crop', title: 'Silver Exclusive #3', order_index: 3 },
  // 3위 - 영원한서포터 (2장)
  { reward_id: 3, image_url: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800&h=800&fit=crop', title: 'Bronze Exclusive #1', order_index: 1 },
  { reward_id: 3, image_url: 'https://images.unsplash.com/photo-1604076913837-52ab5629fba9?w=800&h=800&fit=crop', title: 'Bronze Exclusive #2', order_index: 2 },
]

// 방명록 데이터 (헌정 페이지용)
const tributeGuestbookData = [
  { profile_id: TEST_PROFILE_IDS.pinkHeart, content: '핑크하트님 정말 대단해요! 최고 후원자!', guest_name: '팬더러버' },
  { profile_id: TEST_PROFILE_IDS.pinkHeart, content: '존경합니다 핑크하트님!', guest_name: '응원단원' },
  { profile_id: TEST_PROFILE_IDS.gul, content: 'gul님 늘 챙겨주셔서 감사해요~', guest_name: '초보팬' },
  { profile_id: TEST_PROFILE_IDS.eternalSupporter, content: '영원한서포터님 닉네임처럼 영원히!', guest_name: '같이응원' },
]

// ============================================
// Seed Functions
// ============================================

async function seedSeasons() {
  console.log('\n📅 시즌 데이터 시딩...')

  const { data: existing } = await supabase.from('seasons').select('id')
  if (existing && existing.length > 0) {
    console.log('  ⏭️  이미 데이터가 있습니다. 건너뜁니다.')
    return
  }

  const { error } = await supabase.from('seasons').insert(seasonsData)
  if (error) {
    console.error('  ❌ 실패:', error.message)
  } else {
    console.log(`  ✅ ${seasonsData.length}건 입력 완료`)
  }
}

async function seedOrganization() {
  console.log('\n👥 조직 데이터 시딩...')

  const { data: existing } = await supabase.from('organization').select('id')
  if (existing && existing.length > 0) {
    console.log('  ⏭️  이미 데이터가 있습니다. 건너뜁니다.')
    return
  }

  const { error } = await supabase.from('organization').insert(organizationData)
  if (error) {
    console.error('  ❌ 실패:', error.message)
  } else {
    console.log(`  ✅ ${organizationData.length}건 입력 완료`)
  }
}

async function seedNotices() {
  console.log('\n📢 공지사항 데이터 시딩...')

  const { data: existing } = await supabase.from('notices').select('id')
  if (existing && existing.length > 0) {
    console.log('  ⏭️  이미 데이터가 있습니다. 건너뜁니다.')
    return
  }

  const { error } = await supabase.from('notices').insert(noticesData)
  if (error) {
    console.error('  ❌ 실패:', error.message)
  } else {
    console.log(`  ✅ ${noticesData.length}건 입력 완료`)
  }
}

async function seedDonations() {
  console.log('\n💰 후원 데이터 시딩...')

  const { data: existing } = await supabase.from('donations').select('id')
  if (existing && existing.length > 0) {
    console.log('  ⏭️  이미 데이터가 있습니다. 건너뜁니다.')
    return
  }

  const { error } = await supabase.from('donations').insert(donationsData)
  if (error) {
    console.error('  ❌ 실패:', error.message)
  } else {
    console.log(`  ✅ ${donationsData.length}건 입력 완료`)
  }
}

async function seedMediaContent() {
  console.log('\n🎬 미디어 콘텐츠 데이터 시딩...')

  const { data: existing } = await supabase.from('media_content').select('id')
  if (existing && existing.length > 0) {
    console.log('  ⏭️  이미 데이터가 있습니다. 건너뜁니다.')
    return
  }

  const { error } = await supabase.from('media_content').insert(mediaContentData)
  if (error) {
    console.error('  ❌ 실패:', error.message)
  } else {
    console.log(`  ✅ ${mediaContentData.length}건 입력 완료`)
  }
}

async function seedTimelineEvents() {
  console.log('\n📅 타임라인 이벤트 데이터 시딩...')

  const { data: existing } = await supabase.from('timeline_events').select('id')
  if (existing && existing.length > 0) {
    console.log('  ⏭️  이미 데이터가 있습니다. 건너뜁니다.')
    return
  }

  const { error } = await supabase.from('timeline_events').insert(timelineEventsData)
  if (error) {
    console.error('  ❌ 실패:', error.message)
  } else {
    console.log(`  ✅ ${timelineEventsData.length}건 입력 완료`)
  }
}

async function seedSchedules() {
  console.log('\n🗓️ 일정 데이터 시딩...')

  const { data: existing } = await supabase.from('schedules').select('id')
  if (existing && existing.length > 0) {
    console.log('  ⏭️  이미 데이터가 있습니다. 건너뜁니다.')
    return
  }

  const { error } = await supabase.from('schedules').insert(schedulesData)
  if (error) {
    console.error('  ❌ 실패:', error.message)
  } else {
    console.log(`  ✅ ${schedulesData.length}건 입력 완료`)
  }
}

async function seedBanners() {
  console.log('\n🖼️ 배너 데이터 시딩...')

  const { data: existing } = await supabase.from('banners').select('id')
  if (existing && existing.length > 0) {
    console.log('  ⏭️  이미 데이터가 있습니다. 건너뜁니다.')
    return
  }

  const { error } = await supabase.from('banners').insert(bannersData)
  if (error) {
    console.error('  ❌ 실패:', error.message)
  } else {
    console.log(`  ✅ ${bannersData.length}건 입력 완료`)
  }
}

async function seedSignatures() {
  console.log('\n🎵 시그니처 데이터 시딩...')

  const { data: existing } = await supabase.from('signatures').select('id')
  if (existing && existing.length > 0) {
    console.log('  ⏭️  이미 데이터가 있습니다. 건너뜁니다.')
    return
  }

  const { error } = await supabase.from('signatures').insert(signaturesData)
  if (error) {
    console.error('  ❌ 실패:', error.message)
  } else {
    console.log(`  ✅ ${signaturesData.length}건 입력 완료`)
  }
}

async function seedLiveStatus() {
  console.log('\n📡 라이브 상태 데이터 시딩...')

  const { data: existing } = await supabase.from('live_status').select('id')
  if (existing && existing.length > 0) {
    console.log('  ⏭️  이미 데이터가 있습니다. 건너뜁니다.')
    return
  }

  const { error } = await supabase.from('live_status').insert(liveStatusData)
  if (error) {
    console.error('  ❌ 실패:', error.message)
  } else {
    console.log(`  ✅ ${liveStatusData.length}건 입력 완료`)
  }
}

async function seedVipProfiles() {
  console.log('\n👤 VIP 테스트 프로필 시딩...')

  // 프로필은 auth.users와 연결되어 있어 직접 삽입이 어려움
  // service_role을 사용하여 RLS 우회하여 삽입
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .in('id', Object.values(TEST_PROFILE_IDS))

  if (existing && existing.length > 0) {
    console.log('  ⏭️  이미 데이터가 있습니다. 건너뜁니다.')
    return
  }

  // 직접 삽입 (service_role 키 사용 시 FK 제약 우회 가능)
  // 주의: auth.users에 해당 id가 없으면 실패할 수 있음
  // 대안: SQL로 직접 삽입하거나, 테스트 환경에서만 사용
  const { error } = await supabase.from('profiles').insert(vipProfilesData)
  if (error) {
    console.error('  ❌ 실패:', error.message)
    console.log('  💡 힌트: profiles 테이블은 auth.users FK가 있어 테스트 시 SQL 직접 삽입 권장')
    console.log('  💡 Supabase Dashboard에서 SQL Editor로 아래 실행:')
    console.log('     INSERT INTO profiles (id, nickname, role, unit, total_donation)')
    console.log('     VALUES (...) ON CONFLICT (id) DO NOTHING;')
  } else {
    console.log(`  ✅ ${vipProfilesData.length}건 입력 완료`)
  }
}

async function seedVipRewards() {
  console.log('\n🏆 VIP 보상 데이터 시딩...')

  const { data: existing } = await supabase.from('vip_rewards').select('id')
  if (existing && existing.length > 0) {
    console.log('  ⏭️  이미 데이터가 있습니다. 건너뜁니다.')
    return
  }

  // 프로필이 존재하는지 확인
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .in('id', [TEST_PROFILE_IDS.pinkHeart, TEST_PROFILE_IDS.gul, TEST_PROFILE_IDS.eternalSupporter])

  if (!profiles || profiles.length === 0) {
    console.log('  ⚠️  VIP 프로필이 없습니다. 먼저 프로필을 생성하세요.')
    console.log('  💡 profiles 테이블에 테스트 사용자를 먼저 추가해야 합니다.')
    return
  }

  const { error } = await supabase.from('vip_rewards').insert(vipRewardsData)
  if (error) {
    console.error('  ❌ 실패:', error.message)
  } else {
    console.log(`  ✅ ${vipRewardsData.length}건 입력 완료`)
  }
}

async function seedVipImages() {
  console.log('\n🖼️ VIP 이미지 데이터 시딩...')

  const { data: existing } = await supabase.from('vip_images').select('id')
  if (existing && existing.length > 0) {
    console.log('  ⏭️  이미 데이터가 있습니다. 건너뜁니다.')
    return
  }

  // VIP 보상이 존재하는지 확인
  const { data: rewards } = await supabase.from('vip_rewards').select('id')
  if (!rewards || rewards.length === 0) {
    console.log('  ⚠️  VIP 보상 데이터가 없습니다. 먼저 보상을 생성하세요.')
    return
  }

  const { error } = await supabase.from('vip_images').insert(vipImagesData)
  if (error) {
    console.error('  ❌ 실패:', error.message)
  } else {
    console.log(`  ✅ ${vipImagesData.length}건 입력 완료`)
  }
}

async function seedTributeGuestbook() {
  console.log('\n📝 헌정 방명록 데이터 시딩...')

  const { data: existing } = await supabase.from('tribute_guestbook').select('id')
  if (existing && existing.length > 0) {
    console.log('  ⏭️  이미 데이터가 있습니다. 건너뜁니다.')
    return
  }

  // 프로필이 존재하는지 확인
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .in('id', Object.values(TEST_PROFILE_IDS))

  if (!profiles || profiles.length === 0) {
    console.log('  ⚠️  VIP 프로필이 없습니다. 방명록을 건너뜁니다.')
    return
  }

  const { error } = await supabase.from('tribute_guestbook').insert(tributeGuestbookData)
  if (error) {
    console.error('  ❌ 실패:', error.message)
  } else {
    console.log(`  ✅ ${tributeGuestbookData.length}건 입력 완료`)
  }
}

async function checkConnection() {
  console.log('🔌 Supabase 연결 확인...')
  console.log('  URL:', SUPABASE_URL)

  const { data, error } = await supabase.from('seasons').select('count').limit(1)
  if (error) {
    console.error('  ❌ 연결 실패:', error.message)
    process.exit(1)
  }
  console.log('  ✅ 연결 성공!')
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('  RG Family Database Seeding')
  console.log('═══════════════════════════════════════════')

  await checkConnection()

  // 기본 데이터 (의존성 없음)
  await seedSeasons()
  await seedOrganization()
  await seedNotices()
  await seedDonations()
  await seedMediaContent()
  await seedTimelineEvents()
  await seedSchedules()
  await seedBanners()
  await seedSignatures()
  await seedLiveStatus()

  // VIP 시스템 (순서 중요: profiles → rewards → images)
  console.log('\n═══════════════════════════════════════════')
  console.log('  🎖️ VIP 보상 시스템 시딩')
  console.log('═══════════════════════════════════════════')
  await seedVipProfiles()
  await seedVipRewards()
  await seedVipImages()
  await seedTributeGuestbook()

  console.log('\n═══════════════════════════════════════════')
  console.log('  ✨ 시딩 완료!')
  console.log('═══════════════════════════════════════════\n')
}

main().catch(console.error)
