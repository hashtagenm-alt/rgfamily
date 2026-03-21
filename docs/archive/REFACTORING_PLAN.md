# RG Family 프로젝트 구조 리팩토링 계획

## 분석 일자: 2026-01-12

---

## 📊 현황 요약

| 항목 | 수치 |
|------|------|
| 전체 소스 파일 | 134개 (tsx/ts) |
| CSS Modules | 52개 |
| 앱 페이지 | 31개 |
| 컴포넌트 | 46개 |
| Mock 데이터 파일 | 18개 |

---

## 🔴 Phase 1: 긴급 리팩토링 (1-2일)

### 1.1 조직도 훅 추출 (코드 중복 해결)

**문제:** `organization/page.tsx`와 `rg/live/page.tsx`에서 동일한 데이터 fetch 로직 중복

**해결:** `useOrganization` 훅 생성

```typescript
// src/lib/hooks/useOrganization.ts
export function useOrganization(options?: { liveOnly?: boolean }) {
  const supabase = useSupabaseContext()
  const [members, setMembers] = useState<OrgMember[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchMembers = async () => {
      if (USE_MOCK_DATA) {
        const data = mockOrganization.map(m => ({
          id: m.id,
          name: m.name,
          role: m.role,
          unit: m.unit,
          image_url: m.image_url,
          is_live: m.is_live,
          social_links: m.social_links,
          position_order: m.position_order,
          parent_id: m.parent_id,
        }))
        setMembers(options?.liveOnly ? data.filter(m => m.is_live) : data)
        setIsLoading(false)
        return
      }
      // Supabase fetch...
    }
    fetchMembers()
  }, [options?.liveOnly])

  return { members, isLoading }
}
```

**변경 파일:**
- [ ] `src/lib/hooks/useOrganization.ts` 생성
- [ ] `src/app/organization/page.tsx` 수정 (훅 사용)
- [ ] `src/app/rg/live/page.tsx` 수정 (훅 사용)
- [ ] `src/lib/hooks/index.ts` export 추가

---

### 1.2 컴포넌트 루트 정리

**이동할 파일:**

| 파일 | 현재 위치 | 이동 위치 | 이유 |
|------|----------|----------|------|
| `RankingBoard.tsx` | `components/` | `components/ranking/` | 도메인별 그룹핑 |
| `SectionHeader.tsx` | `components/` | `components/ui/` | 공용 유틸 컴포넌트 |
| `SectionSkeleton.tsx` | `components/` | `components/ui/` | 공용 유틸 컴포넌트 |
| `ThemeToggle.tsx` | `components/` | `components/ui/` | 공용 유틸 컴포넌트 |

**실행 명령:**
```bash
# 파일 이동
mv src/components/RankingBoard.tsx src/components/ranking/
mv src/components/SectionHeader.tsx src/components/ui/
mv src/components/SectionSkeleton.tsx src/components/ui/
mv src/components/ThemeToggle.tsx src/components/ui/

# import 업데이트 필요
```

---

### 1.3 홈 페이지 컴포넌트 그룹화

**새 폴더 생성:** `src/components/home/`

| 파일 | 현재 위치 | 이동 위치 |
|------|----------|----------|
| `Hero.tsx` | `components/` | `components/home/` |
| `LiveMembers.tsx` | `components/` | `components/home/` |
| `Notice.tsx` | `components/` | `components/home/` |
| `Shorts.tsx` | `components/` | `components/home/` |
| `VOD.tsx` | `components/` | `components/home/` |

**인덱스 파일:**
```typescript
// src/components/home/index.ts
export { default as Hero } from './Hero'
export { default as LiveMembers } from './LiveMembers'
export { default as Notice } from './Notice'
export { default as Shorts } from './Shorts'
export { default as VOD } from './VOD'
```

---

## 🟡 Phase 2: 중요 리팩토링 (3-5일)

### 2.1 RG 정보 라우트 통합

**현재 (분산됨):**
```
/organization    → RG 조직도
/signature       → 시그리스트
/timeline        → 타임라인
/rg/live         → 라이브 상태
```

**변경 후 (통합됨):**
```
/rg/
├── org/         → RG 조직도 (redirect: /organization → /rg/org)
├── sig/         → 시그리스트 (redirect: /signature → /rg/sig)
├── history/     → 타임라인 (redirect: /timeline → /rg/history)
└── live/        → 라이브 상태 (유지)
```

**Navbar 업데이트:**
```typescript
// src/components/Navbar.tsx
const rgInfoItems = [
  { label: '라이브', href: '/rg/live' },
  { label: '조직도', href: '/rg/org' },
  { label: '시그리스트', href: '/rg/sig' },
  { label: '타임라인', href: '/rg/history' },
]
```

**리다이렉트 설정:** `next.config.ts`
```typescript
async redirects() {
  return [
    { source: '/organization', destination: '/rg/org', permanent: true },
    { source: '/signature', destination: '/rg/sig', permanent: true },
    { source: '/timeline', destination: '/rg/history', permanent: true },
  ]
}
```

---

### 2.2 유틸 함수 통합

**현재 구조 (분산):**
```
lib/utils.ts              → cn() 만 있음
lib/utils/format.ts       → formatDate, formatShortDate
lib/utils/ranking.ts      → getRankIcon, getInitials
lib/utils/youtube.ts      → YouTube URL 파싱
lib/mock/utils.ts         → getPlaceholderAvatar, getDateWithOffset
```

**통합 구조:**
```
lib/utils/
├── index.ts              → 모든 export 집약
├── cn.ts                 → Tailwind class merge
├── format.ts             → 날짜/숫자 포맷팅
├── ranking.ts            → 랭킹 관련
├── youtube.ts            → YouTube 헬퍼
├── images.ts             → 이미지 플레이스홀더 (mock에서 이동)
└── dates.ts              → 날짜 연산 (mock에서 이동)
```

**lib/utils.ts 삭제** → 모든 import를 `@/lib/utils/` 또는 `@/lib/utils`로 통일

---

### 2.3 타입 정의 통합

**새 타입 파일 구조:**
```
types/
├── common.ts             → 공용 타입 (유지)
├── database.ts           → DB 스키마 타입 (유지)
├── organization.ts       → OrgMember, UnitType, LiveMember (신규)
├── ranking.ts            → RankingItem, RankingData (신규)
├── community.ts          → Post, Comment (신규)
└── index.ts              → 모든 export
```

**인라인 타입 이동:**
- `OrgMember` (organization/page.tsx → types/organization.ts)
- `LiveMember` (rg/live/page.tsx → types/organization.ts)
- `UnitFilter` (여러 곳 → types/organization.ts)

---

### 2.4 VIP 데이터 통합

**현재 (중복):**
```
lib/mock/vip-content.ts   → VIP 콘텐츠 (100줄)
lib/mock/vip-rewards.ts   → VIP 보상 (200줄)
lib/mock/vip-tribute.ts   → VIP 헌정 (별도)
```

**통합:**
```
lib/mock/vip/
├── index.ts              → 통합 export
├── content.ts            → VIP 전용 콘텐츠
├── rewards.ts            → 랭킹 보상 시스템
└── tribute.ts            → 헌정 페이지 데이터
```

---

## 🟢 Phase 3: 개선 리팩토링 (1주)

### 3.1 대형 페이지 분할

**ranking/[userId]/page.tsx (618줄)**
```
분할 방안:
├── components/tribute/TributeGate.tsx      → 게이트 애니메이션
├── components/tribute/TributeAccessDenied.tsx → 접근 거부 UI
├── components/tribute/TributeContent.tsx   → 메인 콘텐츠
└── hooks/useTributeData.ts                 → 데이터 로딩 로직
```

**admin/donations/page.tsx (517줄)**
```
분할 방안:
├── components/admin/DonationTable.tsx      → 테이블 UI
├── components/admin/DonationModal.tsx      → 등록/수정 모달
├── components/admin/DonationCsvUpload.tsx  → CSV 업로드
└── hooks/useDonations.ts                   → CRUD 로직
```

---

### 3.2 인덱스 파일 추가

**누락된 인덱스:**
- [ ] `src/components/community/index.ts`
- [ ] `src/components/home/index.ts` (신규 생성 시)
- [ ] `src/components/index.ts` (전역 레이아웃 export)

---

### 3.3 테스트 파일 구조 개선

**현재:**
```
__tests__/
├── setup.ts
└── utils/
    ├── format.test.ts
    └── ranking.test.ts
```

**권장 (co-location):**
```
src/lib/utils/
├── format.ts
├── format.test.ts        ← 같은 폴더에 테스트
├── ranking.ts
└── ranking.test.ts       ← 같은 폴더에 테스트
```

---

## 📋 실행 체크리스트

### Phase 1 (긴급)
- [ ] `useOrganization` 훅 생성
- [ ] 컴포넌트 4개 이동 (RankingBoard, SectionHeader, SectionSkeleton, ThemeToggle)
- [ ] 홈 컴포넌트 그룹화 (`components/home/`)
- [ ] 모든 import 경로 업데이트
- [ ] 빌드 테스트

### Phase 2 (중요)
- [ ] RG 라우트 통합 (`/rg/*`)
- [ ] next.config.ts 리다이렉트 설정
- [ ] 유틸 함수 통합
- [ ] 타입 파일 분리
- [ ] VIP 데이터 통합
- [ ] Navbar 업데이트
- [ ] 빌드 테스트

### Phase 3 (개선)
- [ ] ranking/[userId] 페이지 분할
- [ ] admin/donations 페이지 분할
- [ ] 인덱스 파일 추가
- [ ] 테스트 구조 개선

---

## 예상 효과

| 지표 | 현재 | 개선 후 |
|------|------|---------|
| 코드 중복 | ~200줄 | ~0줄 |
| 루트 컴포넌트 | 12개 | 2개 (Providers, Footer) |
| 라우트 일관성 | 분산 | 통합 (/rg/*) |
| 유틸 파일 위치 | 3곳 | 1곳 |
| 평균 페이지 크기 | 350줄 | 200줄 |

---

## 참고 사항

- 리팩토링 시 `git stash` 또는 별도 브랜치에서 작업 권장
- 각 Phase 완료 후 반드시 `npm run build` 테스트
- import 경로 변경 시 IDE의 "Find and Replace" 기능 활용
- CSS Module 파일도 함께 이동 필요
