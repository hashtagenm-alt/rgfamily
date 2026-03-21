import { getServiceClient } from '../lib/supabase'

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || ''
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN || ''

const supabase = getServiceClient()

async function main() {
  const { data } = await supabase
    .from('media_content')
    .select('id, title, cloudflare_uid')
    .eq('content_type', 'shorts')
    .order('id')

  console.log('=== Cloudflare Stream 재생 상태 (' + data!.length + '개) ===\n')

  const failed: { id: number; title: string; state: string; step: string; err: string }[] = []

  for (const r of data!) {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/${r.cloudflare_uid}`,
      { headers: { Authorization: `Bearer ${CF_TOKEN}` } }
    )
    const json = await res.json() as any
    const v = json.result || {}
    const ready = v.readyToStream ? '✅' : '❌'
    const state = v.status?.state || 'unknown'
    const dur = v.duration ? v.duration.toFixed(1) + 's' : '-'
    const w = v.input?.width || '-'
    const h = v.input?.height || '-'

    console.log(`  [${r.id}] ${r.title} | ${ready} state=${state} | ${w}x${h} | ${dur}`)

    if (!v.readyToStream) {
      failed.push({ id: r.id, title: r.title, state, step: v.status?.step || '-', err: v.status?.errReasonCode || '-' })
    }
  }

  if (failed.length > 0) {
    console.log('\n⚠️ 재생 불가: ' + failed.length + '개')
    failed.forEach(f => console.log(`  [${f.id}] ${f.title} → state=${f.state} step=${f.step} err=${f.err}`))
  } else {
    console.log('\n✅ 모든 영상 재생 가능')
  }
}

main().catch(console.error)
