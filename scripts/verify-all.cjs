const fs = require('fs');
const path = require('path');

const CSV_PATH = '/Users/bagjaeseog/엑셀 내역 정리/시그_전체현황_20260124.csv';
const FOLDER_PATH = '/Users/bagjaeseog/Downloads/_RG패밀리/RG시그 리뉴얼/시그_전체정리';

// CSV 읽기
const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
const csvLines = csvContent.trim().split('\n').slice(1); // 헤더 제외

const csvData = csvLines.map(line => {
  const parts = line.split(',');
  return {
    seq: parts[0],
    sigNumber: parts[1],
    name: parts[2],
    fullName: parts[1] + '_' + parts[2]
  };
}).filter(d => d.sigNumber);

// 폴더 읽기
const folders = fs.readdirSync(FOLDER_PATH).filter(f => {
  return fs.statSync(path.join(FOLDER_PATH, f)).isDirectory();
});

console.log('=== 2차 검증: CSV vs 폴더 비교 ===\n');
console.log('CSV 시그니처 수:', csvData.length);
console.log('폴더 수:', folders.length);
console.log('');

// 불일치 찾기
const mismatches = [];
const csvMissing = [];
const folderMissing = [];

csvData.forEach(csv => {
  const paddedNum = csv.sigNumber.padStart(6, '0');
  const expectedFolder = paddedNum + '_' + csv.name;
  
  // 해당 시그번호로 시작하는 폴더 찾기
  const matchingFolder = folders.find(f => f.startsWith(paddedNum));
  
  if (!matchingFolder) {
    folderMissing.push({ csv, expected: expectedFolder });
  } else if (matchingFolder !== expectedFolder) {
    mismatches.push({
      sigNumber: csv.sigNumber,
      csvName: csv.name,
      expected: expectedFolder,
      actual: matchingFolder
    });
  }
});

// 폴더는 있지만 CSV에 없는 것
folders.forEach(folder => {
  const sigNum = folder.split('_')[0];
  const found = csvData.find(c => c.sigNumber.padStart(6, '0') === sigNum);
  if (!found) {
    csvMissing.push(folder);
  }
});

if (mismatches.length === 0 && folderMissing.length === 0 && csvMissing.length === 0) {
  console.log('✅ 모든 항목 일치! 불일치 없음.\n');
} else {
  if (mismatches.length > 0) {
    console.log('❌ 이름 불일치 (' + mismatches.length + '개):');
    mismatches.forEach(m => {
      console.log('  ' + m.sigNumber + ': CSV="' + m.csvName + '"');
      console.log('    예상: ' + m.expected);
      console.log('    실제: ' + m.actual);
    });
    console.log('');
  }
  
  if (folderMissing.length > 0) {
    console.log('❌ 폴더 없음 (' + folderMissing.length + '개):');
    folderMissing.forEach(f => {
      console.log('  ' + f.csv.sigNumber + ' ' + f.csv.name + ' -> ' + f.expected);
    });
    console.log('');
  }
  
  if (csvMissing.length > 0) {
    console.log('❌ CSV에 없는 폴더 (' + csvMissing.length + '개):');
    csvMissing.forEach(f => console.log('  ' + f));
    console.log('');
  }
}

// 주요 수정 항목 확인
console.log('=== 주요 수정 항목 확인 ===');
const checkItems = ['5055', '10053', '10054'];
checkItems.forEach(num => {
  const csv = csvData.find(c => c.sigNumber === num);
  const paddedNum = num.padStart(6, '0');
  const folder = folders.find(f => f.startsWith(paddedNum));
  
  console.log(num + ':');
  console.log('  CSV: ' + (csv ? csv.name : 'NOT FOUND'));
  console.log('  폴더: ' + (folder || 'NOT FOUND'));
  
  if (csv && folder) {
    const expected = paddedNum + '_' + csv.name;
    console.log('  일치: ' + (folder === expected ? '✓' : '✗ (예상: ' + expected + ')'));
  }
});
