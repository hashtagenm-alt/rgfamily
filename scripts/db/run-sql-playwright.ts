/**
 * Playwright를 사용해서 Supabase Dashboard SQL Editor에서 SQL 실행
 * 별도 임시 프로필 사용 — 로그인 필요 시 60초 대기
 */
import { chromium } from 'playwright'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'

const PROJECT_REF = 'cdiptfmagemjfmsuphaj'
const SQL_EDITOR_URL = `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`

const SQL_TO_RUN = `-- media_content: is_published 컬럼 추가
ALTER TABLE media_content ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;
UPDATE media_content SET is_published = true WHERE is_published = false;
CREATE INDEX IF NOT EXISTS idx_media_content_published ON media_content (is_published) WHERE is_published = true;

-- signature_videos: is_published 컬럼 추가
ALTER TABLE signature_videos ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;
UPDATE signature_videos SET is_published = true WHERE is_published = false;
CREATE INDEX IF NOT EXISTS idx_sig_videos_published ON signature_videos (is_published) WHERE is_published = true;`

async function run() {
  // 임시 프로필 디렉토리 (재사용 가능하도록 고정 경로)
  const userDataDir = path.join(os.tmpdir(), 'playwright-supabase-profile')
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true })
  }

  console.log('🚀 Chrome 실행 중 (별도 프로필)...')

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',
    args: ['--disable-blink-features=AutomationControlled'],
    viewport: { width: 1400, height: 900 },
  })

  const page = context.pages()[0] || await context.newPage()

  try {
    // 1. SQL Editor로 이동
    console.log('📍 Supabase SQL Editor로 이동...')
    await page.goto(SQL_EDITOR_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(3000)

    // 로그인 필요 여부 확인
    const currentUrl = page.url()
    if (currentUrl.includes('sign-in') || currentUrl.includes('login') || !currentUrl.includes(PROJECT_REF)) {
      console.log('')
      console.log('🔑 Supabase 로그인이 필요합니다!')
      console.log('   브라우저에서 로그인해주세요. (60초 대기)')
      console.log('')

      // 로그인 완료될 때까지 폴링 (최대 60초)
      for (let i = 0; i < 60; i++) {
        await page.waitForTimeout(1000)
        const url = page.url()
        if (url.includes(PROJECT_REF)) {
          console.log('✅ 로그인 완료!')
          break
        }
        if (i === 59) {
          console.log('⏰ 타임아웃 — 로그인을 완료하지 못했습니다.')
          await context.close()
          return
        }
      }

      // SQL Editor 페이지로 다시 이동
      await page.goto(SQL_EDITOR_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(3000)
    }

    // SQL Editor 페이지 로드 대기
    console.log('⏳ SQL Editor 로드 대기...')
    await page.waitForTimeout(3000)

    // 2. Monaco 에디터 찾기 및 SQL 입력
    console.log('📝 SQL 입력 중...')

    // Monaco 에디터에 포커스
    const monacoEditor = page.locator('.monaco-editor').first()
    await monacoEditor.waitFor({ timeout: 15000 })
    await monacoEditor.click()
    await page.waitForTimeout(500)

    // 기존 내용 전체 선택 후 삭제
    await page.keyboard.press('Meta+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(200)

    // SQL 한 줄씩 타이핑 (clipboard가 안 될 수 있으므로)
    // fill 방식 대신 Monaco의 setValue를 사용
    await page.evaluate((sql) => {
      // Monaco editor의 모델에 직접 값 설정
      const editors = (window as any).monaco?.editor?.getEditors?.()
      if (editors && editors.length > 0) {
        editors[0].setValue(sql)
      }
    }, SQL_TO_RUN)
    await page.waitForTimeout(500)

    // Monaco가 없으면 타이핑으로 폴백
    const editorContent = await page.evaluate(() => {
      const editors = (window as any).monaco?.editor?.getEditors?.()
      return editors?.[0]?.getValue() || ''
    })

    if (!editorContent.includes('is_published')) {
      console.log('   Monaco API 사용 불가 — 직접 타이핑 중...')
      await page.keyboard.press('Meta+a')
      await page.keyboard.press('Backspace')
      await page.keyboard.type(SQL_TO_RUN, { delay: 5 })
    }

    await page.waitForTimeout(1000)

    // 3. Run 버튼 클릭 (Cmd+Enter)
    console.log('▶️  SQL 실행 중...')
    await page.keyboard.press('Meta+Enter')

    // 결과 대기
    await page.waitForTimeout(5000)

    // 4. 결과 확인 — 페이지에서 에러/성공 메시지 추출
    const resultText = await page.evaluate(() => {
      // 결과 영역에서 텍스트 추출
      const resultEl = document.querySelector('[class*="result"]') ||
                        document.querySelector('[data-state="open"]') ||
                        document.querySelector('.cm-content')
      return resultEl?.textContent?.slice(0, 500) || 'No result element found'
    })

    console.log('\n📋 실행 결과:')
    console.log(resultText)
    console.log('\n✅ SQL 실행 완료! 브라우저에서 결과를 확인해주세요.')

    // 결과 확인 시간 제공
    console.log('   10초 후 브라우저가 닫힙니다...')
    await page.waitForTimeout(10000)

  } catch (err) {
    console.error('❌ 오류:', err)
    console.log('   30초 후 브라우저가 닫힙니다...')
    await page.waitForTimeout(30000)
  } finally {
    await context.close()
  }
}

run().catch(console.error)
