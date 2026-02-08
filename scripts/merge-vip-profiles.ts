/**
 * VIP 프로필 병합 스크립트
 *
 * 새 계정 유지하면서 기존 프로필의 데이터(avatar_url, vip_rewards 등) 보존
 */

import { getServiceClient } from './lib/supabase'

const supabase = getServiceClient()

interface ProfileData {
  id: string
  nickname: string
  email: string
  role: string
  avatar_url: string | null
  total_donation: number | null
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔄 VIP 프로필 병합 (데이터 보존)')
  if (dryRun) console.log('⚠️  DRY-RUN 모드')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 1. 모든 프로필 조회 (중복 닉네임 찾기)
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, nickname, email, role, avatar_url, total_donation')
    .order('nickname')

  // 닉네임별로 그룹화
  const profilesByNickname = new Map<string, ProfileData[]>()
  for (const p of allProfiles || []) {
    const existing = profilesByNickname.get(p.nickname) || []
    existing.push(p as ProfileData)
    profilesByNickname.set(p.nickname, existing)
  }

  // 중복된 닉네임만 필터
  const duplicates = [...profilesByNickname.entries()].filter(([, profiles]) => profiles.length > 1)

  console.log(`📋 중복 닉네임: ${duplicates.length}개\n`)

  let merged = 0
  let errors = 0

  for (const [nickname, profiles] of duplicates) {
    // 새 프로필 (member, @rgfamily.kr) 찾기
    const newProfile = profiles.find(p =>
      p.role === 'member' && p.email.endsWith('@rgfamily.kr') && !p.email.includes('@rgfamily.local')
    )

    // 기존 vip 프로필 찾기
    const oldProfile = profiles.find(p => p.role === 'vip')

    if (!newProfile || !oldProfile) {
      console.log(`⏭️  [${nickname}] 병합 대상 없음`)
      continue
    }

    console.log(`\n[${nickname}]`)
    console.log(`   기존: ${oldProfile.email} (${oldProfile.role})`)
    console.log(`   새로: ${newProfile.email} (${newProfile.role})`)

    // 보존할 데이터
    const preserveData = {
      avatar_url: oldProfile.avatar_url,
      total_donation: oldProfile.total_donation
    }

    if (preserveData.avatar_url) {
      console.log(`   🖼️  avatar_url 보존: ${preserveData.avatar_url.substring(0, 50)}...`)
    }

    // vip_rewards에서 기존 프로필 ID 사용 여부 확인
    const { data: vipRewards } = await supabase
      .from('vip_rewards')
      .select('id, profile_id')
      .eq('profile_id', oldProfile.id)

    if (vipRewards && vipRewards.length > 0) {
      console.log(`   🎁 vip_rewards ${vipRewards.length}개 발견`)
    }

    // total_donation_rankings에서 donor_id 확인
    const { data: rankings } = await supabase
      .from('total_donation_rankings')
      .select('id, donor_id, donor_name')
      .eq('donor_id', oldProfile.id)

    if (rankings && rankings.length > 0) {
      console.log(`   🏆 total_donation_rankings 연결됨`)
    }

    if (dryRun) {
      console.log(`   📝 병합 예정`)
      merged++
      continue
    }

    try {
      // 2. 새 프로필에 기존 데이터 복사 + role을 vip로 변경
      const { error: updateNewError } = await supabase
        .from('profiles')
        .update({
          role: 'vip',
          avatar_url: preserveData.avatar_url,
          total_donation: preserveData.total_donation
        })
        .eq('id', newProfile.id)

      if (updateNewError) {
        console.log(`   ❌ 새 프로필 업데이트 실패: ${updateNewError.message}`)
        errors++
        continue
      }

      // 3. vip_rewards의 user_id 업데이트
      if (vipRewards && vipRewards.length > 0) {
        const { error: vipError } = await supabase
          .from('vip_rewards')
          .update({ profile_id: newProfile.id })
          .eq('profile_id', oldProfile.id)

        if (vipError) {
          console.log(`   ⚠️  vip_rewards 업데이트 실패: ${vipError.message}`)
        } else {
          console.log(`   ✅ vip_rewards 연결 업데이트`)
        }
      }

      // 4. total_donation_rankings의 donor_id 업데이트
      if (rankings && rankings.length > 0) {
        const { error: rankError } = await supabase
          .from('total_donation_rankings')
          .update({ donor_id: newProfile.id })
          .eq('donor_id', oldProfile.id)

        if (rankError) {
          console.log(`   ⚠️  rankings donor_id 업데이트 실패: ${rankError.message}`)
        } else {
          console.log(`   ✅ rankings donor_id 업데이트`)
        }
      }

      // 5. season_donation_rankings의 donor_id 업데이트
      const { error: seasonRankError } = await supabase
        .from('season_donation_rankings')
        .update({ donor_id: newProfile.id })
        .eq('donor_id', oldProfile.id)

      if (!seasonRankError) {
        console.log(`   ✅ season_rankings donor_id 업데이트`)
      }

      // 6. posts의 author_id 업데이트 (게시판 글 보존)
      const { data: posts } = await supabase
        .from('posts')
        .select('id')
        .eq('author_id', oldProfile.id)

      if (posts && posts.length > 0) {
        const { error: postsError } = await supabase
          .from('posts')
          .update({ author_id: newProfile.id })
          .eq('author_id', oldProfile.id)

        if (!postsError) {
          console.log(`   ✅ posts ${posts.length}개 author_id 업데이트`)
        }
      }

      // 7. comments의 author_id 업데이트 (댓글 보존)
      const { data: comments } = await supabase
        .from('comments')
        .select('id')
        .eq('author_id', oldProfile.id)

      if (comments && comments.length > 0) {
        const { error: commentsError } = await supabase
          .from('comments')
          .update({ author_id: newProfile.id })
          .eq('author_id', oldProfile.id)

        if (!commentsError) {
          console.log(`   ✅ comments ${comments.length}개 author_id 업데이트`)
        }
      }

      // 8. vip_personal_messages의 vip_profile_id 업데이트 (VIP 개인 감사메시지 보존)
      const { data: vipMessages } = await supabase
        .from('vip_personal_messages')
        .select('id')
        .eq('vip_profile_id', oldProfile.id)

      if (vipMessages && vipMessages.length > 0) {
        const { error: vipMsgError } = await supabase
          .from('vip_personal_messages')
          .update({ vip_profile_id: newProfile.id })
          .eq('vip_profile_id', oldProfile.id)

        if (!vipMsgError) {
          console.log(`   ✅ vip_personal_messages ${vipMessages.length}개 업데이트`)
        }
      }

      // 9. vip_personal_messages의 author_id 업데이트 (작성자로서의 메시지)
      const { error: vipAuthorMsgError } = await supabase
        .from('vip_personal_messages')
        .update({ author_id: newProfile.id })
        .eq('author_id', oldProfile.id)

      if (!vipAuthorMsgError) {
        console.log(`   ✅ vip_personal_messages author_id 업데이트`)
      }

      // 10. 기존 프로필 삭제
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', oldProfile.id)

      if (deleteError) {
        console.log(`   ⚠️  기존 프로필 삭제 실패: ${deleteError.message}`)
      } else {
        console.log(`   🗑️  기존 프로필 삭제 완료`)
      }

      // 11. 기존 auth user 삭제
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(oldProfile.id)
      if (!authDeleteError) {
        console.log(`   🗑️  기존 auth user 삭제 완료`)
      }

      merged++
      console.log(`   ✅ 병합 완료`)

    } catch (err: any) {
      console.log(`   ❌ 오류: ${err.message}`)
      errors++
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📊 결과: 병합 ${merged}개, 오류 ${errors}개`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (dryRun) {
    console.log('\n💡 실제 병합하려면: npx tsx scripts/merge-vip-profiles.ts')
  }
}

main().catch(console.error)
