/**
 * is_published 컬럼 추가 마이그레이션 스크립트
 * media_content + signature_videos 테이블에 is_published 컬럼 추가
 */
import { getServiceClient } from '../lib/supabase'

const supabase = getServiceClient()

async function run() {
  console.log('=== is_published 마이그레이션 시작 ===\n')

  // 1. media_content에 is_published 컬럼 존재 여부 확인
  const { data: mediaCheck } = await supabase
    .from('media_content')
    .select('id')
    .limit(1)

  // is_published 컬럼이 이미 있는지 확인 (select *로 체크)
  const { data: mediaSample } = await supabase
    .from('media_content')
    .select('*')
    .limit(1)

  if (mediaSample && mediaSample.length > 0 && 'is_published' in mediaSample[0]) {
    console.log('✅ media_content.is_published 컬럼이 이미 존재합니다.')

    // 기존 데이터 중 null인 것 있으면 true로 업데이트
    const { count: unpublishedMedia } = await supabase
      .from('media_content')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', false)

    console.log(`   - 비공개 미디어: ${unpublishedMedia || 0}개`)
  } else {
    console.log('⚠️  media_content.is_published 컬럼이 없습니다.')
    console.log('   Supabase Dashboard SQL Editor에서 아래 SQL을 실행해주세요:\n')
    console.log('   ALTER TABLE media_content ADD COLUMN is_published boolean NOT NULL DEFAULT false;')
    console.log('   UPDATE media_content SET is_published = true;')
    console.log('   CREATE INDEX idx_media_content_published ON media_content (is_published) WHERE is_published = true;\n')
  }

  // 2. signature_videos에 is_published 컬럼 존재 여부 확인
  const { data: sigSample } = await supabase
    .from('signature_videos')
    .select('*')
    .limit(1)

  if (sigSample && sigSample.length > 0 && 'is_published' in sigSample[0]) {
    console.log('✅ signature_videos.is_published 컬럼이 이미 존재합니다.')

    const { count: unpublishedSig } = await supabase
      .from('signature_videos')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', false)

    console.log(`   - 비공개 시그니처 영상: ${unpublishedSig || 0}개`)
  } else {
    console.log('⚠️  signature_videos.is_published 컬럼이 없습니다.')
    console.log('   Supabase Dashboard SQL Editor에서 아래 SQL을 실행해주세요:\n')
    console.log('   ALTER TABLE signature_videos ADD COLUMN is_published boolean NOT NULL DEFAULT false;')
    console.log('   UPDATE signature_videos SET is_published = true;')
    console.log('   CREATE INDEX idx_sig_videos_published ON signature_videos (is_published) WHERE is_published = true;\n')
  }

  console.log('\n=== 마이그레이션 체크 완료 ===')
}

run().catch(console.error)
