/**
 * VIP 시그니처 관리 스크립트
 *
 * 사용법:
 *   node scripts/manage-signatures.cjs list              # 모든 시그니처 조회
 *   node scripts/manage-signatures.cjs add <닉네임> <파일경로>  # 시그니처 추가
 *   node scripts/manage-signatures.cjs delete <이미지ID>  # 시그니처 삭제
 *   node scripts/manage-signatures.cjs update-avatar <닉네임>  # 아바타 업데이트
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  'https://cdiptfmagemjfmsuphaj.supabase.co',
  'sb_secret_snZIkebQVn4xNPbHPMoDRQ_bl45b7rC'
);

// 모든 시그니처 조회
async function listSignatures() {
  console.log('\n📋 VIP 시그니처 목록\n');
  console.log('='.repeat(80));

  const { data: rewards } = await supabase
    .from('vip_rewards')
    .select(`
      id,
      rank,
      profiles:profile_id (id, nickname, avatar_url)
    `)
    .order('rank', { ascending: true });

  for (const reward of rewards || []) {
    const profile = Array.isArray(reward.profiles) ? reward.profiles[0] : reward.profiles;
    const nickname = profile?.nickname || 'Unknown';

    const { data: images } = await supabase
      .from('vip_images')
      .select('id, image_url, title')
      .eq('reward_id', reward.id);

    console.log(`\n[Rank ${reward.rank}] ${nickname}`);
    console.log(`  Profile ID: ${profile?.id}`);
    console.log(`  Avatar URL: ${profile?.avatar_url ? '✅ 설정됨' : '❌ 없음'}`);
    console.log(`  시그니처 이미지: ${images?.length || 0}개`);

    if (images && images.length > 0) {
      images.forEach((img, i) => {
        console.log(`    [${img.id}] ${img.title || '제목없음'}`);
        console.log(`        ${img.image_url}`);
      });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('사용법:');
  console.log('  추가: node scripts/manage-signatures.cjs add <닉네임> <파일경로>');
  console.log('  삭제: node scripts/manage-signatures.cjs delete <이미지ID>');
  console.log('  아바타 업데이트: node scripts/manage-signatures.cjs update-avatar <닉네임>');
}

// 시그니처 추가
async function addSignature(nickname, filePath) {
  console.log(`\n🖼️  시그니처 추가: ${nickname}`);

  // 파일 존재 확인
  if (!fs.existsSync(filePath)) {
    console.error('❌ 파일을 찾을 수 없습니다:', filePath);
    return;
  }

  // 프로필 찾기
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname')
    .ilike('nickname', `%${nickname}%`);

  if (!profiles || profiles.length === 0) {
    console.error('❌ 프로필을 찾을 수 없습니다:', nickname);
    return;
  }

  const profile = profiles[0];
  console.log(`  프로필 찾음: ${profile.nickname} (${profile.id})`);

  // VIP reward 찾기 또는 생성
  let { data: reward } = await supabase
    .from('vip_rewards')
    .select('id')
    .eq('profile_id', profile.id)
    .single();

  if (!reward) {
    console.log('  VIP reward 생성 중...');
    const { data: newReward, error } = await supabase
      .from('vip_rewards')
      .insert({ profile_id: profile.id, season_id: 1, rank: 99 })
      .select()
      .single();

    if (error) {
      console.error('❌ VIP reward 생성 실패:', error.message);
      return;
    }
    reward = newReward;
  }

  console.log(`  Reward ID: ${reward.id}`);

  // 파일 업로드
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath);
  const fileName = `${nickname.replace(/[^a-zA-Z0-9가-힣]/g, '-')}-signature-${Date.now()}${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('vip-signatures')
    .upload(fileName, fileBuffer, {
      contentType: ext === '.gif' ? 'image/gif' : 'image/png',
      upsert: true
    });

  if (uploadError) {
    console.error('❌ 업로드 실패:', uploadError.message);
    return;
  }

  const { data: urlData } = supabase.storage.from('vip-signatures').getPublicUrl(fileName);
  console.log(`  업로드 완료: ${urlData.publicUrl}`);

  // vip_images에 추가
  const { data: imageData, error: imgError } = await supabase
    .from('vip_images')
    .insert({
      reward_id: reward.id,
      image_url: urlData.publicUrl,
      title: `${profile.nickname} 시그니처`,
      order_index: 1
    })
    .select();

  if (imgError) {
    console.error('❌ 이미지 등록 실패:', imgError.message);
    return;
  }

  console.log(`✅ 시그니처 추가 완료! (ID: ${imageData[0].id})`);

  // 아바타 업데이트 여부 묻기
  console.log('\n  💡 프로필 아바타도 업데이트하시겠습니까?');
  console.log(`     node scripts/manage-signatures.cjs update-avatar "${nickname}"`);
}

// 시그니처 삭제
async function deleteSignature(imageId) {
  console.log(`\n🗑️  시그니처 삭제: ID ${imageId}`);

  const { data: image } = await supabase
    .from('vip_images')
    .select('*')
    .eq('id', imageId)
    .single();

  if (!image) {
    console.error('❌ 이미지를 찾을 수 없습니다:', imageId);
    return;
  }

  const { error } = await supabase
    .from('vip_images')
    .delete()
    .eq('id', imageId);

  if (error) {
    console.error('❌ 삭제 실패:', error.message);
    return;
  }

  console.log(`✅ 삭제 완료: ${image.title || image.image_url}`);
}

// 아바타 업데이트 (시그니처를 프로필 아바타로 설정)
async function updateAvatar(nickname) {
  console.log(`\n👤 아바타 업데이트: ${nickname}`);

  // 프로필 찾기
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname')
    .ilike('nickname', `%${nickname}%`);

  if (!profiles || profiles.length === 0) {
    console.error('❌ 프로필을 찾을 수 없습니다:', nickname);
    return;
  }

  const profile = profiles[0];

  // VIP reward와 이미지 찾기
  const { data: reward } = await supabase
    .from('vip_rewards')
    .select('id')
    .eq('profile_id', profile.id)
    .single();

  if (!reward) {
    console.error('❌ VIP reward를 찾을 수 없습니다');
    return;
  }

  const { data: images } = await supabase
    .from('vip_images')
    .select('image_url')
    .eq('reward_id', reward.id)
    .order('order_index', { ascending: true })
    .limit(1);

  if (!images || images.length === 0) {
    console.error('❌ 시그니처 이미지가 없습니다. 먼저 시그니처를 추가하세요.');
    return;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: images[0].image_url })
    .eq('id', profile.id);

  if (error) {
    console.error('❌ 아바타 업데이트 실패:', error.message);
    return;
  }

  console.log(`✅ 아바타 업데이트 완료!`);
  console.log(`   ${profile.nickname} → ${images[0].image_url}`);
}

// 메인
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'list':
      await listSignatures();
      break;
    case 'add':
      if (args.length < 3) {
        console.log('사용법: node scripts/manage-signatures.cjs add <닉네임> <파일경로>');
        return;
      }
      await addSignature(args[1], args[2]);
      break;
    case 'delete':
      if (args.length < 2) {
        console.log('사용법: node scripts/manage-signatures.cjs delete <이미지ID>');
        return;
      }
      await deleteSignature(parseInt(args[1]));
      break;
    case 'update-avatar':
      if (args.length < 2) {
        console.log('사용법: node scripts/manage-signatures.cjs update-avatar <닉네임>');
        return;
      }
      await updateAvatar(args[1]);
      break;
    default:
      await listSignatures();
  }
}

main().catch(console.error);
