import { getServiceClient } from '../lib/supabase'
;
;
;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = getServiceClient();

async function checkVipImages() {
  console.log('=== VIP 이미지 RLS 점검 (anon key - 비로그인 상태) ===\n');

  // 1. vip_images 테이블 직접 조회
  const { data: images, error: imgError } = await supabase
    .from('vip_images')
    .select('*')
    .limit(10);

  console.log('1. vip_images 테이블 직접 조회:');
  console.log('   Error:', imgError?.message || 'None');
  console.log('   Data count:', images?.length || 0);
  if (images && images.length > 0) {
    console.log('   Sample:', JSON.stringify(images[0], null, 2));
  }

  // 2. vip_rewards 테이블 조회
  const { data: rewards, error: rewardError } = await supabase
    .from('vip_rewards')
    .select('id, profile_id, rank')
    .limit(10);

  console.log('\n2. vip_rewards 테이블 조회:');
  console.log('   Error:', rewardError?.message || 'None');
  console.log('   Data count:', rewards?.length || 0);
  if (rewards && rewards.length > 0) {
    console.log('   Rewards:', rewards);
  }

  // 3. 미키 프로필 ID로 조회
  const { data: mikiProfile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, nickname')
    .eq('nickname', '미키™')
    .single();

  console.log('\n3. 미키 프로필 조회:');
  console.log('   Error:', profileErr?.message || 'None');
  console.log('   Profile:', mikiProfile);

  if (mikiProfile) {
    // 4. 미키의 vip_rewards 조회
    const { data: mikiReward, error: mikiRewardErr } = await supabase
      .from('vip_rewards')
      .select('*')
      .eq('profile_id', mikiProfile.id)
      .single();

    console.log('\n4. 미키 VIP Reward:');
    console.log('   Error:', mikiRewardErr?.message || 'None');
    console.log('   Reward:', mikiReward);

    if (mikiReward) {
      // 5. 미키의 vip_images 조회
      const { data: mikiImages, error: mikiImgErr } = await supabase
        .from('vip_images')
        .select('*')
        .eq('reward_id', mikiReward.id);

      console.log('\n5. 미키 VIP Images (reward_id로 조회):');
      console.log('   Error:', mikiImgErr?.message || 'None');
      console.log('   Images count:', mikiImages?.length || 0);
      if (mikiImages) {
        mikiImages.forEach((img, i) => {
          console.log(`   Image ${i + 1}:`, img.image_url);
        });
      }
    }
  }

  // 6. Storage에서 직접 이미지 URL 접근 테스트
  console.log('\n6. Storage URL 접근 테스트:');
  const testUrl = `${supabaseUrl}/storage/v1/object/public/vip-signatures/`;
  console.log('   Storage base URL:', testUrl);
}

checkVipImages().catch(console.error);
