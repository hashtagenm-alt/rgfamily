# RG Family - 개발 가이드 (Claude Code용)

> 이 문서는 AI가 개발할 때 참고하는 지침서야. 모든 규칙에는 "왜?"가 있어.

---

## ⚠️ 가장 중요한 규칙: PR 워크플로우 (AI 필수!)

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

## 이 프로젝트가 뭔지 먼저 알아야 해

**RG Family**는 PandaTV 스트리머 "리나" 팬 커뮤니티 공식 웹사이트야.

- **뭘 하는 사이트?**: 팬들이 후원 랭킹 보고, 멤버 정보 확인하고, VIP 혜택 받는 곳
- **누가 쓰는데?**: 내부 팬들이랑 VIP 후원자들. 일반인 대상 아님
- **배포**: Vercel / **백엔드**: Supabase

왜 이걸 알아야 하냐면, 팬덤 내부용이라 복잡한 기능보다 **감성적 디자인**이랑 **후원자 감사 표현**이 더 중요해.

---

## 기술 스택 - 왜 이걸 쓰는지

| 기술 | 왜 쓰는지 |
|-----|----------|
| **Next.js 16+ App Router** | 라우팅 편하고 React 19 쓰려면 이게 최신 |
| **Tailwind CSS 4** | 빠르게 스타일링하려고. 클래스 이름 고민 시간 아끼려면 유틸리티가 답 |
| **shadcn/ui + Mantine** | 기본 컴포넌트 직접 만들 시간 없음. 폼은 Mantine이 더 잘 됨 |
| **Supabase** | Firebase보다 SQL 쓸 수 있어서. 후원 데이터 조회 많아서 RDB가 맞음 |
| **TypeScript** | 버그 방지. 타입 없으면 나중에 유지보수 지옥됨 |

---

## ⚠️ 데이터는 무조건 Supabase (Mock 금지!)

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

## Supabase 스키마 레퍼런스

```
왜? 스키마 모르고 개발하면 타입 에러, 쿼리 실패 발생. 항상 여기 먼저 참고해.

📍 타입 정의 파일: src/types/database.ts

주요 테이블:
┌─────────────────────┬───────────────────────────────────────┐
│ 테이블              │ 용도                                  │
├─────────────────────┼───────────────────────────────────────┤
│ profiles            │ 사용자 프로필 (닉네임, 역할, 후원총액)│
│ seasons             │ 시즌 정보 (is_active로 현재 시즌 판별)│
│ episodes            │ 에피소드/직급전 정보                   │
│ donations           │ 후원 내역 (donor_name, amount, unit)  │
│ organization        │ 조직도 멤버 (unit, role, parent_id)   │
│ vip_rewards         │ VIP 리워드 (rank, personal_message)   │
│ vip_images          │ VIP 보상 이미지                       │
│ schedules           │ 캘린더 일정                           │
│ timeline_events     │ 타임라인 이벤트                       │
│ live_status         │ 방송 라이브 상태                      │
│ banners             │ 메인 배너                             │
│ notices             │ 공지사항                              │
│ posts/comments      │ 게시판/댓글                           │
│ signatures          │ 시그니처 콘텐츠                       │
│ media_content       │ 숏츠/VOD                              │
│ tribute_guestbook   │ 헌정 방명록                           │
│ bj_thank_you_messages│ BJ 감사 메시지                       │
│ vip_personal_messages│ VIP 개인 메시지                      │
└─────────────────────┴───────────────────────────────────────┘

주요 컬럼 타입:
- unit: 'excel' | 'crew' (팬클럽 소속)
- role (profiles): 'member' | 'vip' | 'moderator' | 'admin' | 'superadmin'
- event_type (schedules): 'broadcast' | 'collab' | 'event' | 'notice' | '休'
- platform (live_status): 'chzzk' | 'twitch' | 'youtube' | 'pandatv'

주요 RPC 함수:
- get_active_season_id(): 현재 활성 시즌 ID
- get_user_rank(p_user_id, p_season_id): 사용자 랭킹 조회
- get_episode_rankings(p_episode_id, p_limit): 에피소드별 랭킹
- is_vip_user(user_id): VIP 여부 확인
- is_admin(user_id): 관리자 여부 확인
```

---

## 핵심 개발 지침 (이것만은 꼭!)

> 디자이너, 기획자, 개발자 통화 회의에서 합의한 내용들이야.

### 2. 라이브 상태는 크롤링으로
```
왜? PandaTV는 공식 API가 없어. 방송 중인지 확인하려면 직접 긁어와야 함
방법: 관리자 계정 즐겨찾기 페이지에서 파싱 (헤드리스 브라우저)
메인 페이지는 모든 BJ가 나와서 파싱 어려움 → 즐겨찾기 페이지가 답
```

### 3. 컬러는 무조건 통일 (핑크 과용 주의!)
```css
왜? 디자이너가 "컬러가 다 따로 논다"고 지적함. 일관성 없으면 촌스러워 보임
그리고 핑크만 도배하면 오히려 촌스러워짐 → 뉴트럴 기반으로!

--color-primary: #fd68ba;    /* 메인 핑크 - 포인트에만 */
--live-color: #00d4ff;       /* 라이브는 시안색 */
--gold: #ffd700;             /* 1등 */
--silver: #c0c0c0;           /* 2등 */
--bronze: #cd7f32;           /* 3등 */

핑크 사용 비율:
- 뉴트럴(흰/검/회) 85-90%: 배경, 텍스트, 카드, 테두리
- 핑크 포인트 10-15%: CTA 버튼, 활성 상태, 로고, 호버

마우스 호버할 때도 핑크로 바뀌게 해야 함
```

### 4. 글씨는 키워
```
왜? "전체적으로 글씨가 조금 작은 느낌" - 디자이너 피드백
어르신 팬분들 많아서 시인성 중요. 본문은 최소 16px
```

### 5. 다크/라이트 모드 둘 다
```
왜? 이사님이 흰색 좋아하신대. 근데 다크가 더 프리미엄해 보여서 둘 다 지원
기본값은 다크, 토글로 전환 가능하게
```

### 6. 닉네임으로 표시 (아이디 X)
```
왜? "아이디 말고 닉네임으로 가는 거지" - 회의 내용
실명이나 아이디 노출하면 안 됨. 팬들은 닉네임으로 불리길 원함

❌ user.id, user.email
✅ user.nickname, profile.nickname
```

### 7. 조직도는 트리 구조로
```
왜? "대표 2명이 투톱으로 있고 나머지를 거미줄처럼 빠지게"
기존: 가로 나열 (비어 보임)
변경: 대표 → 팀장 → 멤버 계층으로 아래로 연결선
참고: cnine.kr 조직도
```

### 8. 랭킹은 포디움 형태
```
왜? "1등이 가운데로 제일 높게, 2등 왼쪽, 3등 오른쪽"
올림픽 시상대처럼. 컬러는 금은동으로 구분
```

### 9. 메인 배너는 꽉 채워
```
왜? "사진을 테두리 끝까지 다 채우시게" - 디자이너 피드백
양옆 여백 비어있으면 허전해 보임
참고: theK 그룹 페이지처럼 꽉 채운 배너
```

### 10. 타임라인에 엑셀부/크루부 필터
```
왜? "제일 위에 엑셀부랑 크루부로 나누시는 게 나을 것 같아요"
시즌 필터 위쪽에 팬클럽 그룹별 탭 추가 필요
```

### 11. 캘린더는 더케이 스타일로
```
왜? "왼쪽 거를 날리고 날짜 안에 일정이 들어가 있었으면"
현재: 사이드바 + 작은 캘린더
변경: 풀 캘린더 뷰, 날짜 칸 안에 일정 직접 표시
```

### 12. 마우스 호버 효과 필수
```
왜? 인터랙션 없으면 밋밋해 보임
"마우스 갖다 대면 시그니처 컬러로 바뀌게끔"
적용: 카드, 버튼, 링크, 테이블 행 전부 → 핑크(#fd68ba)로 변경
```

---

## 스타일링 원칙

```
왜? Tailwind랑 CSS 모듈 섞여있으면 "스타일 어디서 바꾸지?" 혼란
- Tailwind 우선: 일반 스타일링
- CSS 모듈: 복잡한 애니메이션, 테마 분기, :global 필요할 때만
- globals.css: CSS 변수/테마, *.module.css: 컴포넌트별 복잡한 스타일
```

---

## Git 브랜치 전략

```
왜? main 직접 푸시하면 위험함. 여러 명이 작업하면 코드 충돌남
- main: 배포 전용 (PR 통해서만 병합)
- feature/*: 새 기능, fix/*: 버그 수정
흐름: 브랜치 생성 → 작업 → PR → 리뷰 → main 병합 → Vercel 자동 배포
```

---

## 절대 하면 안 되는 것들

| 금지 | 이유 |
|-----|------|
| **main 직접 푸시** | PR 통해서만 병합해야 함. CI 검증 필수 |
| **빌드 확인 없이 PR** | `npm run build` 성공 확인 후 PR 생성 |
| **Mock 데이터 사용** | Supabase 직접 연결만 허용. Mock 파일 import 금지 |
| **스키마 확인 없이 개발** | src/types/database.ts 먼저 확인 필수 |
| SOOP(별풍선) | 여긴 **PandaTV(하트)** 플랫폼임 |
| 아이디/이메일 노출 | 닉네임만 표시해야 함 |
| 라이브 컬러 핑크 | LIVE는 **시안색**(#00d4ff) |

---

## 주요 파일 위치

```
페이지: src/app/(page.tsx, rg/org/page.tsx, ranking/page.tsx, schedule/page.tsx)
컴포넌트: src/components/
목업 데이터: src/lib/mock/
CSS 변수: src/app/globals.css
타입: src/types/
```

---

## 참고 사이트
- **cnine.kr** → 조직도, 라이브 (시안색 테두리) / **theK** → 캘린더 / **sooplive** → VIP

---

## 환경변수

```
📍 로컬 환경변수 파일: .env.local (이미 설정됨)

NEXT_PUBLIC_SUPABASE_URL=https://cdiptfmagemjfmsuphaj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...  # 관리자 스크립트용

⚠️ NEXT_PUBLIC_USE_MOCK_DATA=false 유지 필수!
```

---

## Supabase 데이터 확인/수정 방법

```
왜? 코드로 데이터 수정하면 실수 위험. Dashboard에서 직접 확인하고 수정하는 게 안전함.

🌐 Supabase Dashboard 접속:
https://supabase.com/dashboard/project/cdiptfmagemjfmsuphaj

브라우저에서 할 수 있는 작업:
1. Table Editor → 테이블 데이터 직접 CRUD
2. SQL Editor → 복잡한 쿼리 실행
3. Authentication → 사용자 관리
4. Storage → 이미지/파일 업로드

개발 시 데이터 작업 순서:
1. Dashboard에서 테이블 구조 확인
2. 필요한 데이터 직접 추가/수정
3. 코드에서 해당 데이터 조회만 구현

CLI로 Supabase 확인 (선택):
npx supabase status  # 연결 상태 확인
```

---

## 요약: 개발할 때 이것만 기억해

1. **Supabase만**: Mock 금지, database.ts 스키마 먼저 확인
2. **컬러 통일**: 핑크(#fd68ba) + 라이브는 시안(#00d4ff)
3. **글씨 크게**: 최소 16px
4. **닉네임만**: 아이디/이메일 절대 노출 금지
5. **호버 효과**: 클릭 가능한 건 다 핑크로 변함
6. **후원 단위**: 별풍선 아니고 **하트**
