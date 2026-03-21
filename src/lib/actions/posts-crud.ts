'use server'

import { authAction, publicAction, type ActionResult } from './index'
import { checkOwnerOrModeratorPermission, throwPermissionError } from './permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { InsertTables, UpdateTables, Post } from '@/types/database'
import { logger } from '@/lib/utils/logger'

type PostInsert = InsertTables<'posts'>
type PostUpdate = UpdateTables<'posts'>

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

    // Service Role 클라이언트 사용 (RLS 우회)
    const serviceClient = createServiceRoleClient()
    const { error } = await serviceClient
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
      const trimmedQuery = searchQuery.trim().slice(0, 100)

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

    // 조회수 원자적 증가 (Race Condition 방지)
    if (data) {
      try { await supabase.rpc('increment_post_view_count', { p_post_id: id }) } catch (e) { logger.debug('RPC 카운터 증가 실패', { context: { error: e } }) }
    }

    return data
  })
}

/**
 * 게시글 상세 조회 - 프로필 조인 포함 (공개)
 * 조회수 증가 포함
 */
export async function getPostDetail(
  postId: number
): Promise<ActionResult<{
  id: number
  title: string
  content: string
  authorId: string
  authorNickname: string
  authorAvatar: string | null
  viewCount: number
  likeCount: number
  createdAt: string
  isAnonymous: boolean
} | null>> {
  return publicAction(async (supabase) => {
    const { data: postData, error } = await supabase
      .from('posts')
      .select('*, profiles!author_id(id, nickname, avatar_url)')
      .eq('id', postId)
      .single()

    if (error || !postData) return null

    // 조회수 원자적 증가 (Race Condition 방지)
    try { await supabase.rpc('increment_post_view_count', { p_post_id: postId }) } catch (e) { logger.debug('RPC 카운터 증가 실패', { context: { error: e } }) }

    const profile = postData.profiles as { id?: string; nickname?: string; avatar_url?: string } | null

    return {
      id: postData.id,
      title: postData.title,
      content: postData.content || '',
      authorId: postData.author_id,
      authorNickname: profile?.nickname || '알 수 없음',
      authorAvatar: profile?.avatar_url || null,
      viewCount: (postData.view_count || 0) + 1,
      likeCount: postData.like_count || 0,
      createdAt: postData.created_at,
      isAnonymous: Boolean(postData.is_anonymous),
    }
  })
}

/**
 * 게시글 복수 삭제 (관리자 또는 작성자)
 */
export async function deleteMultiplePosts(
  ids: number[]
): Promise<ActionResult<{ deleted: number; failed: number }>> {
  return authAction(async (supabase, userId) => {
    // 사용자 권한 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    const isModerator = profile && ['admin', 'superadmin', 'moderator'].includes(profile.role)

    // Service Role 클라이언트 생성 (RLS 우회)
    const serviceClient = createServiceRoleClient()

    // N+1 방지: 대상 게시글을 한번에 조회
    const { data: posts, error: fetchError } = await supabase
      .from('posts')
      .select('id, author_id')
      .in('id', ids)

    if (fetchError) throw new Error(fetchError.message)

    const postMap = new Map(
      (posts || []).map(p => [p.id, p])
    )

    // 권한 체크: 작성자이거나 관리자인 게시글만 삭제 허용
    const allowedIds: number[] = []
    let failed = 0

    for (const id of ids) {
      const post = postMap.get(id)
      if (!post) {
        failed++
        continue
      }
      if (post.author_id !== userId && !isModerator) {
        failed++
        continue
      }
      allowedIds.push(id)
    }

    // 허용된 게시글을 한번에 soft delete
    let deleted = 0
    if (allowedIds.length > 0) {
      const { error } = await serviceClient
        .from('posts')
        .update({ is_deleted: true })
        .in('id', allowedIds)

      if (error) {
        failed += allowedIds.length
      } else {
        deleted = allowedIds.length
      }
    }

    return { deleted, failed }
  }, ['/community/free', '/community/vip'])
}
