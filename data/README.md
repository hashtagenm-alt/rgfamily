# Data 폴더

⚠️ **이 폴더는 .gitignore에 포함되어 있습니다. Git에 커밋하지 마세요!**

## 파일 목록

### accounts.csv
BJ, 관리자, Top 후원자 계정 정보

**생성 방법:**
```bash
npx tsx scripts/generate-accounts-csv.ts
```

**포함 정보:**
- 구분: BJ / Admin / Top_Supporter
- 닉네임: 표시 이름
- PandaTV_ID: PandaTV 아이디 (BJ만)
- 이메일: 로그인용 이메일
- 임시비밀번호: 첫 로그인용 (변경 필수)
- 권한: superadmin / admin / vip / member
- 랭킹: 시즌/전체 순위
- 소속: excel / crew
- 비고: 추가 설명

## 보안 주의사항

1. 이 폴더의 파일은 외부 유출 금지
2. CSV 파일을 이메일/메신저로 공유하지 말 것
3. 운영팀 내부에서만 사용
4. 계정 전달 후 임시 비밀번호 변경 안내 필수
