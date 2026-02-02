# RG Family 스크립트 레퍼런스

## 최종 업데이트: 2026-02-03

---

## 1. 공통 유틸리티 (`scripts/lib/`)

### utils.ts - 재시도 및 배치 처리
```typescript
import { withRetry, processBatch, sleep, chunk, printProgress } from './lib/utils'

// 지수 백오프 재시도 (기본 3회, 1초 시작)
await withRetry(() => supabase.from('table').select('*'), {
  maxRetries: 3,
  initialDelayMs: 1000,
  onRetry: (error, attempt, delay) => console.log(`재시도 ${attempt}`)
})

// 배치 처리 + 진행률
await processBatch(items, async (item) => {
  await processItem(item)
}, { batchSize: 50 })
```

### supabase.ts - 공통 클라이언트
```typescript
import { getServiceClient, checkError, validateEnv } from './lib/supabase'

const supabase = getServiceClient()  // Service Role 클라이언트
```

### csv-parser.ts - RFC 4180 CSV 파서
```typescript
import { parseCSV, parseCSVLine, parsePandaTVDonationCSV } from './lib/csv-parser'

// 기본 파싱
const { headers, records } = parseCSV(content)

// PandaTV 후원 CSV 형식
const donations = parsePandaTVDonationCSV(content)
// → [{ rank, id, nickname, hearts }, ...]
```

### nickname.ts - 닉네임 정규화
```typescript
import { extractNickname, normalizeNickname, isSystemNickname } from './lib/nickname'

extractNickname('user123(미키™)')  // '미키™'
normalizeNickname('  미키™  ')     // '미키™'
isSystemNickname('RG_family')      // true
```

---

## 2. 랭킹 관리 스크립트

### update-season-rankings.ts
**용도**: CSV 파일에서 시즌별 후원 랭킹 업데이트
```bash
# 기본 사용
npx tsx scripts/update-season-rankings.ts --season=1 --files="./data/ep1.csv,./data/ep2.csv"

# 팬클럽 단위 지정
npx tsx scripts/update-season-rankings.ts --season=1 --unit=excel --files="./data/excel.csv"

# 미리보기
npx tsx scripts/update-season-rankings.ts --season=1 --files="./data/ep1.csv" --dry-run
```
**특징**: RPC 트랜잭션 사용, 실패 시 폴백, 따옴표 내 쉼표 처리

### refresh-season-rankings.ts
**용도**: donations 테이블 기준으로 시즌 랭킹 재계산
```bash
npx tsx scripts/refresh-season-rankings.ts              # 시즌 1 (기본)
npx tsx scripts/refresh-season-rankings.ts --season=2   # 시즌 2
```
**특징**: donations 테이블 전체 스캔, Top 50 자동 추출

### update-total-rankings.ts
**용도**: 하드코딩된 총 후원 랭킹 데이터로 업데이트
```bash
npx tsx scripts/update-total-rankings.ts           # 실행
npx tsx scripts/update-total-rankings.ts --dry-run # 미리보기
```
**특징**: 스크립트 내 totalRankingData 배열 사용, 레거시+시즌 통합

### refresh-total-rankings.ts
**용도**: 레거시 데이터 + donations 합산하여 총 랭킹 재계산
```bash
npx tsx scripts/refresh-total-rankings.ts           # 실행
npx tsx scripts/refresh-total-rankings.ts --dry-run # 미리보기
```
**특징**: legacyData(하드코딩) + donations 테이블 합산

---

## 3. 정합성 검증 스크립트

### verify-ranking-integrity.ts
**용도**: donations 테이블과 랭킹 테이블 간 데이터 일치 검증
```bash
# 검증만
npx tsx scripts/verify-ranking-integrity.ts

# 시즌 랭킹만 자동 수정
npx tsx scripts/verify-ranking-integrity.ts --fix-season

# 전체 자동 수정 (종합 포함)
npx tsx scripts/verify-ranking-integrity.ts --fix
```
**출력 예시**:
```
📊 시즌 1 랭킹 정합성 검사...
   ✅ 시즌 1: 모든 데이터 일치 (156명, 2959건)

📊 종합 랭킹 정합성 검사...
   ⚠️  주의: total_donation_rankings는 레거시 데이터 + 시즌1을 포함
   📋 donations 후원자: 156명, rankings: 50명
   📋 차이 있는 항목: 30건 (레거시 데이터로 인한 정상적 차이 포함)
```

---

## 4. 데이터 마이그레이션

### migrate-legacy-data.ts
**용도**: 하드코딩된 레거시 데이터를 DB 테이블로 이관
```bash
npx tsx scripts/migrate-legacy-data.ts --dry-run  # 미리보기
npx tsx scripts/migrate-legacy-data.ts            # 실제 이관
```
**사전 조건**: `legacy_donation_totals` 테이블 생성 필요
```sql
-- supabase/migrations/20260203_add_legacy_donation_totals.sql 실행
```

---

## 5. SQL 마이그레이션 파일

### 20260203_add_ranking_rpc_functions.sql
RPC 트랜잭션 함수:
- `upsert_season_rankings(p_season_id, p_unit, p_rankings)` - 시즌 랭킹 원자적 교체
- `upsert_total_rankings(p_rankings)` - 총 랭킹 원자적 교체
- `pg_proc_exists(func_name)` - 함수 존재 여부 확인

### 20260203_add_legacy_donation_totals.sql
레거시 데이터 테이블:
- `legacy_donation_totals` - 시즌1 이전 누적 후원 데이터

---

## 6. 데이터 조회 스크립트

### run-sql.ts
```bash
npx tsx scripts/run-sql.ts --table profiles           # 테이블 조회
npx tsx scripts/run-sql.ts --view season_rankings_public  # View 조회
npx tsx scripts/run-sql.ts                            # 도움말
```

### check-season-rankings.ts
```bash
npx tsx scripts/check-season-rankings.ts  # 시즌 랭킹 현황
```

---

## 7. 스크립트 실행 우선순위

### 초기 설정 (1회)
1. `supabase/migrations/20260203_add_ranking_rpc_functions.sql` 실행
2. `supabase/migrations/20260203_add_legacy_donation_totals.sql` 실행
3. `npx tsx scripts/migrate-legacy-data.ts` 실행

### 정기 랭킹 업데이트
1. `npx tsx scripts/verify-ranking-integrity.ts` - 검증
2. `npx tsx scripts/refresh-season-rankings.ts` - 시즌 갱신
3. `npx tsx scripts/refresh-total-rankings.ts` - 종합 갱신

### 새 에피소드 데이터 추가
1. CSV 파일 준비 (PandaTV 후원 내역)
2. `npx tsx scripts/update-season-rankings.ts --season=1 --files="./data/new.csv" --dry-run`
3. `npx tsx scripts/update-season-rankings.ts --season=1 --files="./data/new.csv"`

---

## 8. 트러블슈팅

### RPC 함수 없음 에러
```
⚠️  RPC 실패, 폴백 실행: function upsert_season_rankings does not exist
```
→ SQL 마이그레이션 파일을 Supabase Dashboard에서 실행

### 환경변수 에러
```
❌ 다음 환경변수가 설정되지 않았습니다:
   - SUPABASE_SERVICE_ROLE_KEY
```
→ `.env.local` 파일 확인

### CSV 파싱 오류
```
❌ 파일을 찾을 수 없습니다: ./data/ep1.csv
```
→ 절대 경로 사용 또는 프로젝트 루트에서 실행
