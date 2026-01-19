# RG Family overview

- Purpose: PandaTV streamer ("린아") fan community site focused on donor rankings, org chart, community boards, schedules, and VIP content.
- Frontend: Next.js 16 App Router, React 19, TypeScript 5; Tailwind CSS 4 + CSS Modules; Mantine + shadcn/ui; React Query; Framer Motion.
- Backend: Supabase (Auth/DB/Storage) with Next.js API routes (Cloudinary upload, PandaTV notice fetch, live status sync/update) and server actions wrappers.
- Data layer: Repository pattern with mock vs Supabase providers; 일부 화면/훅은 Supabase를 직접 호출.
- Ops/scripts: `scripts/` for DB seed/migrations/admin ops; `python-live-scraper/` for PandaTV live status sync.
- Env: `NEXT_PUBLIC_USE_MOCK_DATA` toggles mock mode; missing/invalid Supabase env vars force mock.
