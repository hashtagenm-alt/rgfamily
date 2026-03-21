import { getServiceClient } from '../lib/supabase'

const supabase = getServiceClient()
const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID!
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

async function main() {
  const { data: vids } = await supabase
    .from('signature_videos')
    .select('id, signature_id, member_id, cloudflare_uid, video_url, is_published, created_at')
    .eq('is_published', true)
    .order('id')

  if (!vids) { console.error('조회 실패'); return }

  const { data: sigs } = await supabase.from('signatures').select('id, sig_number, title')
  const { data: members } = await supabase.from('organization').select('id, name')

  const sigMap = new Map(sigs?.map(s => [s.id, s]) || [])
  const memberMap = new Map(members?.map(m => [m.id, m.name]) || [])

  console.log(`=== 전체 published 영상: ${vids.length}개 ===\n`)

  const broken: typeof vids = []

  for (const v of vids) {
    if (!v.cloudflare_uid) { broken.push(v); continue }

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/stream/${v.cloudflare_uid}`,
      { headers: { Authorization: `Bearer ${CF_TOKEN}` } }
    )
    const data = await res.json()
    if (!data.success) {
      broken.push(v)
    }
  }

  console.log(`정상: ${vids.length - broken.length}개, 깨진 영상: ${broken.length}개\n`)

  if (broken.length > 0) {
    console.log('=== 깨진 영상 목록 ===')
    for (const v of broken) {
      const sig = sigMap.get(v.signature_id)
      const memberName = memberMap.get(v.member_id) || '?'
      console.log(`  ID:${v.id} | sig${sig?.sig_number || '?'} "${sig?.title || '?'}" | ${memberName} | uid:${v.cloudflare_uid?.substring(0, 12) || '없음'}... | ${v.created_at}`)
    }
  }
}

main().catch(console.error)
