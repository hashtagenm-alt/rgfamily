# ADR-001: Server Action 5계층 권한 체계

| 항목 | 값 |
|------|-----|
| 상태 | 승인 |
| 날짜 | 2026-01-12 |

## 문맥 (Context)

RG Family는 역할 기반 접근 제어(RBAC)가 필요한 팬 커뮤니티 플랫폼이다. 관리자 페이지, VIP 콘텐츠, 일반 게시판 등 각 기능마다 다른 권한 수준이 요구된다. Server Action에서 권한 체크 로직이 각 파일에 중복되면 누락 위험이 있고, 일관성 유지가 어렵다.

## 결정 (Decision)

5계층 Server Action 래퍼 패턴을 채택한다:

1. **publicAction** - 인증 불필요 (공개 데이터 조회)
2. **authAction** - 로그인 필수 (게시판 글쓰기 등)
3. **moderatorAction** - moderator + admin + superadmin
4. **adminAction** - admin + superadmin
5. **superadminAction** - superadmin만

각 래퍼는 인증 확인 → 역할 조회 → 권한 검증 → 액션 실행 → 캐시 무효화 파이프라인을 캡슐화한다. `ActionResult<T>` 타입으로 `{ data, error }` 형태를 통일한다.

권한 상수는 `permissions.ts`에서 중앙 관리:
- `ADMIN_ROLES = ['admin', 'superadmin']`
- `MODERATOR_ROLES = ['admin', 'superadmin', 'moderator']`
- `VIP_ROLES = ['vip', 'moderator', 'admin', 'superadmin']`

## 결과 (Consequences)

**장점**:
- 새 Server Action 추가 시 래퍼만 감싸면 권한 체크 자동 적용
- 권한 누락 방지 (래퍼 없이는 Supabase 클라이언트 접근 불가)
- `ActionResult<T>` 통일로 프론트엔드 에러 핸들링 일관성

**단점**:
- 래퍼 중첩으로 스택 트레이스가 다소 깊어짐
- 권한 계층 변경 시 래퍼와 permissions.ts 동시 수정 필요

## 갱신 이력

- **2026-03-08**: Kaizen Cycle 2-6에서 모든 데이터 접근을 Server Action 경유로 전환 완료. Generic CRUD Action (`admin-crud.ts`) 추가로 admin 페이지 16개 테이블 표준화. 도메인별 Server Action 파일 구조: analytics/(7파일), donor-links.ts, media.ts, dashboard.ts, contributions.ts, data-sync.ts, prizes.ts, ranks.ts, timeline.ts 등.

## 관련 파일
- `src/lib/actions/index.ts` - 5계층 래퍼 정의
- `src/lib/actions/permissions.ts` - 권한 상수 및 유틸리티
- `src/lib/actions/admin-crud.ts` - Generic CRUD (adminAction 래퍼)
- `src/lib/actions/analytics/` - 분석 도메인 (7파일, publicAction 래퍼)
- `src/lib/actions/posts.ts` - 사용 예시 (authAction, moderatorAction)
