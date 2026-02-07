# Google Drive 영상 소스 폴더 정보

## 시그니처 영상 (시그리스트)
- **Google Drive 폴더**: https://drive.google.com/drive/folders/1sMgXm1z0L8CY_LP5MxzPO2Bf2arBHYL-
- **폴더 ID**: `1sMgXm1z0L8CY_LP5MxzPO2Bf2arBHYL-`
- **폴더명**: 시즌1
- **구조**: 멤버별 하위 폴더 (가애, 가윤, 린아, 설윤, 월아, 채은, 청아, 퀸로니, 키키, 한백설, 한세아, 해린, 홍서하)
- **파일명 규칙**: `{sig_number} {멤버명}.mp4` (예: "10001 홍서하.mp4")
- **업로드 대상 DB**: `signature_videos` 테이블

### 멤버별 폴더 ID
| 멤버 | Google Drive 폴더 ID |
|------|---------------------|
| 가애 | 1TgBpNpbgKjRhU8ZM0U8F0L94iKe7hnAq |
| 가윤 | 1mo1iK2_RNHp_K5Fc7Q9QXDuxqlzzKQGM |
| 린아 | 1ohjsys-vPZV_jb-Xowa5GzZ4NFq8IVk4 |
| 설윤 | 1fqgrz4FsrXLg5ITc9MJpk7tQaW99ygAE |
| 월아 | 1PFwQwep8J2Xf9RM1UsshgszVOFziErji |
| 채은 | 1cIxCBJTpJeAlnCfIshN3MjAzYVR5nb0f |
| 청아 | 1gwc9AiVC72JBHm4zvG0eZCOMvXSXwME3 |
| 퀸로니 | 1FXEeJsMIplhLW4aXX_ILdlLCywOAvco6 |
| 키키 | 1FXrYnOkQQgmpDfK7GXBtY4O-VLJr-geg |
| 한백설 | 1AMk9z6ZP00I5xpII5nuAixOUmyj_70cO |
| 한세아 | 1a7DlJE-SmK02Me_4A1nm3_gSn4TZjOny |
| 해린 | 1wJtlz6rOiJ54nbDkDYmLWM44LBo0bawN |
| 홍서하 | 1A2PGJf_LgvzmFEDqOxothYRfKdvsnAYX |

## 쇼츠(세로) 영상
- **Google Drive 폴더**: https://drive.google.com/drive/folders/1kEUuHsY3Ob_lvuy5gw2zkmVjQO58l3b1
- **폴더 ID**: `1kEUuHsY3Ob_lvuy5gw2zkmVjQO58l3b1`
- **내용**: 세로 쇼츠 영상 리스트
- **업로드 대상 DB**: `media_content` 테이블 (content_type: 'shorts')

## 업로드 화질 정책

### 원칙: 원본 화질 유지 (4K 포함)
- 업로드 시 리사이즈/압축/트랜스코딩 하지 않음
- Google Drive 원본 → 바이너리 그대로 → Cloudflare Stream 업로드
- Cloudflare Stream이 서버측에서 adaptive bitrate 프로필 자동 생성 (원본 보존)

### 업로드 방식별 화질 보존 여부
| 방식 | 화질 | 비고 |
|------|------|------|
| FormData (≤200MB) | 원본 유지 | 파일 바이너리 그대로 전송 |
| TUS 프로토콜 (>200MB) | 원본 유지 | 5MB 청크 분할, 압축 없음 |
| upload-shorts-transcoded.ts | **1080p로 다운스케일** | FFmpeg 사용, 8Mbps 제한 - 4K 원본 업로드 시 사용 금지 |

### 주의사항
- `scripts/upload-shorts-transcoded.ts`는 FFmpeg로 4K→1080p 트랜스코딩함 → **4K 원본 업로드에 사용 금지**
- 4K 쇼츠 업로드 시 `scripts/upload-shorts-videos.ts` 또는 `scripts/gdrive-shorts-upload.ts` 사용
- 시그니처 영상은 `scripts/batch-signature-upload.ts` 사용 (원본 유지)

## 관련 스크립트
| 스크립트 | 용도 | 화질 |
|---------|------|------|
| `scripts/batch-signature-upload.ts` | 시그니처 일괄 업로드 (Google Drive API) | 원본 |
| `scripts/gdrive-shorts-upload.ts` | 쇼츠 업로드 (Google Drive) | 원본 |
| `scripts/upload-shorts-videos.ts` | 쇼츠 TUS 업로드 | 원본 |
| `scripts/upload-shorts-transcoded.ts` | 쇼츠 트랜스코딩 업로드 | **1080p** |
| `scripts/upload-fancam-videos.ts` | 직캠 업로드 | 원본 |
