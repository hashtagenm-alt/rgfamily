'use server'

import { adminAction, authAction, publicAction, type ActionResult } from './index'
import { checkOwnerOrModeratorPermission, throwPermissionError } from './permissions'
import type { InsertTables, UpdateTables, Post, Comment } from '@/types/database'

type PostInsert = InsertTables<'posts'>
type PostUpdate = UpdateTables<'posts'>
type CommentInsert = InsertTables<'comments'>
type CommentUpdate = UpdateTables<'comments'>

// ==================== Posts ====================

/**
 * 게시글 생성 (인증 필요)
 */
export async function createPost(
  data: Omit<PostInsert, 'author_id'>
): Promise<ActionResult<Post>> {
  return authAction(async (supabase, userId) => {
    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        ...data,
        author_id: userId
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return post
  }, ['/community/free', '/community/vip'])
}

/**
 * 게시글 수정 (작성자 또는 Admin)
 */
export async function updatePost(
  id: number,
  data: PostUpdate
): Promise<ActionResult<Post>> {
  return authAction(async (supabase, userId) => {
    // 작성자 확인
    const { data: existingPost, error: fetchError } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', id)
      .single()

    if (fetchError) throw new Error(fetchError.message)

    // 작성자 또는 Moderator 권한 확인
    const permission = await checkOwnerOrModeratorPermission(supabase, userId, existingPost.author_id)
    if (!permission.hasPermission) throwPermissionError('수정')

    const { data: post, error } = await supabase
      .from('posts')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return post
  }, ['/community/free', '/community/vip'])
}

/**
 * 게시글 삭제 (작성자 또는 Admin)
 */
export async function deletePost(
  id: number
): Promise<ActionResult<null>> {
  return authAction(async (supabase, userId) => {
    // Soft delete
    const { data: existingPost, error: fetchError } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', id)
      .single()

    if (fetchError) throw new Error(fetchError.message)

    // 작성자 또는 Moderator 권한 확인
    const permission = await checkOwnerOrModeratorPermission(supabase, userId, existingPost.author_id)
    if (!permission.hasPermission) throwPermissionError('삭제')

    const { error } = await supabase
      .from('posts')
      .update({ is_deleted: true })
      .eq('id', id)

    if (error) throw new Error(error.message)
    return null
  }, ['/community/free', '/community/vip'])
}

/**
 * 게시글 목록 조회 (공개) - 검색 및 페이지네이션 지원
 */
export async function getPosts(options: {
  boardType: 'free' | 'vip'
  page?: number
  limit?: number
  searchQuery?: string
  searchType?: 'all' | 'title' | 'author'
}): Promise<ActionResult<{ data: (Post & { author_nickname?: string })[]; count: number }>> {
  return publicAction(async (supabase) => {
    const { boardType, page = 1, limit = 20, searchQuery, searchType = 'all' } = options
    const from = (page - 1) * limit
    const to = from + limit - 1

    // 기본 쿼리
    let query = supabase
      .from('posts')
      .select('*, profiles!author_id(nickname)', { count: 'exact' })
      .eq('board_type', boardType)
      .eq('is_deleted', false)

    // 검색 필터 적용
    if (searchQuery && searchQuery.trim()) {
      const trimmedQuery = searchQuery.trim()

      if (searchType === 'title') {
        query = query.ilike('title', `%${trimmedQuery}%`)
      } else if (searchType === 'author') {
        // author 검색은 profiles 조인 후 nickname으로 검색
        // Supabase에서 조인된 테이블 필터링은 제한적이므로
        // 먼저 닉네임으로 프로필 ID를 조회 후 필터링
        const { data: matchingProfiles } = await supabase
          .from('profiles')
          .select('id')
          .ilike('nickname', `%${trimmedQuery}%`)

        if (matchingProfiles && matchingProfiles.length > 0) {
          const authorIds = matchingProfiles.map(p => p.id)
          query = query.in('author_id', authorIds)
        } else {
          // 매칭되는 작성자 없으면 빈 결과 반환
          return { data: [], count: 0 }
        }
      } else {
        // 'all': 제목 또는 작성자로 검색
        // 먼저 제목으로 검색
        const { data: matchingProfiles } = await supabase
          .from('profiles')
          .select('id')
          .ilike('nickname', `%${trimmedQuery}%`)

        if (matchingProfiles && matchingProfiles.length > 0) {
          const authorIds = matchingProfiles.map(p => p.id)
          query = query.or(`title.ilike.%${trimmedQuery}%,author_id.in.(${authorIds.join(',')})`)
        } else {
          query = query.ilike('title', `%${trimmedQuery}%`)
        }
      }
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw new Error(error.message)

    // profiles 정보 포함하여 반환
    const postsWithAuthor = (data || []).map(post => {
      const profile = post.profiles as { nickname?: string } | null
      return {
        ...post,
        author_nickname: profile?.nickname || '알 수 없음',
        profiles: undefined // 중복 데이터 제거
      }
    })

    return { data: postsWithAuthor, count: count || 0 }
  })
}

/**
 * 게시글 상세 조회 (공개)
 */
export async function getPostById(
  id: number
): Promise<ActionResult<Post | null>> {
  return publicAction(async (supabase) => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single()

    if (error) throw new Error(error.message)

    // 조회수 증가
    if (data) {
      try {
        await supabase
          .from('posts')
          .update({ view_count: (data.view_count || 0) + 1 })
          .eq('id', id)
      } catch {
        // 무시
      }
    }

    return data
  })
}

// ==================== Comments ====================

/**
 * 댓글 생성 (인증 필요)
 */
export async function createComment(
  data: Omit<CommentInsert, 'author_id'>
): Promise<ActionResult<Comment>> {
  return authAction(async (supabase, userId) => {
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        ...data,
        author_id: userId
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    // 댓글 수 증가
    const { data: post } = await supabase
      .from('posts')
      .select('comment_count')
      .eq('id', data.post_id)
      .single()

    if (post) {
      try {
        await supabase
          .from('posts')
          .update({ comment_count: (post.comment_count || 0) + 1 })
          .eq('id', data.post_id)
      } catch {
        // 무시
      }
    }

    return comment
  })
}

/**
 * 댓글 수정 (작성자 또는 Admin)
 */
export async function updateComment(
  id: number,
  data: CommentUpdate
): Promise<ActionResult<Comment>> {
  return authAction(async (supabase, userId) => {
    const { data: existingComment, error: fetchError } = await supabase
      .from('comments')
      .select('author_id')
      .eq('id', id)
      .single()

    if (fetchError) throw new Error(fetchError.message)

    // 작성자 또는 Moderator 권한 확인
    const permission = await checkOwnerOrModeratorPermission(supabase, userId, existingComment.author_id)
    if (!permission.hasPermission) throwPermissionError('수정')

    const { data: comment, error } = await supabase
      .from('comments')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return comment
  })
}

/**
 * 댓글 삭제 (작성자 또는 Admin)
 */
export async function deleteComment(
  id: number
): Promise<ActionResult<null>> {
  return authAction(async (supabase, userId) => {
    const { data: existingComment, error: fetchError } = await supabase
      .from('comments')
      .select('author_id, post_id')
      .eq('id', id)
      .single()

    if (fetchError) throw new Error(fetchError.message)

    // 작성자 또는 Moderator 권한 확인
    const permission = await checkOwnerOrModeratorPermission(supabase, userId, existingComment.author_id)
    if (!permission.hasPermission) throwPermissionError('삭제')

    // Soft delete
    const { error } = await supabase
      .from('comments')
      .update({ is_deleted: true })
      .eq('id', id)

    if (error) throw new Error(error.message)
    return null
  })
}

/**
 * 게시글의 댓글 목록 조회 (공개)
 */
export async function getCommentsByPostId(
  postId: number
): Promise<ActionResult<Comment[]>> {
  return publicAction(async (supabase) => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return data || []
  })
}

// ==================== Admin Only ====================

/**
 * 게시글 강제 삭제 (Admin - Hard Delete)
 */
export async function hardDeletePost(
  id: number
): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    return null
  }, ['/admin/posts', '/community/free', '/community/vip'])
}

/**
 * 게시글 복구 (Admin)
 */
export async function restorePost(
  id: number
): Promise<ActionResult<Post>> {
  return adminAction(async (supabase) => {
    const { data: post, error } = await supabase
      .from('posts')
      .update({ is_deleted: false })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return post
  }, ['/admin/posts', '/community/free', '/community/vip'])
}
