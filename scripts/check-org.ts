import { getServiceClient } from './lib/supabase'

const supabase = getServiceClient()

async function main() {
  const { data } = await supabase.from('organization').select('*').order('id')
  console.log('전체 organization 테이블:')
  data?.forEach((m) => {
    const status = m.is_active ? '✅' : '❌'
    console.log(`${status} ID:${m.id} | ${m.name} | ${m.unit} | ${m.role}`)
  })

  // ID 시퀀스 확인을 위해 마지막 ID 확인
  const maxId = Math.max(...(data?.map((d) => d.id) || [0]))
  console.log(`\n최대 ID: ${maxId}`)
}

main()
