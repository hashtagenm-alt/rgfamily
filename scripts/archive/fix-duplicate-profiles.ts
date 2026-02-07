/**
 * 중복 프로필 정리 스크립트
 *
 * 1. 기존 계정의 vip_rewards를 새 계정으로 이관
 * 2. 기존 계정 삭제
 *
 * 사용법:
 *   npx tsx scripts/fix-duplicate-profiles.ts --dry-run  (미리보기)
 *   npx tsx scripts/fix-duplicate-profiles.ts            (실행)
 */

import { getServiceClient } from './lib/supabase'
const supabase = getServiceClient()

// 11명 VIP 닉네임
const TARGET_NICKNAMES = [
  '르큐리',
  '미키™',
  '채은❤️여신',
  '에이맨♣️',
  '손밍매니아',
  '한세아내꺼♡호랭이',
  '사랑해씌발™',
  '[RG]미드굿♣️가애',
  '[J]젖문가',
  '[RG]✨린아의발굴™',
  '농심육개장라면'
]

// 새 계정 이메일 매핑 (CSV 기준)
const NEW_EMAIL_MAP: Record<string, string> = {
  '르큐리': 'srvllo@rgfamily.kr',
  '미키™': 'mickey94@rgfamily.kr',
  '채은❤️여신': 'chaeeun01@rgfamily.kr',
  '에이맨♣️': 'superontime111@rgfamily.kr',
  '손밍매니아': 'luka831@rgfamily.kr',
  '한세아내꺼♡호랭이': 'yuricap85@rgfamily.kr',
  '사랑해씌발™': 'ejeh2472@rgfamily.kr',
  '[RG]미드굿♣️가애': 'thursdayday@rgfamily.kr',
  '[J]젖문가': 'amiral555@rgfamily.kr',
  '[RG]✨린아의발굴™': 'ksbjh77@rgfamily.kr',
  '농심육개장라면': 'busjae011@rgfamily.kr'
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔧 중복 프로필 정리')
  if (dryRun) console.log('⚠️  DRY-RUN 모드')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  let fixed = 0
  let errors = 0

  for (const nickname of TARGET_NICKNAMES) {
    const targetEmail = NEW_EMAIL_MAP[nickname]
    if (!targetEmail) {
      console.log(`⏭️ [${nickname}] 새 이메일 매핑 없음`)
      continue
    }

    console.log(`\n[${nickname}]`)

    // 해당 닉네임의 모든 프로필 조회
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nickname, email, avatar_url')
      .eq('nickname', nickname)

    if (!profiles || profiles.length === 0) {
      console.log('   ❌ 프로필 없음')
      errors++
      continue
    }

    // 새 프로필과 기존 프로필 구분
    const newProfile = profiles.find(p => p.email === targetEmail)
    const oldProfiles = profiles.filter(p => p.email !== targetEmail)

    if (!newProfile) {
      console.log(`   ❌ 새 프로필(${targetEmail}) 없음`)
      errors++
      continue
    }

    console.log(`   🆕 새 프로필: ${newProfile.id.substring(0, 8)}... (${newProfile.email})`)
    console.log(`   📦 기존 프로필: ${oldProfiles.length}개`)

    if (oldProfiles.length === 0) {
      console.log('   ✅ 이미 정리됨')
      continue
    }

    for (const oldProfile of oldProfiles) {
      console.log(`\n   기존 → ${oldProfile.id.substring(0, 8)}... (${oldProfile.email})`)

      // 1. vip_rewards 이관
      const { data: vipRewards } = await supabase
        .from('vip_rewards')
        .select('id')
        .eq('profile_id', oldProfile.id)

      if (vipRewards && vipRewards.length > 0) {
        console.log(`      vip_rewards ${vipRewards.length}개 이관`)
        if (!dryRun) {
          const { error } = await supabase
            .from('vip_rewards')
            .update({ profile_id: newProfile.id })
            .eq('profile_id', oldProfile.id)
          if (error) {
            console.log(`      ⚠️ vip_rewards 이관 실패: ${error.message}`)
          }
        }
      }

      // 2. vip_images (vip_rewards를 통해 이미 이관됨)

      // 3. vip_personal_messages 이관
      const { data: vipMessages } = await supabase
        .from('vip_personal_messages')
        .select('id')
        .eq('vip_profile_id', oldProfile.id)

      if (vipMessages && vipMessages.length > 0) {
        console.log(`      vip_personal_messages ${vipMessages.length}개 이관`)
        if (!dryRun) {
          await supabase
            .from('vip_personal_messages')
            .update({ vip_profile_id: newProfile.id })
            .eq('vip_profile_id', oldProfile.id)
          await supabase
            .from('vip_personal_messages')
            .update({ author_id: newProfile.id })
            .eq('author_id', oldProfile.id)
        }
      }

      // 4. total_donation_rankings 이관
      const { data: totalRankings } = await supabase
        .from('total_donation_rankings')
        .select('id')
        .eq('donor_id', oldProfile.id)

      if (totalRankings && totalRankings.length > 0) {
        console.log(`      total_donation_rankings ${totalRankings.length}개 이관`)
        if (!dryRun) {
          await supabase
            .from('total_donation_rankings')
            .update({ donor_id: newProfile.id })
            .eq('donor_id', oldProfile.id)
        }
      }

      // 5. season_donation_rankings 이관
      const { data: seasonRankings } = await supabase
        .from('season_donation_rankings')
        .select('id')
        .eq('donor_id', oldProfile.id)

      if (seasonRankings && seasonRankings.length > 0) {
        console.log(`      season_donation_rankings ${seasonRankings.length}개 이관`)
        if (!dryRun) {
          await supabase
            .from('season_donation_rankings')
            .update({ donor_id: newProfile.id })
            .eq('donor_id', oldProfile.id)
        }
      }

      // 6. posts 이관
      const { data: posts } = await supabase
        .from('posts')
        .select('id')
        .eq('author_id', oldProfile.id)

      if (posts && posts.length > 0) {
        console.log(`      posts ${posts.length}개 이관`)
        if (!dryRun) {
          await supabase
            .from('posts')
            .update({ author_id: newProfile.id })
            .eq('author_id', oldProfile.id)
        }
      }

      // 7. comments 이관
      const { data: comments } = await supabase
        .from('comments')
        .select('id')
        .eq('author_id', oldProfile.id)

      if (comments && comments.length > 0) {
        console.log(`      comments ${comments.length}개 이관`)
        if (!dryRun) {
          await supabase
            .from('comments')
            .update({ author_id: newProfile.id })
            .eq('author_id', oldProfile.id)
        }
      }

      // 8. avatar_url 복사 (새 프로필에 없으면)
      if (!newProfile.avatar_url && oldProfile.avatar_url) {
        console.log(`      avatar_url 복사`)
        if (!dryRun) {
          await supabase
            .from('profiles')
            .update({ avatar_url: oldProfile.avatar_url })
            .eq('id', newProfile.id)
        }
      }

      // 9. 기존 프로필 삭제
      console.log(`      프로필 삭제`)
      if (!dryRun) {
        const { error: deleteError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', oldProfile.id)

        if (deleteError) {
          console.log(`      ⚠️ 프로필 삭제 실패: ${deleteError.message}`)
        }
      }

      // 10. auth user 삭제
      console.log(`      auth user 삭제`)
      if (!dryRun) {
        const { error: authError } = await supabase.auth.admin.deleteUser(oldProfile.id)
        if (authError) {
          console.log(`      ⚠️ auth user 삭제 실패: ${authError.message}`)
        }
      }
    }

    fixed++
    console.log(`   ✅ 정리 완료`)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📊 결과: ${fixed}명 정리, ${errors}명 오류`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (dryRun) {
    console.log('\n💡 실제 실행: npx tsx scripts/fix-duplicate-profiles.ts')
  }
}

main().catch(console.error)
