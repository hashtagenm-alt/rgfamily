# VIP 시스템 아키텍처

## 최종 업데이트: 2026-02-03

---

## 1. VIP 클릭 가능 조건

### 현재 적용된 방식: View 기반 (2026-02-03 전환)

VIP 개인 페이지 클릭 조건:
1. `profiles.avatar_url` 존재 (프로필 이미지)
2. `vip_rewards` 테이블에 해당 `profile_id` 레코드 존재

**DB View로 관리:**
```sql
-- vip_clickable_profiles View
SELECT DISTINCT p.id, p.nickname, p.avatar_url, TRUE as is_vip_clickable
FROM profiles p
INNER JOIN vip_rewards vr ON vr.profile_id = p.id
WHERE p.avatar_url IS NOT NULL;

-- season_rankings_public / total_rankings_public View에 is_vip_clickable 컬럼 포함
```

**장점:**
- VIP 조건 변경 시 SQL만 수정 (코드 배포 불필요)
- 추가 쿼리 제거로 성능 향상 (profiles, vip_rewards 별도 조회 X)
- DB 레벨에서 일관된 조건 관리

### 클릭 가능한 11명 VIP (2026-02-03 기준)
| 닉네임 | 이메일 | vip_rewards |
|--------|--------|-------------|
| 르큐리 | srvllo@rgfamily.kr | ✅ |
| 미키™ | mickey94@rgfamily.kr | ✅ |
| 채은❤️여신 | chaeeun01@rgfamily.kr | ✅ |
| 에이맨♣️ | superontime111@rgfamily.kr | ✅ |
| 손밍매니아 | luka831@rgfamily.kr | ✅ |
| 한세아내꺼♡호랭이 | yuricap85@rgfamily.kr | ✅ |
| 사랑해씌발™ | ejeh2472@rgfamily.kr | ✅ |
| [RG]미드굿♣️가애 | thursdayday@rgfamily.kr | ✅ |
| [J]젖문가 | amiral555@rgfamily.kr | ✅ |
| [RG]✨린아의발굴™ | ksbjh77@rgfamily.kr | ✅ |
| 농심육개장라면 | busjae011@rgfamily.kr | ✅ |

---

## 2. VIP 데이터 저장 구조

### 2.1 VIP 리워드 (vip_rewards)
```
vip_rewards
├── id (PK)
├── profile_id (FK → profiles.id)
├── season_id (FK → seasons.id)
├── episode_id (nullable)
├── rank (순위)
├── personal_message (VIP 개인 메시지)
└── dedication_video_url (헌정 영상 URL)
```

### 2.2 VIP 시그니처 이미지 (vip_images)
```
vip_images
├── id (PK)
├── reward_id (FK → vip_rewards.id) ⚠️ profile_id 아님!
├── image_url (Cloudinary/Supabase Storage URL)
├── title (이미지 제목)
└── order_index (정렬 순서)
```

**중요**: vip_images는 `profile_id`가 아닌 `reward_id`로 연결됨
- 조회 시: vip_rewards → vip_images (reward_id로 JOIN)

### 2.3 BJ 감사 메시지 (bj_thank_you_messages)
```
bj_thank_you_messages
├── id (PK)
├── vip_profile_id (FK → profiles.id) ⚠️ VIP 프로필
├── bj_member_id (FK → organization.id)
├── message_type ('text' | 'image' | 'video')
├── content_text (텍스트 내용)
├── content_url (이미지/영상 URL)
├── is_public (공개 여부)
└── is_deleted (삭제 여부)
```

### 2.4 VIP 개인 메시지 (vip_personal_messages)
```
vip_personal_messages
├── id (PK)
├── vip_profile_id (FK → profiles.id)
├── author_id (FK → profiles.id) - 작성자
├── message_type ('text' | 'image' | 'video')
├── content_text / content_url
└── is_public / is_deleted
```

### 2.5 아바타 이미지 (profiles.avatar_url)
- `profiles.avatar_url`: 외부 URL 또는 Supabase Storage URL
- Cloudinary 또는 Supabase Storage에 저장

---

## 3. 관계도

```
profiles (id)
    │
    ├──► vip_rewards (profile_id)
    │         │
    │         └──► vip_images (reward_id)
    │
    ├──► bj_thank_you_messages (vip_profile_id)
    │
    └──► vip_personal_messages (vip_profile_id, author_id)
```

---

## 4. 프로필 정리 이력 (2026-02-03)

### 중복 프로필 해결
- 각 VIP가 2개 프로필 보유 (기존 + 새 @rgfamily.kr)
- 기존 계정 데이터 → 새 계정으로 이관
- 기존 계정 삭제 (profiles + auth users)

### 이관 대상 데이터
1. `vip_rewards` (profile_id 변경)
2. `vip_personal_messages` (vip_profile_id, author_id)
3. `total_donation_rankings` (donor_id)
4. `season_donation_rankings` (donor_id)
5. `posts` (author_id)
6. `comments` (author_id)
7. `profiles.avatar_url` (새 계정에 없으면 복사)

### 스크립트
- `scripts/fix-duplicate-profiles.ts` - 중복 정리
- `scripts/check-cleanup-status.ts` - 정리 현황 확인
- `scripts/analyze-duplicate-profiles.ts` - 분석용

---

## 5. View 구현 상세

### 마이그레이션 파일
`supabase/migrations/20260203_vip_clickable_views.sql`

### 생성된 View들

1. **vip_clickable_profiles** - VIP 클릭 가능 프로필 목록
2. **season_rankings_public** - 시즌 랭킹 (is_vip_clickable 포함)
3. **total_rankings_public** - 종합 랭킹 (is_vip_clickable 포함)

### RankingRepository.ts 변경사항
- profiles, vip_rewards 별도 쿼리 제거
- View에서 `profile_id`, `avatar_url`, `is_vip_clickable` 직접 조회
- 쿼리 2-3개 → 1개로 단순화

---

## 6. 주의사항

1. **vip_images 조회 시 reward_id 사용** (profile_id 아님)
2. **bj_thank_you_messages는 CASCADE DELETE** - 프로필 삭제 시 함께 삭제됨
3. **새 VIP 추가 시**: 
   - profiles에 계정 생성
   - vip_rewards에 레코드 추가
   - (선택) vip_images에 시그니처 이미지 추가
4. **VIP 클릭 조건 변경 시**: `RankingRepository.ts` 수정
