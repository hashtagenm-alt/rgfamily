/**
 * 남은 중복 프로필 정리 - posts 참조 수정 후 삭제
 */

import { getServiceClient } from './lib/supabase'
const supabase = getServiceClient()

async function main() {
  // 삭제 대상 -> 유지할 프로필 매핑
  const migrations: Record<string, string> = {
    '50b7e01c-a3d7-4af5-9300-ffdb0b278bdc': '62795156-29ae-4e1b-a66d-838d313d35db', // 가애
    '45544464-3a6e-42dc-8423-4d991ac5f195': '33444c33-160f-43fa-be10-9ff62a372e84', // 가윤이꼬❤️마음⭐
    '2e273e30-9d7a-4362-bdc7-72c1ce76195b': '72f8e952-8922-4310-8f19-db81f3117ab5', // 김고양이
  }

  for (const [deleteId, keepId] of Object.entries(migrations)) {
    console.log(`\n처리 중: ${deleteId.slice(0, 8)}...`)

    // posts author_id 업데이트
    const { data: posts } = await supabase
      .from('posts')
      .select('id, title')
      .eq('author_id', deleteId)

    if (posts && posts.length > 0) {
      console.log(`  posts ${posts.length}개 발견`)

      const { error: updateError } = await supabase
        .from('posts')
        .update({ author_id: keepId })
        .eq('author_id', deleteId)

      if (updateError) {
        console.log(`  ❌ posts 업데이트 실패: ${updateError.message}`)
        continue
      }
      console.log(`  ✅ posts author_id 변경 완료`)
    }

    // comments author_id 업데이트
    const { data: comments } = await supabase
      .from('comments')
      .select('id')
      .eq('author_id', deleteId)

    if (comments && comments.length > 0) {
      console.log(`  comments ${comments.length}개 발견`)

      const { error: updateError } = await supabase
        .from('comments')
        .update({ author_id: keepId })
        .eq('author_id', deleteId)

      if (updateError) {
        console.log(`  ❌ comments 업데이트 실패: ${updateError.message}`)
        continue
      }
      console.log(`  ✅ comments author_id 변경 완료`)
    }

    // 프로필 삭제
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', deleteId)

    if (deleteError) {
      console.log(`  ❌ 프로필 삭제 실패: ${deleteError.message}`)
    } else {
      console.log(`  ✅ 프로필 삭제 완료`)
    }
  }

  console.log('\n완료!')
}

main().catch(console.error)
