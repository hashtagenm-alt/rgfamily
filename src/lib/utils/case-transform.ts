/**
 * 케이스 변환 유틸리티
 *
 * Supabase DB (snake_case) ↔ TypeScript (camelCase) 변환
 * 타입 안전성을 위해 제네릭 사용
 */

type SnakeToCamelCase<S extends string> = S extends `${infer T}_${infer U}`
  ? `${Lowercase<T>}${Capitalize<SnakeToCamelCase<U>>}`
  : Lowercase<S>

type CamelToSnakeCase<S extends string> = S extends `${infer T}${infer U}`
  ? T extends Capitalize<T>
    ? `_${Lowercase<T>}${CamelToSnakeCase<U>}`
    : `${T}${CamelToSnakeCase<U>}`
  : S

export type SnakeToCamel<T> = T extends object
  ? T extends Array<infer U>
    ? Array<SnakeToCamel<U>>
    : {
        [K in keyof T as K extends string ? SnakeToCamelCase<K> : K]: SnakeToCamel<T[K]>
      }
  : T

export type CamelToSnake<T> = T extends object
  ? T extends Array<infer U>
    ? Array<CamelToSnake<U>>
    : {
        [K in keyof T as K extends string ? CamelToSnakeCase<K> : K]: CamelToSnake<T[K]>
      }
  : T

/**
 * snake_case 문자열을 camelCase로 변환
 * @example snakeToCamel('user_profile_id') // 'userProfileId'
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * camelCase 문자열을 snake_case로 변환
 * @example camelToSnake('userProfileId') // 'user_profile_id'
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

/**
 * 객체의 모든 키를 snake_case에서 camelCase로 변환 (재귀)
 * DB 응답 → 프론트엔드 타입 변환에 사용
 *
 * @example
 * const dbData = { user_id: 1, profile_name: 'test', created_at: '2024-01-01' }
 * const uiData = snakeToCamelObject(dbData)
 * // { userId: 1, profileName: 'test', createdAt: '2024-01-01' }
 */
export function snakeToCamelObject<T extends Record<string, unknown>>(
  obj: T
): SnakeToCamel<T> {
  if (obj === null || obj === undefined) {
    return obj as SnakeToCamel<T>
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === 'object' && item !== null
        ? snakeToCamelObject(item as Record<string, unknown>)
        : item
    ) as SnakeToCamel<T>
  }

  if (typeof obj !== 'object') {
    return obj as SnakeToCamel<T>
  }

  const result: Record<string, unknown> = {}

  for (const key of Object.keys(obj)) {
    const camelKey = snakeToCamel(key)
    const value = obj[key]

    if (value !== null && typeof value === 'object') {
      result[camelKey] = snakeToCamelObject(value as Record<string, unknown>)
    } else {
      result[camelKey] = value
    }
  }

  return result as SnakeToCamel<T>
}

/**
 * 객체의 모든 키를 camelCase에서 snake_case로 변환 (재귀)
 * 프론트엔드 데이터 → DB 저장에 사용
 *
 * @example
 * const uiData = { userId: 1, profileName: 'test' }
 * const dbData = camelToSnakeObject(uiData)
 * // { user_id: 1, profile_name: 'test' }
 */
export function camelToSnakeObject<T extends Record<string, unknown>>(
  obj: T
): CamelToSnake<T> {
  if (obj === null || obj === undefined) {
    return obj as CamelToSnake<T>
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === 'object' && item !== null
        ? camelToSnakeObject(item as Record<string, unknown>)
        : item
    ) as CamelToSnake<T>
  }

  if (typeof obj !== 'object') {
    return obj as CamelToSnake<T>
  }

  const result: Record<string, unknown> = {}

  for (const key of Object.keys(obj)) {
    const snakeKey = camelToSnake(key)
    const value = obj[key]

    if (value !== null && typeof value === 'object') {
      result[snakeKey] = camelToSnakeObject(value as Record<string, unknown>)
    } else {
      result[snakeKey] = value
    }
  }

  return result as CamelToSnake<T>
}

/**
 * 배열의 모든 객체를 snake_case에서 camelCase로 변환
 */
export function snakeToCamelArray<T extends Record<string, unknown>>(
  arr: T[]
): SnakeToCamel<T>[] {
  return arr.map((item) => snakeToCamelObject(item))
}

/**
 * 배열의 모든 객체를 camelCase에서 snake_case로 변환
 */
export function camelToSnakeArray<T extends Record<string, unknown>>(
  arr: T[]
): CamelToSnake<T>[] {
  return arr.map((item) => camelToSnakeObject(item))
}
