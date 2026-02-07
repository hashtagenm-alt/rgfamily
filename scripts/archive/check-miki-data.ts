import { getServiceClient } from './lib/supabase'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = getServiceClient()

async function main() {
  // 미키 포함된 프로필 조회
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .ilike('nickname', '%미키%')

  console.log('=== 미키 관련 프로필 ===')
  profiles?.forEach(p => {
    console.log(`ID: ${p.id}`)
    console.log(`닉네임: ${p.nickname}`)
    console.log(`이메일: ${p.email}`)
    console.log(`역할: ${p.role}`)
    console.log(`프로필이미지: ${p.profile_image_url}`)
    console.log(`아바타: ${p.avatar_url}`)
    console.log('---')
  })

  // vip_rewards 테이블 확인
  const { data: vipRewards } = await supabase
    .from('vip_rewards')
    .select('*')
    .ilike('nickname', '%미키%')

  console.log('\n=== 미키 VIP Rewards ===')
  console.log(JSON.stringify(vipRewards, null, 2))

  // signatures 테이블 확인
  const { data: signatures } = await supabase
    .from('signatures')
    .select('*')
    .ilike('donor_name', '%미키%')

  console.log('\n=== 미키 Signatures ===')
  console.log(JSON.stringify(signatures, null, 2))

  // vip_images 테이블 확인
  const { data: vipImages } = await supabase
    .from('vip_images')
    .select('*')
    .ilike('nickname', '%미키%')

  console.log('\n=== 미키 VIP Images ===')
  console.log(JSON.stringify(vipImages, null, 2))

  // signature_videos 확인
  const { data: sigVideos } = await supabase
    .from('signature_videos')
    .select('*')
    .ilike('donor_name', '%미키%')

  console.log('\n=== 미키 Signature Videos ===')
  console.log(JSON.stringify(sigVideos, null, 2))

  // Supabase Storage에서 미키 관련 파일 확인
  const { data: storageFiles } = await supabase.storage
    .from('signatures')
    .list('', { search: '미키' })

  console.log('\n=== Storage signatures 버킷 (미키 검색) ===')
  console.log(JSON.stringify(storageFiles, null, 2))

  // 전체 signatures 폴더 확인
  const { data: allSigFiles } = await supabase.storage
    .from('signatures')
    .list('')

  console.log('\n=== Storage signatures 버킷 전체 목록 ===')
  allSigFiles?.forEach(f => console.log(f.name))
}

main().catch(console.error)
