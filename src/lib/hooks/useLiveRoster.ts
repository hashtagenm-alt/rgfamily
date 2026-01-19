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

    const { data: orgData, error: orgError } = await supabase
      .from('organization')
      .select('id, name, role, unit, position_order, parent_id, image_url, social_links, profile_info, is_live, profiles(nickname, avatar_url)')
      .eq('is_active', true)
      .order('position_order')

    if (orgError) {
      console.error('조직도 데이터 로드 실패:', orgError)
      setIsLoading(false)
      return
    }

    const { data: liveData, error: liveError } = await supabase
      .from('live_status')
      .select('member_id, platform, stream_url, thumbnail_url, is_live, viewer_count, last_checked')

    if (liveError) {
      console.error('라이브 상태 로드 실패:', liveError)
      setIsLoading(false)
      return
    }

    const liveEntries: LiveStatusEntry[] = (liveData || []).map((entry) => ({
      memberId: entry.member_id,
      platform: entry.platform,
      streamUrl: entry.stream_url,
      thumbnailUrl: entry.thumbnail_url,
      isLive: entry.is_live,
      viewerCount: entry.viewer_count,
      lastChecked: entry.last_checked,
    }))

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

    const channel = supabase
      .channel('live_status_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_status' }, () => {
        fetchRoster()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchRoster, realtime])

  return { members, liveStatusByMemberId, isLoading, refetch: fetchRoster }
}
