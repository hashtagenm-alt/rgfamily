/**
 * 깨진 영상 - 유사 매칭 분석
 * sig_number는 같지만 멤버가 다른 파일, 또는 멤버는 같지만 sig_number가 근접한 파일 찾기
 */

interface BrokenVideo {
  id: number
  sigNumber: number
  title: string
  memberName: string
}

const broken: BrokenVideo[] = [
  { id: 178, sigNumber: 10092, title: '르큐리', memberName: '청아' },
  { id: 206, sigNumber: 1818, title: '욕시그', memberName: '퀸로니' },
  { id: 210, sigNumber: 1036, title: 'L.U.V', memberName: '홍서하' },
  { id: 211, sigNumber: 1008, title: 'WAIT', memberName: '한백설' },
  { id: 212, sigNumber: 1919, title: '젖젖', memberName: '채은' },
  { id: 213, sigNumber: 3000, title: '결혼할래', memberName: '월아' },
  { id: 215, sigNumber: 5052, title: '해린 응원가', memberName: '해린' },
  { id: 216, sigNumber: 10119, title: '까부는 넌 내꺼야', memberName: '채은' },
  { id: 217, sigNumber: 10119, title: '까부는 넌 내꺼야', memberName: '가애' },
  { id: 218, sigNumber: 1009, title: 'BLUE VALENTINE', memberName: '린아' },
  { id: 219, sigNumber: 5045, title: '한세아 응원가', memberName: '한세아' },
  { id: 220, sigNumber: 1036, title: 'L.U.V', memberName: '월아' },
  { id: 222, sigNumber: 5444, title: 'NANANA', memberName: '한세아' },
  { id: 224, sigNumber: 1385, title: '오빠 하앙', memberName: '린아' },
  { id: 226, sigNumber: 2825, title: '오빠 바이러스', memberName: '채은' },
  { id: 227, sigNumber: 12412, title: '미키', memberName: '채은' },
  { id: 230, sigNumber: 3333, title: '드라군', memberName: '가애' },
  { id: 231, sigNumber: 1218, title: 'bubble', memberName: '가윤' },
]

// 모든 폴더의 파일을 (sigNumber, member, location) 형태로 통합
interface DriveFile {
  sigNumber: number
  memberName: string
  fileName: string
  location: string
}

function parseSigNumber(filename: string): number | null {
  const withoutExt = filename.replace(/\.(mp4|mov)$/i, '').trim()
  const cleaned = withoutExt.replace(/,/g, '')
  const match = cleaned.match(/^(\d+)/)
  if (match) return parseInt(match[1])
  const match2 = cleaned.match(/(\d+)\s*$/)
  if (match2) return parseInt(match2[1])
  const match3 = cleaned.match(/\s(\d+)/)
  if (match3) return parseInt(match3[1])
  return null
}

function parseMember(filename: string): string {
  const withoutExt = filename.replace(/\.(mp4|mov)$/i, '').trim()
  const cleaned = withoutExt.replace(/,/g, '').replace(/\(.*?\)/g, '').trim()
  return cleaned.replace(/^\d+\s*/, '').replace(/\s*\d+$/, '').trim()
}

const allFiles: DriveFile[] = []

// 폴더1
const f1 = ['1090 가애', '1090 해린', '1134 가윤', '1158 가윤', '1174 가윤', '1225 린아', '1305 채은', '1385 홍서하', '1450 월아', '1774 린아', '1818 린아', '1818 채은', '3333 채은']
f1.forEach(n => { const s = parseSigNumber(n+'.mp4'); if(s) allFiles.push({sigNumber:s, memberName:parseMember(n+'.mp4'), fileName:n+'.mp4', location:'폴더1'}) })

// 폴더2
const f2 = ['10005 가애','10072 채은','1015 한세아','1038 한세아','1044 한백설','1055 가애','1055 가윤','1069 홍서하','1097 채은','1100 한백설','11280 청아','1183 린아','1183 한백설','1200 가윤','1218 가애','1237 가윤','1270 설윤','1286 설윤','1291 월아','1300 해린','1358 가애','1358 설윤','1450 가윤','1488 한세아','1738 청아','1833 한백설','2000 청아','2825 린아','3838 채은','4000 월아','5000 채은','5015 월아','5058 채은','5075 청아']
f2.forEach(n => { const s = parseSigNumber(n+'.mp4'); if(s) allFiles.push({sigNumber:s, memberName:parseMember(n+'.mp4'), fileName:n+'.mp4', location:'폴더2'}) })

// 폴더3 (시즌1)
const f3: Record<string, string[]> = {
  '홍서하': ['10001','10002','10003','10004','10005','10006','10007','10010','1005','1007','1008','1009','1018 홍서하 핫해','1050','10558','1078','1153','12412','2222','30000','3283','4040','5044','홍서하 솜사탕 2650'],
  '청아': ['100,000 르큐리 청아','10000','1002','1004','1005','10053','1018','1128','1919 청아','30000 청아','50000 청아(르큐리)','50000'],
  '린아': ['100000','10002','10007','1001','10010','10033','10073','1026 린아','10558','1071','1080','12337 에이맨','12412','1379','1588','20000','20012 린아 (큰미키)','3000 린아','30012 린아','5444','7777','린아 1030'],
  '채은': ['100,000 채은(김회장)','1000','10022 채은','1004','10092 르큐리 (채은)','1010','1026 채은(이게 더 잘나옴)','1050','1128','1180','1240','1350','1416','20000 채은 김회장 2','20000 채은 김회장 3','20000 채은 김회장 4','20000 채은(김회장) 1','4040','50000','6884 클로저 채은','777','채은 1026','채은 키세스 777'],
  '가애': ['1000','10000','10010','1002','10070','1009','1030','1163','12337 에이맨(가애)','12470','1248','20000','3283','5353','6884 클로저 가애','9999','가애 10070(미드굿)'],
  '가윤': ['1000','10000','10008','1001','10018 가윤(씌발이)','1007','1010','1020','1022','1515','1819','3000','5055','777'],
  '월아': ['1003','1006','1328','1550'],
  '퀸로니': ['10002','1278','1328','1999','4500','777 키세스 퀸로니'],
  '한백설': ['1002','1010','1128'],
  '한세아': ['10045 호랭이','1125','1297','3000'],
  '해린': ['1001','1080','1425','1674'],
  '설윤': ['1002','1008','1050 설윤','1257'],
  '키키': ['5000'],
}

for (const [member, files] of Object.entries(f3)) {
  for (const f of files) {
    const fullName = f.includes(member) || f.includes('르큐리') || f.includes('에이맨') || f.includes('클로저') || f.includes('호랭이') || f.includes('키세스') || f.includes('김회장') || f.includes('씌발이') || f.includes('미드굿') || f.includes('큰미키')
      ? f + '.mp4'
      : f + ' ' + member + '.mp4'
    const sigNum = parseSigNumber(fullName)
    if (sigNum) {
      allFiles.push({ sigNumber: sigNum, memberName: member, fileName: fullName, location: `시즌1/${member}` })
    }
  }
}

console.log('='.repeat(70))
console.log('깨진 영상 18개 - 유사 파일 검색')
console.log('(같은 sig_number의 다른 멤버 / 같은 멤버의 유사 sig_number)')
console.log('='.repeat(70))

for (const b of broken) {
  console.log(`\n🔍 ID:${b.id} | sig${b.sigNumber} "${b.title}" | ${b.memberName}`)

  // 같은 sig_number, 다른 멤버
  const sameSig = allFiles.filter(f => f.sigNumber === b.sigNumber && f.memberName !== b.memberName)
  if (sameSig.length > 0) {
    console.log('   같은 sig_number 다른 멤버:')
    for (const f of sameSig) {
      console.log(`     ${f.location}: ${f.fileName} (${f.memberName})`)
    }
  }

  // 같은 멤버, sig_number 없는 경우 확인
  const sameMember = allFiles.filter(f => f.memberName === b.memberName)
  const hasSameSigMember = sameMember.some(f => f.sigNumber === b.sigNumber)

  if (!hasSameSigMember) {
    console.log(`   ⚠️ ${b.memberName}의 sig${b.sigNumber} 파일은 3개 폴더 어디에도 없음`)
  }
}

// 최종 요약
console.log('\n' + '='.repeat(70))
console.log('요약: 3개 폴더에서 원본을 찾을 수 없는 영상')
console.log('='.repeat(70))
const unfound = broken.filter(b => !allFiles.some(f => f.sigNumber === b.sigNumber && f.memberName === b.memberName))
for (const b of unfound) {
  console.log(`  ID:${b.id} | sig${b.sigNumber} "${b.title}" | ${b.memberName}`)
}
console.log(`\n총 ${unfound.length}개 - 원본 파일 별도 확보 필요`)
