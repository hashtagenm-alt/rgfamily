# RG Family Supabase 스키마 및 데이터 정합성 분석

## 최종 업데이트: 2026-02-03

---

## 1. 데이터베이스 현황 요약

| 테이블 | 레코드 수 | 용도 |
|--------|----------|------|
| profiles | 144 | 사용자 프로필 (닉네임, 역할, 아바타) |
| seasons | 1 | 시즌 정보 (현재 시즌 1 활성) |
| episodes | 15 | 에피소드/방송 회차 (EP1~EP15) |
| donations | 2,959 | 개별 후원 내역 |
| season_donation_rankings | 50 | 시즌 후원 랭킹 Top 50 |
| total_donation_rankings | 50 | 총 후원 랭킹 Top 50 (레거시 포함) |
| vip_rewards | 11 | VIP 리워드/프로필 페이지 (11명 VIP 전용) |
| vip_images | 11 | VIP 시그니처 이미지 |
| organization | 14 | 조직도 멤버 |
| schedules | 4 | 일정 |
| banners | 1 | 메인 배너 |
| posts | 30 | 게시글 |
| comments | 5 | 댓글 |

---

## 2. 랭킹 테이블 구조

### season_donation_rankings
- 시즌별 후원 랭킹 (레거시 + EP 데이터 합산)
- **데이터 출처**: CSV import (EP 이전 레거시 포함)
- donations 테이블은 EP1-6만 포함, 레거시는 별도
- 컬럼: id, season_id, rank, donor_name, total_amount, created_at, updated_at

### total_donation_rankings
- 역대 누적 총 후원 랭킹 (레거시 데이터 포함)
- PandaTV 원본 데이터 기반 (donations에 없는 과거 데이터 포함)
- 컬럼: id, rank, donor_name, total_amount, is_permanent_vip, created_at
- **영구 VIP**: 미키™(2위), [RG]미드굿♣️가애(7위), [RG]✨린아의발굴™✨(10위), 농심육개장라면(20위)

### 데이터 정합성 관계
```
donations 테이블 집계 = season_donation_rankings (100% 일치)
total_donation_rankings = donations + 레거시 데이터 (EP1 이전)
```

---

## 3. 주요 테이블 스키마

### profiles
```sql
- id: uuid (PK)
- nickname: text (표시용 닉네임)
- avatar_url: text (프로필 이미지)
- role: enum ('member', 'vip', 'moderator', 'admin', 'superadmin')
- unit: enum ('excel', 'crew')
- total_donation: bigint
- pandatv_id: text (PandaTV 아이디)
```

### donations
```sql
- id: uuid (PK)
- episode_id: int (FK → episodes)
- donor_name: text (후원자 닉네임)
- amount: int (후원 하트)
- donated_at: timestamp
- bj_name: text (참여 BJ)
```

### vip_rewards
```sql
- id: serial (PK)
- profile_id: uuid (FK → profiles)
- season_id: int (FK → seasons)
- episode_id: int (nullable)
- rank: int
- personal_message: text
- dedication_video_url: text
```

---

## 4. VIP 클릭 가능 조건 (2026-02-03 시그니처 자격 기반 전환)

### ⚠️ 중요 변경사항 (2026-02-03)
**기존**: vip_rewards 테이블 기반 (49명 모두 클릭 가능)
**변경**: signature_eligibility 테이블 기반 (시그니처 자격자 11명만 클릭 가능)

### VIP 페이지 링크 활성화 조건 (모두 충족 필요)
1. `profiles.avatar_url` 존재 (프로필 이미지)
2. `signature_eligibility` 테이블에 해당 `donor_name` 레코드 존재

### 시그니처 자격 기준
| 시그 번호 | 기준 | 조건 |
|-----------|------|------|
| 1번째 | 당일 누적 10만+ 하트 | 최초 달성 |
| 2번째 | 당일 누적 15만+ 하트 | 1번째 이후 회차 |
| 3번째 | 당일 누적 20만+ 하트 | 2번째 이후 회차 |

### 구현 위치 (View 기반 - 시그니처 자격 전환)
- **DB View**: `vip_clickable_profiles` (signature_eligibility JOIN profiles)
- **마이그레이션**: `supabase/migrations/20260203_signature_vip_click_system.sql`
- **Repository**: `src/lib/repositories/supabase/RankingRepository.ts` (View의 `is_vip_clickable` 사용)
- **UI**: `src/components/ranking/RankingFullList.tsx`에서 클릭 가능 여부 판단

### 현재 클릭 가능한 시그니처 자격자 (11명)
**3개 시그**: 르큐리
**2개 시그**: 미키™, 에이맨♣️
**1개 시그**: 손밍매니아, 쩔어서짜다, ❥CaNnOt, 한세아내꺼♡호랭이, 서연❤️까부는김회장, [A]젖문가, 사랑해씌발™, 채은❤️여신

### 새 VIP 추가 시 (자동 처리)
1. 후원 시 당일 10만+ 달성하면 자동 자격 획득
2. `npx tsx scripts/manage-signature-eligibility.ts --sync` 실행하여 DB 동기화
3. profiles 테이블에 avatar_url 설정 필요 (없으면 클릭 불가)

### 관련 스크립트
- `scripts/manage-signature-eligibility.ts --analyze`: 자격 분석
- `scripts/manage-signature-eligibility.ts --sync`: DB 동기화
- `scripts/manage-signature-eligibility.ts --claim=닉네임 --sig=1`: 수령 처리

---

## 5. 데이터 정합성 체크 스크립트

### 주요 스크립트 (2026-02-03 개선)

```bash
# 정합성 검증 (추천)
npx tsx scripts/verify-ranking-integrity.ts          # 검증만
npx tsx scripts/verify-ranking-integrity.ts --fix-season  # 시즌 수정

# 시즌 랭킹 갱신
npx tsx scripts/refresh-season-rankings.ts --season=1

# 종합 랭킹 갱신
npx tsx scripts/refresh-total-rankings.ts

# CSV에서 업데이트
npx tsx scripts/update-season-rankings.ts --season=1 --files="./data/ep1.csv"
```

### 공통 유틸리티 (scripts/lib/)
- `utils.ts` - withRetry(재시도), processBatch(배치처리)
- `supabase.ts` - 공통 클라이언트, 환경변수 검증
- `csv-parser.ts` - RFC 4180 CSV 파서
- `nickname.ts` - 닉네임 추출/정규화

### RPC 트랜잭션 함수
- `upsert_season_rankings()` - 시즌 랭킹 원자적 교체
- `upsert_total_rankings()` - 종합 랭킹 원자적 교체

---

## 6. 최근 수정 이력

- 2026-02-03: 스크립트 아키텍처 개선 (공통 유틸리티, RPC, 재시도 로직)
- 2026-02-03: scripts/lib/ 폴더 생성 (utils, supabase, csv-parser, nickname)
- 2026-02-03: verify-ranking-integrity.ts로 시즌 랭킹 50명 갱신
- 2026-02-03: legacy_donation_totals 테이블 및 마이그레이션 스크립트 추가
- 2026-02-02: total_donation_rankings Top 50 완성 (31-50위 추가)
- 2026-02-02: 영구 VIP 4명 설정 (2, 7, 10, 20위)

## 7. 정합성 검증 결과 (2026-02-03)

### 최신 시즌 1 랭킹 Top 15
```
1위: 르큐리 - 1,798,059 하트
2위: 채은❤️여신 - 716,532 하트
3위: 미키™ - 569,818 하트
4위: 에이맨♣️ - 527,637 하트
5위: 손밍매니아 - 375,454 하트
6위: 한세아내꺼♡호랭이 - 329,740 하트
7위: 사랑해씌발™ - 227,352 하트
8위: 쩔어서짜다 - 185,465 하트
9위: [J]젖문가 - 180,806 하트 ⬆️ (A+J 통합)
10위: ❥CaNnOt - 176,754 하트
11위: [RG]✨린아의발굴™ - 154,985 하트
```

### 닉네임 통합 이력
- `[A]젖문가` + `[J]젖문가` → `[J]젖문가` (180,806 하트)
- 동일인물 확인 후 donations 테이블에서 donor_name 통합

### 프로필 이미지 해결
- `[J]젖문가`: 이미지 ✅ (jeonmunga-10019-*.gif)
- `[RG]✨린아의발굴™`: 이미지 ✅ (balgul-signature-1.gif)
  - 프로필 닉네임 수정: `[RG]✨린아의발굴™✨` → `[RG]✨린아의발굴™`

### VIP 프로필 정리 완료 (2026-02-03)
- 11명 VIP 각각 중복 프로필 2개 → 1개로 통합
- 기존 계정(@rgfamily.local, @rg-family.test 등) 데이터 → 새 계정(@rgfamily.kr)으로 이관
- 이관 대상: vip_rewards, vip_personal_messages, rankings, posts, comments, avatar_url
- 기존 프로필 및 auth user 삭제 완료

### 다음 단계
1. RPC 함수 설치 (Supabase Dashboard에서 SQL 실행)
2. legacy_donation_totals 테이블 생성 및 마이그레이션
3. `[Another]젖문가` 동일인물 여부 확인 필요