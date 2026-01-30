/**
 * 판다라이브 시그니처 스크래핑 스크립트
 * 사용법: npx tsx scripts/scrape-pandalive.ts
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import https from 'https';

const OUTPUT_DIR = '/Users/bagjaeseog/Downloads/_RG패밀리/RG시그 리뉴얼/시그_전체정리';
const DOWNLOAD_DIR = '/tmp/pandalive-signatures';

interface SignatureData {
  number: string;
  imageUrl: string;
}

async function downloadImage(url: string, filepath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      console.error(`  ❌ 다운로드 실패: ${err.message}`);
      resolve(false);
    });
  });
}

async function main() {
  console.log('🚀 판다라이브 시그니처 스크래핑 시작\n');

  // 다운로드 폴더 생성
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const allSignatures: SignatureData[] = [];

  // 페이지 로드
  console.log('📄 판다라이브 시그니처 페이지 로드 중...');
  await page.goto(`https://www.pandalive.co.kr/channel/rgfamily/signature`, {
    waitUntil: 'networkidle'
  });

  // 3페이지 모두 스크래핑
  for (let pageNum = 1; pageNum <= 3; pageNum++) {
    console.log(`\n📄 페이지 ${pageNum} 스크래핑 중...`);

    // 페이지 번호 클릭 (2, 3페이지)
    if (pageNum > 1) {
      // 페이지네이션 버튼 찾기 (정확히 해당 숫자만 포함하는 버튼)
      const pageButtons = await page.$$('button');
      for (const btn of pageButtons) {
        const text = await btn.textContent();
        if (text?.trim() === String(pageNum)) {
          await btn.click();
          console.log(`  ⏳ 페이지 ${pageNum} 로딩 대기...`);
          await page.waitForTimeout(3000);
          break;
        }
      }
    }

    // 스크롤하여 모든 이미지 로드
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // 시그니처 데이터 추출
    const signatures = await page.evaluate(() => {
      const results: { number: string; imageUrl: string }[] = [];
      const buttons = document.querySelectorAll('button');

      buttons.forEach(btn => {
        const text = btn.textContent?.trim() || '';
        // 3~6자리 숫자만 매칭 (페이지 번호와 구분)
        const numMatch = text.match(/^(\d{3,6})$/m);

        if (numMatch) {
          const divs = btn.querySelectorAll('div');
          for (const div of divs) {
            const style = div.getAttribute('style') || '';
            const computedStyle = window.getComputedStyle(div);
            const bgImage = style.includes('background-image')
              ? style
              : computedStyle.backgroundImage;

            if (bgImage && bgImage.includes('HeartIcon')) {
              const urlMatch = bgImage.match(/url\(["']?([^"')]+)["']?\)/);
              if (urlMatch) {
                results.push({
                  number: numMatch[1],
                  imageUrl: urlMatch[1]
                });
                break;
              }
            }
          }
        }
      });

      return results;
    });

    console.log(`  ✅ ${signatures.length}개 시그니처 발견`);
    allSignatures.push(...signatures);
  }

  await browser.close();

  // 중복 제거
  const uniqueSignatures = allSignatures.filter((v, i, a) =>
    a.findIndex(t => t.number === v.number) === i
  );

  console.log(`\n📊 총 ${uniqueSignatures.length}개 고유 시그니처 발견\n`);

  // 이미지 다운로드 및 폴더 정리
  console.log('📥 이미지 다운로드 및 폴더 정리 시작...\n');

  let successCount = 0;
  let failCount = 0;

  for (const sig of uniqueSignatures) {
    const paddedNum = sig.number.padStart(6, '0');
    const folderPattern = `${paddedNum}_`;

    // 해당 폴더 찾기
    const folders = fs.readdirSync(OUTPUT_DIR);
    const targetFolder = folders.find(f => f.startsWith(folderPattern));

    if (!targetFolder) {
      console.log(`⚠️  ${sig.number}: 폴더 없음 - 새로 생성 필요`);
      failCount++;
      continue;
    }

    const folderPath = path.join(OUTPUT_DIR, targetFolder);
    const ext = sig.imageUrl.endsWith('.gif') ? 'gif' : 'png';
    const filename = `${sig.number} 3mb.${ext}`;
    const filepath = path.join(folderPath, filename);

    console.log(`[${sig.number}] ${targetFolder} -> ${filename}`);

    const success = await downloadImage(sig.imageUrl, filepath);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 결과 저장
  fs.writeFileSync(
    path.join(DOWNLOAD_DIR, 'signatures.json'),
    JSON.stringify(uniqueSignatures, null, 2)
  );
  console.log(`\n📁 결과 저장: ${path.join(DOWNLOAD_DIR, 'signatures.json')}`);
}

main().catch(console.error);
