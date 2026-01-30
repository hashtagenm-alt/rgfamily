/**
 * 조직 멤버 목록 확인 스크립트
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://titqtnobfapyjvairgqy.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpdHF0bm9iZmFweWp2YWlyZ3F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc5NDQyNSwiZXhwIjoyMDg0MzcwNDI1fQ.M6mlPiqgRruYCd4jXBcIOsYIhtqgvJmGmzg6l3KakwU'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
})

async function main() {
  const { data, error } = await supabase
    .from('organization')
    .select('id, name, role, unit')
    .order('unit')
    .order('name')

  if (error) {
    console.log('오류:', error.message)
    return
  }

  console.log('📊 현재 등록된 멤버 목록:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  data?.forEach((m, i) => {
    console.log(`${i + 1}. [${m.unit}] ${m.name} - ${m.role}`)
  })
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`총 ${data?.length}명`)
}

main().catch(console.error)
