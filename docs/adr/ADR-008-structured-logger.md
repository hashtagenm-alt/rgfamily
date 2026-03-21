# ADR-008: 구조화 로거 표준화

| 항목 | 값 |
|------|-----|
| 상태 | 승인 |
| 날짜 | 2026-03-08 |

## 문맥 (Context)

`src/lib/` 전역에서 `console.log`, `console.error`, `console.warn`이 70건 이상 산재해 있었다. 이로 인해:
- 로그 형식 비일관 (`Error:`, `에러:`, `failed:` 혼재)
- 프로덕션에서 민감 정보(Supabase 에러 상세) 노출 위험
- 로그 레벨 제어 불가 (개발/프로덕션 구분 없음)

## 결정 (Decision)

`src/lib/utils/logger.ts`에 구조화 로거를 도입하고, `src/lib/` 내 모든 raw console 호출을 마이그레이션한다.

### 로거 API

```typescript
logger.debug(message, ...args)    // 개발 환경만
logger.info(message, ...args)     // 정보성
logger.warn(message, ...args)     // 경고
logger.error(message, error?)     // 일반 에러
logger.apiError(endpoint, error)  // API 호출 실패
logger.dbError(op, table, error)  // DB 작업 실패
```

### 마이그레이션 패턴

```typescript
// Before
console.error('후원 데이터 로드 실패:', err)

// After
logger.dbError('fetch', 'donations', err)
```

### 적용 범위

- `src/lib/hooks/` (18파일)
- `src/lib/actions/` (6파일)
- `src/lib/api/` (3파일)
- `src/lib/context/` (2파일)
- `src/app/` 내 console은 향후 마이그레이션 예정

## 결과 (Consequences)

**장점**:
- 로그 형식 통일 (`[LEVEL] message` 패턴)
- DB/API 에러 전용 메서드로 컨텍스트 자동 포함
- 환경별 로그 레벨 제어 가능

**단점**:
- logger import 추가 필요
- `src/app/` 영역은 미전환 (향후 과제)

## 관련 파일
- `src/lib/utils/logger.ts` - 로거 구현체
- `src/lib/hooks/*.ts` - 마이그레이션된 훅 (18파일)
- `src/lib/actions/*.ts` - 마이그레이션된 액션 (6파일)
