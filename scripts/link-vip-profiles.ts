/**
 * VIP 프로필 연결 스크립트
 * 새로 생성된 auth users와 기존 profiles 연결
 */

import { getServiceClient } from './lib/supabase'

const supabase = getServiceClient()

async function linkProfiles() {
  console.log('🔗 프로필 연결 수정 중...\n')

  // 새로 생성된 auth users 조회 (@rgfamily.kr 이메일)
  const { data: authData } = await supabase.auth.admin.listUsers()
  const newUsers = (authData?.users || []).filter(u =>
    u.email && u.email.endsWith('@rgfamily.kr') && u.user_metadata?.nickname
  )

  console.log(`새로 생성된 계정: ${newUsers.length}개\n`)

  let updated = 0
  let created = 0
  let errors = 0

  for (const user of newUsers) {
    const nickname = user.user_metadata.nickname as string
    const email = user.email as string
    const userId = user.id

    // 기존 프로필 찾기
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, nickname')
      .eq('nickname', nickname)
      .single()

    if (existingProfile) {
      // email만 업데이트 (id는 변경하지 않음)
      const { error } = await supabase
        .from('profiles')
        .update({ email: email, role: 'vip' })
        .eq('nickname', nickname)

      if (error) {
        console.log(`❌ [${nickname}] 업데이트 실패: ${error.message}`)
        errors++
      } else {
        console.log(`✅ [${nickname}] 이메일 업데이트: ${email}`)
        updated++
      }
    } else {
      // 새 프로필 생성
      const { error } = await supabase
        .from('profiles')
        .insert({ id: userId, nickname: nickname, email: email, role: 'vip' })

      if (error) {
        console.log(`❌ [${nickname}] 생성 실패: ${error.message}`)
        errors++
      } else {
        console.log(`📝 [${nickname}] 새 프로필 생성`)
        created++
      }
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📊 결과: 업데이트 ${updated}개, 새로 생성 ${created}개, 오류 ${errors}개`)
}

linkProfiles().catch(console.error)
