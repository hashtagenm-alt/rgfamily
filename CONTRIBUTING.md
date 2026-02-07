# Contributing to RG Family

RG Family 프로젝트에 기여해주셔서 감사합니다!

## Development Setup

### 1. Fork & Clone

```bash
# Fork this repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/rg-family.git
cd rg-family
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

```bash
cp .env.example .env.local
```

개발 시에는 `NEXT_PUBLIC_USE_MOCK_DATA=true`로 설정하면 Supabase 없이 작업할 수 있습니다.

### 4. Run Development Server

```bash
npm run dev
```

## Code Style

### TypeScript

- 모든 컴포넌트와 함수에 타입을 명시합니다
- `any` 타입 사용을 지양합니다
- 타입 정의는 `src/types/` 디렉토리에 위치합니다

### CSS

- CSS Modules 사용 (`*.module.css`)
- CSS Variables 활용 (테마 지원)
- 하드코딩된 색상값 대신 변수 사용

```css
/* Good */
.container {
  background: var(--card-bg);
  color: var(--text-primary);
}

/* Avoid */
.container {
  background: #0a0a0a;
  color: #ffffff;
}
```

### Component Structure

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSupabaseContext } from '@/lib/context'
import { USE_MOCK_DATA } from '@/lib/config'
import styles from './Component.module.css'

interface Props {
  // Props definition
}

export default function Component({ ...props }: Props) {
  // 1. Hooks
  const supabase = useSupabaseContext()
  const [state, setState] = useState()

  // 2. Data fetching
  const fetchData = useCallback(async () => {
    if (USE_MOCK_DATA) {
      // Use mock data
      return
    }
    // Supabase query
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 3. Render
  return (
    <div className={styles.container}>
      {/* Component content */}
    </div>
  )
}
```

## Git Workflow

### Branch Naming

```text
feature/feature-name    # New features
fix/bug-description     # Bug fixes
refactor/description    # Code refactoring
docs/description        # Documentation
```

### Commit Messages

```text
feat: Add new ranking page
fix: Resolve calendar display issue
refactor: Improve component structure
docs: Update README
style: Fix CSS formatting
```

### Pull Request

1. 최신 `main` 브랜치에서 새 브랜치 생성
2. 변경사항 커밋
3. PR 생성 전 `npm run build` 확인
4. PR 설명에 변경 내용 상세히 기술

## Project Structure

```text
src/
├── app/           # Pages (Next.js App Router)
├── components/    # Reusable components
├── lib/
│   ├── config.ts  # Configuration
│   ├── context/   # React Context
│   ├── hooks/     # Custom hooks
│   ├── mock/      # Mock data
│   └── utils/     # Utilities
└── types/         # TypeScript types
```

## Design Guidelines

- [Design System Guide](./docs/RG_FAMILY_DESIGN_SYSTEM.md) 참조
- 다크 모드 기본, 라이트 모드 지원
- 모바일 반응형 필수

## Questions?

질문이 있으시면 Issue를 생성해주세요.
