import { describe, it, expect } from 'vitest'
import {
  formatAmount,
  formatAmountShort,
  formatCurrency,
  formatCompactNumber,
  formatDate,
  formatShortDate,
  formatRelativeTime,
  formatRank,
  formatRankKo,
} from '@/lib/utils'

describe('formatAmount', () => {
  it('should format amounts under 10,000 with unit', () => {
    expect(formatAmount(1000, '하트')).toBe('1,000 하트')
    expect(formatAmount(9999, '하트')).toBe('9,999 하트')
  })

  it('should format amounts in 만 range', () => {
    expect(formatAmount(10000, '하트')).toBe('1.0만 하트')
    expect(formatAmount(50000, '하트')).toBe('5.0만 하트')
    expect(formatAmount(1234567, '하트')).toBe('123.5만 하트')
  })

  it('should format amounts in 억 range', () => {
    expect(formatAmount(100000000, '하트')).toBe('1.0억 하트')
    expect(formatAmount(250000000, '하트')).toBe('2.5억 하트')
  })

  it('should use default unit (하트)', () => {
    expect(formatAmount(10000)).toBe('1.0만 하트')
  })
})

describe('formatAmountShort', () => {
  it('should format amounts under 10,000 without unit', () => {
    expect(formatAmountShort(1000)).toBe('1,000')
    expect(formatAmountShort(9999)).toBe('9,999')
  })

  it('should format amounts in 만 range without unit', () => {
    expect(formatAmountShort(10000)).toBe('1만')
    expect(formatAmountShort(50000)).toBe('5만')
  })

  it('should format amounts in 억 range without unit', () => {
    expect(formatAmountShort(100000000)).toBe('1.0억')
    expect(formatAmountShort(500000000)).toBe('5.0억')
  })
})

describe('formatCurrency', () => {
  it('should format amounts in 원 (Korean Won)', () => {
    expect(formatCurrency(1000)).toBe('1,000원')
    expect(formatCurrency(10000)).toBe('1만원')
    expect(formatCurrency(100000000)).toBe('1.0억원')
  })
})

describe('formatCompactNumber', () => {
  it('should format numbers under 1000', () => {
    expect(formatCompactNumber(999)).toBe('999')
  })

  it('should format numbers in K range', () => {
    expect(formatCompactNumber(1000)).toBe('1.0K')
    expect(formatCompactNumber(5500)).toBe('5.5K')
  })

  it('should format numbers in M range', () => {
    expect(formatCompactNumber(1000000)).toBe('1.0M')
    expect(formatCompactNumber(2500000)).toBe('2.5M')
  })
})

describe('formatDate', () => {
  it('should format date with default options', () => {
    const date = '2024-01-15T10:30:00Z'
    const formatted = formatDate(date)
    expect(formatted).toContain('2024')
    expect(formatted).toContain('1월')
    expect(formatted).toContain('15일')
  })

  it('should format date with custom options', () => {
    const date = '2024-03-20T14:00:00Z'
    const formatted = formatDate(date, { year: 'numeric', month: 'short', day: 'numeric' })
    expect(formatted).toContain('2024')
  })
})

describe('formatShortDate', () => {
  it('should format date as YYYY.MM.DD', () => {
    const date = '2024-01-15T10:30:00Z'
    expect(formatShortDate(date)).toMatch(/2024\.01\.1[45]/)
  })
})

describe('formatRank', () => {
  it('should format ranks with ordinal suffixes', () => {
    expect(formatRank(1)).toBe('1st')
    expect(formatRank(2)).toBe('2nd')
    expect(formatRank(3)).toBe('3rd')
    expect(formatRank(4)).toBe('4th')
    expect(formatRank(10)).toBe('10th')
  })

  it('should return dash for invalid ranks', () => {
    expect(formatRank(0)).toBe('-')
    expect(formatRank(-1)).toBe('-')
  })
})

describe('formatRankKo', () => {
  it('should format ranks in Korean', () => {
    expect(formatRankKo(1)).toBe('1위')
    expect(formatRankKo(2)).toBe('2위')
    expect(formatRankKo(100)).toBe('100위')
  })

  it('should return dash for invalid ranks', () => {
    expect(formatRankKo(0)).toBe('-')
  })
})
