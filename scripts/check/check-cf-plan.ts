import { validateEnv } from '../lib/supabase'
validateEnv() // .env.local 로드

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

async function main() {
  const r1 = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream/storage-usage`, {
    headers: { Authorization: `Bearer ${API_TOKEN}` }
  })
  console.log('=== Storage Usage ===')
  console.log(JSON.stringify(await r1.json(), null, 2))

  const r2 = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/subscriptions`, {
    headers: { Authorization: `Bearer ${API_TOKEN}` }
  })
  const subs = await r2.json() as any
  console.log('\n=== Subscriptions ===')
  if (subs.result) {
    for (const s of subs.result) {
      console.log(JSON.stringify({
        rate_plan: s.rate_plan,
        price: s.price,
        currency: s.currency,
        frequency: s.frequency,
        component_values: s.component_values
      }, null, 2))
    }
  } else {
    console.log(JSON.stringify(subs, null, 2))
  }
}

main()
