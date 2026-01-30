const fs = require('fs');
const path = require('path');

const FOLDER_PATH = '/Users/bagjaeseog/Downloads/_RG패밀리/RG시그 리뉴얼/시그_전체정리';

const folders = fs.readdirSync(FOLDER_PATH).filter(f => {
  return fs.statSync(path.join(FOLDER_PATH, f)).isDirectory();
}).sort();

console.log('=== 전체 폴더 이미지 숫자 검증 ===\n');
console.log('총 폴더 수:', folders.length);

const results = { match: [], mismatch: [], noImage: [], error: [] };

folders.forEach((folder) => {
  const folderPath = path.join(FOLDER_PATH, folder);
  const sigNum = folder.split('_')[0].replace(/^0+/, '');
  
  const files = fs.readdirSync(folderPath);
  const gifFile = files.find(f => f.toLowerCase().endsWith('.gif'));
  
  if (!gifFile) {
    results.noImage.push({ folder, sigNum });
    return;
  }
  
  const fileNumMatch = gifFile.match(/^(\d+)/);
  if (fileNumMatch) {
    const fileNum = fileNumMatch[1];
    if (fileNum === sigNum) {
      results.match.push({ folder, sigNum, gifFile });
    } else {
      results.mismatch.push({ folder, sigNum, fileNum, gifFile });
    }
  } else {
    results.error.push({ folder, sigNum, gifFile });
  }
});

console.log('✅ 일치:', results.match.length + '개');
console.log('❌ 불일치:', results.mismatch.length + '개');
console.log('⚠️ 이미지없음:', results.noImage.length + '개');
console.log('');

if (results.mismatch.length > 0) {
  console.log('=== 불일치 목록 ===');
  results.mismatch.forEach(m => {
    console.log(m.folder + ' (폴더:' + m.sigNum + ', 파일:' + m.fileNum + ')');
  });
}

if (results.noImage.length > 0) {
  console.log('=== 이미지 없음 ===');
  results.noImage.forEach(n => console.log(n.folder));
}
