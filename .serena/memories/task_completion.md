# Task completion checklist

- Typecheck: `pnpm exec tsc --noEmit`
- Lint: `pnpm lint`
- Unit tests: `pnpm test:run`
- Build: `pnpm build`
- Smoke test: `bash scripts/smoke-test.sh` (or `pnpm start` + curl key pages)
- Optional: E2E `pnpm test:e2e` (Playwright)
