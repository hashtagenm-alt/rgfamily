'use server'

import { adminAction, type ActionResult } from './index'
import { parseDonationCsv } from '@/lib/utils/donation-csv'

// ========================================
// 닉네임 변경 매핑 (구 닉네임 → 현재 PandaTV 닉네임)
// refresh-season-rankings.ts, refresh-total-rankings.ts와 동일
// ========================================
const nicknameAliases: Record<string, string> = {
  '[J]젖문가': '젖문가™',
  '시아에오ღ까부는넌내꺼야': '까부는넌내꺼야119',
  '[RG]✨린아의발굴™': '[RG]✨린아의발굴™✨',
  '박하은❤️린아❤️사탕': '찌개❤️사탕',
  '가윤이꼬❤️마음⭐': '가윤이꼬❤️너만의마음⭐',
  '☀칰힌사주면천사☀': '칰힌사주면천사❥',
  '갈색말티푸': '김채은네_갈색말티푸',
  '경리때리는❤️쪼다❤️': '경리의두쫀쿠키❤️쪼다❤️',
  '가윤이꼬❤️함주라': '꽉B가윤이꼬❤️함주라',
  '시라☆구구단☆시우': '바겐시우',
}

// 레거시 데이터 (시즌1 이전 누적) - refresh-total-rankings.ts와 동일
const legacyData: Record<string, number> = {
  '미키™': 411282,
  '[RG]미드굿♣️가애': 147864,
  '농심육개장라면': 84177,
  '까부는김회장': 83461,
  '[RG]✨린아의발굴™✨': 67199,
  '[RG]여행™': 60495,
  '❥CaNnOt': 59632,
  '바겐시우': 102,
  '태린공주❤️줄여보자': 46926,
  '⭐건빵이미래쥐': 42395,
  '⚡도도➷라론⚡': 39003,
  '내마지막은키르❤️머네로': 36312,
  '도도화♔원픽♔': 34270,
  '✨가윤❤️바위늪✨': 32492,
  '가윤이꼬❤️털이': 30532,
  '선하❤️삐딱이': 25172,
  '[오골계]': 23085,
  '✨❤️라율◡ღ카사❤️✨': 22914,
  '교미ෆ': 21179,
  '언제나♬': 20873,
  '한은비ღ안줘ღ': 20727,
  '❥견뎌': 20568,
  '☾코코에르메스': 20070,
  '양재동ღ젖문가➷': 20009,
  '마시마로ღ': 19486,
  '린아사단✨탱커': 18492,
  '개호구⭐즈하⭐광대': 18015,
  '현생중_냐핫': 16548,
  '❤️닉푸어™❤️': 16288,
  '온리원❥금쪽이ღ조커✨': 16275,
  '앵겨라잉': 15588,
  '[로진]꽃츄잉♡엔터대표': 15286,
  '태린공주❤️마비™': 15240,
  '[RG]채은➳♥도루묵': 13448,
  '❤️재활중~방랑자❤️': 13198,
  '가윤이꼬❤️가플단니킥': 12374,
  '[가플단]가윤❤️호기': 12110,
  '[RG]가애여황': 10090,
  '젖문가™': 9496,
  '김스껄': 9404,
  '[RG]가애ෆ잔바리': 8208,
  '홍서하네❥홍바스': 7918,
  '미쯔✨': 7606,
  '신세련❤️영원한니꺼✦쿨': 7503,
  '[RG]린아네☀둥그레': 7052,
  '퉁퉁퉁퉁퉁퉁사우르': 5671,
  '[RG]✨린아의단진™': 5554,
  '사랑해씌발™': 3349,
  'qldh라유': 3174,
  '한세아내꺼♡호랭이': 2933,
  '홍서하네❥페르소나™': 2586,
  '가윤이꼬❤️관씨': 2557,
  '가윤이꼬❤️너만의마음⭐': 779,
  'ღ❥가애ღ개맛도링❥ღ': 564,
  '한세아♡백작♡하얀만두피': 500,
  '[RG]가애ෆ57774': 212,
  '김채은네_갈색말티푸': 200,
  '찌개❤️사탕': 144,
  '손밍ღ타코보이': 58,
  '손밍매니아': 21,
  '칰힌사주면천사❥': 14,
  '❤️지수ෆ해린❤️치토스㉦': 10,
  '글레스고키스': 6,
  '파민♣️': 4,
  '채은❤️여신': -83461,
}

// ========================================
// Phase 2: 시즌 랭킹 갱신
// ========================================

interface RefreshResult {
  totalDonations: number
  uniqueDonors: number
  rankedCount: number
}

/**
 * 시즌 랭킹 갱신: donations 테이블 기준으로 season_donation_rankings 재계산
 */
export async function refreshSeasonRankings(
  seasonId: number
): Promise<ActionResult<RefreshResult>> {
  return adminAction(async (supabase) => {
    // 1. donations에서 해당 시즌 전체 데이터 가져오기 (페이지네이션)
    const allDonations: { donor_name: string; amount: number }[] = []
    let page = 0
    const pageSize = 1000

    while (true) {
      const { data, error } = await supabase
        .from('donations')
        .select('donor_name, amount')
        .eq('season_id', seasonId)
        .gt('amount', 0)
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (error) throw new Error(`데이터 로딩 실패: ${error.message}`)
      if (!data || data.length === 0) break
      allDonations.push(...data)
      if (data.length < pageSize) break
      page++
    }

    if (allDonations.length === 0) {
      throw new Error('해당 시즌에 후원 데이터가 없습니다.')
    }

    // 2. 닉네임별 집계 (닉변 매핑 적용)
    const donorTotals: Record<string, { total: number; count: number }> = {}
    for (const d of allDonations) {
      const canonical = nicknameAliases[d.donor_name] || d.donor_name
      if (!donorTotals[canonical]) {
        donorTotals[canonical] = { total: 0, count: 0 }
      }
      donorTotals[canonical].total += d.amount
      donorTotals[canonical].count++
    }

    // 3. 정렬 및 Top 50 추출
    const rankings = Object.entries(donorTotals)
      .map(([name, data]) => ({
        donor_name: name,
        total_amount: data.total,
        donation_count: data.count,
      }))
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 50)

    // 4. 기존 데이터 삭제
    const { error: deleteError } = await supabase
      .from('season_donation_rankings')
      .delete()
      .eq('season_id', seasonId)

    if (deleteError) throw new Error(`기존 데이터 삭제 실패: ${deleteError.message}`)

    // 5. 새 데이터 삽입
    const insertData = rankings.map((d, i) => ({
      season_id: seasonId,
      rank: i + 1,
      donor_name: d.donor_name,
      total_amount: d.total_amount,
      donation_count: d.donation_count,
      unit: 'excel' as const,
      updated_at: new Date().toISOString(),
    }))

    const { error: insertError } = await supabase
      .from('season_donation_rankings')
      .insert(insertData)

    if (insertError) throw new Error(`새 데이터 삽입 실패: ${insertError.message}`)

    return {
      totalDonations: allDonations.length,
      uniqueDonors: Object.keys(donorTotals).length,
      rankedCount: rankings.length,
    }
  }, ['/admin/donation-rankings', '/ranking'])
}

// ========================================
// Phase 2: 총 후원 랭킹 갱신
// ========================================

interface TotalRefreshResult {
  totalDonations: number
  uniqueDonors: number
  rankedCount: number
  legacyEntries: number
}

/**
 * 총 후원 랭킹 갱신: 레거시 + 시즌 합산 → total_donation_rankings 재계산
 */
export async function refreshTotalRankings(): Promise<ActionResult<TotalRefreshResult>> {
  return adminAction(async (supabase) => {
    // 1. donations 테이블에서 전체 데이터 가져오기 (페이지네이션)
    const allDonations: { donor_name: string; amount: number; target_bj: string | null }[] = []
    let page = 0
    const pageSize = 1000

    while (true) {
      const { data, error } = await supabase
        .from('donations')
        .select('donor_name, amount, target_bj')
        .gt('amount', 0)
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (error) throw new Error(`데이터 로딩 실패: ${error.message}`)
      if (!data || data.length === 0) break
      allDonations.push(...data)
      if (data.length < pageSize) break
      page++
    }

    // 2. 닉네임별 합계 + donation_count + top_bj (닉변 매핑 적용)
    const seasonTotals: Record<string, number> = {}
    const donationCounts: Record<string, number> = {}
    const bjTotals: Record<string, Record<string, number>> = {}

    for (const d of allDonations) {
      const canonical = nicknameAliases[d.donor_name] || d.donor_name
      seasonTotals[canonical] = (seasonTotals[canonical] || 0) + d.amount
      donationCounts[canonical] = (donationCounts[canonical] || 0) + 1
      if (d.target_bj) {
        if (!bjTotals[canonical]) bjTotals[canonical] = {}
        bjTotals[canonical][d.target_bj] = (bjTotals[canonical][d.target_bj] || 0) + d.amount
      }
    }

    // top_bj 계산
    const topBjMap: Record<string, string | null> = {}
    for (const [donor, bjs] of Object.entries(bjTotals)) {
      let maxBj: string | null = null
      let maxAmount = 0
      for (const [bj, amount] of Object.entries(bjs)) {
        if (amount > maxAmount) {
          maxAmount = amount
          maxBj = bj
        }
      }
      topBjMap[donor] = maxBj
    }

    // 3. 레거시 + 시즌 합산
    const combined: Record<string, number> = { ...legacyData }
    for (const [name, amount] of Object.entries(seasonTotals)) {
      combined[name] = (combined[name] || 0) + amount
    }

    // 4. 정렬 및 Top 50 추출
    const rankings = Object.entries(combined)
      .map(([name, total]) => ({ donor_name: name, total_amount: total }))
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 50)
      .map((d, i) => ({
        rank: i + 1,
        donor_name: d.donor_name,
        total_amount: d.total_amount,
        is_permanent_vip: false,
        donation_count: donationCounts[d.donor_name] || 0,
        top_bj: topBjMap[d.donor_name] || null,
      }))

    // 5. 기존 데이터 삭제
    const { error: deleteError } = await supabase
      .from('total_donation_rankings')
      .delete()
      .gte('id', 0)

    if (deleteError) throw new Error(`기존 데이터 삭제 실패: ${deleteError.message}`)

    // 6. 새 데이터 삽입
    const insertData = rankings.map((r) => ({
      rank: r.rank,
      donor_name: r.donor_name,
      total_amount: r.total_amount,
      is_permanent_vip: r.is_permanent_vip,
      donation_count: r.donation_count,
      top_bj: r.top_bj,
    }))

    const { error: insertError } = await supabase
      .from('total_donation_rankings')
      .insert(insertData)

    if (insertError) throw new Error(`새 데이터 삽입 실패: ${insertError.message}`)

    return {
      totalDonations: allDonations.length,
      uniqueDonors: Object.keys(seasonTotals).length,
      rankedCount: rankings.length,
      legacyEntries: Object.keys(legacyData).length,
    }
  }, ['/admin/donation-rankings', '/ranking'])
}

// ========================================
// Phase 1: 후원 데이터 CSV 임포트
// ========================================

interface ImportResult {
  importedCount: number
  uniqueDonors: number
  totalHearts: number
  episodeFinalized: boolean
}

/**
 * 후원 데이터 CSV 임포트
 * 기존 에피소드 데이터 삭제 후 재삽입
 */
export async function importDonationsCsv(
  seasonId: number,
  episodeId: number,
  csvText: string,
): Promise<ActionResult<ImportResult>> {
  return adminAction(async (supabase) => {
    // 1. CSV 파싱
    const { rows, totalHearts, uniqueDonors } = parseDonationCsv(csvText)

    if (rows.length === 0) {
      throw new Error('유효한 후원 데이터가 없습니다. CSV 형식을 확인해주세요.')
    }

    // 2. 에피소드 존재 확인
    const { data: episode, error: epError } = await supabase
      .from('episodes')
      .select('id, season_id')
      .eq('id', episodeId)
      .single()

    if (epError || !episode) {
      throw new Error('에피소드를 찾을 수 없습니다.')
    }
    if (episode.season_id !== seasonId) {
      throw new Error('에피소드가 선택한 시즌에 속하지 않습니다.')
    }

    // 3. 기존 에피소드 데이터 삭제
    const { error: deleteError } = await supabase
      .from('donations')
      .delete()
      .eq('episode_id', episodeId)

    if (deleteError) throw new Error(`기존 데이터 삭제 실패: ${deleteError.message}`)

    // 4. 배치 삽입 (100건씩)
    const batchSize = 100
    let importedCount = 0
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize).map(r => ({
        season_id: seasonId,
        episode_id: episodeId,
        donor_name: r.donor_name,
        amount: r.amount,
        target_bj: r.target_bj,
        donated_at: r.donated_at,
        unit: 'excel' as const,
      }))

      const { error: insertError } = await supabase.from('donations').insert(batch)
      if (insertError) throw new Error(`데이터 삽입 실패 (batch ${Math.floor(i / batchSize) + 1}): ${insertError.message}`)
      importedCount += batch.length
    }

    // 5. 에피소드 메타데이터 업데이트 (확정 처리)
    const { error: updateError } = await supabase
      .from('episodes')
      .update({
        is_finalized: true,
        finalized_at: new Date().toISOString(),
      })
      .eq('id', episodeId)

    if (updateError) {
      console.error('에피소드 업데이트 실패 (데이터는 임포트됨):', updateError.message)
    }

    return {
      importedCount,
      uniqueDonors,
      totalHearts,
      episodeFinalized: !updateError,
    }
  }, ['/admin/donation-rankings', '/admin/episodes', '/ranking'])
}

/**
 * 에피소드 목록 조회 (후원 데이터 임포트 UI용)
 */
export async function getEpisodesForImport(
  seasonId: number
): Promise<ActionResult<Array<{ id: number; episode_number: number; title: string; is_finalized: boolean }>>> {
  return adminAction(async (supabase) => {
    const { data, error } = await supabase
      .from('episodes')
      .select('id, episode_number, title, is_finalized')
      .eq('season_id', seasonId)
      .order('episode_number', { ascending: true })

    if (error) throw new Error(error.message)
    return data || []
  })
}
