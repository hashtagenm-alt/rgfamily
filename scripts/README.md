# Scripts Directory

RG Family 프로젝트의 CLI 스크립트 모음. 모든 스크립트는 `npx tsx` 로 실행합니다.

## Directory Structure

```
scripts/
├── lib/              # 공유 유틸리티 (supabase, cloudflare, utils, csv-parser, nickname)
├── check/            # DB 검증, 상태 확인
├── upload/           # Cloudflare Stream 영상 업로드
├── audit/            # 데이터 감사, 콘텐츠 점검
├── data/             # 데이터 조작: update, import, sync, create, export, fix, restore, analyze
├── db/               # DB 관리: backup, schema dump, migration, run-sql
├── tools/            # 기타 유틸리티: CLI, dashboard, verify, test, match 등
├── archive/          # 완료/폐기된 일회성 스크립트
├── migrations/       # SQL 마이그레이션 파일
├── sql/              # SQL 쿼리 파일
├── crawler/          # 크롤러 (PandaTV 라이브 상태 등)
├── refactor/         # 리팩토링 관련
├── docs/             # 스크립트 관련 문서/다이어그램 (architecture-diagram.html 등)
├── *.sql             # 루트 레벨 SQL 파일 (seed, setup, schema 등)
└── *.sh              # 루트 레벨 쉘 스크립트 (run-migrations, smoke-test, start-ep3)
```

## How to Run

```bash
# 기본 실행 방식
npx tsx scripts/<category>/<script-name>.ts

# 예시
npx tsx scripts/db/db-backup.ts --dry-run
npx tsx scripts/db/run-sql.ts --table profiles
npx tsx scripts/check/check-db-schema.ts
npx tsx scripts/data/update-season-rankings.ts
npx tsx scripts/upload/batch-signature-upload.ts

# npm 스크립트 (package.json에 등록된 것)
npm run rg              # 통합 CLI (scripts/tools/rg-cli.ts)
npm run dashboard       # 모니터링 대시보드 (scripts/tools/rg-dashboard.ts)
npm run db:backup       # DB 백업 (scripts/db/db-backup.ts)
npm run db:schema       # 스키마 스냅샷 (scripts/db/dump-schema.ts)
```

## Categories

### `check/` - DB 검증 & 상태 확인
데이터 정합성 확인, 스키마 검증, VIP/랭킹 상태 점검 등.

### `upload/` - Cloudflare Stream 업로드
시그니처 영상, VOD, 쇼츠, 직캠 등의 Cloudflare Stream 업로드.
원본 화질(4K) 유지 원칙 - FFmpeg 트랜스코딩 금지.

### `audit/` - 데이터 감사
전체 콘텐츠, 미디어, 시그니처 영상의 무결성 점검.

### `data/` - 데이터 조작
update, import, sync, create, export, fix, find, restore, analyze, merge, delete 작업.

### `db/` - DB 관리
백업, 스키마 덤프, SQL 실행, 마이그레이션 등 DB 인프라 관리.

### `tools/` - 유틸리티
통합 CLI, 대시보드, 테스트, 검증(verify), 매칭, VIP 관리 등.

### `crawler/` - 크롤러
PandaTV 라이브 상태 파싱 등 외부 사이트 크롤링 스크립트.

### `docs/` - 스크립트 문서
아키텍처 다이어그램 등 스크립트 관련 참고 문서.

### `migrations/` - SQL 마이그레이션
DB 스키마 변경 마이그레이션 파일. `run-migrations.sh`로 순차 실행.

### `sql/` - SQL 쿼리
재사용 가능한 SQL 쿼리 파일.

### `refactor/` - 리팩토링
코드 리팩토링 관련 스크립트.

### `archive/` - 아카이브
완료/폐기된 일회성 스크립트. 참고용으로 보관.

## Shared Library (`lib/`)

모든 스크립트는 `lib/` 폴더의 공유 모듈을 사용합니다:

| 모듈 | 용도 |
|------|------|
| `supabase.ts` | Supabase 서비스 클라이언트 (getServiceClient) |
| `cloudflare.ts` | Cloudflare Stream API (업로드, 조회, 삭제) |
| `utils.ts` | 공통 유틸 (withRetry, processBatch) |
| `csv-parser.ts` | CSV 파싱 |
| `nickname.ts` | 닉네임 정규화/추출 |

Import 예시:
```typescript
import { getServiceClient } from '../lib/supabase'
import { withRetry } from '../lib/utils'
```
