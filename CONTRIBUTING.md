# Contributing to RG Family

RG Family 프로젝트에 기여해주셔서 감사합니다!

## 시작하기

```bash
git clone https://github.com/YOUR_USERNAME/rg-family.git
cd rg-family
npm install
cp .env.example .env.local
npm run dev
```

## 개발 규칙

모든 개발 규칙은 **[CLAUDE.md](./CLAUDE.md)** 에 정의되어 있습니다.

핵심 사항:

- **PR 워크플로우 필수**: main 직접 푸시 금지 → `feature/*` 브랜치 → PR → 머지 (§1)
- **Supabase 직접 연결**: Mock 데이터 사용 금지. `src/types/database.ts` 스키마 먼저 확인 (§4)
- **Server Action 패턴**: `src/app/` 내 `supabase.from()` 직접 호출 금지. `src/lib/actions/` 사용 (ADR-005)
- **TypeScript**: `any` 금지, `unknown` 사용
- **스타일링**: Tailwind 우선, CSS Modules는 복잡한 애니메이션에만

## 커밋 메시지

```
feat: 새 기능 추가
fix: 버그 수정
refactor: 리팩토링
docs: 문서 수정
```

## 디자인 가이드

- [Design System](./docs/RG_FAMILY_DESIGN_SYSTEM.md) 참조
- 다크 모드 기본, 라이트 모드 지원
- 포인트 컬러 `#fd68ba` (핑크 10-15%), 라이브 `#00d4ff` (시안)

## 질문

Issue를 생성해주세요.
