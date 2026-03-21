# Feature Plan: Top 1-3 헌정 페이지 완성

**Status**: 📋 Planning
**Created**: 2026-01-12
**Last Updated**: 2026-01-12
**Estimated Effort**: Medium (8-12 hours)

---

**CRITICAL INSTRUCTIONS**: After completing each phase:

1. ✅ Check off completed task checkboxes
2. 🧪 Run all quality gate validation commands
3. ⚠️ Verify ALL quality gate items pass
4. 📅 Update "Last Updated" date
5. 📝 Document learnings in Notes section
6. ➡️ Only then proceed to next phase

⛔ DO NOT skip quality gates or proceed with failing checks

---

## Overview

### 목표
Top 1-3 후원자 전용 헌정 페이지(`/ranking/[userId]`)를 완성하여:
- 접근 제어 검증 추가
- Supabase 실제 데이터 연동
- 반응형 디자인 개선
- Admin 관리 인터페이스 구축

### 현재 상태
- ✅ UI/UX 디자인 및 애니메이션 완료
- ✅ Mock 데이터 시스템 구축
- ✅ 타입 정의 완료 (VipTributeData, HallOfFameHonor)
- ❌ 접근 제어 미구현 (누구나 접근 가능)
- ❌ Supabase 연동 미완
- ❌ Admin 관리 UI 없음

### 성공 기준
- [ ] Top 1-3 사용자만 본인 페이지 접근 가능
- [ ] 실제 Supabase 데이터 표시
- [ ] 모바일에서 최적화된 UI
- [ ] Admin에서 헌정 콘텐츠 관리 가능

---

## Architecture Decisions

### 접근 제어 방식
**선택**: Server-side 검증 + Client-side UI 제어
- Server Component에서 userId 검증
- 권한 없을 시 404 또는 접근 거부 페이지
- Client에서는 데이터 숨김만 처리

### 데이터 구조
**선택**: 기존 Supabase 테이블 활용
- `vip_rewards` 테이블 확장
- `vip_images` 테이블 확장
- `hall_of_fame` 뷰 생성

---

## Phase Breakdown

### Phase 1: 접근 제어 구현 (2-3시간)

**목표**: Top 1-3 사용자만 본인 헌정 페이지에 접근 가능하도록

**Tasks**:
- [ ] `src/app/ranking/[userId]/page.tsx`에 Server Component 래퍼 추가
- [ ] 현재 사용자 인증 상태 확인 로직
- [ ] Top 1-3 랭킹 검증 함수 구현
- [ ] userId 파라미터와 현재 사용자 일치 확인
- [ ] 권한 없을 시 접근 거부 UI 또는 리다이렉트
- [ ] Admin 역할 예외 처리 (Admin은 모든 페이지 접근)

**Quality Gate**:
- [ ] 빌드 성공 (`npm run build`)
- [ ] 비로그인 사용자 → 접근 거부
- [ ] Top 4+ 사용자 → 접근 거부
- [ ] Top 1-3 사용자 → 본인 페이지만 접근
- [ ] Admin → 모든 페이지 접근

**Files**:
- `/src/app/ranking/[userId]/page.tsx`
- `/src/lib/auth/access-control.ts` (새 파일)

---

### Phase 2: Supabase 데이터 연동 (3-4시간)

**목표**: Mock 데이터 대신 실제 Supabase 데이터 표시

**Tasks**:
- [ ] `vip_rewards` 테이블 스키마 확인/수정
  - personal_message, dedication_video_url, streamer_signature 컬럼
- [ ] `vip_images` 테이블 스키마 확인/수정
  - reward_id FK, image_url, title, order_index
- [ ] `useVipTribute` 훅 생성 (Mock/Supabase 분기)
- [ ] 헌정 데이터 Fetch 로직 구현
- [ ] Hall of Fame 히스토리 쿼리 구현
- [ ] 에러 핸들링 및 로딩 상태

**Quality Gate**:
- [ ] 빌드 성공
- [ ] Mock 모드에서 기존과 동일 동작
- [ ] Supabase 모드에서 실제 데이터 표시
- [ ] 데이터 없을 시 적절한 fallback UI

**Files**:
- `/src/lib/hooks/useVipTribute.ts` (새 파일)
- `/src/types/database.ts` (스키마 업데이트)
- `/src/app/ranking/[userId]/page.tsx`

---

### Phase 3: 반응형 디자인 개선 (2-3시간)

**목표**: 모바일에서 최적화된 헌정 페이지 UI

**Tasks**:
- [ ] Hero 섹션 타이포그래피 조정 (모바일)
  - 현재: `text-6xl` 고정 → 반응형 클램프
- [ ] 멤버 비디오 그리드 개선
  - Desktop: 3열 → Tablet: 2열 → Mobile: 1열
- [ ] 포토 갤러리 반응형 조정
- [ ] 입장 애니메이션 모바일 최적화
- [ ] 터치 인터랙션 개선 (스와이프 등)
- [ ] 이미지 lazy loading 적용

**Quality Gate**:
- [ ] 빌드 성공
- [ ] Chrome DevTools 모바일 뷰 확인 (iPhone SE, iPhone 12, Pixel 5)
- [ ] 실제 모바일 기기 테스트 (선택사항)
- [ ] Lighthouse Performance 점수 70+

**Files**:
- `/src/app/ranking/[userId]/page.tsx`
- `/src/components/tribute/TributeHero.tsx`
- `/src/components/tribute/TributeGallery.tsx`

---

### Phase 4: Admin 관리 인터페이스 (3-4시간)

**목표**: Admin에서 Top 1-3 헌정 콘텐츠 관리

**Tasks**:
- [ ] `/src/app/admin/tribute/page.tsx` 생성
- [ ] Top 1-3 사용자 목록 표시
- [ ] 개인 메시지 편집 기능
- [ ] 헌정 비디오 URL 관리
- [ ] 포토 갤러리 이미지 업로드/삭제
- [ ] 멤버 비디오 할당 기능
- [ ] 독점 시그니처 선택 기능
- [ ] Sidebar에 메뉴 추가

**Quality Gate**:
- [ ] 빌드 성공
- [ ] Admin 페이지에서 CRUD 동작 확인
- [ ] 수정 내용이 헌정 페이지에 반영
- [ ] 이미지 업로드 후 Supabase Storage에 저장

**Files**:
- `/src/app/admin/tribute/page.tsx` (새 파일)
- `/src/components/admin/TributeEditor.tsx` (새 파일)
- `/src/components/admin/Sidebar.tsx` (메뉴 추가)

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Supabase 스키마 불일치 | Medium | High | Mock 데이터 구조 기준으로 마이그레이션 |
| 이미지 업로드 용량 제한 | Low | Medium | 클라이언트 측 리사이징 적용 |
| 접근 제어 우회 가능성 | Low | High | Server Component에서만 검증 |

---

## Rollback Strategy

**Phase 1**: 접근 제어 코드 제거, 기존 코드 복원
**Phase 2**: `USE_MOCK_DATA=true`로 전환
**Phase 3**: 이전 반응형 클래스 복원 (git revert)
**Phase 4**: Admin 페이지 및 Sidebar 메뉴 제거

---

## Progress Tracking

| Phase | Status | Completed At |
|-------|--------|--------------|
| Phase 1: 접근 제어 | ⏳ Pending | - |
| Phase 2: Supabase 연동 | ⏳ Pending | - |
| Phase 3: 반응형 개선 | ⏳ Pending | - |
| Phase 4: Admin UI | ⏳ Pending | - |

---

## Notes & Learnings

*이 섹션은 구현 중 발견한 사항을 기록합니다.*

---

## Related Files

- `/src/app/ranking/[userId]/page.tsx` - 메인 헌정 페이지
- `/src/app/ranking/vip/page.tsx` - VIP 라운지 (Top 50)
- `/src/components/tribute/*` - 헌정 컴포넌트들
- `/src/lib/mock/vip-tribute.ts` - Mock 데이터
- `/src/types/common.ts` - 타입 정의
