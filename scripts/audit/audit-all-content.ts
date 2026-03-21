import { getServiceClient } from '../lib/supabase';
import { execSync } from 'child_process';

const supabase = getServiceClient();

async function main() {
  // 1. DB의 모든 media_content 조회
  const { data: allMedia } = await supabase
    .from('media_content')
    .select('id, content_type, title, unit, cloudflare_uid, is_published, parent_id, part_number, total_parts')
    .order('title');

  if (!allMedia) return;

  const shorts = allMedia.filter(m => m.content_type === 'shorts');
  const vods = allMedia.filter(m => m.content_type === 'vod');

  console.log('=== MEDIA_CONTENT 전체 통계 ===');
  console.log(`총: ${allMedia.length}개 / shorts: ${shorts.length}개 / vod: ${vods.length}개`);

  // 2. Shorts 분석
  console.log('\n=== SHORTS 상세 ===');
  shorts.sort((a, b) => a.title.localeCompare(b.title));
  shorts.forEach(s => {
    console.log(`  ID:${s.id} "${s.title}" unit=${s.unit} published=${s.is_published} cf=${s.cloudflare_uid ? 'Y' : 'N'}`);
  });

  // 3. VOD 분석
  console.log('\n=== VOD 상세 ===');
  const parentVods = vods.filter(v => !v.parent_id);
  parentVods.sort((a, b) => a.title.localeCompare(b.title));
  for (const parent of parentVods) {
    const parts = vods.filter(v => v.parent_id === parent.id);
    const allParts = [parent, ...parts].sort((a, b) => (a.part_number || 1) - (b.part_number || 1));
    console.log(`  ${parent.title} (${allParts.length}/${parent.total_parts} parts) unit=${parent.unit}`);
    allParts.forEach(p => {
      console.log(`    Part ${p.part_number}: ID:${p.id} published=${p.is_published} cf=${p.cloudflare_uid ? 'Y' : 'N'}`);
    });
  }

  // 4. signature_videos 무결성 체크
  const { data: sigVids } = await supabase
    .from('signature_videos')
    .select('id, signature_id, member_id, cloudflare_uid, is_published');

  if (sigVids) {
    const noCfUid = sigVids.filter(v => !v.cloudflare_uid);
    const unpublished = sigVids.filter(v => !v.is_published);
    const noSigId = sigVids.filter(v => !v.signature_id);

    console.log('\n=== SIGNATURE_VIDEOS 무결성 ===');
    console.log(`총: ${sigVids.length}개`);
    console.log(`cloudflare_uid 없음: ${noCfUid.length}개`);
    console.log(`미공개(is_published=false): ${unpublished.length}개`);
    console.log(`signature_id null: ${noSigId.length}개`);

    if (noCfUid.length > 0) {
      console.log('\n  cloudflare_uid 없는 영상:');
      noCfUid.forEach(v => console.log(`    VID:${v.id} sig_id:${v.signature_id} member:${v.member_id}`));
    }
    if (unpublished.length > 0) {
      console.log('\n  미공개 영상:');
      unpublished.forEach(v => console.log(`    VID:${v.id} sig_id:${v.signature_id} member:${v.member_id}`));
    }
    if (noSigId.length > 0) {
      console.log('\n  signature_id null 영상:');
      noSigId.forEach(v => console.log(`    VID:${v.id} member:${v.member_id} cf:${v.cloudflare_uid}`));
    }
  }

  // 5. Cloudflare Stream 영상 중 DB에 없는 것 확인
  const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  if (cfApiToken && cfAccountId) {
    console.log('\n=== Cloudflare Stream 크로스체크 ===');
    // 모든 DB의 cloudflare_uid 수집
    const dbUids = new Set<string>();
    allMedia.filter(m => m.cloudflare_uid).forEach(m => dbUids.add(m.cloudflare_uid!));
    sigVids?.filter(v => v.cloudflare_uid).forEach(v => dbUids.add(v.cloudflare_uid!));
    console.log(`DB에 등록된 CF UID: ${dbUids.size}개`);
  } else {
    console.log('\n(CLOUDFLARE_API_TOKEN 미설정 - CF 크로스체크 스킵)');
  }
}

main().catch(console.error);
