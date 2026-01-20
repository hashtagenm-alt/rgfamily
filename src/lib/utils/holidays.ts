/**
 * Korean Holidays Utility
 * 한국 공휴일 및 기념일 데이터
 */

interface Holiday {
  date: string // MM-DD format
  name: string
  isLunar?: boolean
}

// 양력 고정 공휴일
const SOLAR_HOLIDAYS: Holiday[] = [
  { date: '01-01', name: '신정' },
  { date: '03-01', name: '삼일절' },
  { date: '05-05', name: '어린이날' },
  { date: '06-06', name: '현충일' },
  { date: '08-15', name: '광복절' },
  { date: '10-03', name: '개천절' },
  { date: '10-09', name: '한글날' },
  { date: '12-25', name: '크리스마스' },
]

// 음력 공휴일 (연도별로 양력 날짜가 다름)
// 2024-2027년 음력 공휴일 양력 날짜
const LUNAR_HOLIDAYS: Record<number, Holiday[]> = {
  2024: [
    { date: '02-09', name: '설날 연휴', isLunar: true },
    { date: '02-10', name: '설날', isLunar: true },
    { date: '02-11', name: '설날 연휴', isLunar: true },
    { date: '02-12', name: '대체공휴일(설날)', isLunar: true },
    { date: '05-15', name: '부처님오신날', isLunar: true },
    { date: '09-16', name: '추석 연휴', isLunar: true },
    { date: '09-17', name: '추석', isLunar: true },
    { date: '09-18', name: '추석 연휴', isLunar: true },
  ],
  2025: [
    { date: '01-28', name: '설날 연휴', isLunar: true },
    { date: '01-29', name: '설날', isLunar: true },
    { date: '01-30', name: '설날 연휴', isLunar: true },
    { date: '05-05', name: '부처님오신날', isLunar: true }, // 어린이날과 같음
    { date: '10-05', name: '추석 연휴', isLunar: true },
    { date: '10-06', name: '추석', isLunar: true },
    { date: '10-07', name: '추석 연휴', isLunar: true },
    { date: '10-08', name: '대체공휴일(추석)', isLunar: true },
  ],
  2026: [
    { date: '02-16', name: '설날 연휴', isLunar: true },
    { date: '02-17', name: '설날', isLunar: true },
    { date: '02-18', name: '설날 연휴', isLunar: true },
    { date: '05-24', name: '부처님오신날', isLunar: true },
    { date: '09-24', name: '추석 연휴', isLunar: true },
    { date: '09-25', name: '추석', isLunar: true },
    { date: '09-26', name: '추석 연휴', isLunar: true },
  ],
  2027: [
    { date: '02-06', name: '설날 연휴', isLunar: true },
    { date: '02-07', name: '설날', isLunar: true },
    { date: '02-08', name: '설날 연휴', isLunar: true },
    { date: '02-09', name: '대체공휴일(설날)', isLunar: true },
    { date: '05-13', name: '부처님오신날', isLunar: true },
    { date: '09-14', name: '추석 연휴', isLunar: true },
    { date: '09-15', name: '추석', isLunar: true },
    { date: '09-16', name: '추석 연휴', isLunar: true },
  ],
}

// 선거일 등 특별 공휴일 (필요시 추가)
const SPECIAL_HOLIDAYS: Record<string, string> = {
  '2024-04-10': '제22대 국회의원 선거일',
}

/**
 * 특정 날짜가 공휴일인지 확인하고 공휴일 이름 반환
 */
export function getHolidayInfo(date: Date): { isHoliday: boolean; name: string | null } {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const monthDay = `${month}-${day}`
  const fullDate = `${year}-${monthDay}`

  // 특별 공휴일 체크
  if (SPECIAL_HOLIDAYS[fullDate]) {
    return { isHoliday: true, name: SPECIAL_HOLIDAYS[fullDate] }
  }

  // 양력 공휴일 체크
  const solarHoliday = SOLAR_HOLIDAYS.find(h => h.date === monthDay)
  if (solarHoliday) {
    return { isHoliday: true, name: solarHoliday.name }
  }

  // 음력 공휴일 체크
  const lunarHolidays = LUNAR_HOLIDAYS[year]
  if (lunarHolidays) {
    const lunarHoliday = lunarHolidays.find(h => h.date === monthDay)
    if (lunarHoliday) {
      return { isHoliday: true, name: lunarHoliday.name }
    }
  }

  return { isHoliday: false, name: null }
}

/**
 * 특정 연도/월의 모든 공휴일 반환
 */
export function getMonthHolidays(year: number, month: number): Map<number, string> {
  const holidays = new Map<number, string>()
  const monthStr = String(month + 1).padStart(2, '0')

  // 양력 공휴일
  SOLAR_HOLIDAYS.forEach(h => {
    if (h.date.startsWith(monthStr)) {
      const day = parseInt(h.date.split('-')[1])
      holidays.set(day, h.name)
    }
  })

  // 음력 공휴일
  const lunarHolidays = LUNAR_HOLIDAYS[year]
  if (lunarHolidays) {
    lunarHolidays.forEach(h => {
      if (h.date.startsWith(monthStr)) {
        const day = parseInt(h.date.split('-')[1])
        // 이미 있는 경우 (어린이날 + 부처님오신날) 둘 다 표시
        const existing = holidays.get(day)
        if (existing) {
          holidays.set(day, `${existing} / ${h.name}`)
        } else {
          holidays.set(day, h.name)
        }
      }
    })
  }

  // 특별 공휴일
  Object.entries(SPECIAL_HOLIDAYS).forEach(([date, name]) => {
    const [y, m, d] = date.split('-').map(Number)
    if (y === year && m === month + 1) {
      const existing = holidays.get(d)
      if (existing) {
        holidays.set(d, `${existing} / ${name}`)
      } else {
        holidays.set(d, name)
      }
    }
  })

  return holidays
}
