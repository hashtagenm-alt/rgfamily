# Feature Plan: 알림 시스템 구축

**Status**: 📋 Planning
**Created**: 2026-01-12
**Last Updated**: 2026-01-12
**Estimated Effort**: Medium (10-15 hours)

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
통합 알림 시스템 구축:
- Toast 알림 표준화 (Mantine Notifications)
- 실시간 사용자 알림 (Supabase Realtime)
- 알림 센터 UI
- 알림 설정/선호도 관리

### 현재 상태
- ✅ Mantine Notifications 설치 및 설정됨
- ✅ Admin CRUD에서 부분적 사용 중
- ❌ 일부 페이지에서 `alert()` 사용
- ❌ 실시간 알림 없음
- ❌ 알림 센터 UI 없음
- ❌ 알림 히스토리 저장 안됨

### 성공 기준
- [ ] 모든 `alert()` 호출 제거
- [ ] 일관된 Toast 스타일 적용
- [ ] 실시간 알림 수신 및 표시
- [ ] 알림 센터에서 히스토리 확인
- [ ] 읽음/안읽음 상태 관리

---

## Architecture Decisions

### Toast 라이브러리
**선택**: Mantine Notifications (기존 사용)
- **이유**: 이미 설치됨, 테마 통합, 큐 관리
- **대안**: shadcn/ui Toast (추가 설정 필요)

### 실시간 알림
**선택**: Supabase Realtime
- **이유**: 기존 인프라, 간단한 설정
- **대안**: WebSocket, Pusher

### 알림 저장소
**선택**: Supabase `notifications` 테이블
- **이유**: 히스토리 보존, 읽음 상태 관리

---

## Phase Breakdown

### Phase 1: Toast 알림 표준화 (2-3시간)

**목표**: 모든 페이지에서 일관된 Toast 알림 사용

**Tasks**:
- [ ] `useNotification` 훅 생성
  ```typescript
  const { success, error, info, warning } = useNotification()
  ```
- [ ] 표준 알림 스타일 정의 (아이콘, 색상, 지속 시간)
- [ ] Admin 페이지 `alert()` → Mantine 교체
  - `/src/app/admin/organization/page.tsx`
  - `/src/app/admin/posts/page.tsx`
  - 기타 `alert()` 사용 파일
- [ ] 기존 `useAdminCRUD` 알림 패턴 적용

**Quality Gate**:
- [ ] 빌드 성공
- [ ] `alert(` 검색 결과 0개
- [ ] 모든 Admin 페이지에서 Toast 동작 확인
- [ ] 다크/라이트 테마에서 스타일 확인

**Files**:
- `/src/hooks/useNotification.ts` (새 파일)
- `/src/app/admin/**/*.tsx` (alert 교체)

---

### Phase 2: 알림 데이터베이스 설정 (2-3시간)

**목표**: 알림 저장 및 조회 인프라 구축

**Tasks**:
- [ ] `notifications` 테이블 생성
  ```sql
  CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'announcement' | 'personal' | 'system' | 'ranking'
    title TEXT NOT NULL,
    message TEXT,
    icon TEXT, -- 아이콘 이름 또는 URL
    action_url TEXT, -- 클릭 시 이동 URL
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] RLS 정책 설정 (본인 알림만 조회)
- [ ] 인덱스 생성 (`user_id`, `read`, `created_at`)
- [ ] 타입 정의 추가
- [ ] Mock 알림 데이터 생성

**Quality Gate**:
- [ ] 마이그레이션 성공
- [ ] RLS 정책 테스트 통과
- [ ] 타입 체크 통과

**Files**:
- `/supabase/migrations/xxx_create_notifications.sql`
- `/src/types/database.ts`
- `/src/lib/mock/notifications.ts` (새 파일)

---

### Phase 3: 알림 Context 및 Realtime 연동 (3-4시간)

**목표**: 실시간 알림 수신 및 상태 관리

**Tasks**:
- [ ] `NotificationContext` 생성
  - 미읽은 알림 개수
  - 알림 목록
  - 읽음 처리 함수
  - 삭제 함수
- [ ] Supabase Realtime 구독
  ```typescript
  supabase
    .channel('user_notifications')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, handleNewNotification)
    .subscribe()
  ```
- [ ] 새 알림 수신 시 Toast 표시
- [ ] 알림 목록 캐싱/최적화

**Quality Gate**:
- [ ] 빌드 성공
- [ ] Mock 모드에서 알림 Context 동작
- [ ] 실제 모드에서 Realtime 수신 확인
- [ ] Toast 팝업 테스트

**Files**:
- `/src/lib/context/NotificationContext.tsx` (새 파일)
- `/src/hooks/useNotifications.ts` (새 파일)
- `/src/components/Providers.tsx` (Provider 추가)

---

### Phase 4: 알림 센터 UI (3-4시간)

**목표**: Navbar에 알림 벨 아이콘 및 드롭다운

**Tasks**:
- [ ] `NotificationBell` 컴포넌트 생성
  - 미읽은 개수 뱃지
  - 클릭 시 드롭다운
- [ ] `NotificationDropdown` 컴포넌트
  - 최근 알림 목록 (최대 10개)
  - 읽음/안읽음 시각적 구분
  - "모두 읽음" 버튼
  - "전체 보기" 링크
- [ ] `/notifications` 전체 알림 페이지
  - 페이지네이션
  - 필터 (유형별)
  - 개별/전체 삭제
- [ ] Navbar에 NotificationBell 추가
- [ ] 모바일 반응형 디자인

**Quality Gate**:
- [ ] 빌드 성공
- [ ] Desktop/Mobile에서 UI 확인
- [ ] 읽음 처리 동작 확인
- [ ] 드롭다운 외부 클릭 시 닫힘

**Files**:
- `/src/components/notifications/NotificationBell.tsx` (새 파일)
- `/src/components/notifications/NotificationDropdown.tsx` (새 파일)
- `/src/app/notifications/page.tsx` (새 파일)
- `/src/components/Navbar.tsx` (Bell 추가)

---

### Phase 5: 알림 발송 시스템 (2-3시간)

**목표**: 다양한 이벤트에서 알림 발송

**Tasks**:
- [ ] `sendNotification` 서버 액션/유틸리티
  ```typescript
  async function sendNotification({
    userId: string | string[], // 단일 또는 다수
    type: NotificationType,
    title: string,
    message?: string,
    actionUrl?: string
  })
  ```
- [ ] 알림 트리거 추가:
  - Admin 공지사항 등록 → 전체 사용자
  - 새 시즌 시작 → 전체 사용자
  - 랭킹 변동 → 해당 사용자
  - VIP 승격 → 해당 사용자
- [ ] Admin에서 수동 알림 발송 기능

**Quality Gate**:
- [ ] 빌드 성공
- [ ] Admin 공지 등록 시 알림 발송 확인
- [ ] 알림 센터에서 수신 확인

**Files**:
- `/src/lib/services/notification-service.ts` (새 파일)
- `/src/app/admin/notices/page.tsx` (알림 발송 연동)
- `/src/app/admin/notifications/page.tsx` (새 파일 - 수동 발송)

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Realtime 연결 불안정 | Medium | Medium | 재연결 로직, 폴링 fallback |
| 알림 스팸 | Low | Medium | Rate limiting, 중복 방지 |
| DB 부하 증가 | Low | Low | 적절한 인덱싱, 오래된 알림 정리 |

---

## Rollback Strategy

**Phase 1**: 훅 파일 삭제, 기존 alert 복원
**Phase 2**: 마이그레이션 롤백
**Phase 3**: Context 제거, Provider에서 제외
**Phase 4**: UI 컴포넌트 삭제, Navbar 복원
**Phase 5**: 발송 로직 제거

---

## Progress Tracking

| Phase | Status | Completed At |
|-------|--------|--------------|
| Phase 1: Toast 표준화 | ⏳ Pending | - |
| Phase 2: DB 설정 | ⏳ Pending | - |
| Phase 3: Realtime 연동 | ⏳ Pending | - |
| Phase 4: 알림 센터 UI | ⏳ Pending | - |
| Phase 5: 발송 시스템 | ⏳ Pending | - |

---

## Notes & Learnings

*이 섹션은 구현 중 발견한 사항을 기록합니다.*

### 기존 Mantine 설정
- Provider: `/src/components/Providers.tsx`
- Position: `top-right`
- Styles: `@mantine/notifications/styles.css` 임포트됨

---

## Related Files

- `/src/components/Providers.tsx` - Mantine Notifications Provider
- `/src/hooks/useAdminCRUD.ts` - 기존 알림 패턴
- `/src/components/Navbar.tsx` - 알림 벨 위치
- `/src/app/admin/**/*.tsx` - alert() 교체 대상
