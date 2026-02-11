import { getServiceClient } from './lib/supabase'

const supabase = getServiceClient()

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'a6b7376e04fbd77bb0f69b9fd0170b01'
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || 'KM9peHrWI896rTU1Rqx3zOZqm4p8ZoGTLB5rbnMq'

async function main() {
  const { data: shorts } = await supabase
    .from('media_content')
    .select('id, title, cloudflare_uid, video_url, duration')
    .eq('content_type', 'shorts')
    .order('id', { ascending: true })

  if (!shorts || shorts.length === 0) {
    console.log('No shorts found')
    return
  }

  console.log(`=== Shorts 코덱 분석 (${shorts.length}개) ===\n`)

  for (const s of shorts) {
    if (!s.cloudflare_uid) {
      console.log(`[${s.title}] - No cloudflare_uid`)
      continue
    }

    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${s.cloudflare_uid}`,
        { headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` } }
      )
      const json = await res.json()
      const r = json.result

      if (r) {
        console.log(`[${s.title}] uid: ${s.cloudflare_uid}`)
        console.log(`  status: ${r.status?.state || 'unknown'}`)
        console.log(`  input: ${JSON.stringify(r.input)}`)
        console.log(`  size: ${r.size ? (r.size / 1024 / 1024).toFixed(1) + 'MB' : 'N/A'}`)
        console.log(`  duration: ${r.duration}s`)
        console.log(`  created: ${r.created}`)
        console.log(`  playback: ${JSON.stringify(r.playback)}`)
        if (r.status?.errorReasonCode) {
          console.log(`  ERROR: ${r.status.errorReasonCode} - ${r.status.errorReasonText}`)
        }
        console.log('')
      } else {
        console.log(`[${s.title}] - API response error: ${JSON.stringify(json.errors)}`)
      }
    } catch (e: any) {
      console.error(`Error fetching ${s.cloudflare_uid}:`, e.message)
    }
  }

  // VOD도 분석
  const { data: vods } = await supabase
    .from('media_content')
    .select('id, title, cloudflare_uid, duration, part_number')
    .eq('content_type', 'vod')
    .order('id', { ascending: true })

  if (vods && vods.length > 0) {
    console.log(`\n=== VOD 코덱 분석 (${vods.length}개) ===\n`)

    for (const v of vods) {
      if (!v.cloudflare_uid) continue

      try {
        const res = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${v.cloudflare_uid}`,
          { headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` } }
        )
        const json = await res.json()
        const r = json.result

        if (r) {
          console.log(`[${v.title}] uid: ${v.cloudflare_uid}`)
          console.log(`  status: ${r.status?.state || 'unknown'}`)
          console.log(`  input: ${JSON.stringify(r.input)}`)
          console.log(`  size: ${r.size ? (r.size / 1024 / 1024).toFixed(1) + 'MB' : 'N/A'}`)
          console.log(`  duration: ${r.duration}s`)
          if (r.status?.errorReasonCode) {
            console.log(`  ERROR: ${r.status.errorReasonCode} - ${r.status.errorReasonText}`)
          }
          console.log('')
        }
      } catch (e: any) {
        console.error(`Error fetching ${v.cloudflare_uid}:`, e.message)
      }
    }
  }
}

main().catch(console.error)
