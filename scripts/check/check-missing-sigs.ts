import { getServiceClient } from '../lib/supabase'

const supabase = getServiceClient()
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

async function main() {
  const { data: allVideos } = await supabase
    .from('signature_videos')
    .select('id, cloudflare_uid, member_id, signature_id')
    .not('cloudflare_uid', 'is', null)

  const { data: members } = await supabase.from('organization').select('id, nickname, name')
  const memberMap = new Map((members || []).map((m: any) => [m.id, m.nickname || m.name]))

  // Check each video on Cloudflare
  const missing: any[] = []
  for (const v of (allVideos || [])) {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream/${v.cloudflare_uid}`,
      { headers: { Authorization: `Bearer ${API_TOKEN}` } }
    )
    const data = await res.json() as any
    if (!data.success) {
      missing.push(v)
    }
  }

  // Get signature info
  const sigIds = [...new Set(missing.map(v => v.signature_id))]
  const { data: sigs } = await supabase
    .from('signatures')
    .select('id, sig_number, title')
    .in('id', sigIds)
  const sigMap = new Map((sigs || []).map((s: any) => [s.id, s]))

  // Group by member
  const byMember: Record<string, any[]> = {}
  for (const v of missing) {
    const name = memberMap.get(v.member_id) || String(v.member_id)
    if (byMember[name] === undefined) byMember[name] = []
    const sig = sigMap.get(v.signature_id)
    byMember[name].push({
      id: v.id,
      sigNumber: sig ? (sig as any).sig_number : '?',
    })
  }

  console.log(`=== 미복구 영상 ${missing.length}개 (Google Drive에 파일 없음) ===`)
  for (const [name, vids] of Object.entries(byMember).sort((a, b) => (b[1] as any[]).length - (a[1] as any[]).length)) {
    console.log(`\n${name} (${(vids as any[]).length}개):`)
    for (const v of (vids as any[])) {
      console.log(`  id=${v.id} | sig ${v.sigNumber}`)
    }
  }

  console.log(`\n=== 요약 ===`)
  console.log(`전체: ${(allVideos || []).length}개`)
  console.log(`정상: ${(allVideos || []).length - missing.length}개`)
  console.log(`미복구: ${missing.length}개`)
  console.log(`\n이 ${missing.length}개 레코드는 Google Drive에 원본이 없어서 재업로드 불가.`)
  console.log(`DB에서 삭제하면 사이트에 빈 영상으로 표시되지 않습니다.`)
}

main().catch(e => console.error(e))
