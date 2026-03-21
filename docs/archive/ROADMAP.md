# RG Family 개발 로드맵

> 프로젝트 진행 현황 및 향후 계획
>
> 최종 업데이트: 2026-01-13

---

## 구현 현황 요약

| 영역 | 완료 | 진행중 | 미구현 | 진행률 |
|------|------|--------|--------|--------|
| 메인 페이지 | 5 | 0 | 0 | 100% |
| RG Info | 4 | 0 | 0 | 100% |
| 랭킹 시스템 | 4 | 1 | 0 | 90% |
| 커뮤니티 | 2 | 0 | 0 | 100% |
| Admin CMS | 11 | 0 | 0 | 100% |
| 실시간 기능 | 1 | 1 | 1 | 50% |
| **전체** | **27** | **2** | **1** | **90%** |

---

## Phase 1: 핵심 기능 (완료)

### 메인 페이지 ✅

| 기능 | 상태 | 파일 위치 |
|------|------|----------|
| Hero 배너 슬라이더 | ✅ | `src/components/home/Hero.tsx` |
| LIVE MEMBERS (시안색 펄스) | ✅ | `src/components/home/LiveMembers.tsx` |
| 공지사항 섹션 | ✅ | `src/components/home/Notice.tsx` |
| Shorts 섹션 | ✅ | `src/components/home/Shorts.tsx` |
| VOD 섹션 | ✅ | `src/components/home/VOD.tsx` |

### RG Info ✅

| 기능 | 상태 | 파일 위치 |
|------|------|----------|
| 조직도 (계층 구조 + 연결선) | ✅ | `src/app/rg/org/page.tsx` |
| 시그리스트 (6-col 그리드) | ✅ | `src/app/rg/sig/page.tsx` |
| 타임라인 (시즌별 카드형) | ✅ | `src/app/rg/history/page.tsx` |
| 라이브 상태 페이지 | ✅ | `src/app/rg/live/page.tsx` |

### 랭킹 시스템 ✅

| 기능 | 상태 | 파일 위치 |
|------|------|----------|
| 전체 랭킹 + 게이지 바 | ✅ | `src/app/ranking/page.tsx` |
| 시즌별 랭킹 | ✅ | `src/app/ranking/season/[id]/page.tsx` |
| VIP 라운지 (Top 50) | ✅ | `src/app/ranking/vip/page.tsx` |
| Top 1-3 헌정 페이지 | ✅ | `src/app/ranking/tribute/[hash]/page.tsx` |

### 커뮤니티 ✅

| 기능 | 상태 | 파일 위치 |
|------|------|----------|
| 자유게시판 | ✅ | `src/app/community/free/page.tsx` |
| VIP 게시판 | ✅ | `src/app/community/vip/page.tsx` |

### 인증/권한 ✅

| 기능 | 상태 | 파일 위치 |
|------|------|----------|
| 로그인 | ✅ | `src/app/(auth)/login/page.tsx` |
| 회원가입 | ✅ | `src/app/(auth)/signup/page.tsx` |
| VIP 권한 체크 | ✅ | `src/lib/auth/access-control.ts` |
| Admin 권한 체크 | ✅ | `src/lib/auth/access-control.ts` |

---

## Phase 2: Admin CMS (완료)

### 11개 관리 페이지 ✅

| 페이지 | 기능 | 상태 |
|--------|------|------|
| Dashboard | 통계 대시보드 | ✅ |
| Donations | 후원 관리 + CSV 업로드 | ✅ |
| Seasons | 시즌 관리 | ✅ |
| Members | 멤버 관리 | ✅ |
| Organization | 조직도 관리 | ✅ |
| Notices | 공지사항 관리 | ✅ |
| Banners | 배너 관리 | ✅ |
| Media | 미디어(Shorts/VOD) 관리 | ✅ |
| Signatures | 시그니처 관리 | ✅ |
| Posts | 게시글 관리 | ✅ |
| VIP Rewards | VIP 보상 관리 | ✅ |

---

## Phase 3: 데이터 레이어 (완료)

### Supabase 통합 ✅

| 기능 | 상태 | 설명 |
|------|------|------|
| 15개 테이블 스키마 | ✅ | `supabase/migrations/` |
| Repository 패턴 | ✅ | `src/lib/repositories/` |
| Mock/Supabase 자동 전환 | ✅ | `USE_MOCK_DATA` 플래그 |
| 타입 자동 생성 | ✅ | `src/types/database.ts` |
| Server Actions | ✅ | `src/lib/actions/` |

### Mock 데이터 시스템 ✅

| 기능 | 상태 | 설명 |
|------|------|------|
| 50명 프로필 | ✅ | 테스트용 후원자 데이터 |
| 4시즌 데이터 | ✅ | 시즌 1~4 |
| 레이지 로딩 | ✅ | 필요 시 생성 |
| 캐시 관리 | ✅ | 메모이제이션 |

---

## Phase 4: 실시간 기능 (진행중)

### 라이브 상태 시스템

| 기능 | 상태 | 설명 |
|------|------|------|
| 라이브 상태 표시 UI | ✅ | 시안색 펄스 애니메이션 |
| 라이브 폴링 훅 | ✅ | `useLiveStatusPolling` 30초 간격 |
| PandaTV API 연동 | 🔄 | `/api/live-status/sync` 크론 작업 |
| 알림 시스템 | ❌ | 공지/일정 알림 |

### 진행 상황

- **완료**: 프론트엔드 UI, 폴링 시스템
- **진행중**: PandaTV API 연동 (채널 라이브 상태 확인)
- **미구현**: 푸시 알림, 실시간 구독

---

## Phase 5: 향후 계획

### 우선순위 높음 🔴

| 기능 | 설명 | 예상 작업량 |
|------|------|------------|
| PandaTV API 완성 | 채널별 라이브 상태 자동 감지 | 중간 |
| 알림 시스템 | 공지/일정 알림 (웹 푸시) | 높음 |

### 우선순위 중간 🟡

| 기능 | 설명 | 예상 작업량 |
|------|------|------------|
| 실시간 구독 | Supabase Realtime 활용 | 중간 |
| 검색 기능 | 전체 사이트 검색 | 중간 |
| 댓글 시스템 개선 | 대댓글, 좋아요 | 낮음 |

### 우선순위 낮음 🟢

| 기능 | 설명 | 예상 작업량 |
|------|------|------------|
| PWA 지원 | 앱처럼 설치 가능 | 낮음 |
| 다국어 지원 | i18n 적용 | 중간 |
| 분석 대시보드 | 방문자 통계 | 중간 |

---

## 기술 부채

### 즉시 수정 필요 🔴

| 이슈 | 설명 | 파일 |
|------|------|------|
| 테스트 실패 | `formatAmountShort` 함수 | `src/lib/utils/format.ts` |
| LIVE 색상 충돌 | globals.css vs LiveMembers.module.css | CSS 파일들 |
| Prettier 부재 | 코드 포맷팅 자동화 없음 | 프로젝트 설정 |

### 개선 권장 🟡

| 이슈 | 설명 |
|------|------|
| Repository 복잡성 | IDataProvider 모듈별 분리 권장 |
| 중복 로직 | getRankColor() 함수 중복 |
| CSS HEX 하드코딩 | Hero.module.css 등 CSS 변수로 변경 |
| Mantine 과잉 의존 | 사용하지 않는 기능 정리 |

---

## 릴리즈 히스토리

### v1.0.0 (2025-12)
- 핵심 기능 구현 완료
- Admin CMS 11개 페이지
- VIP 라운지 + 헌정 페이지

### v1.1.0 (2026-01)
- Supabase 통합 완료
- Repository 패턴 적용
- 무한 스크롤 + 해시 기반 URL

### v1.2.0 (진행중)
- PandaTV 라이브 상태 연동
- 알림 시스템

---

## 참고 문서

| 문서 | 용도 |
|------|------|
| `CLAUDE.md` | 개발 지침 (165개 규칙) |
| `docs/RG_FAMILY_DESIGN_SYSTEM.md` | 디자인 시스템 |
| `docs/SUPABASE_SCHEMA.md` | DB 스키마 |
| `docs/ARCHITECTURE_ANALYSIS_REPORT.md` | 아키텍처 분석 |
| `workthrough/*.md` | 작업 이력 |
