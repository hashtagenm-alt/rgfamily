import { getServiceClient } from '../lib/supabase';

const supabase = getServiceClient();

async function main() {
  // 1. signatures
  const { data: sigs } = await supabase.from('signatures').select('id, sig_number, title, unit').order('sig_number');
  if (!sigs) return;
  const excelSigs = sigs.filter(s => s.unit === 'excel');
  const crewSigs = sigs.filter(s => s.unit === 'crew');
  console.log('=== SIGNATURES 통계 ===');
  console.log(`총: ${sigs.length} / excel: ${excelSigs.length} / crew: ${crewSigs.length}`);

  // 2. signature_videos
  const { data: vids } = await supabase.from('signature_videos').select('id, signature_id, member_id, cloudflare_uid, is_published');
  if (!vids) return;
  console.log(`\n=== SIGNATURE_VIDEOS 통계 ===`);
  console.log(`총 영상 수: ${vids.length}`);

  // 3. members
  const { data: members, error: memErr } = await supabase.from('organization').select('id, nickname, unit').in('id', [59,60,61,62,63,64,65,66,67,68,69,70,71,72]);
  console.log('members error:', memErr);
  console.log('members count:', members?.length);
  if (!members || members.length === 0) {
    // Try broader query
    const { data: allOrg } = await supabase.from('organization').select('id, nickname, unit').order('id');
    console.log('All org members:');
    allOrg?.forEach(m => console.log(`  ${m.id} ${m.nickname} (${m.unit})`));
    return;
  }
  console.log('\n=== MEMBERS ===');
  members.sort((a, b) => a.id - b.id).forEach(m => console.log(`  ${m.id} ${m.nickname} (${m.unit})`));

  // 4. detailed join
  const { data: detailed } = await supabase
    .from('signature_videos')
    .select('id, signature_id, member_id, signatures(id, sig_number, title, unit)')
    .order('member_id');
  if (!detailed) return;

  const byMember: Record<number, typeof detailed> = {};
  detailed.forEach(v => {
    const mid = v.member_id;
    if (!byMember[mid]) byMember[mid] = [];
    byMember[mid].push(v);
  });

  console.log('\n=== 멤버별 영상 수 ===');
  for (const mid of Object.keys(byMember).sort((a, b) => Number(a) - Number(b))) {
    const videos = byMember[Number(mid)];
    const member = members.find(m => m.id === Number(mid));
    const name = member ? member.nickname : 'unknown';
    const mUnit = member ? member.unit : '?';
    const excelV = videos.filter(v => (v.signatures as any)?.unit === 'excel');
    const crewV = videos.filter(v => (v.signatures as any)?.unit === 'crew');
    console.log(`  ${name}(${mUnit}) ID:${mid} => 총:${videos.length} excel:${excelV.length} crew:${crewV.length}`);
  }

  // 5. crew 시그니처 영상 (잘못 분류된 것 확인용)
  console.log('\n=== CREW unit 시그니처에 연결된 영상 ===');
  const crewVids = detailed.filter(v => (v.signatures as any)?.unit === 'crew');
  crewVids.forEach(v => {
    const member = members.find(m => m.id === v.member_id);
    const sig = v.signatures as any;
    console.log(`  VID:${v.id} Member:${member?.nickname || v.member_id}(${member?.unit || '?'}) Sig#${sig?.sig_number} "${sig?.title}" [sig.unit=crew]`);
  });
  console.log(`  crew 영상 총: ${crewVids.length}개`);

  // 6. crew 시그니처 목록 (영상 없어도)
  console.log('\n=== CREW unit 시그니처 전체 목록 ===');
  crewSigs.forEach(s => {
    const hasVideo = detailed.some(v => v.signature_id === s.id);
    console.log(`  Sig#${s.sig_number} "${s.title}" [${hasVideo ? '영상있음' : '영상없음'}]`);
  });

  // 7. 멤버별 미등록 시그니처 (excel 시그니처 중)
  console.log('\n=== 멤버별 미등록 EXCEL 시그니처 ===');
  const minSig = 10000;
  const excelSigsAboveMin = excelSigs.filter(s => s.sig_number >= minSig);
  for (const member of members.sort((a, b) => a.id - b.id)) {
    const memberVids = detailed.filter(v => v.member_id === member.id);
    const registeredSigIds = new Set(memberVids.map(v => v.signature_id));
    const missing = excelSigsAboveMin.filter(s => !registeredSigIds.has(s.id));
    if (missing.length > 0) {
      console.log(`  ${member.nickname}(${member.unit}) ID:${member.id} - 미등록 ${missing.length}개:`);
      missing.forEach(s => console.log(`    Sig#${s.sig_number} "${s.title}"`));
    }
  }
}

main().catch(console.error);
