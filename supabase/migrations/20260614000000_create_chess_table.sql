-- Fresh-start Phase 1 persistence for the chess app.
--
-- This migration intentionally keeps all game data in one table, public.chess.
-- JSONB is used for moves, agent analysis, metadata, and heuristic config so
-- Phase 1 can evolve without table churn as new heuristics/statistics are added.

create extension if not exists pgcrypto;

drop table if exists public.chess cascade;

create table public.chess (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'active',
  result text,
  result_reason text,
  player_color text,
  agent_version text not null default 'minimax-v1',
  engine_version text not null default 'v1',
  heuristic_schema_version text not null default 'v1',
  heuristic_config jsonb not null,
  search_depth int,
  move_count int not null default 0,
  duration_seconds int,
  initial_fen text not null default 'startpos',
  final_fen text,
  final_eval numeric,
  moves jsonb not null default '[]'::jsonb,
  agent_analysis jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  constraint chess_status_check
    check (status in ('active', 'completed', 'abandoned')),
  constraint chess_result_check
    check (result in ('human_win', 'agent_win', 'draw') or result is null),
  constraint chess_player_color_check
    check (player_color in ('white', 'black') or player_color is null),
  constraint chess_search_depth_check
    check (search_depth is null or search_depth >= 1),
  constraint chess_move_count_check
    check (move_count >= 0),
  constraint chess_duration_seconds_check
    check (duration_seconds is null or duration_seconds >= 0),
  constraint chess_heuristic_config_object_check
    check (jsonb_typeof(heuristic_config) = 'object'),
  constraint chess_moves_array_check
    check (jsonb_typeof(moves) = 'array'),
  constraint chess_agent_analysis_array_check
    check (jsonb_typeof(agent_analysis) = 'array'),
  constraint chess_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),
  constraint chess_completed_state_check
    check (
      (
        status = 'active'
        and completed_at is null
        and result is null
      )
      or (
        status = 'completed'
        and completed_at is not null
        and result is not null
      )
      or (
        status = 'abandoned'
        and completed_at is not null
      )
    )
);

create index chess_created_at_idx on public.chess(created_at);
create index chess_updated_at_idx on public.chess(updated_at);
create index chess_status_idx on public.chess(status);
create index chess_result_idx on public.chess(result);
create index chess_completed_at_idx on public.chess(completed_at);
create index chess_completed_status_idx
  on public.chess(completed_at desc)
  where status in ('completed', 'abandoned');

alter table public.chess enable row level security;

-- Direct client writes are intentionally not exposed. Browser clients use RPCs.
-- Completed/abandoned rows may be read for simple dashboards.
create policy "Allow public completed chess reads"
on public.chess
for select
to public
using (status in ('completed', 'abandoned'));

revoke all on table public.chess from anon, authenticated;
grant select on table public.chess to anon, authenticated;

create or replace function public.set_chess_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_chess_updated_at
before update on public.chess
for each row
execute function public.set_chess_updated_at();

create or replace function public.chess_jsonb_object(
  value jsonb,
  fallback jsonb default '{}'::jsonb
)
returns jsonb
language sql
immutable
as $$
  select case
    when value is not null and jsonb_typeof(value) = 'object' then value
    else fallback
  end;
$$;

create or replace function public.chess_jsonb_array(
  value jsonb,
  fallback jsonb default '[]'::jsonb
)
returns jsonb
language sql
immutable
as $$
  select case
    when value is not null and jsonb_typeof(value) = 'array' then value
    else fallback
  end;
$$;

create or replace function public.create_chess_session(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid := coalesce(nullif(payload->>'id', '')::uuid, gen_random_uuid());
begin
  insert into public.chess (
    id,
    player_color,
    agent_version,
    engine_version,
    heuristic_schema_version,
    heuristic_config,
    search_depth,
    initial_fen,
    metadata
  )
  values (
    new_id,
    nullif(payload->>'player_color', ''),
    coalesce(nullif(payload->>'agent_version', ''), 'minimax-v1'),
    coalesce(nullif(payload->>'engine_version', ''), 'v1'),
    coalesce(nullif(payload->>'heuristic_schema_version', ''), 'v1'),
    public.chess_jsonb_object(payload->'heuristic_config'),
    nullif(payload->>'search_depth', '')::int,
    coalesce(nullif(payload->>'initial_fen', ''), 'startpos'),
    public.chess_jsonb_object(payload->'metadata')
  );

  return new_id;
end;
$$;

create or replace function public.append_chess_move(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chess
  set
    moves = moves || jsonb_build_array(public.chess_jsonb_object(payload->'move_data')),
    move_count = move_count + 1
  where id = (payload->>'session_id')::uuid
    and status = 'active';
end;
$$;

create or replace function public.append_agent_analysis(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chess
  set agent_analysis =
    agent_analysis || jsonb_build_array(public.chess_jsonb_object(payload->'analysis_data'))
  where id = (payload->>'session_id')::uuid
    and status = 'active';
end;
$$;

create or replace function public.complete_chess_session(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chess
  set
    completed_at = now(),
    status = 'completed',
    result = payload->>'session_result',
    result_reason = payload->>'session_result_reason',
    move_count = greatest(move_count, (payload->>'session_move_count')::int),
    duration_seconds = nullif(payload->>'session_duration_seconds', '')::int,
    final_fen = payload->>'session_final_fen',
    final_eval = nullif(payload->>'session_final_eval', '')::numeric
  where id = (payload->>'session_id')::uuid
    and status = 'active'
    and payload->>'session_result' in ('human_win', 'agent_win', 'draw');
end;
$$;

create or replace function public.abandon_chess_session(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chess
  set
    completed_at = now(),
    status = 'abandoned'
  where id = (payload->>'session_id')::uuid
    and status = 'active';
end;
$$;

create or replace function public.get_chess_stats(range_text text)
returns table (
  total_games bigint,
  agent_wins bigint,
  human_wins bigint,
  draws bigint,
  abandoned_games bigint,
  average_move_count numeric,
  average_duration numeric,
  average_final_eval numeric
)
language sql
security definer
set search_path = public
as $$
  with bounds as (
    select case range_text
      when 'today' then date_trunc('day', now())
      when '7d' then now() - interval '7 days'
      when '30d' then now() - interval '30 days'
      when '365d' then now() - interval '365 days'
      else now() - interval '30 days'
    end as start_at
  ),
  scoped as (
    select c.*
    from public.chess c, bounds b
    where c.created_at >= b.start_at
      and c.status in ('completed', 'abandoned')
  )
  select
    count(*) as total_games,
    count(*) filter (where result = 'agent_win') as agent_wins,
    count(*) filter (where result = 'human_win') as human_wins,
    count(*) filter (where result = 'draw') as draws,
    count(*) filter (where status = 'abandoned') as abandoned_games,
    coalesce(avg(move_count), 0) as average_move_count,
    avg(duration_seconds) as average_duration,
    avg(final_eval) as average_final_eval
  from scoped;
$$;

create or replace function public.get_recent_chess_sessions(session_limit int default 10)
returns table (
  id uuid,
  created_at timestamptz,
  completed_at timestamptz,
  status text,
  result text,
  result_reason text,
  agent_version text,
  engine_version text,
  heuristic_schema_version text,
  heuristic_config jsonb,
  search_depth int,
  move_count int,
  duration_seconds int,
  final_fen text,
  final_eval numeric
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.created_at,
    c.completed_at,
    c.status,
    c.result,
    c.result_reason,
    c.agent_version,
    c.engine_version,
    c.heuristic_schema_version,
    c.heuristic_config,
    c.search_depth,
    c.move_count,
    c.duration_seconds,
    c.final_fen,
    c.final_eval
  from public.chess c
  where c.status in ('completed', 'abandoned')
  order by c.completed_at desc nulls last, c.created_at desc
  limit greatest(1, least(coalesce(session_limit, 10), 100));
$$;

grant execute on function public.create_chess_session(jsonb) to anon, authenticated;
grant execute on function public.append_chess_move(jsonb) to anon, authenticated;
grant execute on function public.append_agent_analysis(jsonb) to anon, authenticated;
grant execute on function public.complete_chess_session(jsonb) to anon, authenticated;
grant execute on function public.abandon_chess_session(jsonb) to anon, authenticated;
grant execute on function public.get_chess_stats(text) to anon, authenticated;
grant execute on function public.get_recent_chess_sessions(int) to anon, authenticated;

notify pgrst, 'reload schema';
