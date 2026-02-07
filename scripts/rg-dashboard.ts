#!/usr/bin/env npx tsx
/**
 * RG Family 실시간 모니터링 대시보드 (TUI)
 *
 * 사용법:
 *   npm run dashboard              # 대시보드 시작
 *   npx tsx scripts/rg-dashboard.ts
 *
 * 키보드:
 *   r - 새로고침
 *   1 - 랭킹 상세
 *   2 - VIP 상세
 *   3 - 영상 상태
 *   4 - 에피소드
 *   h - 도움말
 *   q - 종료
 */

import { getServiceClient } from './lib/supabase'
import * as readline from 'readline'

const supabase = getServiceClient()

// ANSI 이스케이프 코드
const ESC = '\x1b'
const CSI = `${ESC}[`

const term = {
  // 커서 제어
  clear: () => process.stdout.write(`${CSI}2J${CSI}H`),
  moveTo: (x: number, y: number) => process.stdout.write(`${CSI}${y};${x}H`),
  hideCursor: () => process.stdout.write(`${CSI}?25l`),
  showCursor: () => process.stdout.write(`${CSI}?25h`),

  // 색상
  reset: `${CSI}0m`,
  bold: `${CSI}1m`,
  dim: `${CSI}2m`,
  red: `${CSI}31m`,
  green: `${CSI}32m`,
  yellow: `${CSI}33m`,
  blue: `${CSI}34m`,
  magenta: `${CSI}35m`,
  cyan: `${CSI}36m`,
  white: `${CSI}37m`,
  bgBlue: `${CSI}44m`,
  bgMagenta: `${CSI}45m`,
  bgCyan: `${CSI}46m`,
}

// 유틸리티
function colorize(text: string, ...codes: string[]): string {
  return codes.join('') + text + term.reset
}

function padCenter(text: string, width: number): string {
  const len = text.replace(/\x1b\[[0-9;]*m/g, '').length
  if (len >= width) return text
  const left = Math.floor((width - len) / 2)
  const right = width - len - left
  return ' '.repeat(left) + text + ' '.repeat(right)
}

function formatNumber(num: number): string {
  return num.toLocaleString()
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str.padEnd(len)
  return str.slice(0, len - 2) + '..'
}

// 데이터 타입
interface DashboardData {
  // 시즌 정보
  currentSeason: { id: number; name: string } | null
  // 랭킹 요약
  totalRankers: number
  seasonRankers: number
  top3Total: Array<{ rank: number; donor_name: string; total_amount: number }>
  top3Season: Array<{ rank: number; donor_name: string; total_amount: number }>
  // VIP 현황
  vipCount: number
  vipClickable: number
  sigEligible: number
  // 영상 현황
  signatureVideos: number
  shortsVideos: number
  vodVideos: number
  // 에피소드
  totalEpisodes: number
  recentEpisode: { id: number; title: string; episode_number: number } | null
  // 조직도
  orgMembers: number
  // 시간
  lastUpdate: Date
}

// 데이터 로드
async function loadDashboardData(): Promise<DashboardData> {
  const data: DashboardData = {
    currentSeason: null,
    totalRankers: 0,
    seasonRankers: 0,
    top3Total: [],
    top3Season: [],
    vipCount: 0,
    vipClickable: 0,
    sigEligible: 0,
    signatureVideos: 0,
    shortsVideos: 0,
    vodVideos: 0,
    totalEpisodes: 0,
    recentEpisode: null,
    orgMembers: 0,
    lastUpdate: new Date(),
  }

  // 병렬로 데이터 로드
  const [
    seasonResult,
    totalRankResult,
    seasonRankResult,
    top3TotalResult,
    vipResult,
    vipClickableResult,
    sigEligibleResult,
    sigVideoResult,
    shortsResult,
    vodResult,
    episodeResult,
    recentEpResult,
    orgResult,
  ] = await Promise.all([
    // 현재 시즌
    supabase.from('seasons').select('id, name').eq('is_active', true).single(),
    // 총 후원 랭킹 수
    supabase.from('total_donation_rankings').select('*', { count: 'exact', head: true }),
    // 시즌 랭킹 수
    supabase.from('season_donation_rankings').select('*', { count: 'exact', head: true }),
    // Top 3 총 후원
    supabase.from('total_donation_rankings').select('rank, donor_name, total_amount').order('rank').limit(3),
    // VIP 프로필 수
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'vip'),
    // VIP 클릭 가능 수
    supabase.from('vip_clickable_profiles').select('*', { count: 'exact', head: true }),
    // 시그니처 자격자 수
    supabase.from('signature_eligibility').select('donor_name').then(r => {
      const unique = new Set(r.data?.map(d => d.donor_name) || [])
      return { count: unique.size }
    }),
    // 시그니처 영상 수
    supabase.from('signature_videos').select('*', { count: 'exact', head: true }),
    // 쇼츠 수
    supabase.from('media_content').select('*', { count: 'exact', head: true }).eq('content_type', 'shorts'),
    // VOD 수
    supabase.from('media_content').select('*', { count: 'exact', head: true }).eq('content_type', 'vod'),
    // 에피소드 수
    supabase.from('episodes').select('*', { count: 'exact', head: true }),
    // 최근 에피소드
    supabase.from('episodes').select('id, title, episode_number').order('id', { ascending: false }).limit(1).single(),
    // 조직도 멤버 수
    supabase.from('organization').select('*', { count: 'exact', head: true }),
  ])

  if (seasonResult.data) data.currentSeason = seasonResult.data
  data.totalRankers = totalRankResult.count || 0
  data.seasonRankers = seasonRankResult.count || 0
  if (top3TotalResult.data) data.top3Total = top3TotalResult.data
  data.vipCount = vipResult.count || 0
  data.vipClickable = vipClickableResult.count || 0
  data.sigEligible = sigEligibleResult.count || 0
  data.signatureVideos = sigVideoResult.count || 0
  data.shortsVideos = shortsResult.count || 0
  data.vodVideos = vodResult.count || 0
  data.totalEpisodes = episodeResult.count || 0
  if (recentEpResult.data) data.recentEpisode = recentEpResult.data
  data.orgMembers = orgResult.count || 0
  data.lastUpdate = new Date()

  return data
}

// 박스 그리기
function drawBox(x: number, y: number, width: number, height: number, title: string, color: string): void {
  const topBorder = '╭' + '─'.repeat(width - 2) + '╮'
  const bottomBorder = '╰' + '─'.repeat(width - 2) + '╯'
  const emptyLine = '│' + ' '.repeat(width - 2) + '│'

  term.moveTo(x, y)
  process.stdout.write(colorize(topBorder, color))

  // 제목
  if (title) {
    term.moveTo(x + 2, y)
    process.stdout.write(colorize(` ${title} `, color, term.bold))
  }

  for (let i = 1; i < height - 1; i++) {
    term.moveTo(x, y + i)
    process.stdout.write(colorize(emptyLine, color))
  }

  term.moveTo(x, y + height - 1)
  process.stdout.write(colorize(bottomBorder, color))
}

// 텍스트 출력
function drawText(x: number, y: number, text: string): void {
  term.moveTo(x, y)
  process.stdout.write(text)
}

// 대시보드 렌더링
async function renderDashboard(data: DashboardData, viewMode: string): Promise<void> {
  term.clear()

  const width = process.stdout.columns || 80
  const height = process.stdout.rows || 24

  // 헤더
  const header = '🏠 RG Family 모니터링 대시보드'
  const time = data.lastUpdate.toLocaleTimeString('ko-KR')
  drawText(2, 1, colorize(header, term.bold, term.magenta))
  drawText(width - time.length - 2, 1, colorize(time, term.dim))

  const seasonInfo = data.currentSeason ? `시즌 ${data.currentSeason.id}: ${data.currentSeason.name}` : '시즌 정보 없음'
  drawText(2, 2, colorize(seasonInfo, term.cyan))

  // 구분선
  drawText(1, 3, colorize('─'.repeat(width - 2), term.dim))

  if (viewMode === 'main') {
    renderMainView(data, width)
  } else if (viewMode === 'ranking') {
    await renderRankingView(data, width)
  } else if (viewMode === 'vip') {
    await renderVipView(data, width)
  } else if (viewMode === 'videos') {
    await renderVideosView(data, width)
  } else if (viewMode === 'episodes') {
    await renderEpisodesView(data, width)
  } else if (viewMode === 'help') {
    renderHelpView(width)
  }

  // 푸터
  drawText(1, height - 2, colorize('─'.repeat(width - 2), term.dim))
  const footer = '[r]새로고침 [1]랭킹 [2]VIP [3]영상 [4]에피소드 [h]도움말 [q]종료'
  drawText(2, height - 1, colorize(footer, term.dim))
}

// 메인 뷰
function renderMainView(data: DashboardData, width: number): void {
  const colWidth = Math.floor((width - 4) / 3)

  // 랭킹 박스
  drawBox(2, 4, colWidth, 10, '📊 랭킹', term.cyan)
  drawText(4, 6, `총 후원 랭킹: ${colorize(formatNumber(data.totalRankers), term.bold, term.white)}명`)
  drawText(4, 7, `시즌 랭킹:    ${colorize(formatNumber(data.seasonRankers), term.bold, term.white)}명`)
  drawText(4, 9, colorize('Top 3 (총 후원)', term.yellow))
  data.top3Total.forEach((r, i) => {
    const medal = ['🥇', '🥈', '🥉'][i]
    drawText(4, 10 + i, `${medal} ${truncate(r.donor_name, colWidth - 10)}`)
  })

  // VIP 박스
  drawBox(2 + colWidth, 4, colWidth, 10, '👑 VIP', term.magenta)
  drawText(4 + colWidth, 6, `VIP 계정:     ${colorize(String(data.vipCount), term.bold, term.white)}명`)
  drawText(4 + colWidth, 7, `클릭 가능:    ${colorize(String(data.vipClickable), term.bold, term.green)}명`)
  drawText(4 + colWidth, 8, `시그니처 자격: ${colorize(String(data.sigEligible), term.bold, term.yellow)}명`)

  // 영상 박스
  drawBox(2 + colWidth * 2, 4, colWidth, 10, '🎬 영상', term.blue)
  drawText(4 + colWidth * 2, 6, `시그니처: ${colorize(formatNumber(data.signatureVideos), term.bold, term.white)}개`)
  drawText(4 + colWidth * 2, 7, `쇼츠:     ${colorize(formatNumber(data.shortsVideos), term.bold, term.white)}개`)
  drawText(4 + colWidth * 2, 8, `VOD:      ${colorize(formatNumber(data.vodVideos), term.bold, term.white)}개`)

  // 하단 정보
  drawBox(2, 15, width - 4, 5, '📋 시스템 현황', term.green)
  drawText(4, 17, `에피소드: ${data.totalEpisodes}개`)
  if (data.recentEpisode) {
    drawText(25, 17, `최근: ${data.recentEpisode.episode_number}화 ${data.recentEpisode.title || ''}`)
  }
  drawText(4, 18, `조직도 멤버: ${data.orgMembers}명`)
}

// 랭킹 상세 뷰
async function renderRankingView(data: DashboardData, width: number): Promise<void> {
  drawBox(2, 4, width - 4, 16, '📊 랭킹 상세', term.cyan)

  // Top 10 로드
  const { data: top10 } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name, total_amount')
    .order('rank')
    .limit(10)

  drawText(4, 6, colorize('순위  닉네임                          총 하트', term.bold))
  drawText(4, 7, '─'.repeat(50))

  if (top10) {
    top10.forEach((r, i) => {
      const medal = ['🥇', '🥈', '🥉'][i] || '  '
      const rank = String(r.rank).padStart(3)
      const name = truncate(r.donor_name, 28)
      const amount = formatNumber(r.total_amount).padStart(12)
      drawText(4, 8 + i, `${medal}${rank}  ${name}  ${colorize(amount, term.yellow)}`)
    })
  }

  drawText(4, 19, colorize('[Enter] 메인으로 돌아가기', term.dim))
}

// VIP 상세 뷰
async function renderVipView(data: DashboardData, width: number): Promise<void> {
  drawBox(2, 4, width - 4, 16, '👑 VIP 현황', term.magenta)

  const { data: vipList } = await supabase
    .from('vip_clickable_profiles')
    .select('nickname, profile_id, avatar_url')
    .limit(15)

  drawText(4, 6, colorize(`VIP 클릭 가능 목록 (${data.vipClickable}명)`, term.bold))
  drawText(4, 7, '─'.repeat(50))

  if (vipList) {
    vipList.forEach((v, i) => {
      const avatar = v.avatar_url ? '🖼️' : '❌'
      drawText(4, 8 + i, `${avatar} ${truncate(v.nickname, 25)}`)
    })
  }

  drawText(4, 19, colorize('[Enter] 메인으로 돌아가기', term.dim))
}

// 영상 상세 뷰
async function renderVideosView(data: DashboardData, width: number): Promise<void> {
  drawBox(2, 4, width - 4, 16, '🎬 영상 현황', term.blue)

  const { data: recentVideos } = await supabase
    .from('signature_videos')
    .select('member_name, sig_number, video_url')
    .order('created_at', { ascending: false })
    .limit(10)

  drawText(4, 6, colorize('최근 시그니처 영상', term.bold))
  drawText(4, 7, '─'.repeat(50))

  if (recentVideos) {
    recentVideos.forEach((v, i) => {
      const hasVideo = v.video_url ? '✅' : '❌'
      drawText(4, 8 + i, `${hasVideo} ${truncate(v.member_name || '', 10)} 시그${v.sig_number}`)
    })
  }

  drawText(4, 19, colorize('[Enter] 메인으로 돌아가기', term.dim))
}

// 에피소드 상세 뷰
async function renderEpisodesView(data: DashboardData, width: number): Promise<void> {
  drawBox(2, 4, width - 4, 16, '📺 에피소드 현황', term.green)

  const { data: episodes } = await supabase
    .from('episodes')
    .select('id, season_id, episode_number, title, total_hearts, donor_count')
    .order('id', { ascending: false })
    .limit(10)

  drawText(4, 6, colorize('회차   제목                    총하트       후원자', term.bold))
  drawText(4, 7, '─'.repeat(55))

  if (episodes) {
    episodes.forEach((ep, i) => {
      const num = `S${ep.season_id}E${ep.episode_number}`.padEnd(6)
      const title = truncate(ep.title || '-', 22)
      const hearts = formatNumber(ep.total_hearts || 0).padStart(10)
      const donors = String(ep.donor_count || 0).padStart(6)
      drawText(4, 8 + i, `${num} ${title}  ${colorize(hearts, term.yellow)}  ${donors}명`)
    })
  }

  drawText(4, 19, colorize('[Enter] 메인으로 돌아가기', term.dim))
}

// 도움말 뷰
function renderHelpView(width: number): void {
  drawBox(2, 4, width - 4, 16, '❓ 도움말', term.yellow)

  const help = [
    ['r', '데이터 새로고침'],
    ['1', '랭킹 상세 보기'],
    ['2', 'VIP 현황 보기'],
    ['3', '영상 상태 보기'],
    ['4', '에피소드 보기'],
    ['h', '이 도움말 보기'],
    ['q', '대시보드 종료'],
    ['Enter', '메인 화면으로'],
  ]

  drawText(4, 6, colorize('키보드 단축키', term.bold))
  drawText(4, 7, '─'.repeat(40))

  help.forEach(([key, desc], i) => {
    drawText(4, 8 + i, `${colorize(`[${key}]`, term.cyan)}  ${desc}`)
  })

  drawText(4, 17, colorize('자동 새로고침: 30초마다', term.dim))
}

// 메인 함수
async function main(): Promise<void> {
  // 터미널 설정
  term.hideCursor()
  term.clear()

  // Raw mode 설정
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true)
  }
  process.stdin.resume()
  process.stdin.setEncoding('utf8')

  let viewMode = 'main'
  let data = await loadDashboardData()
  await renderDashboard(data, viewMode)

  // 자동 새로고침 타이머
  const refreshInterval = setInterval(async () => {
    data = await loadDashboardData()
    await renderDashboard(data, viewMode)
  }, 30000)

  // 키보드 입력 처리
  process.stdin.on('data', async (key: string) => {
    if (key === 'q' || key === '\x03') {
      // q 또는 Ctrl+C
      clearInterval(refreshInterval)
      term.clear()
      term.showCursor()
      console.log('대시보드를 종료합니다.')
      process.exit(0)
    }

    if (key === 'r') {
      data = await loadDashboardData()
      await renderDashboard(data, viewMode)
    } else if (key === '1') {
      viewMode = 'ranking'
      await renderDashboard(data, viewMode)
    } else if (key === '2') {
      viewMode = 'vip'
      await renderDashboard(data, viewMode)
    } else if (key === '3') {
      viewMode = 'videos'
      await renderDashboard(data, viewMode)
    } else if (key === '4') {
      viewMode = 'episodes'
      await renderDashboard(data, viewMode)
    } else if (key === 'h') {
      viewMode = 'help'
      await renderDashboard(data, viewMode)
    } else if (key === '\r' || key === '\n') {
      viewMode = 'main'
      await renderDashboard(data, viewMode)
    }
  })

  // 종료 시 정리
  process.on('exit', () => {
    term.showCursor()
  })

  process.on('SIGINT', () => {
    clearInterval(refreshInterval)
    term.clear()
    term.showCursor()
    process.exit(0)
  })
}

main().catch((err) => {
  term.showCursor()
  console.error('오류:', err)
  process.exit(1)
})
