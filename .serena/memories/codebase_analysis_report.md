# RG Family 프로젝트 종합 분석 보고서

> 분석일: 2026-02-05
> 분석 범위: 전체 프로젝트 구조, 스크립트, 아키텍처

---

## 1. 프로젝트 구조 (Scaffolding)

```
rg-family/
├── src/                          # 📦 프론트엔드 소스 (352 파일)
│   ├── app/                      # Next.js App Router 페이지
│   │   ├── (auth)/              # 인증 그룹 라우트
│   │   ├── admin/               # 관리자 페이지
│   │   ├── api/                 # API 라우트
│   │   ├── community/           # 커뮤니티
│   │   ├── mypage/              # 마이페이지
│   │   ├── ranking/             # 랭킹 (시즌/종합)
│   │   ├── replay/              # 다시보기
│   │   ├── rg/                  # RG 조직 관련
│   │   └── schedule/            # 일정
│   │
│   ├── components/              # 재사용 컴포넌트
│   │   ├── admin/               # 관리자 전용
│   │   ├── common/              # 공통 UI
│   │   ├── ranking/             # 랭킹 컴포넌트
│   │   ├── vip/                 # VIP 전용
│   │   └── ui/                  # shadcn/ui 컴포넌트
│   │
│   ├── lib/                     # 유틸리티 & 서비스
│   │   ├── actions/             # Server Actions (20개)
│   │   ├── api/                 # API 클라이언트
│   │   ├── hooks/               # 커스텀 훅
│   │   ├── supabase/            # Supabase 클라이언트
│   │   └── utils/               # 유틸리티 함수
│   │
│   └── types/                   # TypeScript 타입
│       ├── database.ts          # Supabase 스키마 (61KB)
│       ├── common.ts            # 공통 타입
│       └── organization.ts      # 조직도 타입
│
├── scripts/                     # 🔧 운영 스크립트 (156개 활성)
│   ├── lib/                     # 공통 유틸리티
│   │   ├── supabase.ts          # Supabase 클라이언트 (싱글톤)
│   │   ├── utils.ts             # 재시도/배치 처리
│   │   ├── csv-parser.ts        # CSV 파서
│   │   └── nickname.ts          # 닉네임 정규화
│   │
│   ├── archive/                 # 아카이브된 스크립트 (~100개)
│   └── data/                    # 데이터 파일 (CSV 등)
│
├── supabase/
│   └── migrations/              # DB 마이그레이션 (30+개)
│
├── python-live-scraper/         # 🐍 PandaTV 라이브 스크래퍼
│
└── 설정 파일
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── next.config.ts
    └── .env.local
```

---

## 2. 기술 스택 요약

| 레이어 | 기술 | 버전 |
|--------|------|------|
| **Frontend** | Next.js (App Router) | 16+ |
| **UI** | Tailwind CSS + shadcn/ui + Mantine | 4.x |
| **상태관리** | React Query + Zustand | - |
| **Backend** | Supabase (PostgreSQL + Auth + Storage) | - |
| **배포** | Vercel | - |
| **스크립트** | tsx (TypeScript 실행) | - |

---

## 3. 스크립트 분류 및 통계

### 3.1 스크립트 개수
```
총 스크립트: 156개 (활성) + ~100개 (archive)
공통 라이브러리 사용: 6개 (4%)
직접 Supabase 초기화: 246개 (96%)
dotenv.config 사용: 95개
수동 환경변수 파싱: ~50개
```

### 3.2 스크립트 카테고리

| 카테고리 | 개수 | 주요 스크립트 |
|----------|------|--------------|
| **랭킹 관리** | ~15 | refresh-season-rankings, update-total-rankings |
| **데이터 검증** | ~25 | verify-ranking-integrity, check-* 시리즈 |
| **VIP 관리** | ~20 | check-vip-access, create-vip-accounts |
| **미디어 업로드** | ~30 | batch-signature-upload, gdrive-shorts-upload |
| **프로필 관리** | ~15 | fix-profile-nicknames, cleanup-duplicate-profiles |
| **BJ 계정** | ~15 | create-bj-accounts, link-bj-auth-accounts |
| **분석** | ~20 | analyze-* 시리즈 |
| **마이그레이션** | ~10 | migrate-legacy-data, execute-migration |
| **유틸리티** | ~10 | run-sql, execute-ddl |

---

## 4. 데이터 파이프라인

### 4.1 후원 데이터 흐름
```
┌─────────────────┐
│   PandaTV CSV   │
│ (후원 내역 추출) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ import-donations│ ← CSV 파싱 (scripts/lib/csv-parser.ts)
│ import-episode- │
│ donations.ts    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   donations     │ ← Supabase 테이블
│   (원본 데이터) │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌────────┐
│시즌   │ │종합    │
│랭킹   │ │랭킹    │
└───┬───┘ └───┬────┘
    │         │
    ▼         ▼
┌───────────────────────┐
│ season_donation_      │
│ rankings              │
│ total_donation_       │
│ rankings              │
└───────────────────────┘
```

### 4.2 미디어 업로드 파이프라인
```
┌─────────────────┐
│  Google Drive   │
│ (원본 4K 영상)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ batch-signature-│ ← Google Drive API (서비스 계정)
│ upload.ts       │
│ gdrive-shorts-  │
│ upload.ts       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Cloudflare      │ ← TUS 프로토콜 (200MB+ 파일)
│ Stream          │ ← FormData (200MB 이하)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ signature_videos│
│ media_content   │ ← Supabase 테이블 (메타데이터)
└─────────────────┘
```

---

## 5. Server Actions 아키텍처

```
src/lib/actions/
├── analytics.ts        # 분석 데이터 조회
├── banners.ts         # 배너 CRUD
├── bj-messages.ts     # BJ 메시지 (16KB - 복잡)
├── donation-rankings.ts # 후원 랭킹 조회
├── episodes.ts        # 에피소드 관리
├── hall-of-fame.ts    # 명예의 전당
├── media.ts           # 미디어 콘텐츠
├── notices.ts         # 공지사항
├── organization.ts    # 조직도
├── permissions.ts     # 권한 체크
├── posts.ts           # 게시판
├── profiles.ts        # 프로필
├── schedules.ts       # 일정
├── seasons.ts         # 시즌
├── signatures.ts      # 시그니처
├── timeline-actions.ts # 타임라인
├── vip-message-comments.ts # VIP 댓글
├── vip-messages.ts    # VIP 메시지 (14KB)
└── vip-rewards.ts     # VIP 리워드 (16KB)
```

---

## 6. 주요 아키텍처 다이어그램

### 6.1 전체 시스템 아키텍처
```
┌─────────────────────────────────────────────────────────────────┐
│                         VERCEL (배포)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Next.js App                          │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │   │
│  │  │ 메인    │  │ 랭킹    │  │ VIP     │  │ 관리자  │   │   │
│  │  │ 페이지  │  │ 페이지  │  │ 페이지  │  │ 페이지  │   │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘   │   │
│  │       │            │            │            │         │   │
│  │       └────────────┼────────────┼────────────┘         │   │
│  │                    │            │                       │   │
│  │              ┌─────▼────────────▼─────┐                │   │
│  │              │    Server Actions      │                │   │
│  │              │   (src/lib/actions/)   │                │   │
│  │              └───────────┬────────────┘                │   │
│  │                          │                              │   │
│  └──────────────────────────┼──────────────────────────────┘   │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SUPABASE                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ PostgreSQL  │  │    Auth     │  │   Storage   │             │
│  │  (데이터)   │  │  (인증)     │  │  (파일)     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      외부 서비스                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Cloudflare  │  │ Google Drive│  │  PandaTV    │             │
│  │   Stream    │  │    API      │  │ (스크래핑)  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 스크립트 의존성 구조
```
scripts/
│
├── lib/ (공통 라이브러리) ──────────────────────────┐
│   ├── supabase.ts   ← 환경변수 검증 + 싱글톤      │
│   ├── utils.ts      ← withRetry, processBatch     │
│   ├── csv-parser.ts ← RFC 4180 CSV 파싱          │
│   └── nickname.ts   ← 닉네임 정규화               │
│                                                    │
├── 핵심 스크립트 (lib 사용 ✅) ◀────────────────────┤
│   ├── refresh-season-rankings.ts                  │
│   ├── refresh-total-rankings.ts                   │
│   ├── update-season-rankings.ts                   │
│   ├── update-total-rankings.ts                    │
│   ├── verify-ranking-integrity.ts                 │
│   └── migrate-legacy-data.ts                      │
│                                                    │
├── 대부분의 스크립트 (lib 미사용 ❌) ──────────────┘
│   ├── check-vip-access.ts      (수동 env 파싱)
│   ├── check-episode-donations.ts (직접 createClient)
│   ├── batch-signature-upload.ts (직접 createClient)
│   └── ... (150+ 스크립트)
│
└── archive/ (사용 중단)
```

---

## 7. 발견된 문제점 및 개선 제안

### 7.1 🔴 심각: 중복된 Supabase 초기화

**현황**:
- 공통 라이브러리(`scripts/lib/supabase.ts`) 사용: **6개** (4%)
- 직접 `createClient` 호출: **246개** (96%)
- 수동 환경변수 파싱 (fs.readFileSync): **~50개**

**문제 코드 패턴** (check-vip-access.ts):
```typescript
// ❌ BAD: 직접 파일 읽기 + 파싱
const envPath = path.join(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=')
  if (key && values.length) envVars[key.trim()] = values.join('=').trim()
})
const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, ...)
```

**개선된 코드** (refresh-season-rankings.ts):
```typescript
// ✅ GOOD: 공통 라이브러리 사용
import { getServiceClient } from './lib/supabase'
const supabase = getServiceClient()
```

### 7.2 🟡 경고: 스크립트 파일 과다

**현황**: 156개 활성 스크립트 + ~100개 archive

**문제점**:
- 유사 기능 스크립트 중복 (check-vip-*.ts 11개)
- 버전별 스크립트 (gdrive-shorts-upload-v2.ts, v3.ts)
- 일회성 스크립트가 archive로 이동 안됨

**개선 제안**:
1. 유사 기능 통합 (예: check-vip-* → vip-diagnostics.ts)
2. 버전 스크립트는 최신만 유지, 구버전 archive
3. 일회성 데이터 수정 스크립트 archive 이동

### 7.3 🟡 경고: 닉네임 정규화 중복

**현황**:
- `scripts/lib/nickname.ts` 존재
- 일부 스크립트에서 자체 닉네임 파싱 로직 사용

**영향**: 닉네임 매칭 불일치 가능성

### 7.4 🟢 양호: Server Actions 구조

**강점**:
- 기능별 잘 분리됨 (20개 파일)
- 타입 정의 완벽 (database.ts 61KB)
- 권한 체크 일관됨 (permissions.ts)

---

## 8. 권장 개선 작업

### 우선순위 1: 공통 라이브러리 적용 확대
```bash
# 영향: 150+ 스크립트
# 작업량: 중 (일괄 치환 가능)
# 효과: 환경변수 오류 방지, 코드 일관성
```

**변경 예시**:
```typescript
// Before (150+ 스크립트)
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, ...)

// After
import { getServiceClient } from './lib/supabase'
const supabase = getServiceClient()
```

### 우선순위 2: 스크립트 정리
```bash
# 영향: 코드 관리 용이성
# 작업량: 소
# 효과: 유지보수성 향상
```

**이동 대상** (archive):
- gdrive-shorts-upload.ts (v3 존재)
- gdrive-shorts-upload-v2.ts (v3 존재)
- check-latest-donations.ts (check-latest-donations2.ts 존재)
- 일회성 fix-*.ts 스크립트들

### 우선순위 3: 유틸리티 함수 통합
```bash
# 영향: 코드 재사용성
# 작업량: 소
# 효과: 버그 감소
```

**scripts/lib/ 확장**:
- cloudflare.ts: Cloudflare Stream API 공통화
- google-drive.ts: Google Drive API 공통화

---

## 9. 스크립트 사용 가이드 요약

### 데이터 조회
```bash
npx tsx scripts/run-sql.ts --table profiles
npx tsx scripts/run-sql.ts --view season_rankings_public
```

### 랭킹 관리
```bash
npx tsx scripts/refresh-season-rankings.ts --season=1
npx tsx scripts/refresh-total-rankings.ts
npx tsx scripts/verify-ranking-integrity.ts
```

### VIP 관리
```bash
npx tsx scripts/check-vip-access.ts
npx tsx scripts/check-vip-clickable-v2.ts
```

### 영상 업로드
```bash
npx tsx scripts/batch-signature-upload.ts
npx tsx scripts/gdrive-shorts-upload-v3.ts
```

---

## 10. 결론

### 강점
1. **타입 안전성**: 61KB database.ts로 완벽한 타입 커버리지
2. **Server Actions**: 기능별 잘 분리된 20개 액션
3. **공통 라이브러리 기반**: 핵심 스크립트(랭킹)는 잘 구조화
4. **문서화**: CLAUDE.md, 메모리 시스템 활용

### 약점
1. **스크립트 중복**: 96%가 공통 라이브러리 미사용
2. **스크립트 과다**: 156개 활성, 정리 필요
3. **버전 관리**: v2, v3 등 구버전 스크립트 정리 필요

### 즉시 개선 가능
- 공통 라이브러리 import 변경 (일괄 sed 치환)
- 구버전/일회성 스크립트 archive 이동
