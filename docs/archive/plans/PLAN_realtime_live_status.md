# Feature Plan: 실시간 라이브 상태 연동

**Status**: 📋 Planning
**Created**: 2026-01-12
**Last Updated**: 2026-01-12
**Estimated Effort**: Medium-Large (12-18 hours)

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
PandaTV API와 연동하여 실시간 라이브 상태를 자동으로 감지하고 업데이트:
- PandaTV API 클라이언트 구축
- 주기적 폴링 또는 웹훅 수신
- Supabase Realtime으로 UI 자동 갱신
- 시청자 수, 방송 썸네일 실시간 표시

### 현재 상태
- ✅ `live_status` 테이블 스키마 정의됨
- ✅ Supabase Realtime 구독 패턴 구현됨
- ✅ Mock 데이터로 UI 동작 확인됨
- ❌ PandaTV API 연동 없음
- ❌ 폴링/웹훅 메커니즘 없음
- ❌ 실제 시청자 수 표시 안됨

### 성공 기준
- [ ] 멤버 라이브 시작 시 30초 이내 반영
- [ ] 시청자 수 실시간 표시
- [ ] 방송 썸네일 자동 갱신
- [ ] API 실패 시 graceful degradation

---

## Architecture Decisions

### 데이터 동기화 방식
**선택**: Server-side Polling (30초 간격)
- **이유**: PandaTV 웹훅 지원 불확실, 폴링이 더 안정적
- **대안**: 웹훅 (추후 PandaTV 지원 시)

### API 호출 위치
**선택**: Next.js API Route + Vercel Cron
- **이유**: 서버리스 환경에서 안정적인 스케줄링
- **대안**: Supabase Edge Functions

### 상태 저장
**선택**: Supabase `live_status` 테이블
- 변경 시 Realtime 자동 브로드캐스트
- 기존 구독 코드 그대로 활용

---

## Phase Breakdown

### Phase 1: PandaTV API 클라이언트 구축 (3-4시간)

**목표**: PandaTV 라이브 상태 조회 API 클라이언트

**Tasks**:
- [ ] PandaTV API 문서 조사 및 엔드포인트 확인
- [ ] `/src/lib/api/pandatv.ts` 생성
  - `checkLiveStatus(channelId: string)` 함수
  - `bulkCheckLiveStatuses(channelIds: string[])` 함수
- [ ] 응답 타입 정의 (`PandaTVLiveStatus`)
- [ ] 에러 핸들링 (rate limit, timeout, 401)
- [ ] 환경 변수 설정 (`PANDATV_API_KEY` 등)
- [ ] 단위 테스트 작성

**Quality Gate**:
- [ ] 빌드 성공
- [ ] API 클라이언트 테스트 통과
- [ ] Mock 서버로 응답 확인
- [ ] 타입 안정성 확인

**Files**:
- `/src/lib/api/pandatv.ts` (새 파일)
- `/src/types/pandatv.ts` (새 파일)
- `.env.local` (환경 변수)

---

### Phase 2: 데이터베이스 스키마 업데이트 (2-3시간)

**목표**: PandaTV 채널 ID 저장 및 live_status 테이블 최적화

**Tasks**:
- [ ] `organization` 테이블에 `pandatv_channel_id` 컬럼 추가
- [ ] `live_status` 테이블 인덱스 최적화
  - `idx_live_status_member_id`
  - `idx_live_status_is_live`
  - `idx_live_status_last_checked`
- [ ] Mock 데이터에 channel_id 추가
- [ ] Supabase 마이그레이션 파일 생성
- [ ] 타입 정의 업데이트

**Quality Gate**:
- [ ] 마이그레이션 성공
- [ ] 기존 쿼리 정상 동작
- [ ] 인덱스 적용 확인

**Files**:
- `/supabase/migrations/xxx_add_pandatv_channel.sql`
- `/src/types/database.ts`
- `/src/lib/mock/organization.ts`

---

### Phase 3: 폴링 API Route 구현 (3-4시간)

**목표**: 주기적으로 라이브 상태를 확인하고 DB 업데이트

**Tasks**:
- [ ] `/src/app/api/cron/update-live-status/route.ts` 생성
- [ ] 모든 멤버의 pandatv_channel_id 조회
- [ ] PandaTV API 일괄 호출
- [ ] `live_status` 테이블 업데이트
- [ ] `organization.is_live` 동기화 (denormalized)
- [ ] Vercel Cron 설정 (`vercel.json`)
- [ ] 에러 로깅 및 알림

**Quality Gate**:
- [ ] 빌드 성공
- [ ] API Route 수동 호출 테스트
- [ ] DB 업데이트 확인
- [ ] Supabase Realtime 트리거 확인

**Files**:
- `/src/app/api/cron/update-live-status/route.ts` (새 파일)
- `/vercel.json` (cron 설정)
- `/src/lib/services/live-status-sync.ts` (새 파일)

---

### Phase 4: UI 실시간 업데이트 연동 (2-3시간)

**목표**: 라이브 상태 변경 시 UI 자동 갱신

**Tasks**:
- [ ] `LiveMembers.tsx` 구독 로직 검증/개선
- [ ] `rg/live/page.tsx` 구독 로직 검증/개선
- [ ] 시청자 수 실시간 표시 추가
- [ ] 방송 썸네일 표시 추가
- [ ] 라이브 시작/종료 애니메이션
- [ ] 연결 끊김 시 재연결 로직

**Quality Gate**:
- [ ] 빌드 성공
- [ ] Mock 모드에서 기존 동작 유지
- [ ] 실제 모드에서 Realtime 업데이트 확인
- [ ] 네트워크 끊김 후 복구 테스트

**Files**:
- `/src/components/LiveMembers.tsx`
- `/src/app/rg/live/page.tsx`

---

### Phase 5: 모니터링 및 Admin 대시보드 (2-3시간)

**목표**: 라이브 상태 동기화 모니터링

**Tasks**:
- [ ] Admin 대시보드에 동기화 상태 표시
- [ ] 마지막 동기화 시간 표시
- [ ] 수동 동기화 버튼
- [ ] 동기화 실패 알림
- [ ] 채널 ID 관리 UI (organization 편집 시)

**Quality Gate**:
- [ ] 빌드 성공
- [ ] Admin에서 동기화 상태 확인 가능
- [ ] 수동 동기화 동작 확인

**Files**:
- `/src/app/admin/live-status/page.tsx` (새 파일)
- `/src/components/admin/LiveStatusMonitor.tsx` (새 파일)
- `/src/app/admin/organization/page.tsx` (채널 ID 필드)

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| PandaTV API 제한/변경 | Medium | High | 캐싱, 폴링 간격 조절 |
| Rate Limiting | Medium | Medium | 일괄 호출, 간격 조절 |
| Vercel Cron 제한 (Hobby) | Low | Medium | Pro 플랜 또는 외부 서비스 |
| 네트워크 지연 | Low | Low | 타임아웃 설정, 재시도 |

---

## Rollback Strategy

**Phase 1**: API 클라이언트 파일 삭제, 환경 변수 제거
**Phase 2**: 마이그레이션 롤백 SQL 실행
**Phase 3**: API Route 삭제, Cron 설정 제거
**Phase 4**: 기존 구독 코드로 복원
**Phase 5**: Admin 페이지 제거

---

## Progress Tracking

| Phase | Status | Completed At |
|-------|--------|--------------|
| Phase 1: API 클라이언트 | ⏳ Pending | - |
| Phase 2: DB 스키마 | ⏳ Pending | - |
| Phase 3: 폴링 구현 | ⏳ Pending | - |
| Phase 4: UI 연동 | ⏳ Pending | - |
| Phase 5: 모니터링 | ⏳ Pending | - |

---

## Notes & Learnings

*이 섹션은 구현 중 발견한 사항을 기록합니다.*

### PandaTV API 정보
- Base URL: `https://api.pandalive.co.kr/` (확인 필요)
- 인증: API Key 또는 OAuth (확인 필요)
- Rate Limit: TBD

---

## Related Files

- `/src/components/LiveMembers.tsx` - 메인 라이브 섹션
- `/src/app/rg/live/page.tsx` - 라이브 전체 페이지
- `/src/lib/mock/live-status.ts` - Mock 데이터
- `/src/lib/mock/organization.ts` - 조직 데이터
- `/src/types/database.ts` - DB 타입
