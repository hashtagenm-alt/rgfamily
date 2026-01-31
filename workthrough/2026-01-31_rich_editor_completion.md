# 리치 에디터 기능 완료 및 동영상 임베드 추가

## 개요
자유게시판/공지사항에 디시인사이드/네이버 블로그 스타일의 리치 에디터 기능을 구현합니다. 기존 작업자가 85% 완료한 상태에서 동영상 임베드 기능을 추가하고 빌드 이슈를 해결합니다.

## 현재 상태 분석

### ✅ 기존 작업자가 완료한 부분

| 항목 | 파일 | 상태 | 비고 |
|------|------|------|------|
| RichEditor 컴포넌트 | `src/components/ui/RichEditor.tsx` | ✅ 완료 | TipTap 기반, 411줄 |
| RichEditor 스타일 | `src/components/ui/RichEditor.module.css` | ✅ 완료 | 반응형, 338줄 |
| useImageUpload 훅 | `src/lib/hooks/useImageUpload.ts` | ✅ 완료 | Cloudinary 연동 |
| 이미지 업로드 API | `src/app/api/upload/route.ts` | ✅ 완료 | Cloudinary 변환 |
| HTML 유틸리티 | `src/lib/utils/htmlContent.ts` | ✅ 완료 | DOMPurify 적용 |
| 컴포넌트 export | `src/components/ui/index.ts` | ✅ 완료 | |
| 훅 export | `src/lib/hooks/index.ts` | ✅ 완료 | |

### ✅ 이미 통합된 페이지

| 페이지 | 경로 | 통합 상태 |
|--------|------|----------|
| 공지사항 작성 | `/notice/write/page.tsx` | ✅ RichEditor 사용 |
| 자유게시판 작성 | `/community/write/page.tsx` | ✅ RichEditor 사용 |
| 관리자 공지관리 | `/admin/notices/page.tsx` | ✅ RichEditor 사용 |
| 관리자 게시판관리 | `/admin/posts/page.tsx` | ✅ RichEditor 사용 |

### ⚠️ 발견된 문제점

| 문제 | 원인 | 해결방법 |
|------|------|----------|
| 빌드 실패 | dompurify 미설치 | `pnpm install` 실행 |
| 동영상 미지원 | 기능 미구현 | 동영상 임베드 추가 |

---

## 구현 계획

### 1단계: 의존성 설치 및 빌드 확인

```bash
pnpm install
npm run build
```

### 2단계: 동영상 임베드 기능 추가

**지원 형식:**
- YouTube: `youtube.com/watch?v=...`, `youtu.be/...`
- Cloudflare Stream: `videodelivery.net/{uid}`, `iframe.videodelivery.net/{uid}`

**수정 파일:**

| 파일 | 작업 내용 |
|------|----------|
| `src/components/ui/RichEditor.tsx` | 동영상 버튼 및 URL 입력 모달 추가 |
| `src/components/ui/RichEditor.module.css` | 동영상 모달 및 iframe 스타일 추가 |
| `src/lib/utils/htmlContent.ts` | iframe 태그 허용 추가 |

**구현 상세:**

1. **RichEditor.tsx 수정**
   - 툴바에 `Video` 아이콘 버튼 추가
   - URL 입력 모달 (링크 모달과 유사)
   - YouTube/Cloudflare URL 파싱 → iframe HTML 생성
   - 반응형 비디오 wrapper div 생성

2. **htmlContent.ts 수정**
   - DOMPurify 허용 태그에 `iframe` 추가
   - 허용 속성: `src`, `width`, `height`, `frameborder`, `allow`, `allowfullscreen`
   - YouTube/Cloudflare 도메인만 허용 (보안)

### 3단계: 테스트

| 테스트 항목 | 예상 결과 |
|------------|----------|
| 공지사항 작성 (이미지) | 이미지 삽입 및 렌더링 정상 |
| 공지사항 작성 (YouTube) | YouTube 영상 임베드 정상 |
| 공지사항 작성 (Cloudflare) | Cloudflare 영상 임베드 정상 |
| 자유게시판 동일 테스트 | 모든 기능 정상 |
| 기존 텍스트 데이터 | 일반 텍스트 정상 렌더링 |

---

## 기존 데이터 호환성

### ✅ 완전 유지됨

`htmlContent.ts`의 `renderContent()` 함수가 자동으로 처리:

```
입력 content
    ↓
HTML 태그 감지? (<p>, <h1-6>, <ul>, <ol>, <li>, <blockquote>, <pre>, <br>, <strong>, <em>, <u>, <s>, <a>, <img>)
    ├─ YES → DOMPurify로 sanitize
    └─ NO  → 줄바꿈을 <p> 태그로 변환 → sanitize

출력: 안전한 HTML
```

- 기존 일반 텍스트: 줄바꿈 → `<p>` 태그 변환
- 새로운 HTML: 그대로 sanitize 후 렌더링

---

## 파일 변경 목록

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `src/components/ui/RichEditor.tsx` | 수정 | 동영상 버튼/모달 추가 |
| `src/components/ui/RichEditor.module.css` | 수정 | 동영상 스타일 추가 |
| `src/lib/utils/htmlContent.ts` | 수정 | iframe 허용 추가 |

---

## 예상 작업량

| 단계 | 예상 시간 |
|------|----------|
| 1단계 (의존성 설치) | 5분 |
| 2단계 (동영상 임베드) | 30분~1시간 |
| 3단계 (테스트) | 15분 |
| **합계** | **약 1시간** |

---

## 결과 (완료 후 업데이트)

- [ ] 의존성 설치 완료
- [ ] 빌드 성공
- [ ] 동영상 임베드 기능 추가
- [ ] 테스트 완료
- [ ] 커밋 완료
