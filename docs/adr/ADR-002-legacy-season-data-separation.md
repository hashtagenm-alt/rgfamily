# ADR-002: 레거시+시즌 데이터 이원화 저장

| 항목 | 값 |
|------|-----|
| 상태 | 승인 |
| 날짜 | 2026-01-25 |

## 문맥 (Context)

RG Family는 시즌1 이전(레거시) 후원 데이터와 시즌1 이후 데이터가 공존한다. 레거시 데이터는 원본 시스템에서 수동으로 취합한 누적 합산치(Top 50)만 존재하며, 개별 후원 트랜잭션은 복원 불가능하다. 시즌1 에피소드4부터는 `donations` 테이블에 개별 트랜잭션이 기록된다.

## 결정 (Decision)

두 테이블로 분리하여 저장한다:

1. **`total_donation_rankings`** - 역대 누적 Top 50 (레거시 포함)
   - 마이그레이션 `20260125_fix_ranking_architecture.sql`에서 INSERT 50건으로 초기화
   - 이후 시즌 데이터 누적 합산으로 업데이트

2. **`donations`** (+ `season_donation_rankings` View) - 시즌별 개별 트랜잭션
   - 에피소드4부터 실시간 기록
   - `is_finalized = true`인 에피소드만 집계에 포함

두 데이터 소스의 합산은 `update-total-rankings.ts` 스크립트로 수동 실행한다.

## 결과 (Consequences)

**장점**:
- 레거시 데이터 영구 보존 (마이그레이션에 하드코딩)
- 시즌 데이터와 혼합 없이 독립 관리 가능

**단점**:
- 레거시 데이터 수정 시 마이그레이션 파일 직접 편집 필요
- total_donation_rankings 업데이트가 자동화되지 않음 (수동 스크립트)

**주의사항**:
- `20260125_fix_ranking_architecture.sql`의 INSERT 문은 유일한 레거시 데이터 소스 → 절대 삭제 금지

## 관련 파일
- `supabase/migrations/20260125_fix_ranking_architecture.sql` - 레거시 INSERT 50건
- `scripts/update-total-rankings.ts` - 누적 랭킹 업데이트
- `src/types/database.ts` - 테이블 타입 정의
