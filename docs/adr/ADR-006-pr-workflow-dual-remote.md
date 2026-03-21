# ADR-006: PR 워크플로우 강제 + 이중 리모트

| 항목 | 값 |
|------|-----|
| 상태 | 승인 |
| 날짜 | 2026-01-12 |

## 문맥 (Context)

main 브랜치에 직접 푸시하면 CI 검증 없이 프로덕션에 배포되어 장애 위험이 있다. 또한 프로덕션(정식 도메인)과 개발용 저장소를 분리하여 안전한 배포 경로를 확보해야 한다.

## 결정 (Decision)

### 브랜치 전략
- **main**: 배포 전용, PR 머지로만 변경
- **feature/***: 새 기능 개발
- **fix/***: 버그 수정
- 워크플로우: 브랜치 생성 → 작업 → `npm run build` 성공 확인 → PR → CI → squash merge

### 이중 리모트
- **captain**: `https://github.com/captain-yun7/rg-family.git` (프로덕션, 정식 도메인)
- **origin/deploy**: 개발 및 백업용

### AI 행동 규칙
- AI(Claude)도 main 직접 푸시 절대 금지
- 사용자가 "커밋해줘"라고 해도 반드시 feature 브랜치 사용
- 빌드 확인 없이 PR 생성 금지

## 결과 (Consequences)

**장점**:
- CI/CD 파이프라인으로 빌드 에러, 타입 에러 사전 감지
- 코드 리뷰 기회 확보 (PR 단위)
- 프로덕션 배포 경로 명확화

**단점**:
- 소규모 수정에도 PR 생성 필요 (오버헤드)
- 두 리모트 관리 복잡성

## 관련 파일
- `CLAUDE.md` §1 - PR 워크플로우 규칙
- `CLAUDE.md` §11 - Git 브랜치 전략
- `.github/workflows/` - CI 파이프라인
