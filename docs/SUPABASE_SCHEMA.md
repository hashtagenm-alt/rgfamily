# RG Family Supabase Database Schema

> ⚠️ **이 문서는 구버전입니다.**
>
> 최신 스키마 문서는 다음을 참조하세요:
> - **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** - 전체 스키마 상세 문서 (22개 테이블)
> - **[DATABASE_QUICK_REF.md](./DATABASE_QUICK_REF.md)** - 빠른 참조용 치트시트
>
> Last Updated: 2026-01-21

---

## Overview (Legacy)

RG Family 프로젝트의 Supabase 데이터베이스 스키마 문서입니다.

**Last Updated**: 2026-01-12 (구버전)
**Total Tables**: 15개 → 22개 (최신)
**Migrations**: `supabase/migrations/`

---

## Database Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE                                      │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                        PostgreSQL Database                          │  │
│  │                                                                      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │  │
│  │  │  profiles   │  │   seasons   │  │ organization │                │  │
│  │  │ (사용자/VIP) │  │   (시즌)    │  │   (조직도)   │                │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                │  │
│  │         │                │                │                         │  │
│  │         ▼                ▼                ▼                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │  │
│  │  │  donations  │  │ vip_rewards │  │ live_status │                │  │
│  │  │  (후원내역)  │  │  (VIP보상)  │  │  (LIVE상태) │                │  │
│  │  └─────────────┘  └──────┬──────┘  └─────────────┘                │  │
│  │                          │                                          │  │
│  │                          ▼                                          │  │
│  │                   ┌─────────────┐                                   │  │
│  │                   │ vip_images  │                                   │  │
│  │                   │ (VIP갤러리) │                                   │  │
│  │                   └─────────────┘                                   │  │
│  │                                                                      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │  │
│  │  │   notices   │  │    posts    │  │  comments   │                │  │
│  │  │  (공지사항)  │  │   (게시글)  │  │   (댓글)    │                │  │
│  │  └─────────────┘  └──────┬──────┘  └─────────────┘                │  │
│  │                          │                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │  │
│  │  │ signatures  │  │  schedules  │  │  banners    │                │  │
│  │  │ (시그니처)   │  │   (일정)    │  │   (배너)    │                │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                │  │
│  │                                                                      │  │
│  │  ┌─────────────┐  ┌─────────────┐                                  │  │
│  │  │media_content│  │timeline_evts│                                  │  │
│  │  │(Shorts/VOD) │  │ (타임라인)  │                                  │  │
│  │  └─────────────┘  └─────────────┘                                  │  │
│  │                                                                      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Table Schemas

### 1. profiles (사용자/후원자)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | - | PK, auth.users 참조 |
| `nickname` | VARCHAR(100) | NO | - | 닉네임 |
| `email` | VARCHAR(255) | YES | NULL | 이메일 |
| `avatar_url` | TEXT | YES | NULL | 프로필 이미지 URL |
| `role` | VARCHAR(20) | NO | 'member' | 역할: member/vip/moderator/admin/superadmin |
| `unit` | VARCHAR(10) | YES | NULL | 소속: excel/crew |
| `total_donation` | BIGINT | NO | 0 | 누적 후원금 (하트) |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | 수정일시 |

**Indexes**: Primary Key on `id`
**Triggers**: `trigger_profiles_updated_at`

---

### 2. seasons (시즌)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `name` | VARCHAR(100) | NO | - | 시즌명 |
| `start_date` | DATE | NO | - | 시작일 |
| `end_date` | DATE | YES | NULL | 종료일 (현시즌 NULL) |
| `is_active` | BOOLEAN | NO | false | 활성 여부 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |

**Example Data**:
```sql
('시즌 4 - 겨울의 축제', '2024-10-01', NULL, true)
```

---

### 3. organization (조직도)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `unit` | VARCHAR(10) | NO | - | 유닛: excel/crew |
| `profile_id` | UUID | YES | NULL | profiles FK |
| `name` | VARCHAR(100) | NO | - | 멤버명 |
| `role` | VARCHAR(50) | NO | - | 역할: R대표/G대표/팀장/멤버 |
| `position_order` | INT | NO | 0 | 계층 순서 |
| `parent_id` | INT | YES | NULL | 상위 멤버 (자기참조) |
| `image_url` | TEXT | YES | NULL | 프로필 이미지 |
| `social_links` | JSONB | YES | '{}' | SNS 링크 |
| `is_live` | BOOLEAN | NO | false | LIVE 상태 |
| `is_active` | BOOLEAN | NO | true | 활성화 여부 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |

**Social Links JSON Format**:
```json
{
  "pandatv": "https://pandatv.com/...",
  "chzzk": "https://chzzk.naver.com/...",
  "youtube": "https://youtube.com/@...",
  "instagram": "https://instagram.com/..."
}
```

**Hierarchy**:
```
position_order=1: R대표, G대표 (parent_id=NULL)
position_order=2: 팀장 (parent_id=대표ID)
position_order=3: 멤버 (parent_id=팀장ID)
```

---

### 4. donations (후원 내역)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `donor_id` | UUID | YES | NULL | profiles FK |
| `donor_name` | VARCHAR(100) | NO | - | 후원자명 |
| `amount` | BIGINT | NO | - | 금액 (하트 단위) |
| `season_id` | INT | NO | - | seasons FK |
| `unit` | VARCHAR(10) | YES | NULL | 대상 유닛 |
| `message` | TEXT | YES | NULL | 후원 메시지 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 후원 시각 |

**Indexes**:
- `idx_donations_season (season_id)`
- `idx_donations_donor (donor_id)`
- `idx_donations_amount (amount DESC)`

---

### 5. vip_rewards (VIP 보상)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `profile_id` | UUID | NO | - | profiles FK |
| `season_id` | INT | NO | - | seasons FK |
| `rank` | INT | NO | - | 순위 (1~50) |
| `personal_message` | TEXT | YES | NULL | 개인 감사 메시지 |
| `dedication_video_url` | TEXT | YES | NULL | 헌정 영상 URL |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |

**Constraints**: `UNIQUE(profile_id, season_id)`

---

### 6. vip_images (VIP 갤러리)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `reward_id` | INT | NO | - | vip_rewards FK |
| `image_url` | TEXT | NO | - | 이미지 URL |
| `title` | VARCHAR(255) | YES | NULL | 제목 |
| `order_index` | INT | NO | 0 | 정렬 순서 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |

---

### 7. signatures (시그니처)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `title` | VARCHAR(255) | NO | - | 제목 |
| `description` | TEXT | YES | NULL | 설명 |
| `unit` | VARCHAR(10) | NO | - | 유닛 |
| `member_name` | VARCHAR(100) | NO | - | 멤버명 |
| `media_type` | VARCHAR(10) | NO | 'video' | 타입: video/image/gif |
| `media_url` | TEXT | NO | - | 미디어 URL |
| `thumbnail_url` | TEXT | YES | NULL | 썸네일 |
| `tags` | TEXT[] | YES | NULL | 검색 태그 |
| `view_count` | INT | NO | 0 | 조회수 |
| `is_featured` | BOOLEAN | NO | false | 추천 여부 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |

---

### 8. schedules (일정)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `title` | VARCHAR(255) | NO | - | 제목 |
| `description` | TEXT | YES | NULL | 설명 |
| `unit` | VARCHAR(10) | YES | NULL | 유닛 |
| `event_type` | VARCHAR(20) | NO | - | 유형: broadcast/collab/event/notice/休 |
| `start_datetime` | TIMESTAMPTZ | NO | - | 시작 시간 |
| `end_datetime` | TIMESTAMPTZ | YES | NULL | 종료 시간 |
| `location` | VARCHAR(255) | YES | NULL | 장소 |
| `is_all_day` | BOOLEAN | NO | false | 종일 이벤트 |
| `color` | VARCHAR(20) | YES | NULL | 캘린더 색상 |
| `created_by` | UUID | YES | NULL | 작성자 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |

---

### 9. timeline_events (타임라인)

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

**Categories**: founding, event, milestone, member

---

### 10. notices (공지사항)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `title` | VARCHAR(255) | NO | - | 제목 |
| `content` | TEXT | NO | - | 본문 |
| `category` | VARCHAR(20) | NO | - | 카테고리: official/excel/crew |
| `thumbnail_url` | TEXT | YES | NULL | 썸네일 |
| `is_pinned` | BOOLEAN | NO | false | 고정 여부 |
| `view_count` | INT | NO | 0 | 조회수 |
| `author_id` | UUID | YES | NULL | 작성자 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | 수정일시 |

---

### 11. posts (게시글)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `board_type` | VARCHAR(10) | NO | - | 게시판: free/vip |
| `title` | VARCHAR(255) | NO | - | 제목 |
| `content` | TEXT | NO | - | 본문 |
| `author_id` | UUID | NO | - | 작성자 |
| `view_count` | INT | NO | 0 | 조회수 |
| `like_count` | INT | NO | 0 | 좋아요 |
| `comment_count` | INT | NO | 0 | 댓글 수 |
| `is_anonymous` | BOOLEAN | NO | false | 익명 여부 |
| `is_deleted` | BOOLEAN | NO | false | 삭제 여부 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | 수정일시 |

---

### 12. comments (댓글)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `post_id` | INT | NO | - | posts FK |
| `author_id` | UUID | NO | - | 작성자 |
| `content` | TEXT | NO | - | 내용 |
| `parent_id` | INT | YES | NULL | 대댓글 부모 |
| `is_deleted` | BOOLEAN | NO | false | 삭제 여부 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |

---

### 13. media_content (Shorts/VOD)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `content_type` | VARCHAR(10) | NO | - | 타입: shorts/vod |
| `title` | VARCHAR(255) | NO | - | 제목 |
| `description` | TEXT | YES | NULL | 설명 |
| `thumbnail_url` | TEXT | YES | NULL | 썸네일 |
| `video_url` | TEXT | NO | - | 영상 URL |
| `unit` | VARCHAR(10) | YES | NULL | 유닛 |
| `duration` | INT | YES | NULL | 길이 (초) |
| `view_count` | INT | NO | 0 | 조회수 |
| `is_featured` | BOOLEAN | NO | false | 추천 여부 |
| `created_at` | TIMESTAMPTZ | NO | NOW() | 생성일시 |

---

### 14. live_status (LIVE 상태)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | - | PK |
| `member_id` | INT | NO | - | organization FK |
| `platform` | VARCHAR(20) | NO | - | 플랫폼: chzzk/twitch/youtube/pandatv |
| `stream_url` | TEXT | NO | - | 방송 URL |
| `thumbnail_url` | TEXT | YES | NULL | 썸네일 |
| `is_live` | BOOLEAN | NO | false | LIVE 여부 |
| `viewer_count` | INT | NO | 0 | 시청자 수 |
| `last_checked` | TIMESTAMPTZ | NO | NOW() | 마지막 확인 |

**Constraints**: `UNIQUE(member_id, platform)`

---

### 15. banners (배너)

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

## Database Functions

### update_donation_total

프로필의 누적 후원금을 업데이트합니다.

```sql
CREATE OR REPLACE FUNCTION update_donation_total(p_donor_id UUID, p_amount BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET total_donation = total_donation + p_amount
  WHERE id = p_donor_id;
END;
$$ LANGUAGE plpgsql;
```

---

## Row Level Security (RLS)

모든 테이블에 RLS가 활성화되어 있습니다.

### Common Policies

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| profiles | Public | - | Owner | - |
| seasons | Public | Admin | Admin | Admin |
| organization | Public (active) | Admin | Admin | Admin |
| donations | Public | Admin | - | - |
| vip_rewards | Owner/Admin | Admin | Admin | Admin |
| vip_images | Reward Owner/Admin | Admin | Admin | Admin |
| signatures | Public | Admin | Admin | Admin |
| schedules | Public | Admin | Admin | Admin |
| timeline_events | Public | Admin | Admin | Admin |
| notices | Public | Admin | Admin | Admin |
| posts | Board-based | Auth Users | Owner/Mod | - |
| comments | Public (not deleted) | Auth Users | Owner/Mod | - |
| media_content | Public | Admin | Admin | Admin |
| live_status | Public | Admin | Admin | Admin |
| banners | Public (active) | Admin | Admin | Admin |

---

## Mock Data Files

| Table | Mock File | Records |
|-------|-----------|---------|
| profiles | `profiles.ts` | 51 |
| seasons | `seasons.ts` | 4 |
| organization | `organization.ts` | 14 |
| donations | `donations.ts` | 1000+ |
| vip_rewards | `vip-rewards.ts` | 50 |
| vip_images | `vip-rewards.ts` | 9 |
| signatures | `signatures.ts` | 12 |
| schedules | `schedules.ts` | 6 |
| timeline_events | `timeline.ts` | 7 |
| notices | `notices.ts` | 10 |
| posts | `posts.ts` | 4 |
| comments | `comments.ts` | 48 |
| media_content | `media.ts` | 12 |
| live_status | `live-status.ts` | 8 |
| banners | `banners.ts` | 4 |

---

## Migration Files

| File | Description |
|------|-------------|
| `20241201_init_schema.sql` | 전체 스키마 초기화 (14개 테이블) |
| `20241229_create_banners_table.sql` | 배너 테이블 생성 |

---

## Usage Example

```typescript
// 1. Mock Mode (개발)
import { USE_MOCK_DATA } from '@/lib/config'
import { mockProfiles } from '@/lib/mock'

if (USE_MOCK_DATA) {
  return mockProfiles
}

// 2. Supabase Mode (프로덕션)
const { data } = await supabase
  .from('profiles')
  .select('*')
  .order('total_donation', { ascending: false })
  .limit(50)
```

---

*Generated: 2026-01-12*
