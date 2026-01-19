import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Custom rule overrides
  {
    rules: {
      // 데이터 패칭 패턴에서 useEffect 내 setState 호출은 일반적인 패턴이므로 warning으로 변경
      "react-hooks/set-state-in-effect": "warn",
      // 사용하지 않는 변수는 warning으로 처리 (언더스코어 prefix 허용)
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      // React 컴파일러 최적화 관련 - 수동 메모이제이션 보존 실패는 warning으로 처리
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
]);

export default eslintConfig;
