# ADR-003: 원시 하트 은닉 + 시청자 점수 ×50

| 항목 | 값 |
|------|-----|
| 상태 | 승인 |
| 날짜 | 2026-02-07 |

## 문맥 (Context)

후원의 원시 하트 개수(`total_amount`)는 금전 정보와 동일하다. 외부에 노출되면 팬들 간 갈등이 발생할 수 있고, 크롤링/캡처로 유포될 위험이 있다. 그러나 랭킹 표시를 위해 상대적 크기를 보여줄 필요는 있다.

## 결정 (Decision)

DB View에서 `total_amount × 50 = viewer_score`로 변환하여 제공한다:

- **`total_rankings_public`** View: `viewer_score` 컬럼 제공, `total_amount` 비노출
- **`season_rankings_public`** View: 동일 패턴 적용
- 프론트엔드는 View만 조회 (`total_amount` 직접 접근 금지)

Open Graph, meta 태그, API 응답에 후원 금액/점수 포함 금지.

## 결과 (Consequences)

**장점**:
- 원시 금액 유출 방지 (RLS + View 이중 보호)
- 시청자 점수는 상대적 크기 비교 가능
- 변환 계수(×50) 변경 시 View만 수정

**단점**:
- ×50 계수의 의미가 직관적이지 않음 (관리자 교육 필요)
- View를 거치지 않는 직접 쿼리 시 실수 가능 → 코드 리뷰에서 검증 필요

## 관련 파일
- `supabase/migrations/20260207_ranking_viewer_score.sql` - View 생성
- `CLAUDE.md` §5.3, §6.1 - 보안 정책 문서화
- `src/app/ranking/page.tsx` - 프론트엔드 사용 예시
