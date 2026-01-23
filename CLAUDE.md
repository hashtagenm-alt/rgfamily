# RG Family - 개발 가이드 (Claude Code용)

> 이 문서는 AI가 개발할 때 참고하는 지침서야. 모든 규칙에는 "왜?"가 있어.
> **마지막 업데이트: 2026-01-22**
 ㅠ
---

## 목차

1. [가장 중요한 규칙: PR 워크플로우](#1-가장-중요한-규칙-pr-워크플로우)
2. [프로젝트 소개](#2-프로젝트-소개)
3. [기술 스택](#3-기술-스택)
4. [데이터 정책: Supabase 직접 연결](#4-데이터-정책-supabase-직접-연결)
5. [Supabase 스키마 레퍼런스](#5-supabase-스키마-레퍼런스)
6. [보안 및 개인정보 보호](#6-보안-및-개인정보-보호)
7. [디자인 가이드라인](#7-디자인-가이드라인)
8. [UI/UX 상세 규칙](#8-uiux-상세-규칙)
9. [콘텐츠 관리 정책](#9-콘텐츠-관리-정책)
10. [스타일링 원칙](#10-스타일링-원칙)
11. [Git 브랜치 전략](#11-git-브랜치-전략)
12. [환경변수 및 설정](#12-환경변수-및-설정)
13. [주요 파일 위치](#13-주요-파일-위치)
14. [금지 사항 체크리스트](#14-금지-사항-체크리스트)
15. [참고 사이트](#15-참고-사이트)
16. [운영 전 필수 설정](#16-운영-전-필수-설정)
17. [관리자 페이지 목록](#17-관리자-페이지-목록)
18. [CI 실패 시 해결 가이드](#18-ci-실패-시-해결-가이드)

---

## 1. 가장 중요한 규칙: PR 워크플로우

```
왜? CI 실패, 병합 충돌, 빌드 오류를 미리 잡아야 해. main 직접 푸시는 위험함.

🤖 AI(Claude)는 반드시 이 워크플로우를 따라야 함!
   사용자가 "커밋해줘", "푸시해줘"라고 해도 main 직접 푸시 금지.
   항상 feature 브랜치 → PR → 머지 순서로 진행할 것.

✅ 올바른 워크플로우:
1. feature/* 또는 fix/* 브랜치 생성 (예: feature/vip-upload)
2. 해당 브랜치에서 작업 및 커밋
3. `npm run build` 로 로컬 빌드 성공 확인 (필수!)
4. GitHub에 브랜치 푸시
5. Pull Request 생성 (gh pr create 사용)
6. CI 통과 확인
7. main에 머지 (gh pr merge 사용)

❌ 절대 금지 (AI도 예외 없음):
- main 브랜치에 직접 커밋/푸시
- 로컬 빌드 확인 없이 PR 생성
- CI 실패 상태에서 병합

Git 명령어 예시:
git checkout -b feature/기능명   # 브랜치 생성
git add -A && git commit -m "..."  # 커밋
git push -u origin feature/기능명  # 푸시
gh pr create --fill               # PR 생성
gh pr merge --squash              # 머지

빌드 확인 명령어:
npm run build    # 프로덕션 빌드 (반드시 성공해야 함)
npx tsc --noEmit # TypeScript 타입 체크
npm run lint     # ESLint 검사
```

---

## 2. 프로젝트 소개

**RG Family**는 PandaTV 스트리머 "리나" 팬 커뮤니티 공식 웹사이트야.

| 항목 | 설명 |
|-----|------|
| **목적** | 팬들이 후원 랭킹 보고, 멤버 정보 확인하고, VIP 혜택 받는 곳 |
| **대상** | 내부 팬들 + VIP 후원자들 (일반인 대상 아님) |
| **플랫폼** | PandaTV (후원 단위: **하트**, 별풍선 아님!) |
| **배포** | Vercel |
| **백엔드** | Supabase (PostgreSQL) |

> 왜 이걸 알아야 하냐면, 팬덤 내부용이라 복잡한 기능보다 **감성적 디자인**이랑 **후원자 감사 표현**이 더 중요해.

---

## 3. 기술 스택

| 기술 | 왜 쓰는지 |
|-----|----------|
| **Next.js 16+ App Router** | 라우팅 편하고 React 19 쓰려면 이게 최신 |
| **Tailwind CSS 4** | 빠르게 스타일링하려고. 클래스 이름 고민 시간 아끼려면 유틸리티가 답 |
| **shadcn/ui + Mantine** | 기본 컴포넌트 직접 만들 시간 없음. 폼은 Mantine이 더 잘 됨 |
| **Supabase** | Firebase보다 SQL 쓸 수 있어서. 후원 데이터 조회 많아서 RDB가 맞음 |
| **TypeScript** | 버그 방지. 타입 없으면 나중에 유지보수 지옥됨 |

---

## 4. 데이터 정책: Supabase 직접 연결

```
왜? Mock 데이터로 개발하면 실제 DB 스키마와 불일치 발생. 배포 시 버그 터짐.

✅ 필수 규칙:
1. 모든 데이터 조회/저장은 Supabase 직접 연결
2. 새 기능 개발 전 반드시 src/types/database.ts 스키마 확인
3. Mock 파일(src/lib/mock/) 절대 사용 금지

❌ 금지 사항:
- NEXT_PUBLIC_USE_MOCK_DATA=true 설정
- src/lib/mock/ 폴더의 데이터 import
- 하드코딩된 더미 데이터 사용

개발 전 체크리스트:
□ Supabase 연결 확인 (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
□ 필요한 테이블 존재 여부 확인
□ 컬럼 타입이 database.ts와 일치하는지 확인
```

---

## 5. Supabase 스키마 레퍼런스

```
왜? 스키마 모르고 개발하면 타입 에러, 쿼리 실패 발생. 항상 여기 먼저 참고해.

📍 타입 정의 파일: src/types/database.ts
📍 Supabase Dashboard: https://supabase.com/dashboard/project/cdiptfmagemjfmsuphaj
```

### 5.1 주요 테이블 목록

| 테이블 | 용도 | 비고 |
|--------|------|------|
| `profiles` | 사용자 프로필 (닉네임, 역할, 후원총액) | |
| `seasons` | 시즌 정보 | `is_active`로 현재 시즌 판별 |
| `episodes` | 에피소드/직급전 정보 | `is_rank_battle`, `is_finalized` |
| `donations` | 후원 내역 | donor_name, amount, unit |
| `organization` | 조직도 멤버 | unit, role, parent_id |
| `vip_rewards` | VIP 리워드 | rank, personal_message |
| `vip_images` | VIP 시그니처 이미지 | **운영자만 추가** |
| `schedules` | 캘린더 일정 | |
| `timeline_events` | 타임라인 이벤트 | |
| `live_status` | 방송 라이브 상태 | |
| `banners` | 메인 배너 | |
| `notices` | 공지사항 | |
| `posts` / `comments` | 게시판/댓글 | |
| `signatures` | 시그니처 콘텐츠 | |
| `signature_videos` | 시그니처 영상 | |
| `media_content` | 숏츠/VOD | 목업 데이터 금지 |
| `tribute_guestbook` | 헌정 방명록 | |
| `bj_thank_you_messages` | BJ 감사 메시지 | |
| `vip_personal_messages` | VIP 개인 메시지 | |
| `rank_battle_records` | **직급전 기록 (명예의 전당)** | 시즌/회차별 Top 50 저장 |
| `total_donation_rankings` | **총 후원 랭킹 (역대 누적)** | Top 50, total_amount 외부 노출 금지 |

### 5.2 rank_battle_records 테이블 (명예의 전당용)

```
왜? 직급전 결과를 영구 보존하여 "명예의 전당"에 표시하기 위함.

테이블 구조:
┌──────────────────┬──────────────────────────────────────────┐
│ 컬럼              │ 설명                                     │
├──────────────────┼──────────────────────────────────────────┤
│ id               │ 자동 증가 PK                              │
│ season_id        │ 시즌 번호 (FK → seasons)                  │
│ battle_number    │ 직급전 회차 (1, 2, 3...)                  │
│ rank             │ 순위 (1~50)                               │
│ donor_id         │ 후원자 UUID (nullable, FK → profiles)     │
│ donor_name       │ 후원자 닉네임                             │
│ total_amount     │ 총 후원하트                               │
│ finalized_at     │ 확정 시점                                 │
│ created_at       │ 생성 시점                                 │
└──────────────────┴──────────────────────────────────────────┘

UNIQUE 제약: (season_id, battle_number, rank)
→ 같은 시즌, 같은 회차, 같은 순위는 하나만 존재

사용 예시:
// 시즌 1 / 1회 직급전 Top 50 조회
const { data } = await supabase
  .from('rank_battle_records')
  .select('*')
  .eq('season_id', 1)
  .eq('battle_number', 1)
  .order('rank', { ascending: true })
```

### 5.3 total_donation_rankings 테이블 (총 후원 랭킹)

```
왜? 역대 누적 총 후원 랭킹을 별도로 관리하여 시즌 랭킹과 분리.

⚠️ 중요: total_amount(총 후원 하트)는 외부에 절대 노출 금지!
       UI에서는 게이지(퍼센트)로만 표현해야 함.

테이블 구조:
┌──────────────────┬──────────────────────────────────────────┐
│ 컬럼              │ 설명                                     │
├──────────────────┼──────────────────────────────────────────┤
│ id               │ 자동 증가 PK                              │
│ rank             │ 순위 (1~50) - UNIQUE                      │
│ donor_name       │ 후원자 닉네임                             │
│ total_amount     │ 총 후원하트 ⚠️ 외부 노출 절대 금지!        │
│ is_permanent_vip │ 영구 VIP 여부                             │
│ updated_at       │ 업데이트 시점                             │
│ created_at       │ 생성 시점                                 │
└──────────────────┴──────────────────────────────────────────┘

UI 표현 규칙:
✅ 허용: 순위, 닉네임, 게이지(1위 대비 %)
❌ 금지: 실제 하트 개수 표시, 영구VIP 표시, 숫자 노출

사용 예시:
// Top 50 조회 (total_amount, is_permanent_vip 제외!)
const { data } = await supabase
  .from('total_donation_rankings')
  .select('rank, donor_name')
  .order('rank', { ascending: true })
  .limit(50)
```

### 5.4 주요 컬럼 타입 (Enum)

```typescript
// 팬클럽 소속
type Unit = 'excel' | 'crew'

// 사용자 역할
type Role = 'member' | 'vip' | 'moderator' | 'admin' | 'superadmin'

// 일정 유형
type EventType = 'broadcast' | 'collab' | 'event' | 'notice' | '休'

// 플랫폼
type Platform = 'chzzk' | 'twitch' | 'youtube' | 'pandatv'

// 미디어 콘텐츠 유형
type ContentType = 'shorts' | 'vod'

// 권한 상수 (src/lib/actions/permissions.ts)
ADMIN_ROLES = ['admin', 'superadmin']
MODERATOR_ROLES = ['admin', 'superadmin', 'moderator']
```

### 5.5 주요 RPC 함수

| 함수명 | 용도 |
|--------|------|
| `get_active_season_id()` | 현재 활성 시즌 ID |
| `get_user_rank(p_user_id, p_season_id)` | 사용자 랭킹 조회 |
| `get_episode_rankings(p_episode_id, p_limit)` | 에피소드별 랭킹 |
| `is_vip_user(user_id)` | VIP 여부 확인 |
| `is_admin(user_id)` | 관리자 여부 확인 |
| `is_bj_member(user_id)` | BJ 멤버 여부 확인 |

---

## 6. 보안 및 개인정보 보호

### 6.1 후원 정보 외부 노출 절대 금지

```
⚠️ 가장 중요한 보안 규칙!

왜? 후원 하트 개수는 개인 금전 정보와 같음. 외부에 노출되면 안 됨.
    팬들 간의 비교나 외부 유출로 인한 갈등 방지 목적.

✅ 허용:
- RG Family 홈페이지 내부 (https://www.rgfamily.kr/)
- 로그인한 사용자에게만 랭킹 표시
- 명예의 전당 페이지 (홈페이지 내부)

❌ 절대 금지:
- 후원 하트 개수를 외부 사이트/SNS에 공개
- Open Graph, meta 태그에 후원 금액 포함
- API 응답을 외부에서 접근 가능하게 노출
- 크롤링 가능한 형태로 후원 정보 제공
- 스크린샷/캡처 유도하는 UI (공유 버튼 등)

개발 시 주의사항:
- 랭킹 페이지에 "외부 공유 금지" 안내 문구 표시
- og:description에 후원 금액 절대 포함 금지
- robots.txt에서 랭킹 페이지 크롤링 차단 검토
```

### 6.2 닉네임만 표시 (아이디/이메일 노출 금지)

```
왜? "아이디 말고 닉네임으로 가는 거지" - 회의 내용
실명이나 아이디 노출하면 안 됨. 팬들은 닉네임으로 불리길 원함

❌ 금지: user.id, user.email, user.pandatv_id
✅ 허용: user.nickname, profile.nickname, donor_name
```

---

## 7. 디자인 가이드라인

### 7.1 컬러 시스템

```css
왜? 디자이너가 "컬러가 다 따로 논다"고 지적함. 일관성 없으면 촌스러워 보임
그리고 핑크만 도배하면 오히려 촌스러워짐 → 뉴트럴 기반으로!

/* 브랜드 컬러 */
--color-primary: #fd68ba;    /* 메인 핑크 - 포인트에만 사용 */
--live-color: #00d4ff;       /* 라이브 표시 - 시안색 (핑크 아님!) */

/* 랭킹 컬러 */
--gold: #ffd700;             /* 1등 */
--silver: #c0c0c0;           /* 2등 */
--bronze: #cd7f32;           /* 3등 */

핑크 사용 비율:
┌────────────────────────────────────────┐
│ 뉴트럴(흰/검/회) 85-90%               │
│ → 배경, 텍스트, 카드, 테두리           │
├────────────────────────────────────────┤
│ 핑크 포인트 10-15%                     │
│ → CTA 버튼, 활성 상태, 로고, 호버      │
└────────────────────────────────────────┘
```

### 7.2 글씨 크기

```
왜? "전체적으로 글씨가 조금 작은 느낌" - 디자이너 피드백
어르신 팬분들 많아서 시인성 중요.

최소 크기: 본문 16px
```

### 7.3 다크/라이트 모드

```
왜? 이사님이 흰색 좋아하신대. 근데 다크가 더 프리미엄해 보여서 둘 다 지원
기본값: 다크 모드
토글로 전환 가능
```

---

## 8. UI/UX 상세 규칙

### 8.1 마우스 호버 효과 필수

```
왜? 인터랙션 없으면 밋밋해 보임
"마우스 갖다 대면 시그니처 컬러로 바뀌게끔"

적용 대상: 카드, 버튼, 링크, 테이블 행 전부
호버 시: 핑크(#fd68ba)로 변경
```

### 8.2 랭킹 포디움 형태

```
왜? "1등이 가운데로 제일 높게, 2등 왼쪽, 3등 오른쪽"
올림픽 시상대처럼. 컬러는 금은동으로 구분

     🥇(1등)
  🥈(2등)  🥉(3등)
```

### 8.3 조직도 트리 구조

```
왜? "대표 2명이 투톱으로 있고 나머지를 거미줄처럼 빠지게"
기존: 가로 나열 (비어 보임)
변경: 대표 → 팀장 → 멤버 계층으로 아래로 연결선
참고: cnine.kr 조직도
```

### 8.4 메인 배너 꽉 채우기

```
왜? "사진을 테두리 끝까지 다 채우시게" - 디자이너 피드백
양옆 여백 비어있으면 허전해 보임
참고: theK 그룹 페이지처럼 꽉 채운 배너
```

### 8.5 타임라인 필터

```
왜? "제일 위에 엑셀부랑 크루부로 나누시는 게 나을 것 같아요"
시즌 필터 위쪽에 팬클럽 그룹별 탭 추가 필요
```

### 8.6 캘린더 더케이 스타일

```
왜? "왼쪽 거를 날리고 날짜 안에 일정이 들어가 있었으면"
현재: 사이드바 + 작은 캘린더
변경: 풀 캘린더 뷰, 날짜 칸 안에 일정 직접 표시
```

### 8.7 라이브 상태 크롤링

```
왜? PandaTV는 공식 API가 없어. 방송 중인지 확인하려면 직접 긁어와야 함
방법: 관리자 계정 즐겨찾기 페이지에서 파싱 (헤드리스 브라우저)
메인 페이지는 모든 BJ가 나와서 파싱 어려움 → 즐겨찾기 페이지가 답
```

---

## 9. 콘텐츠 관리 정책

### 9.1 VIP 시그니처 이미지 (운영자만 추가)

```
왜? VIP 이미지는 품질 관리가 필요함. 아무나 업로드하면 안 됨.

✅ 정책:
- vip_images 테이블: 운영자(admin/superadmin)만 직접 추가
- 일반 사용자 업로드 기능 없음
- Supabase Dashboard에서 직접 관리

❌ 금지:
- 일반 사용자용 VIP 이미지 업로드 UI 만들기
- 자동 승인 방식의 이미지 업로드
```

### 9.2 SHORTS/VOD 콘텐츠 (media_content)

```
왜? 미디어 콘텐츠는 실제 데이터만 보여줘야 함. 목업으로 채우면 안 됨.

✅ 정책:
- media_content 테이블에 실제 데이터 있을 때만 표시
- 데이터 없으면 "콘텐츠 준비 중" 메시지 표시
- 목업/더미 데이터 절대 삽입 금지

content_type 구분:
- 'shorts': 짧은 하이라이트 영상
- 'vod': 전체 방송 다시보기
```

### 9.3 VIP 개인 메시지 (vip_rewards.personal_message)

```
왜? 개인 메시지는 실제 VIP가 직접 작성해야 의미 있음.

✅ 정책:
- VIP 사용자가 직접 입력/업로드해야만 저장됨
- 운영자가 대신 입력하는 것도 금지
- 목업/샘플 메시지 삽입 금지

개발 시 주의:
- personal_message 컬럼이 NULL이면 빈 상태로 표시
- "메시지를 작성해주세요" 같은 placeholder만 허용
```

---

## 10. 스타일링 원칙

```
왜? Tailwind랑 CSS 모듈 섞여있으면 "스타일 어디서 바꾸지?" 혼란

우선순위:
1. Tailwind 우선: 일반 스타일링
2. CSS 모듈: 복잡한 애니메이션, 테마 분기, :global 필요할 때만

파일 구조:
- globals.css: CSS 변수/테마
- *.module.css: 컴포넌트별 복잡한 스타일
```

---

## 11. Git 브랜치 전략

```
왜? main 직접 푸시하면 위험함. 여러 명이 작업하면 코드 충돌남

브랜치 구조:
- main: 배포 전용 (PR 통해서만 병합)
- feature/*: 새 기능
- fix/*: 버그 수정

워크플로우:
브랜치 생성 → 작업 → 로컬 빌드 확인 → PR → 리뷰 → main 병합 → Vercel 자동 배포

Git Remote 설정:
- captain: https://github.com/captain-yun7/rg-family.git ⚠️ 프로덕션 (정식 도메인)
- origin: 개발용 백업 저장소

🚨 중요: 프로덕션 배포 시 반드시 captain 리모트에 푸시!
   git fetch captain main
   git merge captain/main
   npm run build  # 빌드 검증 필수
   git push captain HEAD:main
```

---

## 12. 환경변수 및 설정

```
📍 로컬 환경변수 파일: .env.local (이미 설정됨)

필수 환경변수:
NEXT_PUBLIC_SUPABASE_URL=https://cdiptfmagemjfmsuphaj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...  # 관리자 스크립트용

⚠️ NEXT_PUBLIC_USE_MOCK_DATA=false 유지 필수!
```

---

## 13. 주요 파일 위치

```
src/
├── app/                    # 페이지 (App Router)
│   ├── page.tsx           # 메인 페이지
│   ├── rg/org/page.tsx    # 조직도
│   ├── ranking/page.tsx   # 랭킹
│   ├── schedule/page.tsx  # 일정
│   └── globals.css        # 전역 CSS 변수
├── components/            # 재사용 컴포넌트
├── lib/
│   ├── actions/           # Server Actions
│   ├── supabase/          # Supabase 클라이언트
│   └── mock/              # ⚠️ 사용 금지
└── types/
    ├── database.ts        # Supabase 스키마 타입
    └── ranking.ts         # 랭킹 관련 타입
```

---

## 14. 금지 사항 체크리스트

| 금지 | 이유 |
|-----|------|
| **main 직접 푸시** | PR 통해서만 병합. CI 검증 필수 |
| **빌드 확인 없이 PR** | `npm run build` 성공 확인 후 PR 생성 |
| **Mock 데이터 사용** | Supabase 직접 연결만 허용 |
| **스키마 확인 없이 개발** | src/types/database.ts 먼저 확인 |
| **후원 하트 외부 노출** | 홈페이지 내부에서만 표시 |
| **SOOP(별풍선) 용어** | 여긴 **PandaTV(하트)** 플랫폼 |
| **아이디/이메일 노출** | 닉네임만 표시 |
| **라이브 컬러 핑크** | LIVE는 **시안색**(#00d4ff) |
| **VIP 이미지 일반 업로드** | 운영자만 Dashboard에서 추가 |

---

## 15. 참고 사이트

| 사이트 | 참고 요소 |
|--------|----------|
| **cnine.kr** | 조직도 구조, 라이브 표시 (시안색 테두리) |
| **theK** | 캘린더 UI, 꽉 찬 배너 |
| **sooplive** | VIP 페이지 레이아웃 |

---

## 요약: 개발할 때 이것만 기억해

1. **Supabase만**: Mock 금지, database.ts 스키마 먼저 확인
2. **컬러 통일**: 핑크(#fd68ba) 포인트, 라이브는 시안(#00d4ff)
3. **글씨 크게**: 최소 16px
4. **닉네임만**: 아이디/이메일 절대 노출 금지
5. **호버 효과**: 클릭 가능한 건 다 핑크로 변함
6. **후원 단위**: 별풍선 아니고 **하트**
7. **후원 정보 외부 노출 금지**: 홈페이지 내부에서만!
8. **PR 워크플로우 필수**: main 직접 푸시 절대 금지

---

## 16. 운영 전 필수 설정

```
왜? 배포 전에 이것들 빠뜨리면 앱이 정상 동작 안 함.

### 환경변수 체크리스트
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY (스크립트용)
- [ ] NEXT_PUBLIC_USE_MOCK_DATA=false

### Supabase 초기 데이터
- [ ] seasons 테이블: 최소 1개 시즌 (is_active=true)
- [ ] profiles 테이블: superadmin 계정 1개
- [ ] organization 테이블: BJ 멤버 데이터

### 배포 전 체크리스트
- [ ] npm run build 성공
- [ ] npx tsc --noEmit 성공
- [ ] Vercel 환경변수 등록
- [ ] Supabase RLS 정책 확인
```

---

## 17. 관리자 페이지 목록

```
왜? 어떤 관리 페이지가 있고 누가 접근할 수 있는지 한눈에 보려고.

| 경로 | 기능 | 권한 |
|------|------|------|
| /admin | 대시보드 | admin+ |
| /admin/seasons | 시즌 관리 | admin+ |
| /admin/episodes | 에피소드/직급전 | admin+ |
| /admin/donations | 후원 데이터 | admin+ |
| /admin/organization | 조직도 | admin+ |
| /admin/members | 회원 관리 | admin+ |
| /admin/permissions | 권한 관리 | superadmin |
| /admin/banners | 배너 | moderator+ |
| /admin/notices | 공지사항 | moderator+ |
| /admin/schedules | 일정 | moderator+ |
| /admin/timeline | 타임라인 | admin+ |
| /admin/signatures | 시그니처 | admin+ |
| /admin/vip-rewards | VIP 리워드 | admin+ |
| /admin/posts | 게시글 | moderator+ |
| /admin/media | 미디어 | admin+ |

권한 레벨 설명:
- superadmin: 최고 관리자 (모든 권한)
- admin+: admin, superadmin
- moderator+: moderator, admin, superadmin
```

---

## 18. CI 실패 시 해결 가이드

```
왜? CI 실패하면 PR 머지 못함. 빠르게 해결해야 개발 속도 유지됨.

### 흔한 CI 실패 원인 및 해결

1. TypeCheck & Lint 실패
   - 원인: ESLint 에러, TypeScript 타입 에러
   - 해결: npm run lint && npx tsc --noEmit 로 로컬에서 먼저 확인
   - scripts/ 폴더: CommonJS require() 허용 (eslint.config.mjs에서 제외됨)

2. Build 실패
   - 원인: 빌드 시 타입 에러, 모듈 해결 실패
   - 해결: npm run build 로컬 빌드 성공 확인 필수

3. E2E Tests 실패
   - 원인: 브라우저 테스트 타임아웃, DOM 요소 변경
   - 해결: 로컬에서 npm run test:e2e 실행 후 확인

4. Vercel Preview 실패
   - 원인: 환경변수 누락, 빌드 에러
   - 해결: Vercel 대시보드에서 로그 확인

5. pnpm-lock.yaml 불일치
   - 원인: package.json 변경 후 lockfile 미업데이트
   - 해결: pnpm install 실행하여 lockfile 업데이트 후 커밋

### CI 통과 후 PR 머지 워크플로우

1. CI 체크 상태 확인: gh pr view <PR번호> --json statusCheckRollup
2. 모든 체크 통과 확인 (SUCCESS)
3. PR 머지: gh pr merge <PR번호> --squash --delete-branch

### 브랜치 리베이스 후 CI 재실행

main이 업데이트된 경우 기존 PR 브랜치 리베이스 필요:
1. git checkout <브랜치명>
2. git fetch origin main
3. git rebase origin/main
4. git push --force-with-lease
5. CI 자동 재실행 → 결과 대기
```
