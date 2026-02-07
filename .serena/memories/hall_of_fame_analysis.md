# 명예의 전당 페이지 분석 보고서

## 프로젝트 정보
- **현재 브랜치**: feature/ranking-data-integrity
- **파일 경로**: `/ranking/hall-of-fame`
- **상태**: 완성된 기능 (데이터 무결성 개선 진행 중)

---

## 1. 파일 구조 및 아키텍처

### 1.1 페이지 구조
```
src/app/ranking/hall-of-fame/
├── page.tsx              # 메인 페이지 (Hero + 레이아웃)
└── page.module.css       # 페이지 스타일 (Hero 섹션)

src/components/ranking/
├── HallOfFame.tsx        # 핵심 컴포넌트 (데이터 표시)
└── HallOfFame.module.css # 컴포넌트 스타일

src/lib/
├── actions/
│   └── hall-of-fame.ts   # Server Actions (데이터 조회)
├── hooks/
│   ├── useHallOfFame.ts  # 전체 데이터 조회 Hook
│   └── useVipPodiumAchievers.ts # VIP 클릭 가능 프로필 Hook
└── mock/
    └── hall-of-fame.ts   # Mock 데이터 (개발용, 사용 금지)

src/types/
└── ranking.ts            # 타입 정의

src/types/
└── database.ts           # Supabase 스키마 타입
```

### 1.2 데이터 흐름
```
Page (hall-of-fame/page.tsx)
 └─> HallOfFame Component
      ├─> useHallOfFame() Hook
      │    └─> getHallOfFameData() Server Action
      │         └─> Supabase Query (vip_rewards)
      │
      └─> useVipPodiumAchievers() Hook
           └─> vip_clickable_profiles View 조회
```

---

## 2. 핵심 컴포넌트 분석

### 2.1 Page Component (page.tsx)
**역할**: 페이지 레이아웃 및 Hero 섹션 표시

**특징**:
- Hero 섹션: Crown 아이콘 + 금색 그라디언트 텍스트 + 설명문
- 애니메이션 배경 (glowPulse, particleFloat, crownFloat)
- 반응형 디자인 (모바일/태블릿/데스크톱)
- 접근성 고려 (prefers-reduced-motion)

**주요 스타일**:
- 금색(metallic-gold) 테마
- 시간차 애니메이션 (3-8초)
- 역운동 선호 사용자 지원

### 2.2 HallOfFame Component (HallOfFame.tsx)
**역할**: 명예의 전당 데이터 표시

**구조**:
1. **Statistics Section** (통계)
   - 역대 포디움 달성자 수
   - 진행된 직급전 수

2. **Season List** (시즌 목록)
   - 시즌별 Accordion (활성 시즌은 기본 펼침)
   - 활성/종료 상태 배지

3. **Episode Section** (에피소드별)
   - 직급전별 포디움 기록
   - 시즌 최종 순위 (episodeId = null)

4. **Mini Podium** (포디움 표시)
   - 순서: 2위(왼쪽) - 1위(중앙) - 3위(오른쪽)
   - 순위별 컬러 (금/은/동)
   - VIP 페이지 링크 (클릭 가능 프로필만)

**상태 관리**:
- useHallOfFame: 전체 데이터 조회
- useVipPodiumAchievers: VIP 페이지 링크 가능 여부
- isExpanded: 시즌별 확장/축소 상태

---

## 3. Server Action 분석 (hall-of-fame.ts)

### 3.1 getHallOfFameData()
**목적**: 명예의 전당 전체 데이터 조회

**데이터 소스**:
- vip_rewards 테이블 (rank ≤ 3만)
- episodes 테이블 (확정된 직급전만)

**반환 데이터**:
```typescript
{
  totalAchievers: number      // 고유 포디움 달성자 수
  totalEpisodes: number       // 확정된 직급전 수
  seasons: HallOfFameSeasonData[]  // 시즌별 그룹화 데이터
}
```

**쿼리 특징**:
- LEFT JOIN을 통한 관계 데이터 조회
- episode_id 정렬 (null-first, 시즌 최종을 맨 위로)
- 배열 처리 로직 (Array.isArray 체크)

### 3.2 getUserPodiumHistory(profileId)
**목적**: 특정 사용자의 포디움 이력 조회

**특징**:
- 개별 프로필 페이지에서 사용
- 같은 쿼리 구조, profileId 필터 추가

---

## 4. Hook 분석

### 4.1 useHallOfFame()
**역할**: 명예의 전당 데이터 상태 관리

**상태**:
- data: HallOfFameData | null
- isLoading: boolean
- error: string | null
- refetch: () => Promise<void>

**생명주기**:
- 마운트 시 즉시 fetchData() 실행
- useCallback으로 fetchData 메모이제이션

### 4.2 useVipPodiumAchievers()
**역할**: VIP 페이지 클릭 가능 프로필 조회

**데이터 소스**:
- vip_clickable_profiles View (2026-02-03 업데이트)
- Mock 모드 지원 (USE_MOCK_DATA = true일 때)

**특징**:
- RLS 오류(42501) 무시하고 빈 배열 반환
- withRetry 유틸로 재시도 로직
- isPodiumAchiever() 헬퍼 함수 제공

---

## 5. 스타일링 분석

### 5.1 Hero Section (page.module.css)
**특징**:
- 금색 그라디언트 배경 (180도)
- 방사형 그로우 애니메이션
- 장식 입자 효과 (radial-gradient)
- Shimmer 텍스트 애니메이션

**핵심 색상 변수**:
- --metallic-gold: #ffd700
- --metallic-gold-border: (border 색)

### 5.2 HallOfFame Component (HallOfFame.module.css)
**레이아웃**:
- 통계 카드: flex, 구석 장식
- 시즌 섹션: 아코디언 패턴
- 포디움: flex, 2-1-3 순서

**색상 시스템**:
- 1위: 금색 (Gold #ffd700)
- 2위: 은색 (Silver #c0c0c0)
- 3위: 동색 (Bronze #cd7f32)

**호버 효과**:
- translateY(-6px) 상승
- Shimmer 애니메이션
- 색상 전환

**반응형**:
- Tablet (768px): 패딩 감소, 포디움 간격 축소
- Mobile (480px): 통계 세로 배치, 포디움 래핑

---

## 6. 타입 정의 (ranking.ts)

```typescript
interface HallOfFameEntry {
  profileId: string
  nickname: string
  avatarUrl: string | null
  rank: number              // 1, 2, 3
  seasonId: number
  seasonName: string
  episodeId: number | null  // null이면 시즌 최종
  episodeTitle: string | null
  episodeNumber: number | null
  achievedAt: string
}

interface HallOfFameSeasonData {
  season: {
    id: number
    name: string
    isActive: boolean
    startDate: string
    endDate: string | null
  }
  entries: HallOfFameEntry[]
}

interface HallOfFameData {
  totalAchievers: number
  totalEpisodes: number
  seasons: HallOfFameSeasonData[]
}
```

---

## 7. 잠재적 문제점 및 위험

### 7.1 데이터 관련
**문제**:
- vip_rewards 테이블이 진짜 포디움 기록 저장소인지 불명확
- rank_battle_records 테이블과의 데이터 중복 가능성
- CLAUDE.md에서 언급: "rank_battle_records로 직급전 기록 저장"

**영향**:
- 명예의 전당이 불완전한 데이터 표시 가능
- 직급전 이력이 누락될 수 있음

### 7.2 쿼리 로직
**문제**:
- Array.isArray() 체크가 필요한 이유 불명확
- LEFT JOIN에서 배열 반환이 발생하는 상황 미분석

**영향**:
- 데이터 변환 로직의 신뢰성 낮음
- 엣지 케이스 처리 부실

### 7.3 VIP 페이지 링크
**문제**:
- vip_clickable_profiles View 사용 (정의 미확인)
- Mock 모드와 실제 모드 데이터 차이 가능
- RLS 오류를 무시하면 빈 목록 반환

**영향**:
- 클릭 가능한 프로필이 예상과 다를 수 있음
- 404 링크로 이동 가능성

### 7.4 성능
**문제**:
- 전체 데이터를 한 번에 조회 (페이지네이션 없음)
- 시즌/에피소드 수가 많으면 느려질 수 있음

**영향**:
- 초기 로딩 시간 증가
- 메모리 사용량 증가

### 7.5 에러 처리
**문제**:
- 일반적인 "데이터를 불러오는 데 실패했습니다" 메시지
- 구체적 에러 원인 파악 어려움

**영향**:
- 사용자 경험 저하
- 디버깅 어려움

### 7.6 접근성
**문제**:
- prefers-reduced-motion 지원하지만 일부 효과 남음 (shimmer)
- 색상만으로 순위 구분 (금/은/동)

**영향**:
- 색맹 사용자의 순위 구분 어려움
- 일부 모션 민감 사용자 불편

### 7.7 Mock 데이터 구조
**문제**:
- 실제 데이터 구조(vip_rewards)와 크게 다름
- Mock의 TributeSignature, memberVideos 등이 실제 스키마에 없음

**영향**:
- Mock 모드에서 개발 시 실제 운영과 차이
- 마이그레이션 시 문제 발생 가능

---

## 8. UI/UX 분석

### 8.1 긍정적 요소
✅ 시각적 계층: 포디움 구조가 명확 (2위-1위-3위 배치)
✅ 상태 표시: 활성/종료 배지로 시즌 상태 구분
✅ 반응형: 모바일/태블릿 대응
✅ 색상 시스템: 순위별 금/은/동 컬러 명확
✅ 애니메이션: 호버 효과로 상호작용 표시

### 8.2 개선 필요 영역
⚠️ **빈 상태**: "기록된 명예의 전당이 없습니다" 메시지만 있음
   → 설명문이나 가이드 부족

⚠️ **통계 활용**: 총 달성자, 직급전 수만 표시
   → 성취도 게이지나 추가 통계 없음

⚠️ **에피소드 필터**: 시즌 펼쳤을 때 모든 에피소드 표시
   → 에피소드 검색/필터 기능 없음

⚠️ **링크 상태**: 클릭 불가능한 프로필도 포디움 아이템처럼 보임
   → 시각적 구분 필요 (opacity, cursor 등)

⚠️ **닉네임 트렁케이션**: max-width: 90px로 절단 가능
   → 긴 닉네임 처리 (tooltip 고려)

⚠️ **타임스탬프**: achievedAt 표시 없음
   → 언제 달성했는지 사용자가 알 수 없음

---

## 9. 보안 고려사항

### 9.1 후원 정보 외부 노출 방지
✅ ranking/layout.tsx: robots.txt에 noindex, nofollow
✅ 후원 하트 개수 절대 노출 안 함
✅ 닉네임만 표시

### 9.2 잠재적 위험
⚠️ vip_rewards 테이블에 실제 후원 금액 포함 가능성
   → Server Action에서 total_amount 필드 선택하는지 확인 필요

⚠️ Open Graph 메타 태그 확인 필요
   → rank_battle_records.total_amount 외부 노출 금지

---

## 10. 데이터 무결성 관련 (현재 브랜치: feature/ranking-data-integrity)

### 잠재적 문제점
1. **테이블 혼용**: vip_rewards vs rank_battle_records
2. **데이터 동기화**: 두 테이블이 동기화되지 않을 가능성
3. **포디움 정의**: "rank ≤ 3"만으로 충분한가?
4. **에피소드 기록**: episodeId 없는 레코드의 의미는?

### 개선 방향
- rank_battle_records로 통일?
- 동기화 로직 추가?
- 데이터 검증 강화?

---

## 11. 권장 사항

### 단기 (긴급)
1. rank_battle_records vs vip_rewards 데이터 소스 명확화
2. vip_clickable_profiles View 정의 확인
3. 에러 메시지 구체화

### 중기
1. 에피소드 필터/검색 기능 추가
2. 닉네임 토oltip 처리
3. achievedAt 날짜 표시
4. 색상만으로의 순위 구분 개선 (텍스트 추가)

### 장기
1. 페이지네이션 추가 (매우 많은 기록 시)
2. 통계 대시보드 확장
3. VIP 페이지 전환율 분석

---

## 12. 파일 경로 요약

| 파일 | 라인 | 용도 |
|------|------|------|
| `/src/app/ranking/hall-of-fame/page.tsx` | 1-55 | 메인 페이지 |
| `/src/app/ranking/hall-of-fame/page.module.css` | 1-325 | 페이지 스타일 |
| `/src/components/ranking/HallOfFame.tsx` | 1-256 | 핵심 컴포넌트 |
| `/src/components/ranking/HallOfFame.module.css` | 1-734 | 컴포넌트 스타일 |
| `/src/lib/actions/hall-of-fame.ts` | 1-196 | Server Actions |
| `/src/lib/hooks/useHallOfFame.ts` | 1-118 | 데이터 Hook |
| `/src/lib/hooks/useVipPodiumAchievers.ts` | 1-103 | VIP 프로필 Hook |
| `/src/types/ranking.ts` | 1-52 | 타입 정의 |

