/**
 * Media Content 시드 스크립트
 * Shorts 및 VOD 임시 데이터 추가
 *
 * 실행: npx tsx scripts/seed-media.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// .env.local 로드
config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// 임시 YouTube Shorts (세로형 영상)
const sampleShorts = [
  {
    title: '[엑셀부] 리나 하이라이트',
    video_url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    content_type: 'shorts',
    unit: 'excel',
  },
  {
    title: '[엑셀부] 방송 비하인드',
    video_url: 'https://www.youtube.com/shorts/9bZkp7q19f0',
    thumbnail_url: 'https://img.youtube.com/vi/9bZkp7q19f0/hqdefault.jpg',
    content_type: 'shorts',
    unit: 'excel',
  },
  {
    title: '[크루부] 일상 브이로그',
    video_url: 'https://www.youtube.com/shorts/kJQP7kiw5Fk',
    thumbnail_url: 'https://img.youtube.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
    content_type: 'shorts',
    unit: 'crew',
  },
  {
    title: '[엑셀부] 직급전 하이라이트',
    video_url: 'https://www.youtube.com/shorts/JGwWNGJdvx8',
    thumbnail_url: 'https://img.youtube.com/vi/JGwWNGJdvx8/hqdefault.jpg',
    content_type: 'shorts',
    unit: 'excel',
  },
]

// 임시 VOD (가로형 영상)
const sampleVods = [
  {
    title: '[시즌1] 01화 직급전 풀영상',
    description: 'RG FAMILY 시즌1 첫 회! 직급전 풀버전입니다.',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    content_type: 'vod',
    unit: 'excel',
  },
  {
    title: '[시즌1] 02화 황금or벌금데이',
    description: '상금과 벌금이 걸린 치열한 대결!',
    video_url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
    thumbnail_url: 'https://img.youtube.com/vi/9bZkp7q19f0/maxresdefault.jpg',
    content_type: 'vod',
    unit: 'excel',
  },
  {
    title: '[크루부] 합동 방송 하이라이트',
    description: '크루부 멤버들의 합동 방송 모음집',
    video_url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
    thumbnail_url: 'https://img.youtube.com/vi/kJQP7kiw5Fk/maxresdefault.jpg',
    content_type: 'vod',
    unit: 'crew',
  },
  {
    title: '[시즌1] 03화 퇴근전쟁',
    description: '할당량 채우면 즉시 퇴근! 누가 먼저?',
    video_url: 'https://www.youtube.com/watch?v=JGwWNGJdvx8',
    thumbnail_url: 'https://img.youtube.com/vi/JGwWNGJdvx8/maxresdefault.jpg',
    content_type: 'vod',
    unit: 'excel',
  },
]

async function seedMedia() {
  console.log('🎬 Media Content 시드 시작...')

  // 기존 데이터 확인
  const { count } = await supabase
    .from('media_content')
    .select('*', { count: 'exact', head: true })

  if (count && count > 0) {
    console.log(`⚠️ 이미 ${count}개의 미디어가 있습니다. 추가하시겠습니까? (기존 데이터 유지)`)
  }

  // Shorts 추가
  console.log('📱 Shorts 추가 중...')
  const { data: shortsData, error: shortsError } = await supabase
    .from('media_content')
    .insert(sampleShorts)
    .select()

  if (shortsError) {
    console.error('Shorts 추가 실패:', shortsError)
  } else {
    console.log(`✅ Shorts ${shortsData?.length || 0}개 추가 완료`)
  }

  // VOD 추가
  console.log('🎥 VOD 추가 중...')
  const { data: vodData, error: vodError } = await supabase
    .from('media_content')
    .insert(sampleVods)
    .select()

  if (vodError) {
    console.error('VOD 추가 실패:', vodError)
  } else {
    console.log(`✅ VOD ${vodData?.length || 0}개 추가 완료`)
  }

  console.log('🎉 시드 완료!')
}

seedMedia()
