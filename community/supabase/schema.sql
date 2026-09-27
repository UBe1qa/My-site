-- ============================================================
-- 마당 커뮤니티 데이터베이스 (Supabase)
-- 게시판 · 회원 · 글 · 댓글 · 추천 · 신고 + 보안 규칙 + 사진 저장소
-- 2026-09-27 Supabase 프로젝트 community(서울)에 migration "community_core"로 적용됨.
-- 새 프로젝트에 다시 만들 때는 SQL Editor에 이 파일 전체를 붙여 넣고 실행.
-- ============================================================

-- 닉네임 규칙: 2~12자, 한글·영문·숫자·밑줄만, 운영자 사칭 단어 금지
create or replace function public.valid_nickname(p text)
returns boolean language sql immutable set search_path = ''
as $$
  select p is not null
     and p ~ '^[가-힣a-zA-Z0-9_]{2,12}$'
     and p !~* '(운영자|관리자|운영진|admin|어드민)'
$$;

-- 사진 경로 규칙: "글쓴이id/파일이름.확장자" 모양만 허용
create or replace function public.valid_image_paths(p_images text[], p_author uuid)
returns boolean language sql immutable set search_path = ''
as $$
  select coalesce(bool_and(i ~ ('^' || p_author::text || '/[A-Za-z0-9_-]{1,80}\.(jpg|jpeg|png|webp|gif)$')), true)
  from unnest(p_images) as i
$$;

-- 1) 게시판
create table public.boards (
  slug text primary key,
  name text not null,
  description text not null default '',
  sort int not null default 0
);
insert into public.boards (slug, name, description, sort) values
  ('free',  '자유', '아무 이야기나 편하게', 1),
  ('qna',   '질문', '궁금한 걸 묻고 답해요', 2),
  ('photo', '사진', '찍은 사진을 나눠요', 3);

-- 2) 회원 프로필 (닉네임)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (public.valid_nickname(nickname)),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index profiles_nickname_lower_key on public.profiles (lower(nickname));

-- 3) 글
create table public.posts (
  id bigint generated always as identity primary key,
  board_slug text not null references public.boards(slug) on update cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  content text not null default '',
  images text[] not null default '{}',
  is_notice boolean not null default false,
  view_count integer not null default 0,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint posts_content_len check (char_length(content) <= 10000 and (char_length(btrim(content)) >= 1 or cardinality(images) >= 1)),
  constraint posts_images_max check (cardinality(images) <= 5),
  constraint posts_images_paths check (public.valid_image_paths(images, author_id))
);
create index posts_board_created_idx on public.posts (board_slug, created_at desc);
create index posts_created_idx on public.posts (created_at desc);
create index posts_author_idx on public.posts (author_id);

-- 4) 댓글
create table public.comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index comments_post_idx on public.comments (post_id, created_at);
create index comments_author_idx on public.comments (author_id);

-- 5) 추천 (한 사람이 한 글에 한 번)
create table public.post_likes (
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_likes_user_idx on public.post_likes (user_id);

-- 6) 신고
create table public.reports (
  id bigint generated always as identity primary key,
  post_id bigint references public.posts(id) on delete cascade,
  comment_id bigint references public.comments(id) on delete cascade,
  reporter_id uuid default auth.uid() references public.profiles(id) on delete set null,
  reason text not null check (char_length(btrim(reason)) between 1 and 300),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  constraint reports_target check (post_id is not null or comment_id is not null),
  constraint reports_once unique nulls not distinct (reporter_id, post_id, comment_id)
);
create index reports_post_idx on public.reports (post_id);
create index reports_comment_idx on public.reports (comment_id);

-- ------------------------------------------------------------
-- 자동으로 움직이는 부분 (트리거)
-- ------------------------------------------------------------

-- 가입하면 프로필(닉네임) 자동 생성
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  nick text := btrim(coalesce(new.raw_user_meta_data ->> 'nickname', ''));
  fallback text := '회원' || substr(replace(new.id::text, '-', ''), 1, 8);
begin
  if not public.valid_nickname(nick)
     or exists (select 1 from public.profiles where lower(nickname) = lower(nick)) then
    nick := fallback;
  end if;
  begin
    insert into public.profiles (id, nickname) values (new.id, nick);
  exception when unique_violation then
    insert into public.profiles (id, nickname) values (new.id, fallback);
  end;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 글·댓글을 고치면 '수정됨' 시간 기록 (조회수·추천수 변화는 제외)
create or replace function public.touch_post_updated_at() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if (new.title, new.content, new.images, new.board_slug)
     is distinct from (old.title, old.content, old.images, old.board_slug) then
    new.updated_at := now();
  end if;
  return new;
end $$;
create trigger posts_touch_updated_at before update on public.posts
  for each row execute function public.touch_post_updated_at();

create or replace function public.touch_comment_updated_at() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.content is distinct from old.content then
    new.updated_at := now();
  end if;
  return new;
end $$;
create trigger comments_touch_updated_at before update on public.comments
  for each row execute function public.touch_comment_updated_at();

-- 댓글 수·추천 수 자동 계산
create or replace function public.sync_comment_count() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;
create trigger comments_sync_count after insert or delete on public.comments
  for each row execute function public.sync_comment_count();

create or replace function public.sync_like_count() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;
create trigger post_likes_sync_count after insert or delete on public.post_likes
  for each row execute function public.sync_like_count();

-- 도배 방지: 글 1분에 3개, 댓글 1분에 10개, 신고 1시간에 20개
create or replace function public.limit_post_rate() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.posts
      where author_id = new.author_id and created_at > now() - interval '1 minute') >= 3 then
    raise exception '글은 1분에 3개까지 올릴 수 있어요. 잠시 후 다시 해 주세요.';
  end if;
  return new;
end $$;
create trigger posts_rate_limit before insert on public.posts
  for each row execute function public.limit_post_rate();

create or replace function public.limit_comment_rate() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.comments
      where author_id = new.author_id and created_at > now() - interval '1 minute') >= 10 then
    raise exception '댓글은 1분에 10개까지 달 수 있어요. 잠시 후 다시 해 주세요.';
  end if;
  return new;
end $$;
create trigger comments_rate_limit before insert on public.comments
  for each row execute function public.limit_comment_rate();

create or replace function public.limit_report_rate() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.reports
      where reporter_id = new.reporter_id and created_at > now() - interval '1 hour') >= 20 then
    raise exception '신고는 1시간에 20번까지 할 수 있어요.';
  end if;
  return new;
end $$;
create trigger reports_rate_limit before insert on public.reports
  for each row execute function public.limit_report_rate();

-- ------------------------------------------------------------
-- 사이트에서 부르는 기능 (RPC)
-- ------------------------------------------------------------

-- 지금 로그인한 사람이 운영자인지
create or replace function public.is_admin() returns boolean
language sql stable set search_path = ''
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = (select auth.uid())), false)
$$;

-- 닉네임을 쓸 수 있는지 (규칙 + 중복)
create or replace function public.nickname_available(p_nickname text) returns boolean
language sql stable set search_path = ''
as $$
  select public.valid_nickname(btrim(p_nickname))
     and not exists (select 1 from public.profiles where lower(nickname) = lower(btrim(p_nickname)))
$$;

-- 조회수 +1
create or replace function public.increment_view(p_post_id bigint) returns void
language sql security definer set search_path = ''
as $$
  update public.posts set view_count = view_count + 1 where id = p_post_id
$$;

-- 공지로 올리기/내리기 (운영자만)
create or replace function public.set_notice(p_post_id bigint, p_value boolean) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception '운영자만 할 수 있어요.';
  end if;
  update public.posts set is_notice = p_value where id = p_post_id;
end $$;

-- 검색 (제목 + 내용)
create or replace function public.search_posts(p_query text, p_board text default null)
returns setof public.posts
language sql stable set search_path = ''
as $$
  select p.* from public.posts p
  where (p_board is null or p.board_slug = p_board)
    and (
      p.title ilike '%' || replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%'
      or p.content ilike '%' || replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    )
  order by p.created_at desc
$$;

-- 회원 탈퇴 (내 글·댓글·추천도 함께 지워짐)
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception '로그인이 필요해요.';
  end if;
  delete from auth.users where id = uid;
end $$;

-- ------------------------------------------------------------
-- 권한: 누가 어떤 칸을 읽고 쓸 수 있는지
-- ------------------------------------------------------------
revoke all on public.boards, public.profiles, public.posts, public.comments, public.post_likes, public.reports
  from anon, authenticated;

grant select on public.boards to anon, authenticated;

grant select on public.profiles to anon, authenticated;
grant update (nickname) on public.profiles to authenticated;

grant select on public.posts to anon, authenticated;
grant insert (board_slug, title, content, images) on public.posts to authenticated;
grant update (board_slug, title, content, images) on public.posts to authenticated;
grant delete on public.posts to authenticated;

grant select on public.comments to anon, authenticated;
grant insert (post_id, content) on public.comments to authenticated;
grant update (content) on public.comments to authenticated;
grant delete on public.comments to authenticated;

grant select on public.post_likes to authenticated;
grant insert (post_id) on public.post_likes to authenticated;
grant delete on public.post_likes to authenticated;

grant select, delete on public.reports to authenticated;
grant insert (post_id, comment_id, reason) on public.reports to authenticated;
grant update (resolved) on public.reports to authenticated;

revoke execute on function
  public.handle_new_user(), public.touch_post_updated_at(), public.touch_comment_updated_at(),
  public.sync_comment_count(), public.sync_like_count(),
  public.limit_post_rate(), public.limit_comment_rate(), public.limit_report_rate(),
  public.delete_my_account(), public.set_notice(bigint, boolean)
  from public, anon, authenticated;
grant execute on function public.delete_my_account(), public.set_notice(bigint, boolean) to authenticated;
grant execute on function
  public.is_admin(), public.nickname_available(text), public.increment_view(bigint),
  public.search_posts(text, text), public.valid_nickname(text), public.valid_image_paths(text[], uuid)
  to anon, authenticated;

-- ------------------------------------------------------------
-- 행 단위 보안 (RLS): 내 것만 고치고 지우기
-- ------------------------------------------------------------
alter table public.boards enable row level security;
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.reports enable row level security;

create policy "게시판은 누구나 보기" on public.boards
  for select to anon, authenticated using (true);

create policy "프로필은 누구나 보기" on public.profiles
  for select to anon, authenticated using (true);
create policy "내 닉네임만 바꾸기" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "글은 누구나 보기" on public.posts
  for select to anon, authenticated using (true);
create policy "글은 내 이름으로만 쓰기" on public.posts
  for insert to authenticated with check (author_id = (select auth.uid()));
create policy "내 글만 고치기" on public.posts
  for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "내 글 또는 운영자만 지우기" on public.posts
  for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()));

create policy "댓글은 누구나 보기" on public.comments
  for select to anon, authenticated using (true);
create policy "댓글은 내 이름으로만 쓰기" on public.comments
  for insert to authenticated with check (author_id = (select auth.uid()));
create policy "내 댓글만 고치기" on public.comments
  for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "내 댓글 또는 운영자만 지우기" on public.comments
  for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()));

create policy "내 추천만 보기" on public.post_likes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "남의 글에만 추천하기" on public.post_likes
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and not exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid()))
  );
create policy "내 추천만 취소하기" on public.post_likes
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "신고는 내 이름으로만" on public.reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy "신고함은 운영자만 보기" on public.reports
  for select to authenticated using ((select public.is_admin()));
create policy "신고 처리는 운영자만" on public.reports
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "신고 지우기는 운영자만" on public.reports
  for delete to authenticated using ((select public.is_admin()));

-- ------------------------------------------------------------
-- 사진 저장소: 누구나 보기, 올리기는 내 폴더에만, 지우기는 내 것 또는 운영자
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 3145728, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

create policy "사진은 내 폴더에만 올리기" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "내 사진 목록 보기" on storage.objects
  for select to authenticated
  using (bucket_id = 'post-images' and (owner_id = (select auth.uid()::text) or (select public.is_admin())));
create policy "내 사진 또는 운영자만 지우기" on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-images' and (owner_id = (select auth.uid()::text) or (select public.is_admin())));
