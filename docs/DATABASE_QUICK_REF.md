# RG Family DB Quick Reference

> 빠른 참조용 치트시트 (상세 내용은 `DATABASE_SCHEMA.md` 참조)

---

## 테이블 요약 (22개)

| # | Table | 설명 | 주요 FK |
|---|-------|------|---------|
| 1 | `profiles` | 사용자 | - |
| 2 | `seasons` | 시즌 | - |
| 3 | `organization` | BJ 멤버/조직도 | profiles, self |
| 4 | `episodes` | 방송 회차 | seasons |
| 5 | `donations` | 후원 내역 | profiles, seasons, episodes |
| 6 | `vip_rewards` | VIP 보상 | profiles, seasons, episodes |
| 7 | `vip_images` | VIP 이미지 | vip_rewards |
| 8 | `signatures` | 시그니처 | - |
| 9 | `signature_videos` | 시그니처 영상 | signatures, organization |
| 10 | `schedules` | 일정 | profiles |
| 11 | `timeline_events` | 타임라인 | seasons |
| 12 | `notices` | 공지사항 | profiles |
| 13 | `posts` | 게시글 | profiles |
| 14 | `comments` | 댓글 | posts, profiles, self |
| 15 | `media_content` | Shorts/VOD | - |
| 16 | `live_status` | LIVE 상태 | organization |
| 17 | `banners` | 배너 | - |
| 18 | `tribute_guestbook` | 헌정 방명록 | profiles |
| 19 | `bj_thank_you_messages` | BJ→VIP 메시지 | profiles, organization |
| 20 | `vip_personal_messages` | VIP 개인 메시지 | profiles |
| 21 | `rank_battle_records` | 직급전 기록 | seasons, profiles |
| 22 | `total_donation_rankings` | 역대 랭킹 | - |

---

## 역할(Role) 권한

```
superadmin > admin > moderator > vip > member
```

| Role | Admin 패널 | VIP 콘텐츠 | 일반 기능 |
|------|-----------|-----------|----------|
| superadmin | ✅ 전체 | ✅ | ✅ |
| admin | ✅ 전체 | ✅ | ✅ |
| moderator | ✅ 제한적 | ✅ | ✅ |
| vip | ❌ | ✅ | ✅ |
| member | ❌ | ❌ | ✅ |

### VIP 조건
- **Role 기반**: vip/moderator/admin/superadmin
- **Rank 기반**: Top 50 이내

---

## Enum Values

### Unit
```typescript
'excel' | 'crew'
```

### Role (profiles)
```typescript
'member' | 'vip' | 'moderator' | 'admin' | 'superadmin'
```

### Board Type (posts)
```typescript
'free' | 'vip'
```

### Event Type (schedules)
```typescript
'broadcast' | 'collab' | 'event' | 'notice' | '休'
```

### Content Type (media_content)
```typescript
'shorts' | 'vod'
```

### Message Type (bj_thank_you_messages, vip_personal_messages)
```typescript
'text' | 'image' | 'video'
```

### Platform (live_status)
```typescript
'chzzk' | 'twitch' | 'youtube' | 'pandatv'
```

### Notice Category
```typescript
'official' | 'excel' | 'crew'
```

---

## 자주 쓰는 쿼리

### 사용자 조회
```typescript
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single()
```

### 시즌 랭킹 Top 50
```typescript
const { data } = await supabase
  .from('donations')
  .select('donor_id, donor_name, amount')
  .eq('season_id', seasonId)
  .order('amount', { ascending: false })
  .limit(50)
```

### 게시글 + 작성자
```typescript
const { data } = await supabase
  .from('posts')
  .select(`
    *,
    author:profiles!author_id (nickname, avatar_url)
  `)
  .eq('board_type', 'free')
```

### VIP 보상 + 이미지
```typescript
const { data } = await supabase
  .from('vip_rewards')
  .select(`*, vip_images (*)`)
  .eq('season_id', seasonId)
```

### BJ 메시지 + BJ 정보
```typescript
const { data } = await supabase
  .from('bj_thank_you_messages')
  .select(`
    *,
    bj_member:organization!bj_member_id (name, image_url)
  `)
  .eq('vip_profile_id', vipUserId)
```

### 활성 시즌 조회
```typescript
const { data } = await supabase
  .from('seasons')
  .select('*')
  .eq('is_active', true)
  .single()
```

---

## RPC Functions

| Function | 용도 | 예시 |
|----------|------|------|
| `is_admin(user_id)` | Admin 확인 | RLS 정책 |
| `is_vip_user(user_id)` | VIP 확인 | RLS 정책 |
| `is_bj_member(user_id)` | BJ 확인 | 메시지 권한 |
| `get_user_rank(user_id)` | 사용자 랭킹 | 랭킹 표시 |
| `get_active_season_id()` | 활성 시즌 | 시즌 조회 |
| `get_bj_member_id(user_id)` | BJ ID | BJ 메시지 |

### RPC 호출
```typescript
const { data: isVip } = await supabase.rpc('is_vip_user', { user_id: userId })
const { data: rank } = await supabase.rpc('get_user_rank', { p_user_id: userId })
```

---

## FK 관계도 (핵심)

```
profiles ─────┬──► donations
              ├──► vip_rewards ───► vip_images
              ├──► posts ─────────► comments
              ├──► tribute_guestbook
              ├──► bj_thank_you_messages
              └──► vip_personal_messages

seasons ──────┬──► episodes ──────┬──► donations
              ├──► donations       └──► vip_rewards
              ├──► vip_rewards
              └──► rank_battle_records

organization ─┬──► live_status
              ├──► signature_videos
              └──► bj_thank_you_messages
```

---

## 파일 위치

| 용도 | 경로 |
|------|------|
| TypeScript 타입 | `src/types/database.ts` |
| Supabase 클라이언트 | `src/lib/supabase/client.ts` |
| 서버 미들웨어 | `src/lib/supabase/middleware.ts` |
| 접근 권한 | `src/lib/auth/access-control.ts` |
| VIP 상태 훅 | `src/lib/hooks/useVipStatus.ts` |
| 마이그레이션 | `supabase/migrations/` |
| 상세 스키마 문서 | `docs/DATABASE_SCHEMA.md` |

---

## 주의사항

1. **total_amount 노출 금지**: `total_donation_rankings.total_amount`는 UI에서 절대 직접 표시하지 않음 (게이지로만)
2. **VIP 글쓰기**: Role 기반 OR Rank 기반(Top 50) 모두 허용
3. **BJ 메시지**: organization 테이블에 연결된 계정만 작성 가능
4. **자기참조 FK**: `organization.parent_id`, `comments.parent_id`

---

*Last Updated: 2026-01-21*
