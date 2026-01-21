'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabaseContext } from '@/lib/context'
import type { JoinedProfile, JoinedSeason } from '@/types/common'

export interface DonationItem {
  id: number
  donorId: string | null
  donorName: string
  amount: number
  message: string
  seasonId: number
  seasonName: string
  createdAt: string
}

export interface SeasonItem {
  id: number
  name: string
}

export interface ProfileItem {
  id: string
  nickname: string
}

export type DuplicateHandling = 'skip' | 'overwrite' | 'accumulate'

export interface UploadCsvOptions {
  duplicateHandling?: DuplicateHandling
  autoCreateProfiles?: boolean // 프로필 자동 생성 여부
  episodeId?: number // 에피소드 ID (직급전 연결용)
}

export interface UploadCsvResult {
  success: number
  errors: string[]
  skipped?: number
  updated?: number
  profilesCreated?: number // 자동 생성된 프로필 수
}

export interface UseDonationsDataReturn {
  donations: DonationItem[]
  seasons: SeasonItem[]
  profiles: ProfileItem[]
  isLoading: boolean
  refetch: () => Promise<void>
  addDonation: (donation: Partial<DonationItem>) => Promise<boolean>
  updateDonation: (donation: Partial<DonationItem>) => Promise<boolean>
  deleteDonation: (id: number) => Promise<boolean>
  uploadCsv: (data: { [key: string]: string }[], options?: UploadCsvOptions) => Promise<UploadCsvResult>
}

export function useDonationsData(): UseDonationsDataReturn {
  const supabase = useSupabaseContext()
  const [donations, setDonations] = useState<DonationItem[]>([])
  const [seasons, setSeasons] = useState<SeasonItem[]>([])
  const [profiles, setProfiles] = useState<ProfileItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setIsLoading(true)

    // 후원 목록
    const { data: donationsData } = await supabase
      .from('donations')
      .select('*, profiles!donor_id(nickname), seasons(name)')
      .order('created_at', { ascending: false })

    // 시즌 목록
    const { data: seasonsData } = await supabase
      .from('seasons')
      .select('id, name')
      .order('start_date', { ascending: false })

    // 프로필 목록
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, nickname')
      .order('nickname')

    setDonations(
      (donationsData || []).map((d) => {
        const profile = d.profiles as JoinedProfile | null
        const season = d.seasons as JoinedSeason | null
        return {
          id: d.id,
          donorId: d.donor_id,
          donorName: profile?.nickname || '익명',
          amount: d.amount,
          message: d.message || '',
          seasonId: d.season_id,
          seasonName: season?.name || '',
          createdAt: d.created_at,
        }
      })
    )

    setSeasons(seasonsData || [])
    setProfiles(profilesData || [])
    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const addDonation = useCallback(
    async (donation: Partial<DonationItem>): Promise<boolean> => {
      if (!donation.donorId || !donation.amount) {
        return false
      }

      const selectedProfile = profiles.find((p) => p.id === donation.donorId)
      const donorName = selectedProfile?.nickname || '익명'

      const { error } = await supabase.from('donations').insert({
        donor_id: donation.donorId,
        donor_name: donorName,
        amount: donation.amount,
        message: donation.message,
        season_id: donation.seasonId,
      })

      if (error) {
        console.error('후원 등록 실패:', error)
        return false
      }

      // 프로필 총 후원금 업데이트
      if (donation.donorId) {
        await supabase.rpc('update_donation_total', {
          p_donor_id: donation.donorId,
          p_amount: donation.amount,
        })
      }

      await fetchData()
      return true
    },
    [supabase, profiles, fetchData]
  )

  const updateDonation = useCallback(
    async (donation: Partial<DonationItem>): Promise<boolean> => {
      if (!donation.id) return false

      const { error } = await supabase
        .from('donations')
        .update({
          amount: donation.amount,
          message: donation.message,
          season_id: donation.seasonId,
        })
        .eq('id', donation.id)

      if (error) {
        console.error('후원 수정 실패:', error)
        return false
      }

      await fetchData()
      return true
    },
    [supabase, fetchData]
  )

  const deleteDonation = useCallback(
    async (id: number): Promise<boolean> => {
      const { error } = await supabase.from('donations').delete().eq('id', id)

      if (error) {
        console.error('후원 삭제 실패:', error)
        return false
      }

      await fetchData()
      return true
    },
    [supabase, fetchData]
  )

  const uploadCsv = useCallback(
    async (
      data: { [key: string]: string }[],
      options: UploadCsvOptions = {}
    ): Promise<UploadCsvResult> => {
      const { duplicateHandling = 'skip', autoCreateProfiles = true, episodeId } = options
      const errors: string[] = []
      let successCount = 0
      let skippedCount = 0
      let updatedCount = 0
      let profilesCreatedCount = 0

      // 프로필 캐시 (동일 CSV 내 중복 닉네임 처리용)
      const profileCache = new Map<string, string>() // nickname -> profile_id
      profiles.forEach(p => profileCache.set(p.nickname.toLowerCase(), p.id))

      const activeSeason = seasons[0]
      if (!activeSeason) {
        return { success: 0, errors: ['활성 시즌이 없습니다. 먼저 시즌을 생성해주세요.'], skipped: 0, updated: 0, profilesCreated: 0 }
      }

      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const rowNum = i + 2

        // 후원자 ID/이름 파싱 (여러 CSV 형식 지원)
        let pandaTvId = '' // PandaTV 아이디 (참고용)
        let donorName = row['ID'] || row['donor_id'] || row['id'] || row['donor_name'] || ''

        // PandaTV CSV 형식: "후원 아이디(닉네임)" 컬럼에서 아이디와 닉네임 분리
        // 예: "no0163(유진이ෆ)" -> pandaTvId: "no0163", donorName: "유진이ෆ"
        const pandaTvIdField = row['후원 아이디(닉네임)']
        if (pandaTvIdField) {
          const match = pandaTvIdField.match(/^([^(]+)\(([^)]+)\)$/)
          if (match) {
            pandaTvId = match[1].trim() // 괄호 앞의 아이디
            donorName = match[2].trim() // 괄호 안의 닉네임
          } else {
            // 괄호가 없으면 전체를 닉네임으로 사용
            donorName = pandaTvIdField.trim()
          }
        }

        // 하트 금액 파싱 (여러 컬럼명 지원)
        // - 후원하트: 개별 후원 내역 CSV
        // - 총 후원하트: 누적 랭킹 CSV
        const amountStr = row['후원하트'] || row['총 후원하트'] || row['하트'] || row['amount'] || row['hearts'] || '0'
        const message = row['내용'] || row['message'] || ''
        // 후원시간 또는 일시 컬럼 지원
        const dateStr = row['후원시간'] || row['일시'] || row['date'] || ''
        // 참여BJ 정보 (나중에 활용 가능)
        const targetBj = row['참여BJ'] || ''

        if (!donorName) {
          errors.push(`행 ${rowNum}: 후원자 ID/이름이 필요합니다.`)
          continue
        }

        const amount = parseInt(amountStr.replace(/,/g, ''), 10)
        if (isNaN(amount) || amount <= 0) {
          errors.push(`행 ${rowNum}: 유효하지 않은 하트 수입니다.`)
          continue
        }

        let seasonId = activeSeason.id
        if (row.season_id) {
          const parsedSeasonId = parseInt(row.season_id, 10)
          if (!isNaN(parsedSeasonId) && seasons.some((s) => s.id === parsedSeasonId)) {
            seasonId = parsedSeasonId
          }
        }

        // 프로필 매칭: 캐시 → DB → 자동 생성
        let matchedProfileId = profileCache.get(donorName.toLowerCase())

        // 캐시에 없으면 DB에서 다시 검색 (다른 세션에서 생성됐을 수 있음)
        if (!matchedProfileId) {
          const existingProfile = profiles.find(
            (p) => p.nickname.toLowerCase() === donorName.toLowerCase()
          )
          if (existingProfile) {
            matchedProfileId = existingProfile.id
            profileCache.set(donorName.toLowerCase(), existingProfile.id)
          }
        }

        // 프로필이 없고 자동 생성 옵션이 켜져 있으면 새 프로필 생성
        if (!matchedProfileId && autoCreateProfiles) {
          try {
            // PandaTV 아이디로 기존 프로필 검색 (이미 다른 닉네임으로 등록됐을 수 있음)
            if (pandaTvId) {
              const { data: existingByPandaId } = await supabase
                .from('profiles')
                .select('id')
                .eq('pandatv_id', pandaTvId)
                .single()

              if (existingByPandaId) {
                matchedProfileId = existingByPandaId.id
                profileCache.set(donorName.toLowerCase(), existingByPandaId.id)
              }
            }

            // 여전히 프로필이 없으면 새로 생성
            if (!matchedProfileId) {
              const newProfileId = crypto.randomUUID()

              const { error: createProfileError } = await supabase
                .from('profiles')
                .insert({
                  id: newProfileId,
                  nickname: donorName,
                  pandatv_id: pandaTvId || null, // PandaTV 아이디 저장
                  role: 'member',
                  total_donation: 0,
                })

              if (!createProfileError) {
                matchedProfileId = newProfileId
                profileCache.set(donorName.toLowerCase(), newProfileId)
                profilesCreatedCount++
              } else {
                // 중복 닉네임 등으로 생성 실패 시 무시 (donor_id null로 진행)
                console.warn(`프로필 생성 실패 (${donorName}):`, createProfileError.message)
              }
            }
          } catch (err) {
            console.warn(`프로필 생성 중 오류 (${donorName}):`, err)
          }
        }

        const matchedProfile = matchedProfileId ? { id: matchedProfileId, nickname: donorName } : null

        let createdAt = new Date().toISOString()
        if (dateStr) {
          try {
            // 여러 날짜 형식 지원
            // 형식 1: "2026-01-21 03:40:11" (ISO-like)
            // 형식 2: "26.01.21 03:40:11" (YY.MM.DD)
            if (dateStr.includes('-')) {
              // ISO 형식: 2026-01-21 03:40:11
              const parsedDate = new Date(dateStr.replace(' ', 'T') + '+09:00')
              if (!isNaN(parsedDate.getTime())) {
                createdAt = parsedDate.toISOString()
              }
            } else if (dateStr.includes('.')) {
              // YY.MM.DD 형식
              const [datePart, timePart] = dateStr.split(' ')
              const [yy, mm, dd] = datePart.split('.')
              const year = parseInt(yy, 10) + 2000
              createdAt = new Date(`${year}-${mm}-${dd}T${timePart}+09:00`).toISOString()
            }
          } catch {
            // 파싱 실패 시 현재 시간 사용
          }
        }

        try {
          // 중복 체크: 동일 후원자명 + 동일 시즌
          // 날짜가 없는 누적 데이터의 경우 (랭킹 CSV) 날짜 무관하게 체크
          const isCumulativeImport = !dateStr && pandaTvIdField
          let existingDonationsQuery = supabase
            .from('donations')
            .select('id, amount')
            .eq('donor_name', donorName)
            .eq('season_id', seasonId)

          if (!isCumulativeImport) {
            // 일반 CSV: 동일 날짜 기준 중복 체크
            const dateOnly = createdAt.split('T')[0]
            existingDonationsQuery = existingDonationsQuery
              .gte('created_at', `${dateOnly}T00:00:00Z`)
              .lt('created_at', `${dateOnly}T23:59:59Z`)
          }
          // 누적 CSV: 시즌 전체에서 해당 후원자 기록 조회

          const { data: existingDonations } = await existingDonationsQuery

          const existingDonation = existingDonations?.[0]

          if (existingDonation) {
            // 중복 데이터 발견
            if (duplicateHandling === 'skip') {
              skippedCount++
              continue
            } else if (duplicateHandling === 'overwrite') {
              // 기존 데이터 덮어쓰기
              const { error } = await supabase
                .from('donations')
                .update({
                  amount: amount,
                  message: message || null,
                  created_at: createdAt,
                })
                .eq('id', existingDonation.id)

              if (error) {
                errors.push(`행 ${rowNum}: ${error.message}`)
              } else {
                updatedCount++

                // 프로필 총 후원금 조정 (기존 금액 차감 후 새 금액 추가)
                if (matchedProfile) {
                  const amountDiff = amount - existingDonation.amount
                  if (amountDiff !== 0) {
                    await supabase.rpc('update_donation_total', {
                      p_donor_id: matchedProfile.id,
                      p_amount: amountDiff,
                    })
                  }
                }
              }
              continue
            } else if (duplicateHandling === 'accumulate') {
              // 기존 데이터에 금액 누적
              const newAmount = existingDonation.amount + amount
              const { error } = await supabase
                .from('donations')
                .update({
                  amount: newAmount,
                  message: message ? `${existingDonation.amount}+${amount}: ${message}` : null,
                })
                .eq('id', existingDonation.id)

              if (error) {
                errors.push(`행 ${rowNum}: ${error.message}`)
              } else {
                updatedCount++

                // 프로필 총 후원금에 추가 금액만 반영
                if (matchedProfile) {
                  await supabase.rpc('update_donation_total', {
                    p_donor_id: matchedProfile.id,
                    p_amount: amount,
                  })
                }
              }
              continue
            }
          }

          // 신규 등록
          const { error } = await supabase.from('donations').insert({
            donor_id: matchedProfile?.id || null,
            donor_name: donorName,
            amount: amount,
            message: message || null,
            season_id: seasonId,
            episode_id: episodeId || null, // 에피소드 연결 (직급전용)
            created_at: createdAt,
          })

          if (error) {
            errors.push(`행 ${rowNum}: ${error.message}`)
          } else {
            successCount++

            if (matchedProfile) {
              await supabase.rpc('update_donation_total', {
                p_donor_id: matchedProfile.id,
                p_amount: amount,
              })
            }
          }
        } catch {
          errors.push(`행 ${rowNum}: 데이터베이스 오류`)
        }
      }

      if (successCount > 0 || updatedCount > 0 || profilesCreatedCount > 0) {
        await fetchData()
      }

      return {
        success: successCount,
        errors,
        skipped: skippedCount,
        updated: updatedCount,
        profilesCreated: profilesCreatedCount
      }
    },
    [supabase, seasons, profiles, fetchData]
  )

  return {
    donations,
    seasons,
    profiles,
    isLoading,
    refetch: fetchData,
    addDonation,
    updateDonation,
    deleteDonation,
    uploadCsv,
  }
}
