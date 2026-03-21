import { getServiceClient } from '../lib/supabase';

const supabase = getServiceClient();

async function main() {
  // 1. 모든 shorts 조회 (unit별)
  const { data: allShorts } = await supabase
    .from('media_content')
    .select('id, title, unit, content_type, cloudflare_uid, is_published')
    .eq('content_type', 'shorts')
    .order('title');

  if (!allShorts) return;

  const excelShorts = allShorts.filter(s => s.unit === 'excel');
  const crewShorts = allShorts.filter(s => s.unit === 'crew');

  console.log('=== SHORTS 통계 ===');
  console.log(`총: ${allShorts.length} / excel: ${excelShorts.length} / crew: ${crewShorts.length}`);

  console.log('\n=== CREW로 분류된 SHORTS (수정 대상) ===');
  crewShorts.forEach(s => {
    console.log(`  ID:${s.id} "${s.title}" unit=${s.unit} published=${s.is_published}`);
  });

  console.log('\n=== EXCEL로 분류된 SHORTS ===');
  excelShorts.forEach(s => {
    console.log(`  ID:${s.id} "${s.title}" unit=${s.unit} published=${s.is_published}`);
  });

  // 2. VOD도 확인
  const { data: allVod } = await supabase
    .from('media_content')
    .select('id, title, unit, content_type')
    .eq('content_type', 'vod')
    .order('title');

  if (allVod) {
    const crewVod = allVod.filter(v => v.unit === 'crew');
    if (crewVod.length > 0) {
      console.log('\n=== CREW로 분류된 VOD ===');
      crewVod.forEach(v => console.log(`  ID:${v.id} "${v.title}" unit=${v.unit}`));
    }
  }

  // 3. 시그니처 비디오 현황
  const { data: sigVids } = await supabase
    .from('signature_videos')
    .select('id, signature_id, member_id, cloudflare_uid, is_published, signatures(sig_number, title, unit)')
    .order('member_id');

  if (!sigVids) return;

  // members
  const { data: members } = await supabase
    .from('organization')
    .select('id, name, unit')
    .order('id');

  if (!members) return;

  const memberMap = new Map(members.map(m => [m.id, m]));

  console.log('\n=== 멤버별 시그니처 영상 현황 ===');
  const byMember = new Map<number, typeof sigVids>();
  sigVids.forEach(v => {
    const list = byMember.get(v.member_id) || [];
    list.push(v);
    byMember.set(v.member_id, list);
  });

  for (const [mid, vids] of [...byMember.entries()].sort((a, b) => a[0] - b[0])) {
    const member = memberMap.get(mid);
    console.log(`  ${member?.name || 'unknown'}(${member?.unit}) ID:${mid} → ${vids.length}개 영상`);
  }

  // 4. 10000 이상 시그니처 중 미등록 확인
  const { data: allSigs } = await supabase
    .from('signatures')
    .select('id, sig_number, title, unit')
    .gte('sig_number', 10000)
    .order('sig_number');

  if (!allSigs) return;

  console.log(`\n=== 10000+ 시그니처: 총 ${allSigs.length}개 ===`);

  const registeredPairs = new Set(sigVids.map(v => `${v.signature_id}-${v.member_id}`));

  console.log('\n=== 멤버별 미등록 시그니처 (10000+) ===');
  for (const member of members.sort((a, b) => a.id - b.id)) {
    const missing = allSigs.filter(s => {
      return !registeredPairs.has(`${s.id}-${member.id}`);
    });
    if (missing.length > 0) {
      console.log(`\n  ${member.name}(${member.unit}) ID:${member.id} - 미등록 ${missing.length}개:`);
      missing.forEach(s => console.log(`    Sig#${s.sig_number} "${s.title}"`));
    }
  }
}

main().catch(console.error);
