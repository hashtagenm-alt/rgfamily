# 계정 시스템 정비 및 권한 체계 확립

## 개요
BJ/VIP/관리자/일반회원 계정을 체계적으로 정리하고, role에 'bj'를 별도로 추가하여 권한 체계를 명확히 분리함. 시즌 1-20위, 종합 1-20위 VIP 계정을 생성하고 모든 비밀번호를 CSV로 정리함.

## 주요 변경사항

### 개발한 것
- `scripts/setup-all-accounts.ts`: 전체 계정 설정 및 CSV 내보내기 스크립트
- `scripts/sql/add-bj-role.sql`: Supabase에 'bj' role 추가 SQL
- `src/lib/actions/permissions.ts`: `isBj()`, `isVip()` 헬퍼 함수 추가

### 수정한 것
- `src/types/database.ts`: Role 타입에 'bj' 추가
- `data/accounts.csv`: 54개 계정 비밀번호 포함 CSV 생성

### 권한 체계
```
superadmin > admin > moderator > vip > bj > member
```

## 결과
- ✅ 빌드 성공
- ✅ 54개 계정 생성 완료
  - 관리자: 11명
  - BJ: 13명
  - 시즌 VIP: 20명
  - 종합 VIP: 5명 (중복 제외)
  - 일반 회원: 5명

## 다음 단계
- [ ] **Supabase SQL 실행 필수**: `scripts/sql/add-bj-role.sql` 실행하여 'bj' role 추가
- [ ] SQL 실행 후 `npx tsx scripts/setup-all-accounts.ts` 재실행하여 BJ role 업데이트
- [ ] 프론트엔드에서 role='bj' 권한 체크 로직 테스트
- [ ] 실제 로그인 테스트 (BJ, VIP, 일반회원 각각)
