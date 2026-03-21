# Architecture Decision Records (ADR)

프로젝트의 주요 아키텍처 결정을 기록합니다.

## ADR 목록

| ADR | 제목 | 상태 | 날짜 |
|-----|------|------|------|
| [ADR-001](./ADR-001-server-action-permission-layers.md) | Server Action 5계층 권한 체계 | 승인 | 2026-01-12 |
| [ADR-002](./ADR-002-legacy-season-data-separation.md) | 레거시+시즌 데이터 이원화 저장 | 승인 | 2026-01-25 |
| [ADR-003](./ADR-003-raw-heart-hiding-viewer-score.md) | 원시 하트 은닉 + 시청자 점수 ×50 | 승인 | 2026-02-07 |
| [ADR-004](./ADR-004-vip-click-signature-eligibility.md) | VIP 클릭 = 시그니처 자격 ≠ VIP 리워드 | 승인 | 2026-02-03 |
| [ADR-005](./ADR-005-repository-pattern-factory.md) | Repository Pattern + Factory | 승인 | 2026-01-12 |
| [ADR-006](./ADR-006-pr-workflow-dual-remote.md) | PR 워크플로우 강제 + 이중 리모트 | 승인 | 2026-01-12 |
| [ADR-007](./ADR-007-video-4k-original-upload.md) | 영상 원본 4K 유지 정책 | 승인 | 2026-02-01 |
| [ADR-008](./ADR-008-structured-logger.md) | 구조화 로거 표준화 | 승인 | 2026-03-08 |
| [ADR-009](./ADR-009-scripts-organization.md) | 스크립트 카테고리별 구조화 | 승인 | 2026-03-08 |
| [ADR-010](./ADR-010-analytics-domain-split.md) | 분석 Server Action 도메인 분할 | 승인 | 2026-03-08 |

## ADR 작성 가이드

- 새 ADR 작성 시 [TEMPLATE.md](./TEMPLATE.md) 사용
- 번호는 순차 증가 (ADR-NNN)
- 상태: `제안` → `승인` → `폐기` 또는 `대체됨(→ADR-XXX)`
