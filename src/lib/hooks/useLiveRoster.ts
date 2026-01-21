'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSupabaseContext } from '@/lib/context'
import { USE_MOCK_DATA } from '@/lib/config'
import { mockOrganization, mockLiveStatus } from '@/lib/mock'
import type { JoinedProfile } from '@/types/common'
import type { OrgMember } from '@/types/organization'
import type { LiveStatus } from '@/types/database'

export interface LiveStatusEntry {
  memberId: number
  platform: LiveStatus['platform']
  streamUrl: string
  thumbnailUrl: string | null
  isLive: boolean
  viewerCount: number
  lastChecked: string
}

interface UseLiveRosterOptions {
  realtime?: boolean
}

interface UseLiveRosterReturn {
  members: OrgMember[]
  liveStatusByMemberId: Record<number, LiveStatusEntry[]>
  isLoading: boolean
  refetch: () => Promise<void>
}

function buildLiveStatusMap(entries: LiveStatusEntry[]): Record<number, LiveStatusEntry[]> {
  return entries.reduce<Record<number, LiveStatusEntry[]>>((acc, entry) => {
    if (!acc[entry.memberId]) acc[entry.memberId] = []
    acc[entry.memberId].push(entry)
    return acc
  }, {})
}

export function useLiveRoster(options: UseLiveRosterOptions = {}): UseLiveRosterReturn {
  const { realtime = true } = options
  const supabase = useSupabaseContext()
  const [members, setMembers] = useState<OrgMember[]>([])
  const [liveStatusByMemberId, setLiveStatusByMemberId] = useState<Record<number, LiveStatusEntry[]>>({})
  const [isLoading, setIsLoading] = useState(true)

  const fetchRoster = useCallback(async () => {
    setIsLoading(true)

    if (USE_MOCK_DATA) {
      const mockStatusEntries: LiveStatusEntry[] = mockLiveStatus.map((status) => ({
        memberId: status.member_id,
        platform: status.platform,
        streamUrl: status.stream_url,
        thumbnailUrl: status.thumbnail_url,
        isLive: status.is_live,
        viewerCount: status.viewer_count,
        lastChecked: status.last_checked,
      }))
      const liveMap = buildLiveStatusMap(mockStatusEntries)
      const mappedMembers: OrgMember[] = mockOrganization.map((member) => {
        const liveEntries = liveMap[member.id] || []
        const isLive = liveEntries.some((entry) => entry.isLive)
        return {
          id: member.id,
          name: member.name,
          role: member.role,
          unit: member.unit,
          position_order: member.position_order,
          parent_id: member.parent_id,
          image_url: member.image_url,
          social_links: (member.social_links || undefined) as OrgMember['social_links'],
          profile_info: (member.profile_info || undefined) as OrgMember['profile_info'],
          is_live: isLive,
        }
      })

      setMembers(mappedMembers)
      setLiveStatusByMemberId(liveMap)
      setIsLoading(false)
      return
    }

    // 단일 쿼리로 organization + profiles + live_status 조인
    const { data: orgData, error: orgError } = await supabase
      .from('organization')
      .select(`
        id, name, role, unit, position_order, parent_id, image_url, social_links, profile_info, is_live,
        profiles(nickname, avatar_url),
        live_status(member_id, platform, stream_url, thumbnail_url, is_live, viewer_count, last_checked)
      `)
      .eq('is_active', true)
      .order('position_order')

    if (orgError) {
      console.error('조직도 데이터 로드 실패:', orgError)
      setIsLoading(false)
      return
    }

    // 조인된 데이터에서 live_status 추출
    const liveEntries: LiveStatusEntry[] = []
    ;(orgData || []).forEach((member) => {
      const liveStatuses = member.live_status as Array<{
        member_id: number
        platform: LiveStatus['platform']
        stream_url: string
        thumbnail_url: string | null
        is_live: boolean
        viewer_count: number
        last_checked: string
      }> | null

      if (liveStatuses) {
        liveStatuses.forEach((entry) => {
          liveEntries.push({
            memberId: entry.member_id,
            platform: entry.platform,
            streamUrl: entry.stream_url,
            thumbnailUrl: entry.thumbnail_url,
            isLive: entry.is_live,
            viewerCount: entry.viewer_count,
            lastChecked: entry.last_checked,
          })
        })
      }
    })

    const liveMap = buildLiveStatusMap(liveEntries)
    const mappedMembers: OrgMember[] = (orgData || []).map((member) => {
      const profile = member.profiles as JoinedProfile | null
      const liveEntriesForMember = liveMap[member.id] || []
      // live_status 테이블에서만 라이브 상태를 가져옴 (organization.is_live 폴백 제거)
      const isLive = liveEntriesForMember.some((entry) => entry.isLive)

      return {
        id: member.id,
        name: profile?.nickname || member.name,
        role: member.role,
        unit: member.unit,
        position_order: member.position_order,
        parent_id: member.parent_id,
        image_url: profile?.avatar_url || member.image_url,
        social_links: (member.social_links || undefined) as OrgMember['social_links'],
        profile_info: (member.profile_info || undefined) as OrgMember['profile_info'],
        is_live: isLive,
      }
    })

    setMembers(mappedMembers)
    setLiveStatusByMemberId(liveMap)
    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchRoster()

    if (USE_MOCK_DATA || !realtime) return

    // Realtime: 변경된 레코드만 선택적 업데이트
    const channel = supabase
      .channel('live_status_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_status' }, (payload) => {
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          const newRecord = payload.new as {
            member_id: number
            platform: LiveStatus['platform']
            stream_url: string
            thumbnail_url: string | null
            is_live: boolean
            viewer_count: number
            last_checked: string
          }

          // 해당 멤버의 라이브 상태만 업데이트
          setLiveStatusByMemberId((prev) => {
            const updated = { ...prev }
            const entry: LiveStatusEntry = {
              memberId: newRecord.member_id,
              platform: newRecord.platform,
              streamUrl: newRecord.stream_url,
              thumbnailUrl: newRecord.thumbnail_url,
              isLive: newRecord.is_live,
              viewerCount: newRecord.viewer_count,
              lastChecked: newRecord.last_checked,
            }

            if (!updated[newRecord.member_id]) {
              updated[newRecord.member_id] = [entry]
            } else {
              const idx = updated[newRecord.member_id].findIndex(
                (e) => e.platform === newRecord.platform
              )
              if (idx >= 0) {
                updated[newRecord.member_id][idx] = entry
              } else {
                updated[newRecord.member_id].push(entry)
              }
            }
            return updated
          })

          // 멤버 is_live 상태 업데이트
          setMembers((prev) =>
            prev.map((m) => {
              if (m.id === newRecord.member_id) {
                return { ...m, is_live: newRecord.is_live }
              }
              return m
            })
          )
        } else if (payload.eventType === 'DELETE') {
          // 전체 재조회 (드문 경우)
          fetchRoster()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchRoster, realtime])

  return { members, liveStatusByMemberId, isLoading, refetch: fetchRoster }
}
