# RG Family

PandaTV 스트리머 팬 커뮤니티 공식 웹사이트 

[![Next.js](https://img.shields.io/badge/Next.js-16+-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green?style=flat-square&logo=supabase)](https://supabase.com/)

## Overview

RG Family는 PandaTV 스트리머 팬덤을 위한 프리미엄 커뮤니티 플랫폼입니다.

- **후원 랭킹**: 시즌별/전체 후원자 랭킹 및 VIP 전용 콘텐츠
- **조직도**: 멤버 계층 구조 시각화
- **커뮤니티**: 자유게시판, VIP 전용 게시판
- **일정 캘린더**: 방송 및 이벤트 일정 관리
- **Admin CMS**: 콘텐츠 관리 시스템

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16+ (App Router) |
| Language | TypeScript 5 |
| UI | React 19, CSS Modules |
| Animation | Framer Motion |
| Carousel | Embla Carousel |
| Icons | Lucide React |
| Backend | Supabase (Auth, Database, Storage) |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18.17+
- npm or yarn or pnpm

### Installation

```bash
# Clone repository
git clone https://github.com/your-username/rg-family.git
cd rg-family

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_USE_MOCK_DATA=true  # Set to 'false' for production
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication (login, signup)
│   ├── admin/             # Admin CMS (14 pages)
│   ├── community/         # Community boards
│   ├── notice/            # Notices
│   ├── ranking/           # Donation rankings & VIP pages
│   ├── rg/                # RG Info section
│   │   ├── org/          # Organization chart
│   │   ├── sig/          # Signature gallery
│   │   ├── history/      # Timeline
│   │   └── live/         # Live status
│   └── schedule/          # Calendar
├── components/            # Reusable components
│   ├── admin/            # Admin components
│   ├── community/        # Community components
│   ├── home/             # Homepage components (Hero, Live, etc.)
│   ├── info/             # Info page components (Org, Sig, Timeline)
│   ├── ranking/          # Ranking components
│   ├── schedule/         # Schedule components
│   ├── tribute/          # VIP Tribute page components
│   └── ui/               # UI primitives (shadcn + custom)
├── lib/
│   ├── auth/             # Access control utilities
│   ├── config.ts         # Configuration
│   ├── context/          # React Context providers
│   ├── hooks/            # Custom hooks
│   ├── mock/             # Mock data for development
│   ├── repositories/     # Data access layer (Repository pattern)
│   └── utils/            # Utility functions
└── types/                # TypeScript type definitions
```

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Design System

프로젝트는 "Minimal & Refined Hip" 디자인 컨셉을 따릅니다.

- **Color**: Pink (#fd68ba) + Cyan (#00d4ff) accent
- **Typography**: Outfit (display) + Noto Sans KR (body)
- **Theme**: Dark mode default with light mode support

자세한 내용은 [Design System Guide](./docs/RG_FAMILY_DESIGN_SYSTEM.md) 참조

## Development Guide

### Mock Data

개발 시 Supabase 연결 없이 Mock 데이터를 사용할 수 있습니다:

```typescript
// lib/config.ts
export const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'
```

### Component Pattern

```typescript
'use client'

import { useSupabaseContext } from '@/lib/context'
import { USE_MOCK_DATA } from '@/lib/config'
import { mockData } from '@/lib/mock/data'

export default function Component() {
  const supabase = useSupabaseContext()

  // Mock data fallback
  if (USE_MOCK_DATA) {
    return <div>{/* Render with mockData */}</div>
  }

  // Supabase query
  // ...
}
```

### Styling

CSS Modules + CSS Variables 사용:

```css
/* component.module.css */
.container {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  color: var(--text-primary);
}
```

## Contributing

기여를 환영합니다! [CONTRIBUTING.md](./CONTRIBUTING.md)를 참조해주세요.

## Documentation

- [CLAUDE.md](./CLAUDE.md) - AI 개발 가이드 및 프로젝트 규칙
- [Design System](./docs/RG_FAMILY_DESIGN_SYSTEM.md) - 디자인 시스템 가이드
- [Workthrough](./workthrough/) - 개발 작업 기록

## License

This project is private and proprietary.

---

Built with Next.js and Supabase 1
