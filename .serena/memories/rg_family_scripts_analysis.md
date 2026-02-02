# RG Family 프로젝트 스크립트 분석

## 개요
- 총 128개의 활성 스크립트 (.ts 파일)
- 70개의 아카이브 스크립트 (scripts/archive/)
- Supabase PostgreSQL 기반 데이터 관리

---

## 🎯 핵심 Ranking 시스템 스크립트 (7개)

### 1. **데이터 업데이트 스크립트** (CSV → DB)

#### `update-season-rankings.ts`
- **용도**: CSV 파일에서 시즌별 후원 랭킹 업데이트
- **입력**: CSV 파일 (후원자 닉네임, 하트 개수)
- **대상 테이블**: `season_donation_rankings`
- **주요 컬럼**: rank, donor_name, total_amount, donation_count, unit, season_id
- **사용 예시**:
  ```bash
  npx tsx scripts/update-season-rankings.ts --season=1 --files="./data/ep1.csv,./data/ep2.csv" --unit=excel
  ```
- **특징**:
  - RPC 함수 우선 사용 (`upsert_season_rankings`)
  - 실패 시 폴백: 개별 쿼리로 delete & insert
  - Top 50만 저장
  - DRY-RUN 모드 지원

#### `update-total-rankings.ts`
- **용도**: 종합(역대 누적) 후원 랭킹 업데이트
- **데이터**: 하드코딩된 Top 50 데이터 (시즌1 이전 누적 + 시즌1 초반)
- **대상 테이블**: `total_donation_rankings`
- **주요 컬럼**: rank, donor_name, total_amount, is_permanent_vip
- **사용 예시**:
  ```bash
  npx tsx scripts/update-total-rankings.ts [--dry-run]
  ```
- **특징**: 레거시 데이터 포함 (과거 누적 후원)

---

### 2. **실시간 갱신 스크립트** (donations 테이블 기준)

#### `refresh-season-rankings.ts`
- **용도**: donations 테이블 기준으로 시즌 랭킹 재계산/갱신
- **입력 데이터**: `donations` 테이블 (season_id, donor_name, amount)
- **대상 테이블**: `season_donation_rankings`
- **처리 방식**: 
  - 전체 donations 페이지네이션 조회 (pageSize=1000)
  - 닉네임별 집계
  - Top 50 정렬
  - RPC 또는 폴백으로 upsert
- **사용 예시**:
  ```bash
  npx tsx scripts/refresh-season-rankings.ts [--season=1]
  ```

#### `refresh-total-rankings.ts`
- **용도**: 레거시 데이터 + donations 합산으로 종합 랭킹 갱신
- **입력 데이터**: 
  - `legacyData` (시즌1 이전 누적, 스크립트 내 하드코딩)
  - `donations` 테이블 (모든 시즌)
- **대상 테이블**: `total_donation_rankings`
- **처리 방식**:
  - donations 전체 페이지네이션 조회
  - legacyData + seasonTotals 합산
  - Top 50 추출
- **사용 예시**:
  ```bash
  npx tsx scripts/refresh-total-rankings.ts [--dry-run]
  ```

---

### 3. **조회 및 검증 스크립트**

#### `view-rankings.ts`
- **용도**: 새로운 View 기반 랭킹 시스템에서 랭킹 조회
- **조회 대상 Views**:
  - `v_total_rankings` (역대 누적)
  - `v_season_rankings` (시즌별)
  - `v_episode_rankings` (에피소드별)
- **주요 컬럼**: rank, donor_name, total_amount, donation_count
- **사용 예시**:
  ```bash
  npx tsx scripts/view-rankings.ts --type=total --limit=50
  npx tsx scripts/view-rankings.ts --type=season --season=1 --limit=30
  npx tsx scripts/view-rankings.ts --type=episode --episode=3 --limit=20
  ```

#### `check-season-rankings.ts`
- **용도**: 시즌 랭킹 데이터 확인
- **조회 테이블**: seasons, season_donation_rankings
- **출력**: Top 20 랭킹, 시즌별 데이터 개수

#### `verify-ranking-integrity.ts`
- **용도**: donations 테이블과 랭킹 테이블 간 데이터 정합성 검증
- **대상 테이블**: 
  - `donations` (실제 후원 기록)
  - `season_donation_rankings` (시즌 랭킹)
  - `total_donation_rankings` (종합 랭킹)
- **검증 방식**:
  - donations 전체 페이지네이션 조회
  - 닉네임별 집계 vs 랭킹 테이블 비교
  - 불일치 항목 상세 출력
- **수정 옵션**:
  - `--fix-season`: 시즌 랭킹만 수정 (RPC → 폴백)
  - `--fix`: 전체 수정
- **사용 예시**:
  ```bash
  npx tsx scripts/verify-ranking-integrity.ts
  npx tsx scripts/verify-ranking-integrity.ts --fix-season
  ```

#### `analyze-season-integrity.ts`
- **용도**: 시즌 랭킹 데이터 정합성 분석 (수정 없음, 분석만)
- **비교 대상**:
  - `season_donation_rankings` Top 50
  - `donations` 테이블 집계 Top 50
- **출력**: 불일치 상세 분석 (차이 누적 계산)

---

## 📊 Ranking 관련 테이블 구조

### 핵심 테이블

#### `donations` (후원 기록 - 원본 데이터)
```
- id: 자동증가 PK
- donor_name: 후원자 닉네임 (문자열, 정규화 필요)
- amount: 후원 하트 개수
- season_id: 시즌 ID (FK)
- unit: 팬클럽 소속 (excel|crew|null)
- created_at: 생성 시간
```

#### `season_donation_rankings` (시즌별 랭킹 - 계산된 결과)
```
- id: 자동증가 PK
- season_id: 시즌 ID (FK → seasons)
- rank: 순위 (1~50)
- donor_name: 후원자 닉네임
- total_amount: 시즌 누적 하트
- donation_count: 후원 횟수
- unit: 팬클럽 소속 (선택사항)
- updated_at: 업데이트 시간
- UNIQUE 제약: (season_id, rank) 또는 (season_id, donor_name)
```

#### `total_donation_rankings` (역대 누적 랭킹 - 레거시 포함)
```
- id: 자동증가 PK
- rank: 순위 (1~50)
- donor_name: 후원자 닉네임
- total_amount: 총 후원 하트 (레거시 + 시즌1+)
- is_permanent_vip: 영구 VIP 여부
- updated_at: 업데이트 시간
- created_at: 생성 시간
- UNIQUE 제약: rank
```

### View 기반 조회

#### `v_total_rankings` (View)
- `rank`, `donor_name`, `total_amount`, `donation_count`
- 원본: `total_donation_rankings` 또는 계산 기반

#### `v_season_rankings` (View)
- `season_id`, `rank`, `donor_name`, `total_amount`, `donation_count`
- 원본: `season_donation_rankings`

#### `v_episode_rankings` (View)
- `episode_id`, `rank`, `donor_name`, `total_amount`, `donation_count`
- 에피소드별 후원 집계 (별도 테이블 필요)

---

## 🔄 데이터 흐름도

```
CSV 파일(후원 데이터)
    ↓
update-season-rankings.ts → season_donation_rankings
    ↓
refresh-season-rankings.ts → donations에서 재계산
    ↓
verify-ranking-integrity.ts ← 정합성 검증

donations 테이블 (모든 시즌)
    ↓
refresh-total-rankings.ts (레거시 + donations 합산)
    ↓
total_donation_rankings
    ↓
view-rankings.ts → v_total_rankings View 조회
```

---

## 🛠️ 유틸리티 스크립트

### `run-sql.ts`
- **용도**: Supabase SQL 직접 실행 (CLI 기반)
- **주요 옵션**:
  ```bash
  npx tsx scripts/run-sql.ts --table season_donation_rankings
  npx tsx scripts/run-sql.ts --view v_total_rankings
  npx tsx scripts/run-sql.ts --view season_rankings_public
  npx tsx scripts/run-sql.ts "SELECT * FROM donations LIMIT 5"
  ```
- **목적**: 브라우저 Supabase Dashboard 대신 CLI에서 데이터 조회

---

## 💡 주요 설계 패턴

### 1. **RPC 우선, 폴백 처리**
- 모든 업데이트 스크립트는 RPC 함수(`upsert_season_rankings`, `upsert_total_rankings`) 사용
- RPC 실패 시 개별 쿼리로 폴백 (delete + insert)
- 트랜잭션 안전성 보장

### 2. **페이지네이션 처리**
- donations 조회 시 pageSize=1000으로 페이지네이션
- 대용량 데이터 안정적 처리
- `refresh-*` 및 `verify-*` 스크립트에서 사용

### 3. **닉네임 정규화**
- CSV 파싱 시 "아이디(닉네임)" 형식에서 닉네임 추출
- donations 조회 시 `.trim()` 처리
- 정합성 검증에서 닉네임 매칭

### 4. **DRY-RUN 모드**
- `update-season-rankings.ts`, `refresh-total-rankings.ts` 등에 `--dry-run` 옵션
- 실제 저장 없이 미리보기 가능

### 5. **배치 삽입**
- `verify-ranking-integrity.ts`의 폴백에서 배치 삽입 (batchSize=100)
- 대량 데이터 삽입 최적화

---

## ⚠️ 데이터 정합성 이슈

### 주요 문제점
1. **CSV vs donations 테이블**: 
   - update-season-rankings.ts는 CSV 파일 기준
   - refresh-season-rankings.ts는 donations 테이블 기준
   - 두 소스가 다르면 불일치 발생

2. **레거시 데이터**:
   - total_donation_rankings에는 시즌1 이전 누적(legacyData) 포함
   - donations 테이블은 시즌1부터만 기록
   - refresh-total-rankings.ts에서 hardcoded legacyData와 donations 합산

3. **닉네임 정규화**:
   - donations: donor_name (한국어 포함, 이모지 포함)
   - CSV: "아이디(닉네임)" 형식 파싱
   - trim() 미적용 시 공백 차이로 정합성 오류

### 검증 방법
```bash
# 정합성 확인만
npx tsx scripts/verify-ranking-integrity.ts

# 불일치 분석 (상세 리포트)
npx tsx scripts/analyze-season-integrity.ts

# 데이터 조회
npx tsx scripts/run-sql.ts --table season_donation_rankings
npx tsx scripts/run-sql.ts --view v_season_rankings
```

---

## 📋 스크립트 분류 요약

| 카테고리 | 스크립트 | 용도 |
|---------|---------|------|
| **데이터 업로드** | update-season-rankings.ts | CSV → DB |
| | update-total-rankings.ts | 하드코딩 데이터 → DB |
| **실시간 갱신** | refresh-season-rankings.ts | donations 재계산 |
| | refresh-total-rankings.ts | 레거시+donations 합산 |
| **조회** | view-rankings.ts | View 기반 조회 |
| | check-season-rankings.ts | 시즌 랭킹 확인 |
| **검증** | verify-ranking-integrity.ts | 정합성 검증+수정 |
| | analyze-season-integrity.ts | 정합성 분석(읽기만) |
| **유틸** | run-sql.ts | CLI SQL 실행 |

---

## 🔗 관련 라이브러리/유틸

### `scripts/lib/supabase.ts`
- Supabase 클라이언트 초기화
- `getServiceClient()`: SUPABASE_SERVICE_ROLE_KEY 사용 (관리자 권한)

### `scripts/lib/utils.ts`
- `withRetry()`: 재시도 로직
- `processBatch()`: 배치 처리
- `printProgress()`: 진행 상황 출력

### `scripts/lib/csv-parser.ts`
- CSV 라인 파싱 (따옴표 내 쉼마 처리)
- BOM 제거

---

## 🚀 주요 사용 시나리오

### 시나리오 1: 새 에피소드 후원 데이터 반영
```bash
# 1. CSV에서 시즌1 에피소드1 랭킹 업데이트
npx tsx scripts/update-season-rankings.ts --season=1 --files="./data/ep1.csv"

# 2. 정합성 확인
npx tsx scripts/verify-ranking-integrity.ts

# 3. donations 기준 재계산 (권장)
npx tsx scripts/refresh-season-rankings.ts --season=1

# 4. 결과 조회
npx tsx scripts/view-rankings.ts --type=season --season=1 --limit=50
```

### 시나리오 2: 종합 랭킹 갱신
```bash
# 1. 종합 랭킹 갱신 (레거시 + donations)
npx tsx scripts/refresh-total-rankings.ts --dry-run

# 2. 미리보기 확인 후 실행
npx tsx scripts/refresh-total-rankings.ts

# 3. 결과 조회
npx tsx scripts/view-rankings.ts --type=total --limit=50
```

### 시나리오 3: 데이터 정합성 문제 해결
```bash
# 1. 분석 (문제 확인)
npx tsx scripts/analyze-season-integrity.ts

# 2. 검증 (자동 수정)
npx tsx scripts/verify-ranking-integrity.ts --fix-season

# 3. 결과 확인
npx tsx scripts/verify-ranking-integrity.ts
```
