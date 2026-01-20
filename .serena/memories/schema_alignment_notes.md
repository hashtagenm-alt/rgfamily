# Schema alignment notes (current)

- Signatures: code/types now align with redesigned schema (`sig_number`, `is_group`, `signature_videos`). Legacy fields removed from actions/repos/mocks.
- Types updated: `signature_videos` added; `donations.episode_id` added; episode RPCs (`get_episode_rankings`, `is_vip_for_episode`, `is_vip_for_rank_battles`) added to types.
- Remaining gaps: `increment_view_count` RPC not found in migrations (repo has fallback); `get_user_rank_active_season` exists in older schema snapshots but not in `20260119_complete_schema.sql`.
- Schema snapshots (`20260117_full_schema.sql`, `20260119_complete_schema.sql`) do not fully reflect later migrations (e.g., episodes). Consider regenerating a single source-of-truth schema doc.
