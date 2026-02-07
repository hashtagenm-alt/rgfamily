;
;
import { getServiceClient } from './lib/supabase'
import * as path from 'path';

 });

const supabase = getServiceClient();

async function fix() {
  console.log('=== VIP 프로필 수정 ===\n');

  // 현재 시즌 가져오기
  const { data: season } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .single();

  const seasonId = season?.id || 1;
  console.log('현재 시즌 ID:', seasonId);

  // 1. 사랑해씌발™ vip_rewards 추가
  console.log('\n--- 1. 사랑해씌발™ vip_rewards 추가 ---');
  const sarangProfileId = '15935b30-4700-4d34-891a-3a0149b32874';

  const { data: existingSarang } = await supabase
    .from('vip_rewards')
    .select('id')
    .eq('profile_id', sarangProfileId)
    .single();

  if (existingSarang) {
    console.log('이미 vip_rewards 있음:', existingSarang.id);
  } else {
    const { data: reward1, error: err1 } = await supabase
      .from('vip_rewards')
      .insert({
        profile_id: sarangProfileId,
        season_id: seasonId,
        rank: 11,
      })
      .select()
      .single();

    if (err1) {
      console.log('❌ vip_rewards 추가 실패:', err1.message);
    } else {
      console.log('✅ 사랑해씌발™ vip_rewards 추가 완료. ID:', reward1.id);
    }
  }

  // 2. [J]젖문가 프로필 닉네임 수정
  console.log('\n--- 2. [J]젖문가 프로필 닉네임 수정 ---');
  const jProfileId = '1312dbb6-fc23-4f6a-a5cb-696695be039c';

  const { data: updated, error: err2 } = await supabase
    .from('profiles')
    .update({ nickname: '[J]젖문가' })
    .eq('id', jProfileId)
    .select('id, nickname')
    .single();

  if (err2) {
    console.log('❌ 닉네임 변경 실패:', err2.message);
  } else {
    console.log('✅ 프로필 닉네임 변경:', updated);
  }

  // 3. [J]젖문가 vip_rewards 확인/추가
  console.log('\n--- 3. [J]젖문가 vip_rewards 확인/추가 ---');

  const { data: existingJ } = await supabase
    .from('vip_rewards')
    .select('id')
    .eq('profile_id', jProfileId)
    .single();

  if (existingJ) {
    console.log('이미 vip_rewards 있음:', existingJ.id);
  } else {
    const { data: reward2, error: err3 } = await supabase
      .from('vip_rewards')
      .insert({
        profile_id: jProfileId,
        season_id: seasonId,
        rank: 8,
      })
      .select()
      .single();

    if (err3) {
      console.log('❌ vip_rewards 추가 실패:', err3.message);
    } else {
      console.log('✅ [J]젖문가 vip_rewards 추가 완료. ID:', reward2.id);
    }
  }

  // 검증
  console.log('\n=== 검증 ===');
  const { data: verify } = await supabase
    .from('vip_rewards')
    .select('profile_id, rank, profiles:profile_id(nickname)')
    .in('profile_id', [sarangProfileId, jProfileId]);

  console.log('vip_rewards 확인:');
  verify?.forEach(v => {
    const nickname = Array.isArray(v.profiles)
      ? v.profiles[0]?.nickname
      : (v.profiles as { nickname: string } | null)?.nickname;
    console.log(`  - ${nickname}: rank ${v.rank}`);
  });
}

fix().catch(console.error);
