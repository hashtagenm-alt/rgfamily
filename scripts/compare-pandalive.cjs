/**
 * 판다라이브 시그니처와 CSV 비교 스크립트
 */

const fs = require('fs');
const path = require('path');

// 판다라이브에서 수집한 시그니처 목록 (161개)
const PANDALIVE_SIGS = [
  // Page 1
  10022, 1600, 10053, 5015, 5018, 5022, 5044, 5045, 5052, 5053, 5055, 5058,
  5071, 5075, 5084, 1200, 1020, 1038, 1050, 4500, 7000, 1097, 6666, 1078,
  1064, 1019, 1033, 1128, 3838, 6884, 4040, 1022, 2825, 2300, 3333, 1134,
  1153, 1183, 1240, 1257, 1278, 1286, 1297, 1305, 1313, 1358, 1402, 1488,
  1515, 1619, 1919, 1999, 2000, 10558, 10073, 10070, 10033, 10020, 10010, 10009,
  // Page 2
  10008, 10007, 12470, 12412, 10006, 10005, 10004, 10002, 12337, 10003, 10001,
  300000, 200000, 100000, 70000, 50000, 30000, 10000, 9999, 5353, 5444, 8773,
  7777, 5000, 4848, 4444, 4000, 3000, 2650, 2419, 2222, 1878, 1833, 1819,
  1818, 1588, 1674, 1774, 1738, 1712, 1550, 1450, 1425, 1416, 1390, 1385,
  1379, 1367, 1350, 1348, 1333, 1328, 1300, 1291, 1280, 1270, 1262, 1248,
  1237, 1225,
  // Page 3
  1002, 1001, 1000, 777, 666
];

// CSV 파일 읽기
const csvPath = '/Users/bagjaeseog/엑셀 내역 정리/시그_전체현황_20260124.csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.trim().split('\n');

// CSV 파싱 (헤더 제외)
const csvSigs = [];
const missingImages = [];
const missingVideos = [];
const missingAudios = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const parts = line.split(',');
  if (parts.length < 8) continue;

  const sigNumber = parseInt(parts[1]);
  const name = parts[2];
  const video = parts[4];
  const audio = parts[5];
  const image = parts[6];
  const status = parts[7];

  if (isNaN(sigNumber)) continue;

  csvSigs.push({ sigNumber, name, video, audio, image, status });

  if (status.includes('이미지누락')) {
    missingImages.push({ sigNumber, name });
  }
  if (status.includes('영상누락')) {
    missingVideos.push({ sigNumber, name });
  }
  if (status.includes('음원누락')) {
    missingAudios.push({ sigNumber, name });
  }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 판다라이브 vs CSV 비교 분석');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`\n📌 판다라이브 시그니처: ${PANDALIVE_SIGS.length}개`);
console.log(`📌 CSV 시그니처: ${csvSigs.length}개`);

// 판다라이브에만 있는 시그니처
const csvSigNumbers = new Set(csvSigs.map(s => s.sigNumber));
const onlyInPandalive = PANDALIVE_SIGS.filter(s => !csvSigNumbers.has(s));

console.log(`\n🔵 판다라이브에만 있는 시그니처 (${onlyInPandalive.length}개):`);
if (onlyInPandalive.length > 0) {
  console.log('   ', onlyInPandalive.join(', '));
} else {
  console.log('   없음');
}

// CSV에만 있는 시그니처
const pandaSigSet = new Set(PANDALIVE_SIGS);
const onlyInCSV = csvSigs.filter(s => !pandaSigSet.has(s.sigNumber));

console.log(`\n🟢 CSV에만 있는 시그니처 (${onlyInCSV.length}개):`);
if (onlyInCSV.length > 0) {
  onlyInCSV.forEach(s => console.log(`   ${s.sigNumber} - ${s.name}`));
} else {
  console.log('   없음');
}

// 누락 항목
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('❌ CSV에서 누락된 항목들');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

console.log(`\n🖼️  이미지 누락 (${missingImages.length}개):`);
missingImages.forEach(s => {
  const inPanda = PANDALIVE_SIGS.includes(s.sigNumber) ? '✅ 판다O' : '❌ 판다X';
  console.log(`   ${s.sigNumber} - ${s.name} [${inPanda}]`);
});

console.log(`\n🎬 영상 누락 (${missingVideos.length}개):`);
missingVideos.forEach(s => {
  const inPanda = PANDALIVE_SIGS.includes(s.sigNumber) ? '✅ 판다O' : '❌ 판다X';
  console.log(`   ${s.sigNumber} - ${s.name} [${inPanda}]`);
});

console.log(`\n🎵 음원 누락 (${missingAudios.length}개):`);
missingAudios.forEach(s => {
  const inPanda = PANDALIVE_SIGS.includes(s.sigNumber) ? '✅ 판다O' : '❌ 판다X';
  console.log(`   ${s.sigNumber} - ${s.name} [${inPanda}]`);
});

// 판다라이브에서 이미지 다운로드 가능한 항목
const downloadableImages = missingImages.filter(s => PANDALIVE_SIGS.includes(s.sigNumber));
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📥 판다라이브에서 이미지 다운로드 가능한 항목 (${downloadableImages.length}개):`);
downloadableImages.forEach(s => console.log(`   ${s.sigNumber} - ${s.name}`));

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
