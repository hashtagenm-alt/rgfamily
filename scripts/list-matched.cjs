const fs = require('fs');
const path = require('path');

const FOLDER_PATH = '/Users/bagjaeseog/Downloads/_RG패밀리/RG시그 리뉴얼/시그_전체정리';
const folders = fs.readdirSync(FOLDER_PATH).filter(f => fs.statSync(path.join(FOLDER_PATH, f)).isDirectory()).sort();

console.log('=== 이미지 있는 폴더 (숫자 일치 확인) ===\n');

let count = 0;
folders.forEach((folder) => {
  const folderPath = path.join(FOLDER_PATH, folder);
  const sigNum = folder.split('_')[0].replace(/^0+/, '');
  const folderName = folder.split('_').slice(1).join('_');
  
  const files = fs.readdirSync(folderPath);
  const gifFile = files.find(f => f.toLowerCase().endsWith('.gif'));
  
  if (gifFile) {
    const fileNumMatch = gifFile.match(/^(\d+)/);
    if (fileNumMatch && fileNumMatch[1] === sigNum) {
      count++;
      console.log(count + '. ' + sigNum + ' (' + folderName + ') ✓');
    }
  }
});

console.log('\n총 ' + count + '개 폴더 이미지 숫자 일치 확인 완료');
