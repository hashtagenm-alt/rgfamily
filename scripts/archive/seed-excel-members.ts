/**
 * 엑셀부 멤버 시드 스크립트
 * 실행: npx tsx scripts/seed-excel-members.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface MemberData {
  name: string
  unit: 'excel' | 'crew'
  role: string
  position_order: number
  member_profile: {
    mbti?: string
    bloodType?: string
    height?: number
    weight?: number
    birthday?: string
  }
}

const excelMembers: MemberData[] = [
  {
    name: '한백설',
    unit: 'excel',
    role: 'MEMBER',
    position_order: 1,
    member_profile: {
      mbti: 'ISTP',
      bloodType: 'O',
      height: 168,
      weight: 46,
      birthday: '1997-11-26',
    },
  },
  {
    name: '해린',
    unit: 'excel',
    role: 'MEMBER',
    position_order: 2,
    member_profile: {
      mbti: 'ESFP',
      bloodType: 'B',
      height: 157,
      weight: 50,
      birthday: '2005-07-05',
    },
  },
  {
    name: '월아',
    unit: 'excel',
    role: 'MEMBER',
    position_order: 3,
    member_profile: {
      birthday: '04-02', // 연도 불명
    },
  },
  {
    name: '채은',
    unit: 'excel',
    role: 'MEMBER',
    position_order: 4,
    member_profile: {
      birthday: '2004-03-24',
    },
  },
  {
    name: '가윤',
    unit: 'excel',
    role: 'MEMBER',
    position_order: 5,
    member_profile: {
      birthday: '1996-01-03',
    },
  },
  {
    name: '설윤',
    unit: 'excel',
    role: 'MEMBER',
    position_order: 6,
    member_profile: {
      birthday: '2000-01-10',
    },
  },
  {
    name: '한세아',
    unit: 'excel',
    role: 'MEMBER',
    position_order: 7,
    member_profile: {
      birthday: '1992-12-14',
    },
  },
  {
    name: '청아',
    unit: 'excel',
    role: 'MEMBER',
    position_order: 8,
    member_profile: {
      birthday: '2004-01-03',
    },
  },
  {
    name: '손밍',
    unit: 'excel',
    role: 'MEMBER',
    position_order: 9,
    member_profile: {
      birthday: '1996-07-25',
    },
  },
  {
    name: '키키',
    unit: 'excel',
    role: 'MEMBER',
    position_order: 10,
    member_profile: {
      birthday: '1999-02-10',
    },
  },
  {
    name: '홍서하',
    unit: 'excel',
    role: 'MEMBER',
    position_order: 11,
    member_profile: {
      birthday: '2001-08-30',
    },
  },
  {
    name: '퀸로니',
    unit: 'excel',
    role: 'MEMBER',
    position_order: 12,
    member_profile: {
      birthday: '1991-09-30',
    },
  },
]

async function main() {
  console.log('🚀 엑셀부 멤버 데이터 시드 시작...\n')

  // 1. 먼저 organization 테이블에 member_profile 컬럼이 있는지 확인
  console.log('📋 기존 organization 데이터 확인...')
  const { data: existingData, error: checkError } = await supabase
    .from('organization')
    .select('id, name, unit')
    .eq('unit', 'excel')

  if (checkError) {
    console.error('❌ 테이블 확인 실패:', checkError.message)
    process.exit(1)
  }

  console.log(`   현재 엑셀부 멤버 수: ${existingData?.length || 0}명\n`)

  // 2. 각 멤버 데이터 upsert (이름 기준으로 업데이트 또는 신규 추가)
  for (const member of excelMembers) {
    // 이미 존재하는지 확인
    const existing = existingData?.find(
      (d) => d.name === member.name && d.unit === 'excel'
    )

    if (existing) {
      // 업데이트
      const { error } = await supabase
        .from('organization')
        .update({
          role: member.role,
          position_order: member.position_order,
          member_profile: member.member_profile,
        })
        .eq('id', existing.id)

      if (error) {
        console.error(`❌ ${member.name} 업데이트 실패:`, error.message)
      } else {
        console.log(`✅ ${member.name} 업데이트 완료`)
      }
    } else {
      // 신규 추가
      const { error } = await supabase.from('organization').insert({
        name: member.name,
        unit: member.unit,
        role: member.role,
        position_order: member.position_order,
        member_profile: member.member_profile,
        is_active: true,
        is_live: false,
      })

      if (error) {
        console.error(`❌ ${member.name} 추가 실패:`, error.message)
      } else {
        console.log(`✅ ${member.name} 추가 완료`)
      }
    }
  }

  // 3. 최종 결과 확인
  console.log('\n📊 최종 엑셀부 멤버 목록:')
  const { data: finalData } = await supabase
    .from('organization')
    .select('id, name, role, member_profile')
    .eq('unit', 'excel')
    .order('position_order')

  finalData?.forEach((m, i) => {
    const profile = m.member_profile as { birthday?: string; mbti?: string } | null
    console.log(
      `   ${i + 1}. ${m.name} (${m.role}) - ${profile?.birthday || '생일 미입력'} ${profile?.mbti || ''}`
    )
  })

  console.log('\n✨ 시드 완료!')
}

main().catch(console.error)
