# ADR-010: 분석 Server Action 도메인 분할

| 항목 | 값 |
|------|-----|
| 상태 | 승인 |
| 날짜 | 2026-03-08 |

## 문맥 (Context)

분석 대시보드의 Server Action이 2개 파일에 집중되어 있었다:
- `analytics.ts`: 2,159줄 (13개 함수)
- `analytics-advanced.ts`: 1,129줄 (4개 함수)

단일 파일 3,288줄은 코드 리뷰, 충돌 해결, 개별 함수 탐색에 비효율적이었다.

## 결정 (Decision)

`src/lib/actions/analytics/` 디렉토리에 도메인별 7개 파일로 분할한다:

| 파일 | 줄 수 | 내용 |
|------|-------|------|
| `types.ts` | 388 | 25개 인터페이스/타입 정의 |
| `summary.ts` | 204 | getAnalyticsSummary, getEpisodeList, getSeasonList, getDashboardStats |
| `episodes.ts` | 173 | getEpisodeTrend, compareEpisodes |
| `bj.ts` | 675 | getBjStats, getBjEpisodeTrend, getBjDetailedStats, getSignatureEligibility |
| `donors.ts` | 900 | getDonorPatterns, searchDonor, getDonorRetention 등 |
| `advanced.ts` | 994 | getAdvancedChurnPrediction, getDonorRFMAnalysis, getBjAffinityMatrix 등 |
| `index.ts` | 31 | Barrel re-export (하위 호환성) |

### 규칙

- `index.ts`에는 `'use server'` 지시어 없음 (Turbopack이 타입 export 금지)
- 각 도메인 파일에 `'use server'` 배치
- `types.ts`는 서버/클라이언트 공용 (지시어 없음)
- import는 `@/lib/actions/analytics`로 통일 (barrel export)

## 결과 (Consequences)

**장점**:
- 최대 파일 크기: 2,159줄 → 994줄 (54% 감소)
- 도메인별 독립적 수정 가능 (충돌 감소)
- 타입 정의 분리로 클라이언트 번들 최적화

**단점**:
- 7개 파일 간 import 관리 필요
- `index.ts`의 `'use server'` 제한 (Turbopack)

## 관련 파일
- `src/lib/actions/analytics/` - 7개 도메인 파일
- `src/lib/hooks/useAnalytics.ts` - 소비자 (barrel import)
- `src/app/admin/contributions/page.tsx` - 소비자 (barrel import)
