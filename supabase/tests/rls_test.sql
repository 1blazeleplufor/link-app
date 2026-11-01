-- LINK — security tests. Each check raises an exception on failure; the runner stops at the first one.
-- Users: A (verified), B (verified), C (not verified), M (moderator), X (outsider).
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', coalesce(u::text,''), false); end $$;
create or replace function pg_temp.check(cond boolean, label text) returns void language plpgsql as $$
begin if not coalesce(cond,false) then raise exception 'FAIL: %', label; end if; raise notice 'ok  %', label; end $$;

-- fixtures (as superuser, trusted)
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-00000000000a','a@test'),('00000000-0000-0000-0000-00000000000b','b@test'),
 ('00000000-0000-0000-0000-00000000000c','c@test'),('00000000-0000-0000-0000-00000000000d','m@test'),
 ('00000000-0000-0000-0000-00000000000e','x@test');
insert into profiles(id, first_name, birth_date, home_city_id, identity_status) values
 ('00000000-0000-0000-0000-00000000000a','Ana','1995-04-02','paris','verified'),
 ('00000000-0000-0000-0000-00000000000b','Ben','1990-01-10','paris','verified'),
 ('00000000-0000-0000-0000-00000000000c','Cleo','1998-06-20','paris','none'),
 ('00000000-0000-0000-0000-00000000000d','Mod','1985-03-03','paris','verified'),
 ('00000000-0000-0000-0000-00000000000e','Xav','1993-09-09','london','verified');
insert into staff_roles(user_id, role) values ('00000000-0000-0000-0000-00000000000d','moderator');
insert into events(id, source_id, city_id, category_id, title, starts_at, status) values
 ('10000000-0000-0000-0000-000000000001','link','paris','concerts','Published show', now()+interval '3 days','published'),
 ('10000000-0000-0000-0000-000000000002','link','paris','concerts','Draft show', now()+interval '3 days','draft');

-- Underage profile is impossible
do $$ begin
  begin
    insert into auth.users(id) values ('00000000-0000-0000-0000-0000000000ff');
    insert into profiles(id, first_name, birth_date) values ('00000000-0000-0000-0000-0000000000ff','Kid', current_date - interval '16 years');
    raise exception 'FAIL: minor profile accepted';
  exception when check_violation then raise notice 'ok  minors are rejected by constraint';
  end;
end $$;

set role authenticated;

-- Events: only published visible
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.check((select count(*) from events) = 1, 'unverified user sees only published events');

-- Profiles: cannot read others' raw rows (birth date), can read public view without birth date
select pg_temp.check((select count(*) from profiles) = 1, 'user reads only own raw profile row');
select pg_temp.check((select count(*) from public_profiles) >= 4, 'public_profiles lists visible members');
select pg_temp.check(not exists (select 1 from information_schema.columns where table_name='public_profiles' and column_name='birth_date'), 'public view never exposes birth_date');

-- Self-verification is impossible
update profiles set identity_status = 'verified' where id = '00000000-0000-0000-0000-00000000000c';
select pg_temp.check((select identity_status from profiles where id='00000000-0000-0000-0000-00000000000c') = 'none', 'user cannot self-verify');

-- Unverified user cannot invite
do $$ begin
  perform send_invitation('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', null, 'hi');
  raise exception 'FAIL: unverified invitation accepted';
exception when sqlstate 'P0001' then
  if sqlerrm <> 'verification_required' then raise; end if; raise notice 'ok  unverified user cannot invite';
end $$;

-- Direct inserts into invitations are blocked (no insert policy)
do $$ begin
  insert into invitations(sender_id, recipient_id, event_id) values ('00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-000000000001');
  raise exception 'FAIL: direct invitation insert allowed';
exception when insufficient_privilege then raise notice 'ok  direct invitation insert is refused by RLS';
end $$;

-- Verified A invites B; B accepts; conversation opens
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
create temp table t_ids(k text primary key, v uuid);
grant all on t_ids to authenticated;
insert into t_ids select 'inv', send_invitation('00000000-0000-0000-0000-00000000000b','10000000-0000-0000-0000-000000000001',null,'Concert?');
select pg_temp.check((select count(*) from invitations) = 1, 'sender sees own invitation');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.check((select count(*) from invitations) = 0, 'third party cannot see invitation');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into t_ids select 'conv', respond_invitation((select v from t_ids where k='inv'), true);
select pg_temp.check((select status from invitations) = 'accepted', 'recipient accepts invitation');
insert into messages(conversation_id, sender_id, body) values ((select v from t_ids where k='conv'), '00000000-0000-0000-0000-00000000000b', 'Yes!');
select pg_temp.check((select count(*) from messages) = 1, 'verified member can send message');

-- Outsider cannot read or post in the conversation
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
select pg_temp.check((select count(*) from messages) = 0, 'non-member cannot read messages');
do $$ begin
  insert into messages(conversation_id, sender_id, body) values ((select v from t_ids where k='conv'), '00000000-0000-0000-0000-00000000000e', 'intrusion');
  raise exception 'FAIL: non-member posted';
exception when insufficient_privilege then raise notice 'ok  non-member cannot post';
end $$;

-- Blocking: B blocks A, then A can no longer message B nor invite B
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into blocks(blocker_id, blocked_id) values ('00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000a');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  insert into messages(conversation_id, sender_id, body) values ((select v from t_ids where k='conv'), '00000000-0000-0000-0000-00000000000a', 'still there?');
  raise exception 'FAIL: blocked user could message';
exception when insufficient_privilege then raise notice 'ok  blocked user cannot message';
end $$;
do $$ begin
  perform send_invitation('00000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000001', null, null);
  raise exception 'FAIL: blocked user could invite';
exception when sqlstate 'P0001' then raise notice 'ok  blocked user cannot invite (%)', sqlerrm;
end $$;
select pg_temp.check((select count(*) from public_profiles where id='00000000-0000-0000-0000-00000000000b') = 0, 'blocked profiles disappear from discovery');

-- Outings: public goes to moderation; private stays private
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into outings(creator_id, kind, title, city_id, category_id, starts_at, status) values
 ('00000000-0000-0000-0000-00000000000c','public','Picnic by the canal','paris','food', now()+interval '2 days','pending_review'),
 ('00000000-0000-0000-0000-00000000000c','private','Secret dinner','paris','food', now()+interval '2 days','private');
do $$ begin
  insert into outings(creator_id, kind, title, city_id, category_id, starts_at, status) values
   ('00000000-0000-0000-0000-00000000000c','public','Skip moderation','paris','food', now()+interval '2 days','published');
  raise exception 'FAIL: user self-published';
exception when insufficient_privilege then raise notice 'ok  public outing cannot skip moderation';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
select pg_temp.check((select count(*) from outings) = 0, 'others see neither pending nor private outings');
do $$ begin
  perform moderate_outing((select id from outings limit 1), true);
  raise exception 'FAIL: non-moderator moderated';
exception when insufficient_privilege then raise notice 'ok  only moderators moderate';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select moderate_outing((select id from outings where kind='public'), true, 'fine');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
select pg_temp.check((select count(*) from outings) = 1, 'approved public outing becomes visible, private does not');

-- Tickets: issue one as service role, validate twice
reset role;
insert into ticket_types(id, event_id, name, price, currency) values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Standard',20,'EUR');
insert into orders(id, buyer_id, event_id, status, currency, subtotal, total) values ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-000000000001','paid','EUR',20,20);
insert into tickets(order_id, ticket_type_id, holder_id, token_hash) values ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a', digest('tok-123','sha256'));
insert into staff_roles(user_id, role) values ('00000000-0000-0000-0000-00000000000d','support');
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select count(*) from tickets) = 0, 'users cannot see others'' tickets');
select pg_temp.check((select count(*) from orders) = 0, 'users cannot see others'' orders');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select pg_temp.check(validate_ticket('tok-123','10000000-0000-0000-0000-000000000001') = 'ok', 'first scan is accepted');
select pg_temp.check(validate_ticket('tok-123','10000000-0000-0000-0000-000000000001') = 'already_scanned', 'second scan is refused');
select pg_temp.check(validate_ticket('forged','10000000-0000-0000-0000-000000000001') = 'unknown', 'forged token is unknown');
select pg_temp.check(validate_ticket('tok-123','10000000-0000-0000-0000-000000000002') = 'wrong_event', 'ticket for another event is refused');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  perform validate_ticket('tok-123','10000000-0000-0000-0000-000000000001');
  raise exception 'FAIL: random user scanned';
exception when insufficient_privilege then raise notice 'ok  random users cannot scan tickets';
end $$;

-- Data export returns the caller's own data only
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.check((export_my_data()->'profile'->>'first_name') = 'Ana', 'export returns own profile');

-- Anonymous visitors
reset role; set role anon; select pg_temp.as_user(null);
do $$ begin
  perform 1 from public_profiles;
  raise exception 'FAIL: anon read profiles';
exception when insufficient_privilege then raise notice 'ok  anonymous visitors cannot list profiles';
end $$;
reset role;
\echo ALL SECURITY TESTS PASSED
