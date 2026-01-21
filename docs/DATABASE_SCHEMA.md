# RG Family Database Schema Reference

## Overview

RG Family 프로젝트의 Supabase 데이터베이스 스키마 전체 참조 문서입니다.

| 항목 | 값 |
|------|-----|
| **Last Updated** | 2026-01-21 |
| **Total Tables** | 22개 |
| **Total FK Relations** | 28개 |
| **RLS Policies** | 68개 |
| **TypeScript 정의** | `src/types/database.ts` |
| **Migrations** | `supabase/migrations/` |

---

## Quick Reference

### 역할(Role) 체계

| Role | 설명 | 권한 수준 |
|------|------|----------|
| `superadmin` | 최고 관리자 | 모든 권한 + Admin 관리 |
| `admin` | 관리자 | Admin 패널 전체 접근 |
| `moderator` | 운영진 | 제한적 Admin 접근 |
| `vip` | VIP 회원 | VIP 전용 콘텐츠 접근 |
| `member` | 일반 회원 | 기본 기능만 |

### VIP 자격 조건

- **Role 기반**: `vip`, `moderator`, `admin`, `superadmin` 중 하나
- **Rank 기반**: 시즌 랭킹 Top 50 이내

### Unit (소속)

| Unit | 설명 |
|------|------|
| `excel` | 엑셀 유닛 |
| `crew` | 크루 유닛 |

---

## Database Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           RG Family Database                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [Core]                    [Content]                [Community]          │
│  ┌──────────┐              ┌──────────┐             ┌──────────┐        │
│  │ profiles │◄────────────►│ donations│             │  posts   │        │
│  └────┬─────┘              └────┬─────┘             └────┬─────┘        │
│       │                         │                        │               │
│       │                    ┌────▼─────┐             ┌────▼─────┐        │
│       │                    │ seasons  │             │ comments │        │
│       │                    └────┬─────┘             └──────────┘        │
│       │                         │                                        │
│  ┌────▼─────┐              ┌────▼─────┐             ┌──────────┐        │
│  │organiz-  │◄─────────────│ episodes │             │ notices  │        │
│  │ation     │              └────┬─────┘             └──────────┘        │
│  └────┬─────┘                   │                                        │
│       │                    ┌────▼─────┐                                  │
│       │                    │vip_rewards│                                 │
│  ┌────▼─────┐              └────┬─────┘                                  │
│  │live_status│                  │                                        │
│  └──────────┘              ┌────▼─────┐                                  │
│                            │vip_images│                                  │
│                            └──────────┘                                  │
│                                                                          │
│  [VIP/Tribute]             [Media]                  [System]             │
│  ┌──────────┐              ┌──────────┐             ┌──────────┐        │
│  │tribute_  │              │media_    │             │ banners  │        │
│  │guestbook │              │content   │             └──────────┘        │
│  └──────────┘              └──────────┘                                  │
│  ┌──────────┐              ┌──────────┐             ┌──────────┐        │
│  │bj_thank_ │              │signatures│             │ schedules│        │
│  │you_msgs  │              └────┬─────┘             └──────────┘        │
│  └──────────┘                   │                                        │
│  ┌──────────┐              ┌────▼─────┐             ┌──────────┐        │
│  │vip_      │              │signature_│             │timeline_ │        │
│  │personal_ │              │videos    │             │events    │        │
│  │messages  │              └──────────┘             └──────────┘        │
│  └──────────┘                                                            │
│                                                                          │
│  [Ranking]                                                               │
│  ┌──────────┐              ┌──────────┐                                  │
│  │rank_     │              │total_    │                                  │
│  │battle_   │              │donation_ │                                  │
│  │records   │              │rankings  │                                  │
│  └──────────┘              └──────────┘                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Table Schemas

### 1. profiles (사용자)

**설명**: 사용자 프로필 정보

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | - | PK, auth.users 참조 |
| `nickname` | VARCHAR(100) | NO | - | 닉네임 |
| `email` | VARCHAR(255) | YES | NULL | 이메일 |
| `avatar_url` | TEXT | YES | NULL | 프로필 이미지 URL |
| `role` | VARCHAR(20) | NO | 'member' | 역할 |
| `unit` | VARCHAR(10) | YES | NULL | 소속: excel/crew |
| `total_donation` | BIGINT | NO | 0 | 누적 후원금 |
| `pandatv_id` | VARCHAR(100) | YES | NULL | PandaTV 아이디 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | 수정일시 |

**Role Values**: `member` | `vip` | `moderator` | `admin` | `superadmin`

---

### 2. seasons (시즌)

**설명**: 시즌 정보 관리

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `name` | VARCHAR(100) | NO | - | 시즌명 |
| `start_date` | DATE | NO | - | 시작일 |
| `end_date` | DATE | YES | NULL | 종료일 |
| `is_active` | BOOLEAN | NO | false | 활성 여부 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |

---

### 3. organization (조직도/BJ 멤버)

**설명**: BJ 멤버 및 조직 구조

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `unit` | VARCHAR(10) | NO | - | 유닛: excel/crew |
| `profile_id` | UUID | YES | NULL | profiles FK (연결된 계정) |
| `name` | VARCHAR(100) | NO | - | 멤버명 |
| `role` | VARCHAR(50) | NO | - | 직책: R대표/G대표/팀장/멤버 |
| `position_order` | INT | NO | 0 | 계층 순서 |
| `parent_id` | INT | YES | NULL | 상위 멤버 FK (자기참조) |
| `image_url` | TEXT | YES | NULL | 프로필 이미지 |
| `social_links` | JSONB | YES | '{}' | SNS 링크 |
| `profile_info` | JSONB | YES | NULL | 추가 프로필 정보 |
| `is_live` | BOOLEAN | NO | false | LIVE 상태 |
| `is_active` | BOOLEAN | NO | true | 활성화 여부 |
| `current_rank` | VARCHAR(50) | YES | NULL | 직급전 현재 직급 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |

**FK References**:
- `profile_id` → `profiles(id)`
- `parent_id` → `organization(id)` (자기참조)

**Social Links JSON**:
```json
{
  "pandatv": "https://pandatv.com/...",
  "chzzk": "https://chzzk.naver.com/...",
  "youtube": "https://youtube.com/@...",
  "instagram": "https://instagram.com/..."
}
```

---

### 4. episodes (회차)

**설명**: 방송 회차 정보

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `season_id` | INT | NO | - | seasons FK |
| `episode_number` | INT | NO | - | 회차 번호 |
| `title` | VARCHAR(255) | NO | - | 제목 |
| `broadcast_date` | DATE | NO | - | 방송일 |
| `is_rank_battle` | BOOLEAN | NO | false | 직급전 여부 |
| `description` | TEXT | YES | NULL | 설명 |
| `is_finalized` | BOOLEAN | NO | false | 확정 여부 |
| `finalized_at` | TIMESTAMPTZ | YES | NULL | 확정 시간 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |

**FK References**:
- `season_id` → `seasons(id)`

---

### 5. donations (후원 내역)

**설명**: 후원 기록

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `donor_id` | UUID | YES | NULL | profiles FK |
| `donor_name` | VARCHAR(100) | NO | - | 후원자명 |
| `amount` | BIGINT | NO | - | 금액 (하트) |
| `season_id` | INT | NO | - | seasons FK |
| `episode_id` | INT | YES | NULL | episodes FK |
| `unit` | VARCHAR(10) | YES | NULL | 대상 유닛 |
| `message` | TEXT | YES | NULL | 후원 메시지 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 후원 시각 |

**FK References**:
- `donor_id` → `profiles(id)`
- `season_id` → `seasons(id)`
- `episode_id` → `episodes(id)`

---

### 6. vip_rewards (VIP 보상)

**설명**: VIP 보상 및 헌정 정보

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `profile_id` | UUID | NO | - | profiles FK |
| `season_id` | INT | NO | - | seasons FK |
| `episode_id` | INT | YES | NULL | episodes FK (회차별 VIP) |
| `rank` | INT | NO | - | 순위 |
| `personal_message` | TEXT | YES | NULL | 개인 메시지 |
| `dedication_video_url` | TEXT | YES | NULL | 헌정 영상 URL |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |

**FK References**:
- `profile_id` → `profiles(id)`
- `season_id` → `seasons(id)`
- `episode_id` → `episodes(id)`

---

### 7. vip_images (VIP 갤러리)

**설명**: VIP 헌정 이미지

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `reward_id` | INT | NO | - | vip_rewards FK |
| `image_url` | TEXT | NO | - | 이미지 URL |
| `title` | VARCHAR(255) | YES | NULL | 제목 |
| `order_index` | INT | NO | 0 | 정렬 순서 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |

**FK References**:
- `reward_id` → `vip_rewards(id)`

---

### 8. signatures (시그니처)

**설명**: 멤버 시그니처 콘텐츠

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `sig_number` | INT | NO | - | 시그니처 번호 |
| `title` | VARCHAR(255) | NO | - | 제목 |
| `description` | TEXT | YES | NULL | 설명 |
| `thumbnail_url` | TEXT | YES | NULL | 썸네일 |
| `unit` | VARCHAR(10) | NO | - | 유닛 |
| `is_group` | BOOLEAN | NO | false | 그룹 시그니처 여부 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |

---

### 9. signature_videos (시그니처 영상)

**설명**: 시그니처별 멤버 영상

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `signature_id` | INT | NO | - | signatures FK |
| `member_id` | INT | NO | - | organization FK |
| `video_url` | TEXT | NO | - | 영상 URL |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |

**FK References**:
- `signature_id` → `signatures(id)`
- `member_id` → `organization(id)`

---

### 10. schedules (일정)

**설명**: 방송 및 이벤트 일정

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `title` | VARCHAR(255) | NO | - | 제목 |
| `description` | TEXT | YES | NULL | 설명 |
| `unit` | VARCHAR(10) | YES | NULL | 유닛 |
| `event_type` | VARCHAR(20) | NO | - | 유형 |
| `start_datetime` | TIMESTAMPTZ | NO | - | 시작 시간 |
| `end_datetime` | TIMESTAMPTZ | YES | NULL | 종료 시간 |
| `location` | VARCHAR(255) | YES | NULL | 장소 |
| `is_all_day` | BOOLEAN | NO | false | 종일 여부 |
| `color` | VARCHAR(20) | YES | NULL | 색상 코드 |
| `created_by` | UUID | YES | NULL | profiles FK |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |

**Event Types**: `broadcast` | `collab` | `event` | `notice` | `休`

**FK References**:
- `created_by` → `profiles(id)`

---

### 11. timeline_events (타임라인)

**설명**: RG Family 역사 타임라인

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `event_date` | DATE | NO | - | 이벤트 날짜 |
| `title` | VARCHAR(255) | NO | - | 제목 |
| `description` | TEXT | YES | NULL | 설명 |
| `image_url` | TEXT | YES | NULL | 이미지 |
| `category` | VARCHAR(50) | YES | NULL | 카테고리 |
| `season_id` | INT | YES | NULL | seasons FK |
| `order_index` | INT | NO | 0 | 정렬 순서 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |

**Categories**: `founding` | `event` | `milestone` | `member`

**FK References**:
- `season_id` → `seasons(id)`

---

### 12. notices (공지사항)

**설명**: 공지사항

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `title` | VARCHAR(255) | NO | - | 제목 |
| `content` | TEXT | NO | - | 본문 |
| `category` | VARCHAR(20) | NO | - | 카테고리 |
| `thumbnail_url` | TEXT | YES | NULL | 썸네일 |
| `is_pinned` | BOOLEAN | NO | false | 고정 여부 |
| `view_count` | INT | NO | 0 | 조회수 |
| `author_id` | UUID | YES | NULL | profiles FK |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | 수정일시 |

**Categories**: `official` | `excel` | `crew`

**FK References**:
- `author_id` → `profiles(id)`

---

### 13. posts (게시글)

**설명**: 커뮤니티 게시글

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `board_type` | VARCHAR(10) | NO | - | 게시판 |
| `title` | VARCHAR(255) | NO | - | 제목 |
| `content` | TEXT | NO | - | 본문 |
| `author_id` | UUID | NO | - | profiles FK |
| `view_count` | INT | NO | 0 | 조회수 |
| `like_count` | INT | NO | 0 | 좋아요 |
| `comment_count` | INT | NO | 0 | 댓글 수 |
| `is_anonymous` | BOOLEAN | NO | false | 익명 여부 |
| `is_deleted` | BOOLEAN | NO | false | 삭제 여부 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | 수정일시 |

**Board Types**: `free` | `vip`

**FK References**:
- `author_id` → `profiles(id)`

---

### 14. comments (댓글)

**설명**: 게시글 댓글

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `post_id` | INT | NO | - | posts FK |
| `author_id` | UUID | NO | - | profiles FK |
| `content` | TEXT | NO | - | 내용 |
| `parent_id` | INT | YES | NULL | 대댓글 FK |
| `is_anonymous` | BOOLEAN | NO | false | 익명 여부 |
| `is_deleted` | BOOLEAN | NO | false | 삭제 여부 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |

**FK References**:
- `post_id` → `posts(id)`
- `author_id` → `profiles(id)`
- `parent_id` → `comments(id)` (자기참조)

---

### 15. media_content (미디어)

**설명**: Shorts/VOD 콘텐츠

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `content_type` | VARCHAR(10) | NO | - | 타입 |
| `title` | VARCHAR(255) | NO | - | 제목 |
| `description` | TEXT | YES | NULL | 설명 |
| `thumbnail_url` | TEXT | YES | NULL | 썸네일 |
| `video_url` | TEXT | NO | - | 영상 URL |
| `unit` | VARCHAR(10) | YES | NULL | 유닛 |
| `duration` | INT | YES | NULL | 길이(초) |
| `view_count` | INT | NO | 0 | 조회수 |
| `is_featured` | BOOLEAN | NO | false | 추천 여부 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |

**Content Types**: `shorts` | `vod`

---

### 16. live_status (LIVE 상태)

**설명**: BJ 라이브 방송 상태

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `member_id` | INT | NO | - | organization FK |
| `platform` | VARCHAR(20) | NO | - | 플랫폼 |
| `stream_url` | TEXT | NO | - | 방송 URL |
| `thumbnail_url` | TEXT | YES | NULL | 썸네일 |
| `is_live` | BOOLEAN | NO | false | LIVE 여부 |
| `viewer_count` | INT | NO | 0 | 시청자 수 |
| `last_checked` | TIMESTAMPTZ | NO | NOW() | 마지막 확인 |

**Platforms**: `chzzk` | `twitch` | `youtube` | `pandatv`

**FK References**:
- `member_id` → `organization(id)`

**Constraints**: `UNIQUE(member_id, platform)`

---

### 17. banners (배너)

**설명**: 메인 배너

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `title` | VARCHAR(255) | YES | NULL | 제목 |
| `image_url` | TEXT | NO | - | 이미지 URL |
| `link_url` | TEXT | YES | NULL | 링크 URL |
| `display_order` | INT | NO | 0 | 표시 순서 |
| `is_active` | BOOLEAN | NO | true | 활성화 여부 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | 수정일시 |

---

### 18. tribute_guestbook (헌정 방명록)

**설명**: VIP 헌정 페이지 방명록

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `tribute_user_id` | UUID | NO | - | profiles FK (VIP) |
| `author_id` | UUID | YES | NULL | profiles FK (작성자) |
| `author_name` | VARCHAR(100) | NO | - | 작성자명 |
| `message` | TEXT | NO | - | 메시지 |
| `is_member` | BOOLEAN | NO | false | 멤버 여부 |
| `is_approved` | BOOLEAN | NO | false | 승인 여부 |
| `is_deleted` | BOOLEAN | NO | false | 삭제 여부 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | 수정일시 |

**FK References**:
- `tribute_user_id` → `profiles(id)`
- `author_id` → `profiles(id)`

---

### 19. bj_thank_you_messages (BJ 감사 메시지)

**설명**: BJ가 VIP에게 보내는 감사 메시지

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `vip_profile_id` | UUID | NO | - | profiles FK (VIP) |
| `bj_member_id` | INT | NO | - | organization FK (BJ) |
| `message_type` | VARCHAR(10) | NO | - | 타입 |
| `content_text` | TEXT | YES | NULL | 텍스트 |
| `content_url` | TEXT | YES | NULL | 미디어 URL |
| `is_public` | BOOLEAN | NO | true | 공개 여부 |
| `is_deleted` | BOOLEAN | NO | false | 삭제 여부 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | 수정일시 |

**Message Types**: `text` | `image` | `video`

**FK References**:
- `vip_profile_id` → `profiles(id)`
- `bj_member_id` → `organization(id)`

---

### 20. vip_personal_messages (VIP 개인 메시지)

**설명**: VIP 본인이 자신의 헌정 페이지에 남기는 메시지

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGSERIAL | NO | - | PK |
| `vip_profile_id` | UUID | NO | - | profiles FK (페이지 소유자) |
| `author_id` | UUID | NO | - | profiles FK (작성자 = VIP) |
| `message_type` | VARCHAR(10) | NO | 'text' | 타입 |
| `content_text` | TEXT | YES | NULL | 텍스트 (최대 2000자) |
| `content_url` | TEXT | YES | NULL | 미디어 URL |
| `is_public` | BOOLEAN | NO | true | 공개 여부 |
| `is_deleted` | BOOLEAN | NO | false | 삭제 여부 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | 수정일시 |

**Message Types**: `text` | `image` | `video`

**FK References**:
- `vip_profile_id` → `profiles(id)`
- `author_id` → `profiles(id)`

**RLS Policies**:
- SELECT: 공개 메시지는 모두 조회, 비공개는 VIP/관리자만
- INSERT: VIP 본인만 자기 페이지에 작성 가능
- UPDATE/DELETE: 작성자 본인 또는 관리자만

---

### 21. rank_battle_records (직급전 기록)

**설명**: 직급전 결과 기록

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `season_id` | INT | NO | - | seasons FK |
| `battle_number` | INT | NO | - | 직급전 회차 |
| `rank` | INT | NO | - | 순위 |
| `donor_id` | UUID | YES | NULL | profiles FK |
| `donor_name` | VARCHAR(100) | NO | - | 후원자명 |
| `total_amount` | BIGINT | NO | - | 총 후원금 |
| `finalized_at` | TIMESTAMPTZ | NO | NOW() | 확정 시간 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |

**FK References**:
- `season_id` → `seasons(id)`
- `donor_id` → `profiles(id)`

---

### 22. total_donation_rankings (역대 랭킹)

**설명**: 역대 누적 후원 랭킹 (Top 50)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `rank` | INT | NO | - | 순위 |
| `donor_name` | VARCHAR(100) | NO | - | 후원자명 |
| `total_amount` | BIGINT | NO | - | 총 후원금 ⚠️ |
| `is_permanent_vip` | BOOLEAN | NO | false | 영구 VIP |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | 갱신일시 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |

> ⚠️ **주의**: `total_amount`는 외부 노출 절대 금지! UI에서는 게이지로만 표현

---

## Foreign Key Relationships

### 전체 FK 다이어그램

```
profiles
├── organization.profile_id
├── donations.donor_id
├── vip_rewards.profile_id
├── schedules.created_by
├── notices.author_id
├── posts.author_id
├── comments.author_id
├── tribute_guestbook.tribute_user_id
├── tribute_guestbook.author_id
├── bj_thank_you_messages.vip_profile_id
├── vip_personal_messages.vip_profile_id
├── vip_personal_messages.author_id
└── rank_battle_records.donor_id

seasons
├── episodes.season_id
├── donations.season_id
├── vip_rewards.season_id
├── timeline_events.season_id
└── rank_battle_records.season_id

episodes
├── donations.episode_id
└── vip_rewards.episode_id

organization (self-ref)
├── organization.parent_id
├── signature_videos.member_id
├── live_status.member_id
└── bj_thank_you_messages.bj_member_id

vip_rewards
└── vip_images.reward_id

signatures
└── signature_videos.signature_id

posts
└── comments.post_id

comments (self-ref)
└── comments.parent_id
```

### FK 목록 (28개)

| # | Table | Column | References |
|---|-------|--------|------------|
| 1 | organization | profile_id | profiles(id) |
| 2 | organization | parent_id | organization(id) |
| 3 | episodes | season_id | seasons(id) |
| 4 | donations | donor_id | profiles(id) |
| 5 | donations | season_id | seasons(id) |
| 6 | donations | episode_id | episodes(id) |
| 7 | vip_rewards | profile_id | profiles(id) |
| 8 | vip_rewards | season_id | seasons(id) |
| 9 | vip_rewards | episode_id | episodes(id) |
| 10 | vip_images | reward_id | vip_rewards(id) |
| 11 | signature_videos | signature_id | signatures(id) |
| 12 | signature_videos | member_id | organization(id) |
| 13 | schedules | created_by | profiles(id) |
| 14 | timeline_events | season_id | seasons(id) |
| 15 | notices | author_id | profiles(id) |
| 16 | posts | author_id | profiles(id) |
| 17 | comments | post_id | posts(id) |
| 18 | comments | author_id | profiles(id) |
| 19 | comments | parent_id | comments(id) |
| 20 | live_status | member_id | organization(id) |
| 21 | tribute_guestbook | tribute_user_id | profiles(id) |
| 22 | tribute_guestbook | author_id | profiles(id) |
| 23 | bj_thank_you_messages | vip_profile_id | profiles(id) |
| 24 | bj_thank_you_messages | bj_member_id | organization(id) |
| 25 | vip_personal_messages | vip_profile_id | profiles(id) |
| 26 | vip_personal_messages | author_id | profiles(id) |
| 27 | rank_battle_records | season_id | seasons(id) |
| 28 | rank_battle_records | donor_id | profiles(id) |

---

## Database Functions

### RPC Functions

| Function | Args | Returns | Description |
|----------|------|---------|-------------|
| `update_donation_total` | donor_id, amount | void | 후원금 누적 업데이트 |
| `increment_comment_count` | post_id | void | 댓글 수 증가 |
| `decrement_comment_count` | post_id | void | 댓글 수 감소 |
| `is_admin` | user_id | boolean | Admin 여부 확인 |
| `is_staff` | user_id | boolean | Staff 여부 확인 |
| `is_vip_user` | user_id | boolean | VIP 여부 확인 |
| `get_active_season_id` | - | number | 활성 시즌 ID |
| `get_user_rank` | user_id, season_id? | {rank, total_amount}[] | 사용자 랭킹 |
| `get_user_rank_active_season` | user_id | {rank, total_amount, season_id}[] | 활성 시즌 랭킹 |
| `get_episode_rankings` | episode_id, limit? | {rank, donor_id, donor_name, total_amount}[] | 회차 랭킹 |
| `is_vip_for_episode` | user_id, episode_id | boolean | 회차별 VIP 여부 |
| `is_vip_for_rank_battles` | user_id, season_id? | boolean | 직급전 VIP 여부 |
| `is_bj_member` | user_id | boolean | BJ 멤버 여부 |
| `get_bj_member_id` | user_id | number \| null | BJ 멤버 ID |

### 사용 예시

```typescript
// VIP 여부 확인
const { data: isVip } = await supabase.rpc('is_vip_user', { user_id: userId })

// 사용자 랭킹 조회
const { data: rank } = await supabase.rpc('get_user_rank_active_season', {
  p_user_id: userId
})

// BJ 멤버 확인
const { data: isBj } = await supabase.rpc('is_bj_member', { user_id: userId })
```

---

## Row Level Security (RLS)

### 정책 개요 (68개)

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| profiles | Public | - | Owner | - |
| seasons | Public | Admin | Admin | Admin |
| organization | Public (active) | Admin | Admin | Admin |
| episodes | Public | Admin | Admin | Admin |
| donations | Public | Admin | - | - |
| vip_rewards | Owner/Admin | Admin | Admin | Admin |
| vip_images | Reward Owner/Admin | Admin | Admin | Admin |
| signatures | Public | Admin | Admin | Admin |
| signature_videos | Public | Admin | Admin | Admin |
| schedules | Public | Admin | Admin | Admin |
| timeline_events | Public | Admin | Admin | Admin |
| notices | Public | Admin | Admin | Admin |
| posts | Board-based | Auth Users | Owner/Mod | - |
| comments | Not deleted | Auth Users | Owner/Mod | - |
| media_content | Public | Admin | Admin | Admin |
| live_status | Public | Admin | Admin | Admin |
| banners | Public (active) | Admin | Admin | Admin |
| tribute_guestbook | Not deleted | Auth/Guest | Owner/VIP | Owner/Admin |
| bj_thank_you_messages | Not deleted | BJ Member | Author/Admin | Author/Admin |
| vip_personal_messages | Public or Owner | VIP Owner | Author/Admin | Author/Admin |
| rank_battle_records | Public | Admin | Admin | Admin |
| total_donation_rankings | Public | Admin | Admin | Admin |

### VIP 게시판 접근 제어

```sql
-- VIP 게시판 SELECT
CREATE POLICY "posts_vip_select" ON posts
  FOR SELECT USING (
    board_type = 'vip' AND (
      is_vip_user(auth.uid()) OR
      is_admin(auth.uid())
    )
  );
```

---

## Migration History

| File | Date | Description |
|------|------|-------------|
| `20241201_init_schema.sql` | 2024-12-01 | 초기 스키마 (14개 테이블) |
| `20241229_create_banners_table.sql` | 2024-12-29 | 배너 테이블 생성 |
| `20260121_schema_sync.sql` | 2026-01-21 | 스키마 동기화 |

### 20260121_schema_sync.sql 내용

- `vip_personal_messages` 테이블 생성
- `organization.current_rank` 컬럼 추가
- `episodes.is_finalized`, `finalized_at` 컬럼 추가
- `vip_rewards.episode_id` 컬럼 추가

---

## TypeScript Types

### Import

```typescript
import type {
  Profile,
  Season,
  Organization,
  Episode,
  Donation,
  VipReward,
  VipImage,
  Signature,
  SignatureVideo,
  Schedule,
  TimelineEvent,
  Notice,
  Post,
  Comment,
  MediaContent,
  LiveStatus,
  Banner,
  TributeGuestbook,
  BjThankYouMessage,
  VipPersonalMessage,
  RankBattleRecord,
  TotalDonationRanking,
  Role,
  Unit,
} from '@/types/database'
```

### Helper Types

```typescript
// Row 타입
type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

// Insert 타입
type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

// Update 타입
type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
```

---

## Usage Examples

### 기본 조회

```typescript
// 프로필 조회
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single()

// 시즌 랭킹 조회 (Top 50)
const { data: rankings } = await supabase
  .from('donations')
  .select('donor_id, donor_name, amount')
  .eq('season_id', seasonId)
  .order('amount', { ascending: false })
  .limit(50)
```

### JOIN 조회

```typescript
// VIP 보상 + 이미지
const { data: rewards } = await supabase
  .from('vip_rewards')
  .select(`
    *,
    vip_images (*)
  `)
  .eq('season_id', seasonId)

// 게시글 + 작성자
const { data: posts } = await supabase
  .from('posts')
  .select(`
    *,
    author:profiles!author_id (nickname, avatar_url)
  `)
  .eq('board_type', 'free')
  .order('created_at', { ascending: false })
```

### BJ 메시지 조회

```typescript
// BJ 감사 메시지 + BJ 정보
const { data: messages } = await supabase
  .from('bj_thank_you_messages')
  .select(`
    *,
    bj_member:organization!bj_member_id (
      name,
      image_url
    )
  `)
  .eq('vip_profile_id', vipUserId)
  .eq('is_deleted', false)
  .order('created_at', { ascending: false })
```

---

## Related Files

| 파일 | 설명 |
|------|------|
| `src/types/database.ts` | TypeScript 타입 정의 |
| `src/lib/supabase/client.ts` | Supabase 클라이언트 |
| `src/lib/supabase/middleware.ts` | 서버 미들웨어 |
| `src/lib/auth/access-control.ts` | 접근 권한 유틸리티 |
| `src/lib/hooks/useVipStatus.ts` | VIP 상태 훅 |
| `supabase/migrations/` | 마이그레이션 파일 |

---

*Generated: 2026-01-21*
*Version: 2.0*
