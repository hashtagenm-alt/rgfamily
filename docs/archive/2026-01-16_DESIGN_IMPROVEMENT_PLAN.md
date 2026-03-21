# RG Family 디자인 개선 계획

> 참조: cnine.kr, kuniv.kr, Dark Mode Best Practices 2025

## 1. 분석 결과

### cnine.kr 참조 요소
- **Live 인디케이터**: 시안색(#00d4ff) 테두리로 방송 중 표시 ✅ (이미 적용됨)
- **조직도 트리 구조**: 대표 → 팀장 → 멤버 계층형 연결선
- **타임라인**: 엑셀부/크루부 필터 탭
- **시그니처 갤러리**: 멤버별 시그니처 카드

### kuniv.kr (K-Group) 참조 요소
- **그룹 탭 네비게이션**: 전체 | 케이대 | 쇼케이 | 더케이 스타일
- **랭킹 배지**: S_4, B_1 등 레벨 인디케이터
- **뷰 모드 토글**: 썸네일/리스트 전환
- **게시물 메트릭**: 조회수, 좋아요, 댓글 수 표시

### Dark Mode Best Practices 2025
- 순수 검정(#000) 대신 다크 그레이(#121212, #0a0a0a) 사용 ✅
- 채도 낮은 컬러로 눈 피로 감소
- 마이크로 인터랙션 및 호버 효과 강화
- 토글로 라이트/다크 모드 전환

---

## 2. 개선 항목

### 2.1 글로벌 호버 효과 강화
```css
/* 모든 클릭 가능 요소에 핑크 호버 */
.clickable:hover {
  background: var(--color-pink-bg);
  border-color: var(--color-pink);
  color: var(--color-pink);
}
```

### 2.2 카드 컴포넌트 업그레이드
- 호버 시 scale(1.02) + 핑크 글로우
- 라이브 멤버: 시안색 펄스 애니메이션
- 그림자 깊이 향상

### 2.3 랭킹 페이지 포디움
- 1위 골드, 2위 실버, 3위 브론즈 글로우 효과
- 프로필 이미지 테두리 메달 색상
- 호버 시 프로필 확대

### 2.4 조직도 트리 뷰
- SVG 연결선 추가
- 대표(상단) → 팀장(중간) → 멤버(하단) 레이아웃
- 호버 시 관계 하이라이트

### 2.5 커뮤니티 뷰 모드
- 썸네일 그리드 / 리스트 토글
- 게시물 메트릭 (조회수, 좋아요) 표시 강화

### 2.6 캘린더 풀뷰
- 날짜 칸 내 일정 직접 표시
- 더케이 스타일 참조
- 사이드바 제거

---

## 3. 우선순위

| 순위 | 항목 | 영향도 | 난이도 |
|-----|------|-------|-------|
| 1 | 호버 효과 일관성 | 높음 | 낮음 |
| 2 | 카드 애니메이션 | 높음 | 낮음 |
| 3 | 랭킹 포디움 글로우 | 중간 | 낮음 |
| 4 | 조직도 연결선 | 높음 | 중간 |
| 5 | 뷰 모드 토글 | 중간 | 중간 |
| 6 | 캘린더 리디자인 | 중간 | 높음 |

---

## 4. 구현 코드 스니펫

### 4.1 핑크 호버 유틸리티 클래스
```css
/* globals.css */
.hover-pink {
  transition: all 0.2s ease;
}
.hover-pink:hover {
  background: var(--color-pink-bg);
  border-color: var(--color-pink);
  color: var(--color-pink);
}
```

### 4.2 카드 호버 애니메이션
```css
.card-hover {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.card-hover:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 8px 30px rgba(253, 104, 186, 0.15);
}
```

### 4.3 라이브 펄스 애니메이션
```css
@keyframes live-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(0, 212, 255, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(0, 212, 255, 0);
  }
}
.live-indicator {
  animation: live-pulse 2s infinite;
}
```

### 4.4 포디움 글로우 효과
```css
.podium-gold {
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
  border: 2px solid var(--color-gold);
}
.podium-silver {
  box-shadow: 0 0 25px rgba(192, 192, 192, 0.3);
  border: 2px solid var(--color-silver);
}
.podium-bronze {
  box-shadow: 0 0 20px rgba(205, 127, 50, 0.3);
  border: 2px solid var(--color-bronze);
}
```

---

## 5. 참고 자료

- [Dark Mode UI Best Practices 2025](https://www.uinkits.com/blog-post/best-dark-mode-ui-design-examples-and-best-practices-in-2025)
- [Trending Dark Mode Examples](https://dorik.com/blog/dark-mode-website-examples)
- [Dribbble K-pop Designs](https://dribbble.com/tags/kpop)
