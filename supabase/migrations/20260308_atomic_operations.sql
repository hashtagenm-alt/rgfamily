-- ============================================================
-- C-1 FIX: Atomic counter increments (Race Condition 방지)
-- ============================================================

-- 조회수 원자적 증가 (posts)
create or replace function public.increment_post_view_count(p_post_id integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_post_id is null then return; end if;
  update public.posts
  set view_count = coalesce(view_count, 0) + 1
  where id = p_post_id;
end;
$$;

-- 좋아요 수 원자적 증감 (posts)
create or replace function public.increment_post_like_count(p_post_id integer, p_delta integer default 1)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  if p_post_id is null then return 0; end if;
  update public.posts
  set like_count = greatest(coalesce(like_count, 0) + p_delta, 0)
  where id = p_post_id
  returning like_count into new_count;
  return coalesce(new_count, 0);
end;
$$;

-- 조회수 원자적 증가 (notices)
create or replace function public.increment_notice_view_count(p_notice_id integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_notice_id is null then return; end if;
  update public.notices
  set view_count = coalesce(view_count, 0) + 1
  where id = p_notice_id;
end;
$$;

grant execute on function public.increment_post_view_count(integer) to anon, authenticated;
grant execute on function public.increment_post_like_count(integer, integer) to anon, authenticated;
grant execute on function public.increment_notice_view_count(integer) to anon, authenticated;

-- ============================================================
-- C-2 FIX: Atomic bulk replace rankings (트랜잭션 보장)
-- ============================================================

-- 시즌 랭킹 원자적 교체
create or replace function public.atomic_replace_season_rankings(
  p_season_id integer,
  p_rankings jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  -- 단일 트랜잭션 내에서 DELETE + INSERT
  delete from public.season_donation_rankings
  where season_id = p_season_id;

  insert into public.season_donation_rankings (season_id, rank, donor_name, total_amount, donation_count)
  select
    p_season_id,
    (item->>'rank')::integer,
    item->>'donor_name',
    (item->>'total_amount')::bigint,
    coalesce((item->>'donation_count')::integer, 0)
  from jsonb_array_elements(p_rankings) as item;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

-- 종합 랭킹 원자적 교체
create or replace function public.atomic_replace_total_rankings(
  p_rankings jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  -- 단일 트랜잭션 내에서 DELETE + INSERT
  delete from public.total_donation_rankings;

  insert into public.total_donation_rankings (rank, donor_name, total_amount, is_permanent_vip)
  select
    (item->>'rank')::integer,
    item->>'donor_name',
    (item->>'total_amount')::bigint,
    coalesce((item->>'is_permanent_vip')::boolean, false)
  from jsonb_array_elements(p_rankings) as item;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

grant execute on function public.atomic_replace_season_rankings(integer, jsonb) to authenticated;
grant execute on function public.atomic_replace_total_rankings(jsonb) to authenticated;

-- ============================================================
-- C-5 FIX: Atomic set active season (비원자성 방지)
-- ============================================================

create or replace function public.set_active_season(p_season_id integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 단일 트랜잭션: 모든 시즌 비활성화 + 대상 시즌 활성화
  update public.seasons set is_active = false where is_active = true;
  update public.seasons set is_active = true where id = p_season_id;

  -- 대상 시즌이 존재하는지 확인
  if not found then
    raise exception '시즌 ID %를 찾을 수 없습니다.', p_season_id;
  end if;
end;
$$;

grant execute on function public.set_active_season(integer) to authenticated;
