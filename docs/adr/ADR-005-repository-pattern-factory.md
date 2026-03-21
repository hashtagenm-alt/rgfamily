# ADR-005: Server Action 기반 데이터 접근 (Repository + Generic CRUD)

| 항목 | 값 |
|------|-----|
| 상태 | 승인 |
| 날짜 | 2026-01-12 |
| 갱신 | 2026-03-08 (Kaizen Cycle 2-6 반영) |

## 문맥 (Context)

프로젝트 초기에 컴포넌트에서 직접 Supabase 클라이언트를 호출하여 데이터를 조회했다. 이로 인해:
- 데이터 접근 로직이 UI에 결합
- Mock 데이터와 실제 DB 전환이 어려움
- 동일 쿼리의 중복 작성

Kaizen Cycle 2-6에서 직접 `supabase.from()` 호출 119건을 발견하여 전량 Server Action으로 전환했다.

## 결정 (Decision)

### 1) Repository Pattern (데이터 접근 레이어)

Clean Architecture의 Repository Pattern을 채택한다:

- **`IRepository<T, TInsert, TUpdate>`**: Generic CRUD 베이스 인터페이스
- **17개 도메인 특화 인터페이스**: IRankingRepository, ISeasonRepository 등
- **`IDataProvider`**: 17개 Repository를 묶는 파사드 인터페이스
- **`DataProvider`**: Supabase 구현체

### 2) Server Action 독점 접근 (Cycle 2-6 강화)

**`src/app/` 내 직접 `supabase.from()` 호출 금지** — 모든 데이터 접근은 Server Action을 경유:

- `src/lib/actions/` 내 도메인별 Server Action (posts.ts, media.ts, signatures.ts 등)
- `src/lib/actions/admin-crud.ts`: 16개 테이블 Generic CRUD (adminFetchItems, adminCreateItem, adminUpdateItem, adminDeleteItem)
- `src/lib/hooks/useAdminCRUD.ts`: 6개 admin 페이지에서 공통 사용하는 CRUD 훅 (Server Action 경유)

### 3) ESLint 자동 감지

`eslint.config.mjs`에 `no-restricted-syntax` 규칙 추가:
- `src/app/` 내 `supabase.from()` 호출 시 ESLint 에러
- CI에서 자동 차단

### 4) Mock 금지

Mock 구현은 정책상 사용 금지 (`NEXT_PUBLIC_USE_MOCK_DATA=false` 강제).
`src/lib/mock/` 폴더 전체 삭제 완료 (Cycle 3).

## 결과 (Consequences)

**장점**:
- 데이터 접근의 단일 진입점 (Server Action → Repository)
- ESLint로 위반 자동 감지 (CI 차단)
- Generic CRUD로 admin 페이지 보일러플레이트 90% 감소
- ADR-005 준수율: 0% → 100% (119건 → 0건)

**단점**:
- Server Action 레이어 추가로 코드량 증가
- 단순 읽기도 Server Action 경유 필요
- Generic CRUD 화이트리스트 관리 필요 (16개 테이블)

## 관련 파일
- `src/lib/repositories/types.ts` - 17개 인터페이스 정의
- `src/lib/repositories/supabase/DataProvider.ts` - Supabase 구현체
- `src/lib/actions/admin-crud.ts` - Generic CRUD Server Action (16테이블)
- `src/lib/hooks/useAdminCRUD.ts` - Admin CRUD 공통 훅
- `src/lib/actions/donor-links.ts` - 후원자 링크 Server Action (6개)
- `src/lib/actions/media.ts` - 미디어 Server Action (8개 추가)
- `eslint.config.mjs` - no-restricted-syntax 규칙
