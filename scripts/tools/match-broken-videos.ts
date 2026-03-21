/**
 * 깨진 영상 20개 vs Google Drive 3개 폴더 매칭 분석
 */

interface BrokenVideo {
  id: number
  sigNumber: number
  title: string
  memberName: string
}

const broken: BrokenVideo[] = [
  { id: 172, sigNumber: 2650, title: '솜사탕', memberName: '홍서하' },
  { id: 178, sigNumber: 10092, title: '르큐리', memberName: '청아' },
  { id: 202, sigNumber: 1030, title: 'Dolls(돌스)', memberName: '린아' },
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

// 폴더1 (13LqA - 플랫)
const folder1Files = [
  '1090 가애.mp4', '1090 해린.mp4', '1134 가윤.mp4', '1158 가윤 .mp4',
  '1174 가윤.mp4', '1225 린아.mp4', '1305 채은.mp4', '1385 홍서하.mp4',
  '1450 월아.mp4', '1774 린아.mp4', '1818 린아.mp4', '1818 채은.mp4', '3333 채은.mp4',
]

// 폴더2 (1Mbpl - 플랫)
const folder2Files = [
  '10005 가애.mp4', '10072 채은.mp4', '1015 한세아.mp4', '1038 한세아.mp4',
  '1044 한백설.mp4', '1055 가애.mp4', '1055 가윤.mp4', '1069 홍서하.mp4',
  '1097 채은.mp4', '1100 한백설.mp4', '11280 청아.mp4', '1183 린아.mp4',
  '1183 한백설.mp4', '1200 가윤.mp4', '1218 가애.mp4', '1237 가윤.mp4',
  '1270 설윤.mp4', '1286 설윤.mp4', '1291 월아.mp4', '1300 해린.mp4',
  '1358 가애.mp4', '1358 설윤.mp4', '1450 가윤.mp4', '1488 한세아.mp4',
  '1738 청아.mp4', '1833 한백설.mp4', '2000 청아.mp4', '2825 린아.mp4',
  '3838 채은.mp4', '4000 월아.mp4', '5000 채은.mp4', '5015 월아.mp4',
  '5058 채은.mp4', '5075 청아.mp4',
]

// 폴더3 (시즌1 - 멤버별) - 파일경로로 저장
const folder3Files: Record<string, string[]> = {
  '홍서하': [
    '10001 홍서하.mp4', '10002 홍서하.mp4', '10003 홍서하.mp4', '10004 홍서하.mp4',
    '10005 홍서하.mp4', '10006 홍서하.mp4', '10007 홍서하.mp4', '10010 홍서하.mp4',
    '1005 홍서하.mp4', '1007 홍서하.mp4', '1008 홍서하.mp4', '1009 홍서하.mp4',
    '1018 홍서하 핫해.mp4', '1050 홍서하.mp4', '10558 홍서하.mp4', '1078 홍서하.mp4',
    '1153 홍서하.mp4', '12412 홍서하.mp4', '2222 홍서하.mp4', '30000 홍서하.mp4',
    '3283 홍서하.mp4', '4040 홍서하.mp4', '5044 홍서하.mp4', '홍서하 솜사탕 2650 .mp4',
  ],
  '청아': [
    '100,000 르큐리 청아.mp4', '10000 청아.mp4', '1002 청아.mp4', '1004 청아.mp4',
    '1005 청아.mp4', '10053 청아.mp4', '1018.mp4', '1128 청아.mp4',
    '1919 청아 .mp4', '30000 청아 .mp4', '50000 청아(르큐리).mp4', '50000 청아.mp4',
  ],
  '린아': [
    '100000 린아.mp4', '10002 린아.mp4', '10007 린아.mp4', '1001 린아.mp4',
    '10010 린아.mp4', '10033 린아.mp4', '10073 린아.mp4', '1026 린아 .mp4',
    '10558 린아.mp4', '1071 린아.mp4', '1080 린아.mp4', '12337 에이맨.mp4',
    '12412 린아.mp4', '1379 린아.mp4', '1588 린아.mp4', '20000 린아.mp4',
    '20012 린아 (큰미키).mp4', '3000 린아 .mp4', '30012 린아 .mp4', '5444 린아.mp4',
    '7777 린아.mp4', '린아 1030 .mp4',
  ],
  '채은': [
    '100,000 채은(김회장).mp4', '1000 채은.mp4', '10022 채은 .mp4', '1004 채은.mp4',
    '10092 르큐리 (채은).mp4', '1010 채은.mp4', '1026 채은(이게 더 잘나옴).mp4',
    '1050 채은.mp4', '1128 채은.mp4', '1180 채은.mp4', '1240 채은.mp4', '1350 채은.mp4',
    '1416 채은.mp4', '20000 채은 김회장 2.mp4', '20000 채은 김회장 3.mp4',
    '20000 채은 김회장 4.mp4', '20000 채은(김회장) 1.mp4', '4040 채은.mp4',
    '50000 채은.mp4', '6884 클로저 채은.mp4', '777 채은.mp4', '채은 1026 .mp4',
    '채은 키세스 777.mp4',
  ],
  '가애': [
    '1000 가애.mp4', '10000 가애.mp4', '10010 가애.mp4', '1002 가애.mp4',
    '10070 가애.mp4', '1009 가애.mp4', '1030.mp4', '1163 가애.mp4',
    '12337 에이맨(가애).mp4', '12470 가애.mp4', '1248 가애.mp4', '20000 가애.mp4',
    '3283 가애.mp4', '5353 가애.mp4', '6884 클로저 가애.mp4', '9999 가애.mp4',
    '가애 10070(미드굿).mp4',
  ],
  '가윤': [
    '1000 가윤.mp4', '10000 가윤.mp4', '10008 가윤.mp4', '1001 가윤.mp4',
    '10018 가윤(씌발이).mp4', '1007 가윤.mp4', '1010 가윤.mp4', '1020 가윤.mp4',
    '1022 가윤.mp4', '1515 가윤.mp4', '1819 가윤.mp4', '3000 가윤.mp4',
    '5055 가윤.mp4', '777 가윤.mp4',
  ],
  '월아': ['1003 월아.mp4', '1006 월아.mp4', '1328 월아.mp4', '1550 월아.mp4'],
  '퀸로니': [
    '10002 퀸로니.mp4', '1278 퀸로니.mp4', '1328 퀸로니.mp4', '1999 퀸로니.mp4',
    '4500 퀸로니.mp4', '777 키세스 퀸로니.mp4',
  ],
  '한백설': ['1002 한백설.mp4', '1010 한백설.mp4', '1128 한백설.mp4'],
  '한세아': ['10045 호랭이 .mp4', '1125 한세아.mp4', '1297 한세아.mp4', '3000 한세아.mp4'],
  '해린': ['1001 해린.mp4', '1080 해린.mp4', '1425 해린.mp4', '1674 해린.mp4'],
  '설윤': ['1002 설윤.mp4', '1008 설윤.mp4', '1050 설윤 .mp4', '1257 설윤.mp4'],
  '키키': ['5000 키키.mp4'],
}

function parseSigNumber(filename: string): number | null {
  const withoutExt = filename.replace(/\.(mp4|mov)$/i, '').trim()
  const cleaned = withoutExt.replace(/,/g, '')
  // 앞에서 숫자 찾기
  const match = cleaned.match(/^(\d+)/)
  if (match) return parseInt(match[1])
  // 뒤에서 숫자 찾기 (예: "홍서하 솜사탕 2650")
  const match2 = cleaned.match(/(\d+)\s*$/)
  if (match2) return parseInt(match2[1])
  // 중간에서 숫자 찾기 (예: "린아 1030")
  const match3 = cleaned.match(/\s(\d+)/)
  if (match3) return parseInt(match3[1])
  return null
}

function parseMember(filename: string): string | null {
  const withoutExt = filename.replace(/\.(mp4|mov)$/i, '').trim()
  const cleaned = withoutExt.replace(/,/g, '').replace(/\(.*?\)/g, '').trim()
  // 숫자 제거 후 남은 텍스트
  const name = cleaned.replace(/^\d+\s*/, '').replace(/\s*\d+$/, '').trim()
  return name || null
}

console.log('='.repeat(70))
console.log('깨진 영상 20개 vs Google Drive 3개 폴더 매칭 분석')
console.log('='.repeat(70))

let matched = 0
let unmatched = 0

for (const b of broken) {
  let found: string[] = []

  // 폴더1 검색
  for (const f of folder1Files) {
    const sigNum = parseSigNumber(f)
    const member = parseMember(f)
    if (sigNum === b.sigNumber && member === b.memberName) {
      found.push(`폴더1: ${f}`)
    }
  }

  // 폴더2 검색
  for (const f of folder2Files) {
    const sigNum = parseSigNumber(f)
    const member = parseMember(f)
    if (sigNum === b.sigNumber && member === b.memberName) {
      found.push(`폴더2: ${f}`)
    }
  }

  // 폴더3 검색 (멤버 폴더에서)
  const memberFiles = folder3Files[b.memberName] || []
  for (const f of memberFiles) {
    const sigNum = parseSigNumber(f)
    if (sigNum === b.sigNumber) {
      found.push(`폴더3(시즌1/${b.memberName}): ${f}`)
    }
  }

  if (found.length > 0) {
    matched++
    console.log(`\n✅ ID:${b.id} | sig${b.sigNumber} "${b.title}" | ${b.memberName}`)
    for (const loc of found) {
      console.log(`   → ${loc}`)
    }
  } else {
    unmatched++
    console.log(`\n❌ ID:${b.id} | sig${b.sigNumber} "${b.title}" | ${b.memberName}`)
    console.log(`   → 3개 폴더 모두에서 매칭 파일 없음`)
  }
}

console.log('\n' + '='.repeat(70))
console.log(`매칭됨: ${matched}개, 매칭 안됨: ${unmatched}개`)
console.log('='.repeat(70))
