/**
 * 라이브 상태 업데이트 API
 *
 * 외부 크롤러에서 호출하여 멤버들의 라이브 상태를 업데이트
 *
 * 사용법:
 * POST /api/live-status/update
 * Headers: { "x-api-key": "your-secret-key" }
 * Body: {
 *   "updates": [
 *     { "member_id": 1, "is_live": true },
 *     { "member_id": 2, "is_live": false }
 *   ]
 * }
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const API_SECRET = process.env.LIVE_STATUS_API_SECRET || process.env.LIVE_STATUS_SYNC_SECRET

interface LiveStatusUpdate {
  member_id: number
  is_live: boolean
  stream_title?: string
  viewer_count?: number
  thumbnail_url?: string
}

export async function POST(request: Request) {
  // API 키 검증 - 환경변수 미설정 시 에러 반환
  if (!API_SECRET) {
    return NextResponse.json(
      { error: 'API secret not configured. Set LIVE_STATUS_API_SECRET environment variable.' },
      { status: 500 }
    )
  }

  const provided = request.headers.get('x-api-key')
  if (!provided || provided !== API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
  }

  let body: { updates: LiveStatusUpdate[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { updates } = body
  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: 'updates array is required' }, { status: 400 })
  }

  const supabase = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY)
  const results: { member_id: number; success: boolean; error?: string }[] = []

  // 각 멤버의 라이브 상태 업데이트
  for (const update of updates) {
    const { member_id, is_live } = update

    if (typeof member_id !== 'number' || typeof is_live !== 'boolean') {
      results.push({ member_id, success: false, error: 'Invalid data format' })
      continue
    }

    // organization 테이블의 is_live 업데이트
    const { error } = await supabase.from('organization').update({ is_live }).eq('id', member_id)

    if (error) {
      results.push({ member_id, success: false, error: error.message })
    } else {
      results.push({ member_id, success: true })
    }
  }

  const successCount = results.filter((r) => r.success).length
  const failCount = results.filter((r) => !r.success).length

  return NextResponse.json({
    success: true,
    updated: successCount,
    failed: failCount,
    results,
    timestamp: new Date().toISOString(),
  })
}

// GET: 현재 라이브 상태 조회 (API 키 필수)
export async function GET(request: Request) {
  if (!API_SECRET) {
    return NextResponse.json({ error: 'API secret not configured' }, { status: 500 })
  }

  const provided = request.headers.get('x-api-key')
  if (!provided || provided !== API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
  }

  const supabase = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data, error } = await supabase
    .from('organization')
    .select('id, name, unit, is_live')
    .eq('is_active', true)
    .order('unit')
    .order('position_order')

  if (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const liveMembers = data?.filter((m) => m.is_live) || []

  return NextResponse.json({
    total: data?.length || 0,
    live_count: liveMembers.length,
    members: data,
    live_members: liveMembers,
    timestamp: new Date().toISOString(),
  })
}
