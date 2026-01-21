# RG Family 데이터베이스 스키마 문서

> 테이블별 용도와 관계를 명확히 정의하여 중복/혼란 방지

---

## 테이블 분류

### 1. 사용자 관련
| 테이블 | 용도 | 설명 |
|--------|------|------|
| **profiles** | 가입 회원 정보 | auth.users와 1:1 연결. 로그인한 사용자의 닉네임, 아바타 등 |
| **organization** | RG Family 멤버 | 조직도에 표시되는 공식 멤버 (대표, 팀장, 멤버 등). BJ 멤버 정보 포함 |

**중요**: `profiles` ≠ `organization`
- profiles: 사이트 가입자 (팬 포함)
- organization: RG Family 조직 구성원 (공식 멤버, BJ 멤버)

---

### 2. 후원/랭킹 관련
| 테이블 | 용도 | 설명 |
|--------|------|------|
| **seasons** | 시즌 관리 | RG Family 시즌 정보 (시즌 1, 시즌 2 등) |
| **episodes** | 에피소드 관리 | 각 시즌의 방송 회차 정보 |
| **donations** | 후원 기록 | 개별 후원 내역. donor_name 기준으로 집계 |
| **vip_rewards** | VIP 기본 정보 | 시즌별 Top 5 VIP 순위, 개인 메시지 등. profiles와 연결 |
| **vip_images** | VIP 시그니처 | VIP 전용 갤러리 이미지 |
| **bj_thank_you_messages** | **VIP 리워드** | BJ가 VIP에게 남기는 사진/영상/메시지 |

**⚠️ 용어 주의:**
- "VIP 리워드" = `bj_thank_you_messages` (BJ가 VIP에게 남기는 콘텐츠)
- `vip_rewards` 테이블은 VIP 기본 정보 (순위, 개인 메시지 등)

**FK 관계**:
```
seasons (1) ──┬── (*) donations
              ├── (*) episodes
              ├── (*) vip_rewards
              └── (*) timeline_events

profiles (1) ──┬── (*) vip_rewards
               ├── (*) posts (author_id)
               └── (*) comments (author_id)
```

---

### 3. 커뮤니티 관련
| 테이블 | 용도 | 설명 |
|--------|------|------|
| **posts** | 게시글 | 자유게시판, VIP 게시판 등의 글 |
| **comments** | 댓글 | 게시글에 달린 댓글 (대댓글 지원: parent_id) |
| **notices** | 공지사항 | 관리자 공지 |

---

### 4. 일정/이벤트 관련
| 테이블 | 용도 | 설명 |
|--------|------|------|
| **timeline_events** | 히스토리 타임라인 | RG Family 역사 기록 (첫 방송, 시즌 시작 등) |
| **schedule_events** | 방송 일정 | 캘린더에 표시되는 예정 일정 |

**차이점**:
- timeline_events: 과거 기록 (히스토리 페이지용)
- schedule_events: 미래 일정 (캘린더 페이지용)

---

## 컬럼 명명 규칙

### ID 관련
| 컬럼명 | 용도 |
|--------|------|
| `id` | 테이블 기본 PK (UUID) |
| `profile_id` | profiles 테이블 FK (가입 회원 참조) |
| `season_id` | seasons 테이블 FK |
| `episode_id` | episodes 테이블 FK |
| `author_id` | profiles 테이블 FK (작성자) |
| `post_id` | posts 테이블 FK |
| `parent_id` | 같은 테이블 자기참조 (대댓글 등) |

### 주의: donor_id vs profile_id
```
donations 테이블:
- donor_name: 후원자 닉네임 (필수, 문자열) ← 랭킹 집계 기준
- profile_id: 가입 회원 연결 (선택, UUID) ← 대부분 null
```
**이유**: 후원자가 반드시 사이트 가입자는 아님. PandaTV 닉네임으로 후원 가능.

---

## 혼란 방지 가이드

### ❌ 잘못된 사용
```javascript
// donations에서 profile_id로 랭킹 집계 (대부분 null이라 누락됨)
.select('profile_id, amount')
.group('profile_id')
```

### ✅ 올바른 사용
```javascript
// donations에서 donor_name으로 랭킹 집계
.select('donor_name, amount')
// JavaScript에서 donor_name 기준 합산
```

---

### ❌ 잘못된 참조
```javascript
// VIP 목록을 members 테이블에서 조회 (members는 조직도용)
supabase.from('members').select('*').eq('is_vip', true)
```

### ✅ 올바른 참조
```javascript
// VIP 목록은 vip_rewards → profiles 조인
supabase.from('vip_rewards')
  .select('rank, profile_id, profiles:profile_id(nickname)')
```

---

## 테이블 주석 SQL

Supabase Dashboard에서 실행하여 테이블 주석 추가:

```sql
-- 테이블 주석
COMMENT ON TABLE public.profiles IS '가입 회원 정보 (auth.users 연결)';
COMMENT ON TABLE public.organization IS 'RG Family 조직 멤버 (조직도용, BJ 멤버 포함)';
COMMENT ON TABLE public.seasons IS 'RG Family 시즌 정보';
COMMENT ON TABLE public.episodes IS '시즌별 방송 에피소드';
COMMENT ON TABLE public.donations IS '후원 기록 (donor_name 기준 집계)';
COMMENT ON TABLE public.vip_rewards IS '시즌별 VIP Top 5 보상 정보';
COMMENT ON TABLE public.vip_images IS 'VIP 전용 갤러리 이미지';
COMMENT ON TABLE public.posts IS '커뮤니티 게시글';
COMMENT ON TABLE public.comments IS '게시글 댓글';
COMMENT ON TABLE public.notices IS '관리자 공지사항';
COMMENT ON TABLE public.timeline_events IS '히스토리 타임라인 (과거 기록)';
COMMENT ON TABLE public.schedule_events IS '방송 일정 캘린더 (미래 일정)';

-- 주요 컬럼 주석
COMMENT ON COLUMN public.donations.donor_name IS '후원자 닉네임 (랭킹 집계 기준, 필수)';
COMMENT ON COLUMN public.donations.profile_id IS '가입 회원 연결 (선택, 비회원 후원 가능)';
COMMENT ON COLUMN public.vip_rewards.profile_id IS 'VIP 회원 프로필 연결 (필수)';
COMMENT ON COLUMN public.organization.unit IS '소속: excel(엑셀) 또는 crew(크루)';
COMMENT ON COLUMN public.profiles.unit IS '소속: excel(엑셀) 또는 crew(크루)';
```

---

## 버전
- 최종 업데이트: 2026-01-21
- 테이블 수: 12개
