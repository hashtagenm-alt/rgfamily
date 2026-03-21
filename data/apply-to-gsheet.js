#!/usr/bin/env node
/**
 * CSV → Google Sheets 기여도전쟁 데이터 임포트
 *
 * 사용법:
 *   node data/apply-to-gsheet.js <csv_path> [web_app_url]
 *
 * 예시:
 *   # 분석만 (dry-run)
 *   node data/apply-to-gsheet.js ~/Downloads/시즌_내역.csv
 *
 *   # Google Sheets에 전송
 *   node data/apply-to-gsheet.js ~/Downloads/시즌_내역.csv https://script.google.com/macros/s/.../exec
 */

const fs = require('fs');
const path = require('path');

// =========================================
// CSV 파싱
// =========================================

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const cols = parseCSVLine(line);
    const donor = cols[1] || '';
    const { id, nickname } = parseDonor(donor);

    records.push({
      timestamp: cols[0] || '',
      donorRaw: donor,
      donorId: id,
      donorNick: nickname,
      hearts: parseInt(cols[2]) || 0,       // 후원하트 (항상 양수)
      bjName: (cols[3] || '').trim(),
      score: parseInt(cols[4]) || 0,         // 하트점수 (음수 가능)
      contribution: parseInt(cols[5]) || 0,  // 기여도 (누적)
      note: (cols[6] || '').trim(),          // 기타 (수정 등)
    });
  }

  return records;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseDonor(raw) {
  // "hhh754(세린ෆ한지우)" → { id: "hhh754", nickname: "세린ෆ한지우" }
  // "9521954@filecast(보고싶은다해)" → { id: "9521954@filecast", nickname: "보고싶은다해" }
  const match = raw.match(/^(.+?)\((.+)\)$/);
  if (match) {
    return { id: match[1], nickname: match[2] };
  }
  return { id: raw, nickname: raw };
}

// =========================================
// 분석
// =========================================

function analyzeRecords(records) {
  // BJ별 집계
  const bjTotals = {};

  for (const r of records) {
    const bj = r.bjName;
    if (!bj) continue;

    if (!bjTotals[bj]) {
      bjTotals[bj] = { hearts: 0, score: 0, count: 0, sigCount: 0, negCount: 0 };
    }

    bjTotals[bj].hearts += r.hearts;
    bjTotals[bj].score += r.score;
    bjTotals[bj].count += 1;

    if (r.hearts >= 30000) bjTotals[bj].sigCount += 1;
    if (r.score < 0) bjTotals[bj].negCount += 1;
  }

  // 후원자별 집계
  const donorTotals = {};
  for (const r of records) {
    const donor = r.donorNick || r.donorId;
    if (!donorTotals[donor]) {
      donorTotals[donor] = { hearts: 0, count: 0, bjs: new Set() };
    }
    donorTotals[donor].hearts += r.hearts;
    donorTotals[donor].count += 1;
    donorTotals[donor].bjs.add(r.bjName);
  }

  return { bjTotals, donorTotals };
}

function printSummary(records, analysis) {
  const { bjTotals, donorTotals } = analysis;

  const totalHearts = Object.values(bjTotals).reduce((s, b) => s + b.hearts, 0);
  const totalScore = Object.values(bjTotals).reduce((s, b) => s + b.score, 0);

  console.log('\n' + '='.repeat(65));
  console.log(' 기여도전쟁 CSV 분석 결과');
  console.log('='.repeat(65));
  console.log(`  총 후원 건수 : ${records.length}건`);
  console.log(`  총 후원하트  : ${totalHearts.toLocaleString()}`);
  console.log(`  총 하트점수  : ${totalScore.toLocaleString()}`);
  console.log(`  기간         : ${records[records.length - 1].timestamp} ~ ${records[0].timestamp}`);

  // BJ별 하트점수 (내림차순)
  console.log('\n  [BJ별 하트점수 집계]');
  console.log('  ' + '-'.repeat(61));
  console.log('  ' + 'BJ'.padEnd(22) + '하트점수'.padStart(10) + '후원하트'.padStart(10) + '건수'.padStart(6) + '시그'.padStart(5) + '감점'.padStart(5));
  console.log('  ' + '-'.repeat(61));

  const sorted = Object.entries(bjTotals)
    .sort((a, b) => b[1].score - a[1].score);

  for (const [bj, data] of sorted) {
    const scoreStr = data.score.toLocaleString();
    const heartsStr = data.hearts.toLocaleString();
    const countStr = data.count.toString();
    const sigStr = data.sigCount > 0 ? data.sigCount.toString() : '-';
    const negStr = data.negCount > 0 ? data.negCount.toString() : '-';
    console.log(`  ${bj.padEnd(22)}${scoreStr.padStart(10)}${heartsStr.padStart(10)}${countStr.padStart(6)}${sigStr.padStart(5)}${negStr.padStart(5)}`);
  }

  // 마일스톤 도달 여부
  console.log('\n  [마일스톤 감지 (1만점 단위)]');
  console.log('  ' + '-'.repeat(50));
  for (const [bj, data] of sorted) {
    const milestones = Math.floor(data.score / 10000);
    if (milestones > 0) {
      console.log(`  ${bj}: ${data.score.toLocaleString()}점 → 강탈 ${milestones}회 가능`);
    }
  }

  // 시그 후원 감지
  const sigDonations = records.filter(r => r.hearts >= 30000);
  if (sigDonations.length > 0) {
    console.log('\n  [시그 후원 (3만+)]');
    console.log('  ' + '-'.repeat(50));
    for (const s of sigDonations) {
      console.log(`  ${s.donorNick} → ${s.bjName} ${s.hearts.toLocaleString()}하트 (${s.timestamp})`);
    }
  }

  // 감점(음수 하트점수) 내역
  const negRecords = records.filter(r => r.score < 0);
  if (negRecords.length > 0) {
    console.log('\n  [감점 내역 (음수 하트점수)]');
    console.log('  ' + '-'.repeat(50));
    for (const r of negRecords) {
      console.log(`  ${r.donorNick} → ${r.bjName} ${r.score.toLocaleString()}점 (후원하트: ${r.hearts}, ${r.timestamp})`);
    }
  }

  // 후원자 TOP 10
  console.log('\n  [후원자 TOP 10]');
  console.log('  ' + '-'.repeat(55));

  const topDonors = Object.entries(donorTotals)
    .sort((a, b) => b[1].hearts - a[1].hearts)
    .slice(0, 10);

  for (const [donor, data] of topDonors) {
    const bjList = [...data.bjs].join(', ');
    console.log(`  ${donor.substring(0, 22).padEnd(22)} ${data.hearts.toLocaleString().padStart(10)}하트 (${data.count}건) → ${bjList}`);
  }

  console.log('\n' + '='.repeat(65));
}

// =========================================
// Google Sheets 전송
// =========================================

async function sendToSheets(records, webAppUrl) {
  // 시간순 정렬 (오래된 것부터)
  const sorted = [...records].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const donations = sorted.map(r => ({
    timestamp: new Date(r.timestamp).getTime(),
    donor: r.donorNick || r.donorId,
    maskedId: r.donorId,
    count: r.hearts,
    score: r.score,
    bjName: r.bjName,
    note: r.note,
  }));

  // 10건씩 배치 전송 (GET URL 길이 제한 대응)
  const BATCH_SIZE = 10;
  const batches = [];
  for (let i = 0; i < donations.length; i += BATCH_SIZE) {
    batches.push(donations.slice(i, i + BATCH_SIZE));
  }

  console.log(`\n  Google Sheets 전송 시작 (${batches.length}개 배치, 총 ${donations.length}건)`);

  let totalProcessed = 0;
  const allMilestones = [];
  const allSigAlerts = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    process.stdout.write(`  배치 ${i + 1}/${batches.length} (${batch.length}건)... `);

    try {
      // Google Apps Script "모든 사용자" 배포는 POST 리다이렉트가 깨짐
      // GET + data 파라미터로 전달 (doGet에서 doPost로 위임)
      const payload = JSON.stringify({ action: 'batch', donations: batch });
      const url = webAppUrl + '?data=' + encodeURIComponent(payload);

      const resp = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
      });

      const text = await resp.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        console.log(`FAIL: 응답이 JSON이 아님 (${text.substring(0, 100)}...)`);
        continue;
      }

      if (result.status === 'ok') {
        totalProcessed += result.processed || 0;
        if (result.milestones) allMilestones.push(...result.milestones);
        if (result.sigAlerts) allSigAlerts.push(...result.sigAlerts);
        console.log(`OK (${result.processed}건)`);
      } else {
        console.log(`ERR: ${result.message}`);
      }
    } catch (err) {
      console.log(`FAIL: ${err.message}`);
    }

    // Rate limit 방지
    if (i < batches.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  console.log(`\n  전송 완료: ${totalProcessed}/${donations.length}건`);

  if (allMilestones.length > 0) {
    console.log('\n  [마일스톤 알림]');
    for (const m of allMilestones) {
      console.log(`  ${m.message}`);
    }
  }

  if (allSigAlerts.length > 0) {
    console.log('\n  [시그 후원 알림]');
    for (const s of allSigAlerts) {
      console.log(`  ${s.bj} <- ${s.donor} ${s.amount.toLocaleString()}하트`);
    }
  }
}

// =========================================
// 메인
// =========================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('사용법: node data/apply-to-gsheet.js <csv_path> [web_app_url]');
    console.log('');
    console.log('  csv_path    : CSV 파일 경로');
    console.log('  web_app_url : Google Sheets Web App URL (없으면 분석만 수행)');
    process.exit(1);
  }

  const csvPath = args[0];
  const webAppUrl = args[1];

  if (!fs.existsSync(csvPath)) {
    console.error(`파일을 찾을 수 없습니다: ${csvPath}`);
    process.exit(1);
  }

  // CSV 파싱
  console.log(`CSV 파일 읽기: ${path.basename(csvPath)}`);
  const records = parseCSV(csvPath);
  console.log(`  ${records.length}건 파싱 완료`);

  // 분석
  const analysis = analyzeRecords(records);
  printSummary(records, analysis);

  // Google Sheets 전송
  if (webAppUrl) {
    await sendToSheets(records, webAppUrl);
  } else {
    console.log('\n  Google Sheets에 전송하려면 Web App URL을 인자로 추가하세요:');
    console.log(`  node data/apply-to-gsheet.js "${csvPath}" <WEB_APP_URL>\n`);
  }
}

main().catch(err => {
  console.error('오류:', err);
  process.exit(1);
});
