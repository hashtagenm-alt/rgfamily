const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://cdiptfmagemjfmsuphaj.supabase.co',
  'sb_secret_snZIkebQVn4xNPbHPMoDRQ_bl45b7rC'
);

async function addSignature(nickname, filePath, fileName) {
  console.log('\n=== Adding signature for ' + nickname + ' ===');
  
  let { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, nickname')
    .ilike('nickname', '%' + nickname + '%');
  
  if (profErr) console.log('Profile search error:', profErr);
  
  let profileId;
  if (!profiles || profiles.length === 0) {
    console.log('Profile not found, creating with UUID...');
    const crypto = require('crypto');
    const newId = crypto.randomUUID();
    const { data: newProfile, error: createErr } = await supabase
      .from('profiles')
      .insert({ id: newId, nickname: nickname, role: 'vip' })
      .select()
      .single();
    
    if (createErr) {
      console.log('Create error:', createErr);
      return null;
    }
    profileId = newProfile.id;
    console.log('Created profile:', profileId);
  } else {
    profileId = profiles[0].id;
    console.log('Found profile:', profileId, profiles[0].nickname);
  }
  
  let { data: existingReward } = await supabase
    .from('vip_rewards')
    .select('*')
    .eq('profile_id', profileId)
    .single();
  
  let rewardId;
  if (existingReward) {
    rewardId = existingReward.id;
    console.log('Existing reward:', rewardId);
  } else {
    const { data: reward, error: rewErr } = await supabase
      .from('vip_rewards')
      .insert({ profile_id: profileId, season_id: 1, rank: 99, episode_id: null })
      .select()
      .single();
    
    if (rewErr) {
      console.log('Reward error:', rewErr);
      return null;
    }
    rewardId = reward.id;
    console.log('Created reward:', rewardId);
  }
  
  const fileBuffer = fs.readFileSync(filePath);
  const { error: upErr } = await supabase.storage
    .from('vip-signatures')
    .upload(fileName, fileBuffer, { contentType: 'image/gif', upsert: true });
  
  if (upErr) console.log('Upload error:', upErr);
  
  const { data: urlData } = supabase.storage.from('vip-signatures').getPublicUrl(fileName);
  console.log('Uploaded:', urlData.publicUrl);
  
  const { data: imageData, error: imgErr } = await supabase
    .from('vip_images')
    .insert({ reward_id: rewardId, image_url: urlData.publicUrl, title: nickname + ' 시그니처', order_index: 1 })
    .select();
  
  if (imgErr) {
    console.log('Image error:', imgErr);
    return null;
  }
  console.log('Done! Image ID:', imageData[0].id);
  return imageData[0];
}

async function main() {
  await addSignature(
    '육개장라면',
    '/Users/bagjaeseog/Downloads/_RG패밀리/RG시그 리뉴얼/시그_전체정리/010020_육개장라면/10020 3mb.gif',
    'yukgaejang-signature-1.gif'
  );
  
  await addSignature(
    '발굴',
    '/Users/bagjaeseog/Downloads/_RG패밀리/RG시그 리뉴얼/시그_전체정리/010033_발굴/10033 3mb.gif',
    'balgul-signature-1.gif'
  );
  
  console.log('\n=== All done ===');
}
main();
