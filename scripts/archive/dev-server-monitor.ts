/**
 * 개발 서버 메모리 모니터링 및 자동 재시작 스크립트
 *
 * 메모리 임계치를 초과하면 자동으로 개발 서버를 재시작한다.
 * - 임계치: 1.5GB (환경변수로 조정 가능)
 * - 체크 간격: 30초
 */

import { spawn, ChildProcess } from 'child_process'
import { platform } from 'os'

// 설정
const MEMORY_THRESHOLD_MB = parseInt(process.env.DEV_MEMORY_THRESHOLD_MB || '1500', 10)
const CHECK_INTERVAL_MS = parseInt(process.env.DEV_MEMORY_CHECK_INTERVAL_MS || '30000', 10)
const NODE_MAX_OLD_SPACE_MB = parseInt(process.env.NODE_MAX_OLD_SPACE_MB || '2048', 10)
const ENABLE_PREWARM = process.env.DEV_PREWARM !== 'false' // 기본 활성화

let devProcess: ChildProcess | null = null
let isRestarting = false
let hasPrewarmed = false

function formatMemory(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)}GB`
  }
  return `${mb}MB`
}

function getTimestamp(): string {
  return new Date().toLocaleTimeString('ko-KR', { hour12: false })
}

function log(message: string, type: 'info' | 'warn' | 'error' = 'info'): void {
  const prefix = {
    info: '\x1b[36m[Monitor]\x1b[0m',
    warn: '\x1b[33m[Monitor]\x1b[0m',
    error: '\x1b[31m[Monitor]\x1b[0m',
  }
  console.log(`${prefix[type]} ${getTimestamp()} ${message}`)
}

async function getProcessMemoryMB(pid: number): Promise<number> {
  return new Promise((resolve) => {
    const isWindows = platform() === 'win32'
    const cmd = isWindows ? 'tasklist' : 'ps'
    const args = isWindows ? ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'] : ['-o', 'rss=', '-p', String(pid)]

    const proc = spawn(cmd, args)
    let output = ''

    proc.stdout.on('data', (data) => {
      output += data.toString()
    })

    proc.on('close', () => {
      try {
        if (isWindows) {
          // Windows: "node.exe","12345","Console","1","123,456 K"
          const match = output.match(/"([0-9,]+)\s*K"/)
          if (match) {
            const kb = parseInt(match[1].replace(/,/g, ''), 10)
            resolve(Math.round(kb / 1024))
            return
          }
        } else {
          // Unix: RSS in KB
          const rss = parseInt(output.trim(), 10)
          if (!isNaN(rss)) {
            resolve(Math.round(rss / 1024))
            return
          }
        }
      } catch {
        // 파싱 실패
      }
      resolve(0)
    })
  })
}

// 프리워밍 대상 라우트
const PREWARM_ROUTES = [
  '/',
  '/ranking',
  '/ranking/season',
  '/ranking/vip',
  '/community',
  '/community/free',
  '/notice',
  '/login',
  '/admin',
  '/rg/org',
  '/rg/sig',
]

async function prewarmRoutes(): Promise<void> {
  if (!ENABLE_PREWARM || hasPrewarmed) return
  hasPrewarmed = true

  log('라우트 프리워밍 시작...')

  const BASE_URL = 'http://localhost:3000'
  let success = 0
  let failed = 0

  for (const route of PREWARM_ROUTES) {
    try {
      const start = Date.now()
      const response = await fetch(`${BASE_URL}${route}`, {
        headers: { 'User-Agent': 'Prewarm-Script' },
      })
      const time = Date.now() - start

      if (response.ok) {
        success++
        const timeColor = time < 500 ? '\x1b[32m' : time < 2000 ? '\x1b[33m' : '\x1b[31m'
        console.log(`  \x1b[32m✓\x1b[0m ${route.padEnd(25)} ${timeColor}${time}ms\x1b[0m`)
      } else {
        failed++
        console.log(`  \x1b[31m✗\x1b[0m ${route.padEnd(25)} (${response.status})`)
      }
    } catch {
      failed++
      console.log(`  \x1b[31m✗\x1b[0m ${route.padEnd(25)} (연결 실패)`)
    }

    // 서버 부하 방지
    await new Promise(r => setTimeout(r, 200))
  }

  log(`프리워밍 완료: ${success}개 성공, ${failed}개 실패`)
}

async function waitForServerAndPrewarm(): Promise<void> {
  // 서버가 준비될 때까지 대기 (최대 60초)
  const maxAttempts = 60
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch('http://localhost:3000', {
        method: 'HEAD',
        headers: { 'User-Agent': 'Prewarm-Script' },
      })
      if (response.ok) {
        await prewarmRoutes()
        return
      }
    } catch {
      // 아직 준비 안됨
    }
    await new Promise(r => setTimeout(r, 1000))
  }
  log('서버 연결 실패 - 프리워밍 건너뜀', 'warn')
}

function startDevServer(): void {
  log(`Starting Next.js dev server (max-old-space: ${NODE_MAX_OLD_SPACE_MB}MB)...`)

  const nodeOptions = `--max-old-space-size=${NODE_MAX_OLD_SPACE_MB}`
  const existingNodeOptions = process.env.NODE_OPTIONS || ''
  const combinedNodeOptions = existingNodeOptions
    ? `${existingNodeOptions} ${nodeOptions}`
    : nodeOptions

  devProcess = spawn('npx', ['next', 'dev'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_OPTIONS: combinedNodeOptions,
    },
  })

  devProcess.on('exit', (code, signal) => {
    if (!isRestarting) {
      log(`Dev server exited (code: ${code}, signal: ${signal})`, code === 0 ? 'info' : 'warn')
      process.exit(code || 0)
    }
  })

  devProcess.on('error', (err) => {
    log(`Dev server error: ${err.message}`, 'error')
  })

  // 서버 준비 후 프리워밍 실행
  if (ENABLE_PREWARM && !hasPrewarmed) {
    void waitForServerAndPrewarm()
  }
}

async function restartDevServer(): Promise<void> {
  if (isRestarting) return
  isRestarting = true

  log('Memory threshold exceeded. Restarting server...', 'warn')

  if (devProcess) {
    devProcess.kill('SIGTERM')

    // 프로세스 종료 대기 (최대 5초)
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (devProcess && !devProcess.killed) {
          devProcess.kill('SIGKILL')
        }
        resolve()
      }, 5000)

      devProcess?.on('exit', () => {
        clearTimeout(timeout)
        resolve()
      })
    })
  }

  // 잠시 대기 후 재시작
  await new Promise((r) => setTimeout(r, 1000))

  isRestarting = false
  startDevServer()
}

async function checkMemory(): Promise<void> {
  if (!devProcess?.pid || isRestarting) return

  const memoryMB = await getProcessMemoryMB(devProcess.pid)

  if (memoryMB > 0) {
    const usage = formatMemory(memoryMB)
    const threshold = formatMemory(MEMORY_THRESHOLD_MB)
    const percent = Math.round((memoryMB / MEMORY_THRESHOLD_MB) * 100)

    if (memoryMB > MEMORY_THRESHOLD_MB) {
      log(`Memory: ${usage} / ${threshold} (${percent}%) - EXCEEDED`, 'warn')
      await restartDevServer()
    } else if (percent >= 80) {
      log(`Memory: ${usage} / ${threshold} (${percent}%) - HIGH`, 'warn')
    } else {
      log(`Memory: ${usage} / ${threshold} (${percent}%)`)
    }
  }
}

// 시그널 핸들링
process.on('SIGINT', () => {
  log('Received SIGINT. Shutting down...')
  if (devProcess) {
    devProcess.kill('SIGTERM')
  }
  process.exit(0)
})

process.on('SIGTERM', () => {
  log('Received SIGTERM. Shutting down...')
  if (devProcess) {
    devProcess.kill('SIGTERM')
  }
  process.exit(0)
})

// 메인 실행
console.log('')
log('='.repeat(50))
log('RG Family Dev Server Monitor')
log(`Memory threshold: ${formatMemory(MEMORY_THRESHOLD_MB)}`)
log(`Check interval: ${CHECK_INTERVAL_MS / 1000}s`)
log(`Node max-old-space: ${formatMemory(NODE_MAX_OLD_SPACE_MB)}`)
log('='.repeat(50))
console.log('')

startDevServer()

// 메모리 체크 루프 시작 (첫 체크는 30초 후)
setTimeout(() => {
  void checkMemory()
  setInterval(() => void checkMemory(), CHECK_INTERVAL_MS)
}, CHECK_INTERVAL_MS)
