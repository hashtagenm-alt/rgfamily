# ADR-007: 영상 원본 4K 유지 정책 (Google Drive → Cloudflare Stream)

| 항목 | 값 |
|------|-----|
| 상태 | 승인 |
| 날짜 | 2026-02-01 |

## 문맥 (Context)

RG Family의 시그니처 영상과 팬캠은 4K 원본 화질이 중요한 콘텐츠다. 과거 FFmpeg로 1080p 트랜스코딩하여 업로드한 스크립트(`upload-shorts-transcoded.ts`)가 있었으나, 이는 원본 화질을 손상시킨다. Cloudflare Stream은 업로드 후 서버측에서 adaptive bitrate 프로필을 자동 생성하므로, 클라이언트 측 트랜스코딩이 불필요하다.

## 결정 (Decision)

### 업로드 원칙
- 원본 바이너리를 그대로 Cloudflare Stream에 전송
- FFmpeg, sharp 등 트랜스코딩/리사이즈 도구 사용 금지
- 파일 크기에 따라 업로드 방식 분기:
  - **≤200MB**: FormData 직접 업로드
  - **>200MB**: TUS 프로토콜 (5MB 청크 분할, 압축 없음)

### 영상 소스
- Google Drive API (서비스 계정) 방식으로 다운로드
- Puppeteer/fetch 직접 다운로드 불가 (Google Drive 인증 제한)
- rclone `gdrive:` 리모트 활용

### 승인된 스크립트
- `scripts/batch-signature-upload.ts` - 시그니처 일괄 업로드
- `scripts/gdrive-shorts-upload.ts` - 쇼츠 업로드
- `scripts/upload-shorts-videos.ts` - 쇼츠 TUS 업로드
- `scripts/upload-fancam-videos.ts` - 직캠 업로드

## 결과 (Consequences)

**장점**:
- 4K 원본 화질 100% 보존
- Cloudflare Stream의 adaptive bitrate가 시청 환경에 맞게 자동 최적화
- 업로드 프로세스 단순화 (변환 단계 제거)

**단점**:
- 4K 파일 업로드 시 시간/대역폭 소모 (1파일 수 GB 가능)
- Cloudflare Stream 저장 용량 관리 필요 (40,000분 중 ~29% 사용 중)

## 관련 파일
- `scripts/batch-signature-upload.ts` - 주요 업로드 스크립트
- `scripts/lib/cloudflare.ts` - Cloudflare API 유틸리티
- `CLAUDE.md` §20 - 영상 업로드 정책
