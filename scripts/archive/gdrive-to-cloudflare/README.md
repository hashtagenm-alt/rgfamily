# Google Drive → Cloudflare Stream VOD 자동 업로드

Google Drive에서 VOD 파일을 Cloudflare Stream으로 자동 업로드하고
media_content 테이블에 등록하는 스크립트입니다.

## 1단계: Google Cloud 설정 (최초 1회)

### 1.1 Google Cloud 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 상단의 프로젝트 선택 → "새 프로젝트" 클릭
3. 프로젝트 이름: `rg-family-vod` (원하는 이름)
4. "만들기" 클릭

### 1.2 Google Drive API 활성화

1. 좌측 메뉴 → "API 및 서비스" → "라이브러리"
2. 검색창에 "Google Drive API" 입력
3. "Google Drive API" 클릭 → "사용" 버튼 클릭

### 1.3 Service Account 생성

1. 좌측 메뉴 → "API 및 서비스" → "사용자 인증 정보"
2. 상단 "+ 사용자 인증 정보 만들기" → "서비스 계정"
3. 서비스 계정 이름: `vod-uploader`
4. "만들고 계속하기" → 역할 선택 없이 "완료"

### 1.4 JSON 키 다운로드

1. 생성된 서비스 계정 클릭 (vod-uploader@...)
2. 상단 "키" 탭 클릭
3. "키 추가" → "새 키 만들기" → JSON 선택 → "만들기"
4. 다운로드된 JSON 파일을 프로젝트 루트에 복사:
   ```
   /Users/bagjaeseog/rg-family/google-credentials.json
   ```

### 1.5 Google Drive 폴더 공유

1. Google Drive에서 VOD 폴더 열기
2. 폴더 우클릭 → "공유" → "공유"
3. 서비스 계정 이메일 입력 (예: `vod-uploader@rg-family-vod.iam.gserviceaccount.com`)
4. 권한: "뷰어" 선택 → "보내기"

## 2단계: 환경변수 설정

`.env.local` 파일에 추가:

```bash
# Cloudflare Stream (필수)
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token

# Google Drive (자동 - credentials 파일 경로)
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
```

### Cloudflare API Token 발급 방법

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → 우측 상단 프로필 → "My Profile"
2. 좌측 "API Tokens" → "Create Token"
3. "Create Custom Token" 선택
4. 설정:
   - Token name: `RG Family VOD Upload`
   - Permissions:
     - Account → Stream → Edit
   - Account Resources:
     - Include → Your Account
5. "Continue to summary" → "Create Token"
6. 토큰 복사하여 `.env.local`에 저장

## 3단계: 의존성 설치

```bash
npm install googleapis
```

## 4단계: 업로드 실행

### 단일 파일 업로드

```bash
npx tsx scripts/gdrive-to-cloudflare/upload.ts \
  --file-id "1abc123..." \
  --title "시즌1 1화 풀영상"
```

### 폴더 전체 업로드

```bash
npx tsx scripts/gdrive-to-cloudflare/upload.ts \
  --folder-id "1xyz789..." \
  --content-type vod
```

### 옵션

| 옵션 | 설명 |
|------|------|
| `--file-id` | Google Drive 파일 ID |
| `--folder-id` | Google Drive 폴더 ID |
| `--title` | 영상 제목 (파일명 대신 사용) |
| `--content-type` | `vod` 또는 `shorts` (기본: vod) |
| `--unit` | `excel` 또는 `crew` (소속 팬클럽) |
| `--dry-run` | 테스트 실행 (실제 업로드 안 함) |
| `--limit` | 업로드할 최대 파일 수 |

## 파일 ID / 폴더 ID 찾는 방법

Google Drive URL에서 추출:
- 파일: `https://drive.google.com/file/d/FILE_ID_HERE/view`
- 폴더: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`

## 문제 해결

### "The caller does not have permission" 에러
→ 서비스 계정 이메일로 Drive 폴더/파일 공유 확인

### "API has not been enabled" 에러
→ Google Cloud Console에서 Drive API 활성화 확인

### 대용량 파일 업로드 시간
- 10GB 파일: 약 15-30분 (네트워크 속도에 따라 다름)
- Cloudflare 인코딩 추가 시간 필요 (영상 길이에 비례)
