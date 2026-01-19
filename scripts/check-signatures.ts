import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing env')
  process.exit(1)
}

const supabase = createClient(url, key)

async function main() {
  const { data, error, count } = await supabase
    .from('signatures')
    .select('id, sig_number, title, thumbnail_url, unit', { count: 'exact' })
    .order('sig_number', { ascending: true })
    .limit(20)

  console.log('='.repeat(50))
  console.log('시그니처 테이블 확인')
  console.log('='.repeat(50))
  console.log('Total count:', count)
  console.log('Error:', error)
  console.log('')

  if (data && data.length > 0) {
    console.log('샘플 데이터 (처음 20개):')
    data.forEach((sig) => {
      const hasThumb = sig.thumbnail_url ? '✅' : '❌'
      console.log(`${hasThumb} #${sig.sig_number} | ${sig.title} | ${sig.unit}`)
    })
  } else {
    console.log('데이터 없음!')
  }
}

main()
