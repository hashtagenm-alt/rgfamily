# RG Family UI/UX 긴급 수정 계획

> **최종 납품일**: 2026-01-15
> **Phase A 완료 목표**: 2026-01-13
> **Phase B 완료 목표**: 2026-01-14

---

**CRITICAL INSTRUCTIONS**: After completing each phase:

1. Check off completed task checkboxes
2. Run build verification: `npm run build`
3. Verify ALL quality gate items pass
4. Update "Last Updated" date
5. Document learnings in Notes section
6. Only then proceed to next phase

DO NOT skip quality gates or proceed with failing checks

---

## Phase A: 긴급 UI 수정 (1/12 ~ 1/13)

### Phase A-1: 메인 배너 전체 너비 (30분)

**Goal**: 메인 배너 양 옆 여백 제거, 전체 화면 너비로 확장

**Tasks**:
- [ ] `src/components/Hero.module.css` - `.container` 패딩 제거
- [ ] `src/components/Hero.module.css` - `.carousel` max-width 제거
- [ ] 모바일 반응형 확인

**Quality Gate**:
- [ ] 배너가 화면 전체 너비를 채움
- [ ] 네비게이션 버튼 위치 유지
- [ ] 모바일에서도 정상 표시

---

### Phase A-2: 텍스트 크기 상향 (45분)

**Goal**: 라이브 멤버 카드, 버튼 폰트 크기 확대

**Tasks**:
- [ ] `src/components/LiveMembers.module.css` - `.name` 폰트 사이즈 +2px
- [ ] `src/components/LiveMembers.module.css` - `.liveBadge` 폰트 사이즈 조정
- [ ] `src/components/info/MemberCard.module.css` - 텍스트 크기 확대
- [ ] `src/components/Hero.module.css` - 모바일 텍스트 가독성 개선

**Quality Gate**:
- [ ] 라이브 멤버 닉네임이 명확하게 보임
- [ ] 버튼 텍스트가 작지 않음
- [ ] 모바일 가독성 확인

---

### Phase A-3: 호버 시그니처 컬러 전환 (1시간)

**Goal**: 카드/버튼 hover 시 핑크색 (#fd68ba) 전환 효과

**Tasks**:
- [ ] `src/app/globals.css` - 공통 호버 클래스 추가 (`.hover-pink`)
- [ ] `src/components/info/MemberCard.module.css` - hover 시 border/shadow 핑크
- [ ] `src/components/info/SigCard.module.css` - hover 시 핑크 전환
- [ ] `src/components/info/Timeline.module.css` - 카드 hover 핑크
- [ ] `src/components/LiveMembers.module.css` - 멤버 카드 hover 핑크
- [ ] 버튼 컴포넌트 hover 상태 통일

**Quality Gate**:
- [ ] 모든 주요 카드에 hover 핑크 효과 적용
- [ ] 전환 애니메이션이 부드러움
- [ ] 다크/라이트 모드 모두 작동

---

### Phase A-4: 조직도 레이아웃 수정 (45분)

**Goal**: RG FAMILY 타이틀 크게, ORGANIZATION 배지 제거

**Tasks**:
- [ ] `src/app/organization/page.tsx` - headerBadge에서 "ORGANIZATION" 텍스트 제거
- [ ] `src/app/organization/page.module.css` - `.logoSubtext` (RG FAMILY) 스타일 강화
- [ ] 엑셀부/크루부 토글 위치 조정 (타이틀 바로 아래)
- [ ] 헤더 구조 단순화

**Quality Gate**:
- [ ] "RG FAMILY" 타이틀이 크고 명확함
- [ ] "ORGANIZATION" 배지 제거됨
- [ ] 토글 위치가 적절함

---

## Phase B: 기능 개선 (1/13 ~ 1/14)

### Phase B-1: 조직도 + 라이브 상태 연동 (1.5시간)

**Goal**: 조직도 프로필 카드에 LIVE 상태 배지 표시

**Tasks**:
- [ ] `src/components/info/MemberCard.tsx` - LIVE 배지 표시 로직 추가
- [ ] `src/components/info/MemberCard.module.css` - LIVE 배지 스타일
- [ ] `src/components/info/MemberDetailModal.tsx` - 상세 팝업에 방송중 표시 + 바로가기 버튼
- [ ] Mock 데이터에서 is_live 필드 활용

**Quality Gate**:
- [ ] 방송 중인 멤버에 LIVE 배지 표시
- [ ] 상세 팝업에서 방송 바로가기 버튼 작동
- [ ] LIVE 배지 애니메이션 (시안색 펄스)

---

### Phase B-2: 캘린더 핑크 그리드 (1시간)

**Goal**: 캘린더에 흰색 배경 + 핑크 그리드 라인 적용

**Tasks**:
- [ ] `src/app/schedule/page.module.css` - 캘린더 그리드 스타일 변경
- [ ] 라이트 모드: 흰색 배경 + 핑크 그리드 라인
- [ ] 다크 모드: 다크 배경 + 핑크 그리드 라인
- [ ] 엑셀부/크루부 이벤트 색상 구분

**Quality Gate**:
- [ ] 그리드 라인이 핑크색
- [ ] 날짜 셀 가독성 좋음
- [ ] 이벤트 색상 구분 명확

---

### Phase B-3: 랭킹 금/은/동 컬러 (45분)

**Goal**: 1~3위에 금/은/동 메달 색상 적용

**Tasks**:
- [ ] `src/components/ranking/RankingPodium.module.css` - 1위 금색 (--metallic-gold)
- [ ] `src/components/ranking/RankingPodium.module.css` - 2위 은색 (--metallic-silver)
- [ ] `src/components/ranking/RankingPodium.module.css` - 3위 동색 (--metallic-bronze)
- [ ] 숫자 표기 단순화 (불필요한 0 제거)

**Quality Gate**:
- [ ] 1~3위 색상이 명확히 구분됨
- [ ] 숫자 표기가 깔끔함
- [ ] 다크/라이트 모드 모두 가독성 좋음

---

### Phase B-4: Secret Page (Tribute Page) 완성도 향상 (1시간)

**Goal**: `/ranking/[userId]` 개인 헌정 페이지 UI 개선

**Tasks**:
- [ ] `src/app/ranking/[userId]/page.tsx` - 접근 권한 체크 강화
- [ ] `src/app/ranking/[userId]/page.module.css` - 프리미엄 다크 배경 적용
- [ ] 방명록 섹션 UI 추가 (placeholder)
- [ ] 감사 영상 섹션 레이아웃 개선

**Quality Gate**:
- [ ] 권한 없는 사용자 접근 차단
- [ ] 프리미엄 디자인 적용
- [ ] 모든 섹션 레이아웃 완성

---

## Quality Gate Checklist

### Build & Compilation
- [ ] `npm run build` 성공
- [ ] TypeScript 에러 없음
- [ ] ESLint 경고 최소화

### Visual Verification
- [ ] 다크 모드 스크린샷 확인
- [ ] 라이트 모드 스크린샷 확인
- [ ] 모바일 뷰 (375px) 확인
- [ ] 태블릿 뷰 (768px) 확인

### Functionality
- [ ] 모든 페이지 네비게이션 정상
- [ ] 호버 효과 정상 작동
- [ ] LIVE 상태 표시 정상

---

## Risk Assessment

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| CSS 충돌 | 중 | 중 | CSS Modules로 격리, 테마 변수 사용 |
| 모바일 레이아웃 깨짐 | 중 | 높 | 수정 시 항상 모바일 우선 확인 |
| 빌드 실패 | 낮 | 높 | 각 단계별 빌드 확인 |

---

## Notes & Learnings

(완료 후 기록)

---

**Last Updated**: 2026-01-12
**Status**: In Progress (Phase A 시작)
