# 스크립트 정리 계획

> 총 116개 스크립트 중 중복/불필요 스크립트 정리

## 📊 분석 결과

### 🎬 VOD 관련 (12개) → 3개로 통합

| 유지 | 제거 | 사유 |
|------|------|------|
| ✅ `split-vod-upload-v2.ts` | ❌ `split-vod-upload.ts` | v2가 개선 버전 |
| ✅ `pipeline-vod-upload.ts` | ❌ `batch-vod-compress-upload.ts` | 파이프라인이 더 효율적 |
| ✅ `download-all-vods.sh` | ❌ `compress-vod-videotoolbox.ts` | 단일 압축은 불필요 |
| | ❌ `compress-and-upload-vod.ts` | pipeline으로 대체 |
| | ❌ `stream-compress-upload-vod.ts` | split-v2로 대체 |
| | ❌ `rclone-vod-upload.ts` | pipeline으로 대체 |
| | ❌ `upload-local-vod.ts` | split-v2로 대체 |
| | ❌ `upload-existing-vod.ts` | 미사용 |
| | ❌ `upload-compressed-vod.ts` | 미사용 |

### 📹 시그니처/GDrive 관련 (26개) → 4개로 통합

| 유지 | 제거 | 사유 |
|------|------|------|
| ✅ `gdrive-signature-upload-v2.ts` | ❌ `gdrive-signature-upload.ts` | v2가 최신 |
| ✅ `sync-signature-videos.ts` | ❌ `gdrive-curl-upload.ts` | 미사용 |
| ✅ `check-signature-videos.ts` | ❌ `gdrive-download-upload.ts` | 기능 중복 |
| ✅ `check-sig-status.ts` | ❌ `gdrive-folder-to-cloudflare.ts` | v2로 대체 |
| | ❌ `gdrive-stream-upload.ts` | 미사용 |
| | ❌ `gdrive-to-cloudflare-direct.ts` | v2로 대체 |
| | ❌ `rclone-signature-upload.ts` | v2로 대체 |
| | ❌ `upload-signature-videos*.ts` (4개) | v2로 대체 |
| | ❌ `upload-signatures.ts` | 미사용 |
| | ❌ `upload-missing-signatures.ts` | 미사용 |
| | ❌ `check-signatures.ts` | 중복 |
| | ❌ `insert-signatures-db.ts` | 일회성 |
| | ❌ `manage-signatures.cjs` | 미사용 |
| | ❌ `migrate-signatures-schema.ts` | 완료됨 |
| | ❌ `swap-signature-thumbnails.ts` | 일회성 |
| | ❌ `update-signature-titles.ts` | 일회성 |
| | ❌ `upload-vip-signature.ts` | v2로 대체 |
| | ❌ `rclone-to-cloudflare.ts` | v2로 대체 |
| | ❌ `migrate-video-urls-to-cloudflare.ts` | 완료됨 |

### 🔧 마이그레이션/일회성 (삭제 가능)

```
❌ add-excel-members-safe.ts
❌ add-is-bj-column.ts
❌ add-remaining-members.ts
❌ apply-schema-changes.ts
❌ create-admin-accounts.ts
❌ create-admin.ts
❌ create-bj-ranks.ts
❌ create-notice-attachments-table.ts
❌ create-schedule-event-types.ts
❌ create-test-accounts.ts
❌ fix-ranking-architecture.ts
❌ migrate-member-profiles.ts
❌ replace-excel-members.ts
❌ reset-all-passwords.ts
❌ reset-bj-passwords.ts
❌ run-donor-id-migration.ts
❌ run-migration.ts
❌ seed-*.ts (6개)
❌ setup-*.ts (3개)
```

### ✅ 유지할 스크립트 (핵심)

```
# VOD
split-vod-upload-v2.ts     # VOD 분할 업로드
pipeline-vod-upload.ts     # 파이프라인 처리
download-all-vods.sh       # VOD 다운로드
start-ep3.sh               # EP3 시작

# 시그니처
gdrive-signature-upload-v2.ts  # 시그니처 업로드
sync-signature-videos.ts       # 영상 동기화
check-sig-status.ts           # 상태 확인

# 랭킹
update-season-rankings.ts
update-total-rankings.ts
refresh-season-rankings.ts
verify-ranking-integrity.ts

# 유틸리티
run-sql.ts
check-db-schema.ts
import-donations.ts
export-all-accounts.ts
```

## 🚀 실행 명령

```bash
# 백업 폴더 생성
mkdir -p scripts/archive

# 제거할 파일 이동
mv scripts/split-vod-upload.ts scripts/archive/
mv scripts/batch-vod-compress-upload.ts scripts/archive/
# ... (아래 실행 스크립트 참고)
```

## 📋 정리 후 예상

- **현재**: 116개
- **정리 후**: ~30개
- **감소**: 86개 (74%)
