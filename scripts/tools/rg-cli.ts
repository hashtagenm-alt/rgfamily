#!/usr/bin/env npx tsx
/**
 * RG Family 통합 관리 CLI
 *
 * 사용법:
 *   npm run rg [command]              # npm 스크립트 (권장)
 *   npx tsx scripts/tools/rg-cli.ts [cmd]   # 직접 실행
 *
 * 예시:
 *   npm run rg                        # 인터랙티브 메뉴
 *   npm run rg r view                 # 랭킹 보기 (단축)
 *   npm run rg ranking view           # 랭킹 보기 (전체)
 *   npm run rg c vip                  # VIP 확인
 *   npm run rg help                   # 도움말
 */

import { spawn, SpawnOptions } from 'child_process'
import * as path from 'path'
import * as readline from 'readline'

const SCRIPTS_DIR = __dirname

// ANSI 컬러 코드
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
}

const c = {
  title: (s: string) => `${colors.bold}${colors.magenta}${s}${colors.reset}`,
  category: (s: string) => `${colors.bold}${colors.cyan}${s}${colors.reset}`,
  command: (s: string) => `${colors.green}${s}${colors.reset}`,
  alias: (s: string) => `${colors.yellow}${s}${colors.reset}`,
  error: (s: string) => `${colors.red}${s}${colors.reset}`,
  dim: (s: string) => `${colors.dim}${s}${colors.reset}`,
  success: (s: string) => `${colors.green}${s}${colors.reset}`,
  highlight: (s: string) => `${colors.bold}${colors.white}${s}${colors.reset}`,
}

// 카테고리별 단축키
const CATEGORY_ALIASES: Record<string, string> = {
  r: 'ranking',
  c: 'check',
  s: 'sync',
  a: 'account',
  u: 'upload',
  i: 'import',
  z: 'analyze',
}

// 카테고리별 아이콘
const CATEGORY_ICONS: Record<string, string> = {
  ranking: '📊',
  check: '🔍',
  sync: '🔄',
  account: '👤',
  upload: '📤',
  import: '📥',
  analyze: '📈',
}

// 카테고리별 설명
const CATEGORY_DESC: Record<string, string> = {
  ranking: '후원 랭킹 관리',
  check: '데이터 상태 확인',
  sync: '데이터 동기화',
  account: '계정 관리',
  upload: '영상/이미지 업로드',
  import: '데이터 가져오기',
  analyze: '데이터 분석',
}

// 명령어 → 스크립트 매핑 (설명 포함)
interface CommandInfo {
  script: string
  desc: string
  alias?: string
}

const COMMAND_MAP: Record<string, Record<string, CommandInfo>> = {
  ranking: {
    'refresh-season': { script: 'refresh-season-rankings.ts', desc: '시즌 랭킹 새로고침', alias: 'rs' },
    'refresh-total': { script: 'refresh-total-rankings.ts', desc: '종합 랭킹 새로고침', alias: 'rt' },
    'verify': { script: 'verify-ranking-integrity.ts', desc: '랭킹 정합성 검증', alias: 'v' },
    'view': { script: 'view-rankings.ts', desc: '랭킹 현황 보기', alias: 'vw' },
    'update-season': { script: 'update-season-rankings.ts', desc: '시즌 랭킹 업데이트 (CSV)' },
    'update-total': { script: 'update-total-rankings.ts', desc: '종합 랭킹 업데이트' },
  },
  check: {
    'db': { script: 'check-db-schema.ts', desc: 'DB 스키마 확인' },
    'vip': { script: 'check-vip-access.ts', desc: 'VIP 접근 권한 확인' },
    'vip-clickable': { script: 'check-vip-clickable.ts', desc: 'VIP 클릭 가능 목록', alias: 'vc' },
    'vip-accounts': { script: 'check-vip-accounts.ts', desc: 'VIP 계정 확인', alias: 'va' },
    'videos': { script: 'check-signature-videos.ts', desc: '시그니처 영상 확인', alias: 'vid' },
    'shorts': { script: 'check-shorts-codec.ts', desc: '쇼츠 코덱 확인' },
    'bj': { script: 'check-bj-accounts.ts', desc: 'BJ 계정 확인' },
    'org': { script: 'check-org.ts', desc: '조직도 확인' },
    'episodes': { script: 'check-episodes.ts', desc: '에피소드 확인', alias: 'ep' },
    'rankings': { script: 'check-season-rankings.ts', desc: '시즌 랭킹 확인' },
    'permissions': { script: 'check-permissions.ts', desc: '권한 확인', alias: 'perm' },
  },
  sync: {
    'vip': { script: 'sync-vip-accounts.ts', desc: 'VIP 계정 동기화' },
    'calendar': { script: 'sync-calendar-from-spreadsheet.ts', desc: '캘린더 동기화', alias: 'cal' },
    'signatures': { script: 'sync-signature-videos.ts', desc: '시그니처 영상 동기화', alias: 'sig' },
  },
  account: {
    'create-vip': { script: 'create-vip-accounts.ts', desc: 'VIP 계정 생성', alias: 'cv' },
    'create-bj': { script: 'create-bj-accounts.ts', desc: 'BJ 계정 생성', alias: 'cb' },
    'reset-vip-passwords': { script: 'reset-all-vip-passwords.ts', desc: 'VIP 비밀번호 초기화', alias: 'reset' },
    'link-vip': { script: 'link-vip-profiles.ts', desc: 'VIP 프로필 연결', alias: 'lv' },
    'link-bj': { script: 'link-bj-auth-accounts.ts', desc: 'BJ 인증 계정 연결', alias: 'lb' },
    'create-profiles': { script: 'create-missing-profiles.ts', desc: '누락 프로필 생성', alias: 'cp' },
  },
  upload: {
    'signatures': { script: 'batch-signature-upload.ts', desc: '시그니처 영상 업로드', alias: 'sig' },
    'shorts': { script: 'gdrive-shorts-upload.ts', desc: '쇼츠 영상 업로드' },
    'thumbnails': { script: 'upload-signature-thumbnails.ts', desc: '시그니처 썸네일 업로드', alias: 'thumb' },
    'fancam': { script: 'upload-fancam-videos.ts', desc: '직캠 영상 업로드' },
  },
  import: {
    'donations': { script: 'import-donations.ts', desc: '후원 데이터 가져오기', alias: 'don' },
    'episodes': { script: 'import-episode-donations.ts', desc: '에피소드별 후원 가져오기', alias: 'ep' },
    'pandatv': { script: 'import-pandatv-donations.ts', desc: 'PandaTV 후원 가져오기', alias: 'panda' },
  },
  analyze: {
    'vip': { script: 'analyze-vip-data.ts', desc: 'VIP 데이터 분석' },
    'duplicates': { script: 'analyze-duplicate-profiles.ts', desc: '중복 프로필 분석', alias: 'dup' },
    'rankings': { script: 'analyze-ranking-discrepancy.ts', desc: '랭킹 불일치 분석' },
    'integrity': { script: 'analyze-season-integrity.ts', desc: '시즌 정합성 분석', alias: 'int' },
    'eligibility': { script: 'analyze-signature-eligibility.ts', desc: '시그니처 자격 분석', alias: 'elig' },
  },
}

// 명령어 alias 역매핑 빌드
const COMMAND_ALIAS_MAP: Record<string, Record<string, string>> = {}
for (const [cat, cmds] of Object.entries(COMMAND_MAP)) {
  COMMAND_ALIAS_MAP[cat] = {}
  for (const [cmd, info] of Object.entries(cmds)) {
    if (info.alias) {
      COMMAND_ALIAS_MAP[cat][info.alias] = cmd
    }
  }
}

// 도움말 출력
function printHelp(): void {
  console.log(`
${c.title('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}
${c.title('🏠 RG Family 통합 관리 CLI')}
${c.title('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

${c.highlight('사용법:')}
  ${c.command('npm run rg')}                    인터랙티브 메뉴 (추천)
  ${c.command('npm run rg')} ${c.alias('<카테고리>')} ${c.dim('<명령>')}  명령 직접 실행
  ${c.command('npm run rg help')}               이 도움말

${c.highlight('카테고리 단축키:')}`)

  for (const [alias, full] of Object.entries(CATEGORY_ALIASES)) {
    const icon = CATEGORY_ICONS[full] || '📁'
    const desc = CATEGORY_DESC[full] || ''
    console.log(`  ${c.alias(alias)} = ${c.category(full.padEnd(10))} ${icon} ${c.dim(desc)}`)
  }

  console.log(`
${c.highlight('예시:')}
  ${c.command('npm run rg r view')}             랭킹 현황 보기
  ${c.command('npm run rg c vip')}              VIP 접근 확인
  ${c.command('npm run rg s sig')}              시그니처 동기화
  ${c.command('npm run rg ranking verify --fix')}  정합성 검증 후 자동 수정

${c.highlight('카테고리별 명령어 보기:')}
  ${c.command('npm run rg ranking')}            ranking 카테고리 명령어 목록
  ${c.command('npm run rg check')}              check 카테고리 명령어 목록
`)
}

// 카테고리별 명령어 목록
function printCategoryHelp(category: string): void {
  const categoryMap = COMMAND_MAP[category]
  if (!categoryMap) return

  const icon = CATEGORY_ICONS[category] || '📁'
  const desc = CATEGORY_DESC[category] || ''
  const alias = Object.entries(CATEGORY_ALIASES).find(([_, v]) => v === category)?.[0]

  console.log(`
${c.category(`${icon} ${category.toUpperCase()}`)} ${c.dim(`(${desc})`)}
${alias ? c.dim(`단축키: ${alias}`) : ''}
${'─'.repeat(55)}`)

  for (const [cmd, info] of Object.entries(categoryMap)) {
    const aliasStr = info.alias ? c.alias(`[${info.alias}]`.padEnd(8)) : '        '
    console.log(`  ${c.command(cmd.padEnd(20))} ${aliasStr} ${c.dim(info.desc)}`)
  }

  console.log(`
${c.dim('실행 예시:')}
  ${c.command(`npm run rg ${category} ${Object.keys(categoryMap)[0]}`)}
`)
}

// 스크립트 실행
function runScript(scriptPath: string, args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const fullPath = path.join(SCRIPTS_DIR, scriptPath)

    console.log(`\n${c.success('🚀 실행:')} npx tsx ${scriptPath} ${args.join(' ')}\n`)
    console.log('─'.repeat(55))

    const options: SpawnOptions = {
      stdio: 'inherit',
      cwd: path.dirname(SCRIPTS_DIR),
    }

    const child = spawn('npx', ['tsx', fullPath, ...args], options)

    child.on('close', (code) => {
      console.log('─'.repeat(55))
      if (code === 0) {
        console.log(c.success('✅ 완료'))
      } else {
        console.log(c.error(`❌ 종료 코드: ${code}`))
      }
      resolve(code || 0)
    })
  })
}

// SQL 실행
function runSql(query: string): Promise<number> {
  return runScript('run-sql.ts', ['--query', query])
}

// 유사 명령어 찾기 (Levenshtein distance)
function findSimilar(input: string, candidates: string[]): string[] {
  const distance = (a: string, b: string): number => {
    if (a.length === 0) return b.length
    if (b.length === 0) return a.length
    const matrix: number[][] = []
    for (let i = 0; i <= b.length; i++) matrix[i] = [i]
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        matrix[i][j] = b[i - 1] === a[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
      }
    }
    return matrix[b.length][a.length]
  }

  return candidates
    .map(c => ({ c, d: distance(input.toLowerCase(), c.toLowerCase()) }))
    .filter(x => x.d <= 3)
    .sort((a, b) => a.d - b.d)
    .slice(0, 3)
    .map(x => x.c)
}

// 인터랙티브 메뉴
async function interactiveMenu(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const question = (prompt: string): Promise<string> => {
    return new Promise(resolve => rl.question(prompt, resolve))
  }

  console.log(`
${c.title('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}
${c.title('🏠 RG Family 통합 관리 CLI')}
${c.title('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

${c.highlight('카테고리 선택:')}`)

  const categories = Object.keys(COMMAND_MAP)
  categories.forEach((cat, i) => {
    const alias = Object.entries(CATEGORY_ALIASES).find(([_, v]) => v === cat)?.[0] || ' '
    const icon = CATEGORY_ICONS[cat] || '📁'
    const desc = CATEGORY_DESC[cat] || ''
    console.log(`  ${c.alias(`[${alias}]`)} ${c.command((i + 1).toString())}. ${icon} ${cat.padEnd(10)} ${c.dim(desc)}`)
  })
  console.log(`  ${c.alias('[q]')} 종료`)

  const catInput = await question(`\n${c.highlight('선택 (번호/단축키):')} `)

  if (catInput.toLowerCase() === 'q' || catInput === '') {
    console.log(c.dim('종료합니다.'))
    rl.close()
    return
  }

  // 카테고리 해석
  let category: string | undefined
  const num = parseInt(catInput, 10)
  if (!isNaN(num) && num >= 1 && num <= categories.length) {
    category = categories[num - 1]
  } else if (CATEGORY_ALIASES[catInput]) {
    category = CATEGORY_ALIASES[catInput]
  } else if (categories.includes(catInput)) {
    category = catInput
  }

  if (!category) {
    console.log(c.error(`\n❌ 알 수 없는 카테고리: ${catInput}`))
    const similar = findSimilar(catInput, [...categories, ...Object.keys(CATEGORY_ALIASES)])
    if (similar.length > 0) {
      console.log(c.dim(`혹시: ${similar.join(', ')}?`))
    }
    rl.close()
    return
  }

  // 명령어 선택
  const commands = Object.entries(COMMAND_MAP[category])
  console.log(`\n${c.category(`${CATEGORY_ICONS[category]} ${category.toUpperCase()}`)} 명령어:\n`)

  commands.forEach(([cmd, info], i) => {
    const aliasStr = info.alias ? c.alias(`[${info.alias}]`.padEnd(8)) : '        '
    console.log(`  ${c.command((i + 1).toString().padStart(2))}. ${cmd.padEnd(18)} ${aliasStr} ${c.dim(info.desc)}`)
  })
  console.log(`  ${c.alias(' [b]')} 뒤로`)

  const cmdInput = await question(`\n${c.highlight('명령 선택:')} `)

  if (cmdInput.toLowerCase() === 'b' || cmdInput === '') {
    rl.close()
    await interactiveMenu()
    return
  }

  // 명령어 해석
  let command: string | undefined
  let info: CommandInfo | undefined
  const cmdNum = parseInt(cmdInput, 10)

  if (!isNaN(cmdNum) && cmdNum >= 1 && cmdNum <= commands.length) {
    [command, info] = commands[cmdNum - 1]
  } else if (COMMAND_ALIAS_MAP[category]?.[cmdInput]) {
    command = COMMAND_ALIAS_MAP[category][cmdInput]
    info = COMMAND_MAP[category][command]
  } else if (COMMAND_MAP[category][cmdInput]) {
    command = cmdInput
    info = COMMAND_MAP[category][command]
  }

  if (!command || !info) {
    console.log(c.error(`\n❌ 알 수 없는 명령: ${cmdInput}`))
    const similar = findSimilar(cmdInput, commands.map(([c]) => c))
    if (similar.length > 0) {
      console.log(c.dim(`혹시: ${similar.join(', ')}?`))
    }
    rl.close()
    return
  }

  // 추가 옵션 입력
  const extraArgs = await question(`${c.highlight('추가 옵션 (없으면 Enter):')} `)
  rl.close()

  const args = extraArgs ? extraArgs.split(' ').filter(Boolean) : []
  await runScript(info.script, args)
}

// 카테고리 해석 (alias 포함)
function resolveCategory(input: string): string | undefined {
  if (CATEGORY_ALIASES[input]) return CATEGORY_ALIASES[input]
  if (COMMAND_MAP[input]) return input
  return undefined
}

// 명령어 해석 (alias 포함)
function resolveCommand(category: string, input: string): string | undefined {
  if (COMMAND_ALIAS_MAP[category]?.[input]) return COMMAND_ALIAS_MAP[category][input]
  if (COMMAND_MAP[category]?.[input]) return input
  return undefined
}

// 메인 함수
async function main(): Promise<void> {
  const args = process.argv.slice(2)

  // 인터랙티브 모드 (인자 없음)
  if (args.length === 0) {
    await interactiveMenu()
    return
  }

  // 도움말
  if (args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    printHelp()
    return
  }

  const categoryInput = args[0]
  const commandInput = args[1]
  const restArgs = args.slice(2)

  // SQL 직접 실행
  if (categoryInput === 'sql') {
    const query = args.slice(1).join(' ')
    if (!query) {
      console.error(c.error('❌ SQL 쿼리를 입력하세요'))
      console.log(c.dim('예: npm run rg sql "SELECT * FROM profiles LIMIT 5"'))
      process.exit(1)
    }
    const code = await runSql(query)
    process.exit(code)
  }

  // 카테고리 해석
  const category = resolveCategory(categoryInput)
  if (!category) {
    console.error(c.error(`❌ 알 수 없는 카테고리: ${categoryInput}`))
    const similar = findSimilar(categoryInput, [
      ...Object.keys(COMMAND_MAP),
      ...Object.keys(CATEGORY_ALIASES),
    ])
    if (similar.length > 0) {
      console.log(c.dim(`혹시: ${similar.join(', ')}?`))
    }
    console.log(c.dim('\n사용 가능한 카테고리: ' + Object.keys(COMMAND_MAP).join(', ')))
    console.log(c.dim('도움말: npm run rg help'))
    process.exit(1)
  }

  // 명령어 없이 카테고리만 입력
  if (!commandInput) {
    printCategoryHelp(category)
    process.exit(0)
  }

  // 명령어 해석
  const command = resolveCommand(category, commandInput)
  if (!command) {
    console.error(c.error(`❌ 알 수 없는 명령: ${categoryInput} ${commandInput}`))
    const cmdNames = Object.keys(COMMAND_MAP[category])
    const aliases = Object.keys(COMMAND_ALIAS_MAP[category] || {})
    const similar = findSimilar(commandInput, [...cmdNames, ...aliases])
    if (similar.length > 0) {
      console.log(c.dim(`혹시: ${similar.join(', ')}?`))
    }
    console.log(c.dim(`\n사용 가능한 명령: ${cmdNames.join(', ')}`))
    process.exit(1)
  }

  const info = COMMAND_MAP[category][command]

  // 스크립트 실행
  const code = await runScript(info.script, restArgs)
  process.exit(code)
}

main().catch((err) => {
  console.error(c.error('❌ 오류:'), err.message || err)
  process.exit(1)
})
