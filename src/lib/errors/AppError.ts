/**
 * 애플리케이션 에러 클래스
 *
 * 왜? 에러 처리를 일관성 있게 하기 위해.
 * - 에러 코드로 타입별 구분
 * - 사용자 친화적 메시지
 * - 로깅용 상세 정보 분리
 */

export type ErrorCode =
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'DATABASE_ERROR'

export interface AppErrorOptions {
  /** 에러 코드 */
  code: ErrorCode
  /** 사용자에게 표시할 메시지 */
  message: string
  /** 개발자용 상세 정보 (로깅용) */
  details?: string
  /** 원본 에러 */
  cause?: Error
}

export class AppError extends Error {
  readonly code: ErrorCode
  readonly details?: string
  readonly cause?: Error
  readonly timestamp: Date

  constructor(options: AppErrorOptions) {
    super(options.message)
    this.name = 'AppError'
    this.code = options.code
    this.details = options.details
    this.cause = options.cause
    this.timestamp = new Date()

    // 스택 트레이스 유지
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }

  /** 로깅용 객체 반환 */
  toLog() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      cause: this.cause?.message,
    }
  }

  /** 클라이언트 응답용 객체 반환 (민감 정보 제외) */
  toClient() {
    return {
      code: this.code,
      message: this.message,
    }
  }
}

/** 자주 사용하는 에러 생성 헬퍼 */
export const Errors = {
  notFound: (resource: string) =>
    new AppError({
      code: 'NOT_FOUND',
      message: `${resource}을(를) 찾을 수 없습니다.`,
    }),

  unauthorized: (message = '로그인이 필요합니다.') =>
    new AppError({
      code: 'UNAUTHORIZED',
      message,
    }),

  forbidden: (message = '접근 권한이 없습니다.') =>
    new AppError({
      code: 'FORBIDDEN',
      message,
    }),

  validation: (message: string) =>
    new AppError({
      code: 'VALIDATION_ERROR',
      message,
    }),

  conflict: (message: string) =>
    new AppError({
      code: 'CONFLICT',
      message,
    }),

  database: (message: string, cause?: Error) =>
    new AppError({
      code: 'DATABASE_ERROR',
      message: '데이터베이스 오류가 발생했습니다.',
      details: message,
      cause,
    }),

  internal: (message: string, cause?: Error) =>
    new AppError({
      code: 'INTERNAL_ERROR',
      message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      details: message,
      cause,
    }),
}

/** 에러를 AppError로 변환 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof Error) {
    return new AppError({
      code: 'INTERNAL_ERROR',
      message: '예기치 않은 오류가 발생했습니다.',
      details: error.message,
      cause: error,
    })
  }

  return new AppError({
    code: 'INTERNAL_ERROR',
    message: '알 수 없는 오류가 발생했습니다.',
    details: String(error),
  })
}
