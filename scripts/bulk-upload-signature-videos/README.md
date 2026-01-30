# 시그니처 영상 대량 업로드 스크립트

시그니처 영상을 Cloudflare Stream으로 대량 업로드하는 스크립트입니다.

## 사전 준비

1. `.env.local` 파일에 다음 환경변수가 설정되어 있어야 합니다:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN`

## 방법 1: CSV 기반 업로드

매핑 정보를 CSV 파일로 직접 관리하는 방식입니다.

### 1단계: 템플릿 생성

```bash
npx tsx scripts/bulk-upload-signature-videos/generate-csv-template.ts
```

생성되는 파일:
- `upload-template.csv` - 업로드용 빈 템플릿
- `signatures-list.csv` - 시그니처 목록 (참조용)
- `members-list.csv` - 멤버 목록 (참조용)
- `reference-all-combinations.csv` - 전체 조합 (참조용)

### 2단계: CSV 작성

`upload-template.csv`를 열어 매핑 정보를 입력합니다:

```csv
file_path,signature_id,sig_number,member_id,member_name
/path/to/video1.mp4,129,,59,
/path/to/video2.mp4,,777,,린아
/path/to/video3.mp4,130,,60,가애
```

- `file_path`: 로컬 비디오 파일 경로 (필수)
- `signature_id` 또는 `sig_number` 중 하나 필수
- `member_id` 또는 `member_name` 중 하나 필수

### 3단계: 업로드

```bash
# 검증만 (업로드 안 함)
npx tsx scripts/bulk-upload-signature-videos/upload.ts --dry-run

# 실제 업로드
npx tsx scripts/bulk-upload-signature-videos/upload.ts

# 옵션
npx tsx scripts/bulk-upload-signature-videos/upload.ts --csv /path/to/custom.csv
npx tsx scripts/bulk-upload-signature-videos/upload.ts --limit 10  # 처음 10개만
npx tsx scripts/bulk-upload-signature-videos/upload.ts --skip 100  # 100개 건너뛰기
```

## 방법 2: 폴더 기반 업로드

파일을 멤버별 폴더로 정리하고, 파일명을 시그니처 번호로 지정하는 방식입니다.

### 폴더 구조

```
/videos/
  ├── 린아/
  │   ├── 777.mp4
  │   ├── 1000.mp4
  │   └── 1002.mp4
  ├── 가애/
  │   ├── 777.mp4
  │   ├── 1000.mp4
  │   └── ...
  └── ...
```

- 폴더명 = 멤버 이름 (정확히 일치해야 함)
- 파일명 = 시그니처 번호 (예: `777.mp4`, `1000.mp4`)

### 업로드

```bash
# 검증만
npx tsx scripts/bulk-upload-signature-videos/upload-from-folders.ts /path/to/videos --dry-run

# 실제 업로드
npx tsx scripts/bulk-upload-signature-videos/upload-from-folders.ts /path/to/videos

# 옵션
--limit 10       # 처음 10개만
--member 린아    # 특정 멤버만 업로드
```

## 멤버 목록

현재 등록된 멤버:
- 린아, 가애, 채은, 설윤, 가윤, 홍서하, 월아, 한백설
- 손밍, 퀸로니, 해린, 한세아, 청아, 키키

## 참고

- Cloudflare Rate Limit 방지를 위해 각 업로드 사이에 1초 대기합니다.
- 1000개 업로드 시 약 17분 소요됩니다.
- 업로드 중 오류 발생 시 해당 파일만 실패하고 계속 진행합니다.
- `--skip` 옵션으로 중단된 지점부터 재개할 수 있습니다.
