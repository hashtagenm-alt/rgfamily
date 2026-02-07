;
;
import { getServiceClient } from './lib/supabase'
import * as path from 'path';
import * as fs from 'fs';

 });

const supabase = getServiceClient();

async function updateAvatars() {
  console.log('=== 프로필 아바타 수정 ===\n');

  // 1. 미드굿♣️가애 프로필 사진 업데이트
  console.log('--- 1. [RG]미드굿♣️가애 프로필 사진 업로드 ---');

  const imagePath = '/Users/bagjaeseog/Downloads/2c8cd7a6-eebd-468d-a84e-42bda6f2aa46.gif';
  const midgoodProfileId = '94b963ab-f2a7-4d03-a446-e69e1990a617';

  // 파일 읽기
  const fileBuffer = fs.readFileSync(imagePath);
  const fileName = `midgood-${Date.now()}.gif`;

  // Supabase Storage에 업로드
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('vip-signatures')
    .upload(fileName, fileBuffer, {
      contentType: 'image/gif',
      upsert: true,
    });

  if (uploadError) {
    console.log('❌ 이미지 업로드 실패:', uploadError.message);
    return;
  }

  // Public URL 가져오기
  const { data: urlData } = supabase.storage
    .from('vip-signatures')
    .getPublicUrl(fileName);

  const avatarUrl = urlData.publicUrl;
  console.log('✅ 이미지 업로드 완료:', avatarUrl);

  // 프로필 업데이트
  const { error: updateError1 } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', midgoodProfileId);

  if (updateError1) {
    console.log('❌ 프로필 업데이트 실패:', updateError1.message);
  } else {
    console.log('✅ [RG]미드굿♣️가애 프로필 사진 업데이트 완료');
  }

  // 2. ❥CaNnOt 프로필 사진 제거
  console.log('\n--- 2. ❥CaNnOt 프로필 사진 제거 ---');

  const cannotProfileId = 'cf84b9a9-0d19-4705-9458-e5984167aa9b';

  const { error: updateError2 } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', cannotProfileId);

  if (updateError2) {
    console.log('❌ 프로필 업데이트 실패:', updateError2.message);
  } else {
    console.log('✅ ❥CaNnOt 프로필 사진 제거 완료');
  }

  // 검증
  console.log('\n=== 검증 ===');
  const { data: verify } = await supabase
    .from('profiles')
    .select('nickname, avatar_url')
    .in('id', [midgoodProfileId, cannotProfileId]);

  verify?.forEach(p => {
    console.log(`${p.nickname}: ${p.avatar_url ? '있음' : '없음'}`);
  });
}

updateAvatars().catch(console.error);
