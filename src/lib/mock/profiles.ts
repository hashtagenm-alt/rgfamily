/**
 * Mock Profiles Data - 시즌 1 후원 랭킹 (1회차 방송 기준)
 * 후원자/사용자 데이터 - Top 50
 */

import type { Profile } from '@/types/database'
import { getPlaceholderAvatar } from './utils'

// Mock Admin 계정 (admin/admin으로 로그인 가능)
export const mockAdminProfile: Profile = {
  id: 'admin-user',
  nickname: 'Admin',
  email: 'admin@example.com',
  avatar_url: getPlaceholderAvatar('admin'),
  role: 'superadmin',
  unit: null,
  total_donation: 0,
  pandatv_id: null,
  account_type: 'system', // 시스템 관리자 계정
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-12-30T00:00:00Z',
}

// 시즌 1 후원 랭킹 Top 50 (1회차 방송 기준)
const season1Top50 = [
  { rank: 1, id: 'luka831', name: '손밍매니아', hearts: 254663, unit: 'excel' },
  { rank: 2, id: 'mickey94', name: '미키™', hearts: 215381, unit: 'excel' },
  { rank: 3, id: 'ilcy2k', name: '쩔어서짜다', hearts: 185465, unit: 'excel' },
  { rank: 4, id: '2395546632', name: '❥CaNnOt', hearts: 176754, unit: 'excel' },
  { rank: 5, id: 'skypower1119', name: '까부는넌내꺼야119', hearts: 70847, unit: 'excel' },
  { rank: 6, id: 'symail92', name: '☀칰힌사주면천사☀', hearts: 58895, unit: 'excel' },
  { rank: 7, id: 'welcometome791', name: '한세아♡백작♡하얀만두피', hearts: 49523, unit: 'excel' },
  { rank: 8, id: '16516385', name: '시라☆구구단☆시우', hearts: 48690, unit: 'excel' },
  { rank: 9, id: 'yuricap85', name: '한세아내꺼♡호랭이', hearts: 47367, unit: 'excel' },
  { rank: 10, id: 'ksbjh77', name: '[RG]✨린아의발굴™', hearts: 40685, unit: 'excel' },
  { rank: 11, id: 'thursdayday', name: '미드굿♣️가애', hearts: 36970, unit: 'excel' },
  { rank: 12, id: 'rhehrgks486', name: '❤️지수ෆ해린❤️치토스㉦', hearts: 36488, unit: 'excel' },
  { rank: 13, id: 'tmdgus080222', name: '조패러갈꽈', hearts: 27020, unit: 'excel' },
  { rank: 14, id: 'bbwin12', name: '✨바위늪✨', hearts: 25062, unit: 'excel' },
  { rank: 15, id: 'bravo1975', name: '가윤이꼬❤️함주라', hearts: 22822, unit: 'excel' },
  { rank: 16, id: 'tnvenvelv777', name: 'qldh라유', hearts: 22621, unit: 'excel' },
  { rank: 17, id: 'loveday77', name: '[RG]린아✨여행™', hearts: 19032, unit: 'excel' },
  { rank: 18, id: 'skrrrr12', name: '김스껄', hearts: 15741, unit: 'excel' },
  { rank: 19, id: 'museent03020302', name: '[로진]43세정영민', hearts: 14432, unit: 'excel' },
  { rank: 20, id: 'rriiiqp123', name: '이태린ෆ', hearts: 14205, unit: 'excel' },
  { rank: 21, id: 'uuu981214', name: 'ෆ유은', hearts: 13797, unit: 'excel' },
  { rank: 22, id: 'wony0502', name: '홍서하네❥페르소나™', hearts: 12364, unit: 'excel' },
  { rank: 23, id: 'kim6223164', name: '57774', hearts: 12208, unit: 'excel' },
  { rank: 24, id: 'wow486', name: '니니ღ', hearts: 12095, unit: 'excel' },
  { rank: 25, id: 'akffkdcodl', name: '말랑채이', hearts: 12003, unit: 'excel' },
  { rank: 26, id: 'okd12121', name: '채은S2으악❤️', hearts: 11866, unit: 'excel' },
  { rank: 27, id: 'disk197346', name: '[RG]린아네☀둥그레', hearts: 11381, unit: 'excel' },
  { rank: 28, id: 'bluekjhmi', name: '아름다운집', hearts: 11018, unit: 'excel' },
  { rank: 29, id: '4427766178', name: '미쯔✨', hearts: 10673, unit: 'excel' },
  { rank: 30, id: 'duxnqkrxn', name: '♬♪행복한베니와✨엔띠♬', hearts: 10008, unit: 'excel' },
  { rank: 31, id: 'oxxx139', name: '소율❤️', hearts: 10001, unit: 'excel' },
  { rank: 32, id: 'ysooa1030', name: '[S]윤수아잉❤️', hearts: 10000, unit: 'excel' },
  { rank: 33, id: 'syk7574', name: '✧도루묵✧', hearts: 7717, unit: 'excel' },
  { rank: 34, id: 'ejeh2472', name: '사랑해씌발™', hearts: 7257, unit: 'excel' },
  { rank: 35, id: 'dungeon7', name: '계몽☽BJ죽어흑흑_조랭', hearts: 6878, unit: 'excel' },
  { rank: 36, id: 'mugongja', name: '[SD]티모', hearts: 6124, unit: 'excel' },
  { rank: 37, id: 'kingofthestock', name: '풀묶™', hearts: 5674, unit: 'excel' },
  { rank: 38, id: 'dyeks10', name: '손밍ღ타코보이', hearts: 5647, unit: 'excel' },
  { rank: 39, id: '365719', name: '가윤이꼬❤️털이', hearts: 5419, unit: 'excel' },
  { rank: 40, id: 'gjsfken77', name: '[GV]케인♣️', hearts: 5036, unit: 'excel' },
  { rank: 41, id: 'tjdsdm12', name: '시은◡*', hearts: 5000, unit: 'excel' },
  { rank: 42, id: 'no0163', name: '유진이ෆ', hearts: 4853, unit: 'excel' },
  { rank: 43, id: 'mmkorea', name: '이태리ෆ탤받쮸', hearts: 4848, unit: 'excel' },
  { rank: 44, id: 'anfth1234', name: '갈색말티푸', hearts: 4564, unit: 'excel' },
  { rank: 45, id: 'njw7920', name: '❤️사람❤️', hearts: 4462, unit: 'excel' },
  { rank: 46, id: 'asm3158', name: 'FA진스', hearts: 4444, unit: 'excel' },
  { rank: 47, id: 'bbbb1007', name: '✿도화살✿', hearts: 4315, unit: 'excel' },
  { rank: 48, id: 'scv19001', name: '잔망미니언즈', hearts: 4276, unit: 'excel' },
  { rank: 49, id: '3293064651', name: '킴소금쟁이', hearts: 4000, unit: 'excel' },
  { rank: 50, id: 'dogyoung9157', name: '도도_♡', hearts: 3815, unit: 'excel' },
]

// 후원자 프로필 생성
function generateProfiles(): Profile[] {
  return season1Top50.map((donor) => ({
    id: donor.id, // PandaTV 아이디를 프로필 ID로 사용 (실제로는 UUID)
    nickname: donor.name,
    email: null,
    avatar_url: null,
    role: donor.rank <= 10 ? 'vip' : 'member',
    unit: donor.unit as 'excel' | 'crew',
    total_donation: donor.hearts,
    pandatv_id: donor.id, // PandaTV 아이디 저장
    account_type: 'virtual', // 관리자가 임의 생성한 계정
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-20T00:00:00Z',
  }))
}

export const mockProfiles: Profile[] = [
  mockAdminProfile,
  ...generateProfiles()
]

// 랭킹용 정렬된 프로필
export const rankedProfiles = mockProfiles
  .filter(p => p.id !== 'admin-user')
  .sort((a, b) => (b.total_donation || 0) - (a.total_donation || 0))
