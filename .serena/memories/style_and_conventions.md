# Style and conventions

- Styling: Tailwind CSS 4 via `@import "tailwindcss"` + CSS Modules; design tokens in `src/app/globals.css`.
- Themes: Dark default (`data-theme="dark"`), light supported; Mantine theme set in `src/components/Providers.tsx`.
- Typography: `Inter` (display) + `Noto Sans KR` (body) in CSS tokens; `Geist` fonts also loaded in `src/app/layout.tsx`.
- Color tokens: Tailwind `primary` now matches neutral gray tokens (`#52525b`/`#71717a`/`#3f3f46`); live color is red (`#ef4444`). Ranking colors keep gold/silver/bronze.
- UX rules (CLAUDE): nickname only (no IDs/emails), hover states on interactive elements, body text >=16px.
