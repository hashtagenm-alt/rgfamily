# 시그니처 자격 기반 VIP 클릭 시스템

## 개요
VIP 프로필 클릭 조건을 vip_rewards 테이블 기반에서 signature_eligibility 테이블 기반으로 변경

## 변경 이유
- 기존: vip_rewards 테이블에 49명 등록 → 모두 클릭 가능
- 변경: signature_eligibility 테이블에 11명만 등록 → 시그니처 자격자만 클릭 가능

## 시그니처 자격 기준
| 시그 번호 | 기준 | 조건 |
|-----------|------|------|
| 1번째 | 당일 누적 10만+ 하트 | 최초 달성 |
| 2번째 | 당일 누적 15만+ 하트 | 1번째 이후 회차 |
| 3번째 | 당일 누적 20만+ 하트 | 2번째 이후 회차 |

## 현재 자격자 (2026-02-03 기준, 11명)

### 🏆🏆🏆 3개 시그니처 (1명)
- **르큐리**: EP3(11만) → EP5(28.5만) → EP6(138만)

### 🏆🏆 2개 시그니처 (2명)
- **미키™**: EP1(21.5만) → EP2(15만)
- **에이맨♣️**: EP4(10.7만) → EP6(35만)

### 🏆 1개 시그니처 (8명)
- 손밍매니아: EP1(25.5만)
- 쩔어서짜다: EP1(18.5만)
- ❥CaNnOt: EP1(17.7만)
- 한세아내꺼♡호랭이: EP3(15만)
- 서연❤️까부는김회장: EP4(19만)
- [A]젖문가: EP4(14.4만)
- 사랑해씌발™: EP5(11만)
- 채은❤️여신: EP6(52.5만)

## 핵심 테이블/View

### signature_eligibility 테이블
```sql
CREATE TABLE signature_eligibility (
  id SERIAL PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id),
  donor_name TEXT NOT NULL,
  sig_number INTEGER CHECK (sig_number BETWEEN 1 AND 3),
  episode_id INTEGER REFERENCES episodes(id),
  episode_number INTEGER,
  daily_amount INTEGER NOT NULL,
  threshold_amount INTEGER NOT NULL,
  is_claimed BOOLEAN DEFAULT FALSE,
  UNIQUE(donor_name, sig_number)
);
```

### vip_clickable_profiles View (핵심 변경)
```sql
-- 기존: vip_rewards 기반 (49명)
-- 변경: signature_eligibility 기반 (11명)
CREATE VIEW vip_clickable_profiles AS
SELECT DISTINCT p.id as profile_id, p.nickname, p.avatar_url, TRUE as is_vip_clickable
FROM profiles p
INNER JOIN signature_eligibility se ON se.donor_name = p.nickname
WHERE p.avatar_url IS NOT NULL AND p.avatar_url != '';
```

## UI 클릭 조건 (변경 없음)
```typescript
// src/components/ranking/RankingFullList.tsx
const hasVipPage = item.donorId && item.avatarUrl && item.hasVipRewards;
// hasVipRewards는 View의 is_vip_clickable에서 가져옴
```

## 관련 스크립트
- `scripts/manage-signature-eligibility.ts`: 자격 분석/동기화/수령처리
- `scripts/analyze-signature-eligibility-v2.ts`: 분석 전용

## 마이그레이션 파일
- `supabase/migrations/20260203_signature_vip_click_system.sql`

## 주의사항
1. **1000건 limit 문제**: Supabase 기본 limit → 스크립트에서 pagination 처리 필요
2. **프로필 매칭**: donor_name과 profiles.nickname이 정확히 일치해야 함
3. **avatar_url 필수**: 아바타 없으면 클릭 불가
