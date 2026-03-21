# 크루부/엑셀부 Unit 필터 아키텍처

## 최종 업데이트: 2026-03-20
## 브랜치: feature/crew-season-schema (PR #44)

---

## 1. 정책 결정사항

| 기능 영역 | unit 정책 | 구현 방식 |
|-----------|----------|----------|
| 총 후원 랭킹 | 엑셀+크루 합산 | `total_rankings_public` View (unit 컬럼 없음) |
| 시즌 랭킹 | 완전 분리 | `season_rankings_public.unit` 필터 |
| 분석 대시보드 | 당분간 엑셀부만 | `.eq('unit', 'excel')` 하드코딩 |
| 시그니처 | 엑셀부 전용 | `.eq('unit', 'excel')` |
| 라이브 로스터 | 전체 표시 | 필터 없음 (의도된 동작) |
| 에피소드 관리 (Admin) | 전체 표시 + 배지 | unit 배지 컬럼 + 소속 선택 드롭다운 |

## 2. DB 스키마

```sql
-- episodes 테이블 (20260320_crew_season_schema.sql)
ALTER TABLE episodes ADD COLUMN unit TEXT DEFAULT 'excel' CHECK (unit IN ('excel', 'crew'));
ALTER TABLE episodes ADD CONSTRAINT episodes_season_id_episode_number_unit_key 
  UNIQUE (season_id, episode_number, unit);

-- season_donation_rankings.unit: 'excel' | 'crew' | null
-- season_rankings_public View: sdr.unit 그대로 pass-through (WHERE 없음)
-- total_rankings_public View: unit 컬럼 없음 (합산)
```

## 3. 코드 레벨 필터링 (15개 파일)

### Phase 1: 핵심 데이터 오염 차단
- `donations.ts`: `refreshSeasonRankings(seasonId, unit='excel')` — donations/rankings 모두 unit 필터
- `donations.ts`: `importDonationsCsv` — 에피소드에서 unit 자동 조회하여 donations에 설정
- `donations.ts`: `getEpisodesForImport(seasonId, unit?)` — unit 파라미터 + 결과에 unit 포함
- `analytics-helpers.ts`: `fetchFinalizedEpisodeIds(supabase, seasonId?, unitFilter='excel')` — 캐시 키에 unit 포함
- `analytics-helpers.ts`: `fetchFinalizedEpisodes(supabase, seasonId?, unitFilter='excel')`
- `bj-signature-eligibility.ts`: `.eq('unit', 'excel')` (시그니처는 엑셀부 전용)

### Phase 2: Analytics 직접 쿼리
- `analytics/episodes.ts` getEpisodeTrend: `.eq('unit', 'excel')`
- `analytics/donor-retention.ts` getDonorRetention: `.eq('unit', 'excel')`
- `analytics/bj-detailed-stats.ts` getBjDetailedStats: `.eq('unit', 'excel')`
- `analytics/summary.ts` getEpisodeList: `.eq('unit', 'excel')` + unit select

### Phase 3: 에피소드 조회 공통 함수
- `actions/episodes.ts`: `getEpisodes(seasonId?, unit?)`, `getRankBattleEpisodes(seasonId?, unit?)`
- `hooks/useEpisodes.ts`: `findBySeason(seasonId, unit?)`, `findRankBattles(seasonId, unit?)`

### Phase 4: Admin UI / 서버 액션
- `admin/episodes/page.tsx`: unit 필드, 소속 배지 컬럼, 소속 선택 드롭다운
- `prizes.ts` getCurrentSeasonEpisodes: `.eq('unit', 'excel')` (상벌금은 엑셀부 전용)
- `contributions.ts` getContributionOverview: `.eq('unit', 'excel')` (기여도는 엑셀부 전용)
- `data-sync.ts` getDataSyncMetadata/getEpisodesForSeason: `.eq('unit', 'excel')` 기본
- `scripts/tools/manage-signature-eligibility.ts`: `.eq('unit', 'excel')`

### 랭킹 페이지 unit 필터 연동
- `donation-rankings.ts`: `getPublicSeasonRankings(seasonId, limit, unit?)` — unit 파라미터 추가
- `ranking/page.tsx`: unitFilter 탭 선택 시 시즌 랭킹 후원자 기준으로 총 랭킹 필터링
- `SupabaseRankingRepository`: 시즌 랭킹에서 `.eq('unit', unitFilter)` DB 레벨 필터링 (기존 정상)

## 4. 아키텍처 결정 근거

코드 레벨 필터링을 선택한 이유:
1. **RLS 부적합**: unit 필터는 사용자 기반이 아닌 컨텍스트 기반 (관리자가 양쪽 모두 접근)
2. **View 분리 비유연**: 전체/엑셀/크루 모두 필요한 페이지 존재 (admin 에피소드)
3. **컨텍스트별 정책 상이**: 합산/분리/엑셀만 등 기능마다 다름

### 미래 보강 고려사항
- analytics용 View(`excel_finalized_episodes`) 생성 시 8개 analytics 함수 일괄 단순화 가능
- 새 에피소드 쿼리 작성 시 unit 필터 누락 주의 (CLAUDE.md §14 금지 체크리스트 참고)

## 5. 수정하지 않는 것

- `refreshTotalRankings()`: 엑셀+크루 합산 정책이므로 unit 필터 불필요
- `useLiveRoster`: 전체 멤버 라이브 표시 유지
- `season_members` 코드 통합: 다음 PR에서 진행
