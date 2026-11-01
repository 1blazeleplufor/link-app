-- LINK — Row Level Security, helper functions and server-side business rules.

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER, fixed search_path)
-- ---------------------------------------------------------------------------
create or replace function public.is_verified(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p where p.id = uid and p.identity_status = 'verified' and not p.is_suspended);
$$;

create or replace function public.has_staff_role(uid uuid, r public.staff_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff_roles s where s.user_id = uid and (s.role = r or s.role = 'admin'));
$$;

create or replace function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

create or replace function public.is_conversation_member(conv uuid, uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from conversation_members where conversation_id = conv and profile_id = uid);
$$;

create or replace function public.is_outing_member(o uuid, uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from outing_members where outing_id = o and profile_id = uid and status = 'joined')
      or exists (select 1 from outings where id = o and creator_id = uid);
$$;

create or replace function public.can_see_profile(viewer uuid, target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select viewer = target or exists (
    select 1 from profiles p
    where p.id = target and not p.is_suspended
      and not public.is_blocked_between(viewer, target)
      and (p.visibility = 'public' or (p.visibility = 'verified_only' and public.is_verified(viewer)))
  );
$$;

create or replace function public.audit(action text, target_table text, target_id text, details jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into audit_logs(actor_id, action, target_table, target_id, details) values (auth.uid(), action, target_table, target_id, details);
$$;

-- updated_at trigger
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger events_touch before update on public.events for each row execute function public.touch_updated_at();

-- Users can never self-assign verification, suspension or age flags.
create or replace function public.protect_profile_flags() returns trigger language plpgsql as $$
begin
  if current_setting('link.trusted', true) is distinct from 'on' then
    new.identity_status := old.identity_status;
    new.age_verified := old.age_verified;
    new.is_suspended := old.is_suspended;
    new.birth_date := old.birth_date;
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles for each row execute function public.protect_profile_flags();

-- ---------------------------------------------------------------------------
-- Public projection of profiles: age instead of birth date, no flags
-- ---------------------------------------------------------------------------
create or replace view public.public_profiles with (security_invoker = false) as
  select p.id, p.first_name, p.bio,
         case when p.show_age then date_part('year', age(p.birth_date))::int end as age,
         p.home_city_id, p.languages, p.interests, p.music_genres, p.outing_styles,
         (p.identity_status = 'verified') as is_verified
  from public.profiles p
  where public.can_see_profile(auth.uid(), p.id);
revoke all on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
do $$ declare r record; begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

-- Reference data: readable by everyone, writable by admins only
create policy cities_read on public.cities for select using (is_active or public.has_staff_role(auth.uid(),'admin'));
create policy cities_admin on public.cities for all using (public.has_staff_role(auth.uid(),'admin')) with check (public.has_staff_role(auth.uid(),'admin'));
create policy countries_read on public.countries for select using (true);
create policy languages_read on public.languages for select using (true);
create policy categories_read on public.categories for select using (true);
create policy sources_read on public.event_sources for select using (true);

-- Profiles: owner reads/writes own row; others go through public_profiles view
create policy profiles_own_select on public.profiles for select using (id = auth.uid() or public.has_staff_role(auth.uid(),'moderator'));
create policy profiles_own_insert on public.profiles for insert with check (id = auth.uid() and identity_status = 'none' and not age_verified and not is_suspended);
create policy profiles_own_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy photos_own on public.profile_photos for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy photos_read on public.profile_photos for select using (moderation_status = 'approved' and public.can_see_profile(auth.uid(), profile_id));

create policy trips_own on public.trips for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy trips_read on public.trips for select using (
  public.can_see_profile(auth.uid(), profile_id)
  and (visibility = 'public' or (visibility = 'verified_only' and public.is_verified(auth.uid()))));

-- Verifications: owner reads own status; writes only by the KYC webhook (service role) or staff
create policy verif_own_read on public.verifications for select using (profile_id = auth.uid() or public.has_staff_role(auth.uid(),'moderator'));

-- Staff & audit
create policy staff_read on public.staff_roles for select using (user_id = auth.uid() or public.has_staff_role(auth.uid(),'admin'));
create policy audit_read on public.audit_logs for select using (public.has_staff_role(auth.uid(),'admin'));

-- Organizers
create policy org_read on public.organizers for select using (status = 'verified' or owner_id = auth.uid() or public.has_staff_role(auth.uid(),'moderator'));
create policy org_apply on public.organizers for insert with check (owner_id = auth.uid() and status = 'pending' and not can_sell_tickets);

-- Events: published are public; organizers/staff manage
create policy events_read on public.events for select using (
  status = 'published' or created_by = auth.uid() or public.has_staff_role(auth.uid(),'moderator')
  or exists (select 1 from organizers o where o.id = organizer_id and o.owner_id = auth.uid()));
create policy events_org_write on public.events for insert with check (
  exists (select 1 from organizers o where o.id = organizer_id and o.owner_id = auth.uid() and o.status = 'verified')
  and status in ('draft','pending_review') and not sale_enabled);
create policy events_staff on public.events for update using (public.has_staff_role(auth.uid(),'moderator')) with check (true);
create policy ticket_types_read on public.ticket_types for select using (exists (select 1 from events e where e.id = event_id and e.status = 'published'));

-- Outings: public+published visible to all signed-in users; private only to members/invitees
create policy outings_read on public.outings for select using (
  creator_id = auth.uid()
  or (kind = 'public' and status = 'published' and not public.is_blocked_between(auth.uid(), creator_id))
  or public.is_outing_member(outings.id, auth.uid())
  or exists (select 1 from invitations i where i.outing_id = outings.id and i.recipient_id = auth.uid() and i.status in ('pending','accepted'))
  or public.has_staff_role(auth.uid(),'moderator'));
create policy outings_create on public.outings for insert with check (
  creator_id = auth.uid() and kind in ('public','private')
  and status = case kind when 'public' then 'pending_review' else 'private' end);
create policy outings_creator_update on public.outings for update using (creator_id = auth.uid()) with check (
  creator_id = auth.uid() and status in ('pending_review','private','cancelled'));
create policy outings_staff on public.outings for update using (public.has_staff_role(auth.uid(),'moderator')) with check (true);

create policy members_read on public.outing_members for select using (
  profile_id = auth.uid() or public.is_outing_member(outing_members.outing_id, auth.uid()));

-- Invitations: read own (sent/received); created only through send_invitation()
create policy inv_read on public.invitations for select using (sender_id = auth.uid() or recipient_id = auth.uid());

-- Blocks & reports
create policy blocks_own on public.blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy reports_create on public.reports for insert with check (reporter_id = auth.uid() and status = 'open');
create policy reports_read on public.reports for select using (reporter_id = auth.uid() or public.has_staff_role(auth.uid(),'moderator'));
create policy sanctions_read on public.sanctions for select using (profile_id = auth.uid() or public.has_staff_role(auth.uid(),'moderator'));

-- Messaging: members only, verified only, not blocked
create policy conv_read on public.conversations for select using (public.is_conversation_member(id, auth.uid()));
create policy conv_members_read on public.conversation_members for select using (public.is_conversation_member(conversation_id, auth.uid()));
create policy conv_members_own_update on public.conversation_members for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy msg_read on public.messages for select using (public.is_conversation_member(conversation_id, auth.uid()) and deleted_at is null);
create policy msg_send on public.messages for insert with check (
  sender_id = auth.uid()
  and public.is_verified(auth.uid())
  and public.is_conversation_member(conversation_id, auth.uid())
  and not exists (
    select 1 from conversation_members cm
    where cm.conversation_id = messages.conversation_id and cm.profile_id <> auth.uid()
      and public.is_blocked_between(auth.uid(), cm.profile_id)
      and (select kind from conversations c where c.id = messages.conversation_id) = 'direct'));

-- Commerce: buyers read their own; all writes by Edge Functions (service role)
create policy orders_read on public.orders for select using (buyer_id = auth.uid() or public.has_staff_role(auth.uid(),'finance'));
create policy order_items_read on public.order_items for select using (exists (select 1 from orders o where o.id = order_id and (o.buyer_id = auth.uid() or public.has_staff_role(auth.uid(),'finance'))));
create policy payments_read on public.payments for select using (exists (select 1 from orders o where o.id = order_id and (o.buyer_id = auth.uid() or public.has_staff_role(auth.uid(),'finance'))));
create policy refunds_read on public.refunds for select using (exists (select 1 from orders o where o.id = order_id and (o.buyer_id = auth.uid() or public.has_staff_role(auth.uid(),'finance'))));
create policy tickets_read on public.tickets for select using (holder_id = auth.uid() or public.has_staff_role(auth.uid(),'support'));

-- Notifications
create policy nprefs_own on public.notification_prefs for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy push_own on public.push_tokens for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy notif_own on public.notifications for select using (profile_id = auth.uid());
create policy notif_mark_read on public.notifications for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Server-side business functions (called via supabase.rpc)
-- ---------------------------------------------------------------------------

-- Invitations: verified sender, verified-or-visible recipient, no block, rate limit 20/day.
create or replace function public.send_invitation(p_recipient uuid, p_event uuid, p_outing uuid, p_note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); new_id uuid; sent_today int;
begin
  if me is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not is_verified(me) then raise exception 'verification_required' using errcode = 'P0001'; end if;
  if p_recipient = me then raise exception 'cannot_invite_self' using errcode = 'P0001'; end if;
  if is_blocked_between(me, p_recipient) or not can_see_profile(me, p_recipient) then
    raise exception 'recipient_unavailable' using errcode = 'P0001'; end if;
  if (p_event is null) = (p_outing is null) then raise exception 'exactly_one_target' using errcode = 'P0001'; end if;
  if p_outing is not null and not exists (select 1 from outings o where o.id = p_outing and (o.creator_id = me or exists (select 1 from outing_members m where m.outing_id = o.id and m.profile_id = me))) then
    raise exception 'not_outing_member' using errcode = 'P0001'; end if;
  select count(*) into sent_today from invitations where sender_id = me and created_at > now() - interval '1 day';
  if sent_today >= 20 then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  insert into invitations(sender_id, recipient_id, event_id, outing_id, note)
    values (me, p_recipient, p_event, p_outing, nullif(trim(p_note), '')) returning id into new_id;
  insert into notifications(profile_id, kind, payload) values (p_recipient, 'invitation', jsonb_build_object('invitation_id', new_id, 'from', me));
  return new_id;
end $$;

-- Respond to an invitation; accepting opens (or reuses) a direct conversation.
create or replace function public.respond_invitation(p_invitation uuid, p_accept boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); inv invitations; conv uuid;
begin
  select * into inv from invitations where id = p_invitation for update;
  if inv.id is null or inv.recipient_id <> me then raise exception 'not_found' using errcode = 'P0002'; end if;
  if inv.status <> 'pending' then raise exception 'not_pending' using errcode = 'P0001'; end if;
  if inv.expires_at < now() then update invitations set status = 'expired' where id = inv.id; raise exception 'expired' using errcode = 'P0001'; end if;
  if not p_accept then
    update invitations set status = 'declined', responded_at = now() where id = inv.id; return null;
  end if;
  if not is_verified(me) then raise exception 'verification_required' using errcode = 'P0001'; end if;
  if is_blocked_between(me, inv.sender_id) then raise exception 'recipient_unavailable' using errcode = 'P0001'; end if;
  update invitations set status = 'accepted', responded_at = now() where id = inv.id;
  if inv.outing_id is not null then
    insert into outing_members(outing_id, profile_id) values (inv.outing_id, me) on conflict do nothing;
  end if;
  select c.id into conv from conversations c
    join conversation_members a on a.conversation_id = c.id and a.profile_id = me
    join conversation_members b on b.conversation_id = c.id and b.profile_id = inv.sender_id
    where c.kind = 'direct' limit 1;
  if conv is null then
    insert into conversations(kind) values ('direct') returning id into conv;
    insert into conversation_members(conversation_id, profile_id) values (conv, me), (conv, inv.sender_id);
  end if;
  insert into notifications(profile_id, kind, payload) values (inv.sender_id, 'invitation_accepted', jsonb_build_object('invitation_id', inv.id));
  return conv;
end $$;

-- Staff moderation of public outings, with audit trail.
create or replace function public.moderate_outing(p_outing uuid, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_staff_role(auth.uid(), 'moderator') then raise exception 'forbidden' using errcode = '42501'; end if;
  update outings set status = case when p_approve then 'published' else 'rejected' end
    where id = p_outing and kind = 'public' and status = 'pending_review';
  if not found then raise exception 'not_pending' using errcode = 'P0001'; end if;
  perform audit(case when p_approve then 'outing.approve' else 'outing.reject' end, 'outings', p_outing::text, jsonb_build_object('reason', p_reason));
end $$;

-- Ticket validation at the door: by staff/organizer scanners; single use; logged.
create or replace function public.validate_ticket(p_token text, p_event uuid)
returns text language plpgsql security definer set search_path = public as $$
declare tk tickets; ev uuid; res text;
begin
  if not (has_staff_role(auth.uid(),'support') or exists (
      select 1 from events e join organizers o on o.id = e.organizer_id where e.id = p_event and o.owner_id = auth.uid())) then
    raise exception 'forbidden' using errcode = '42501'; end if;
  select * into tk from tickets where token_hash = digest(p_token, 'sha256') for update;
  if tk.id is null then res := 'unknown';
  else
    select o.event_id into ev from orders o where o.id = tk.order_id;
    if ev <> p_event then res := 'wrong_event';
    elsif tk.status = 'revoked' then res := 'revoked';
    elsif tk.status = 'scanned' then res := 'already_scanned';
    else update tickets set status = 'scanned', scanned_at = now() where id = tk.id; res := 'ok';
    end if;
  end if;
  insert into ticket_scans(ticket_id, scanner_id, result) values (tk.id, auth.uid(), res);
  return res;
end $$;

-- GDPR: export everything about the caller as JSON.
create or replace function public.export_my_data() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'profile', (select to_jsonb(p) from profiles p where p.id = auth.uid()),
    'trips', (select coalesce(jsonb_agg(t), '[]') from trips t where t.profile_id = auth.uid()),
    'verifications', (select coalesce(jsonb_agg(jsonb_build_object('kind',kind,'status',status,'provider',provider,'decided_at',decided_at)), '[]') from verifications where profile_id = auth.uid()),
    'outings', (select coalesce(jsonb_agg(o), '[]') from outings o where o.creator_id = auth.uid()),
    'invitations', (select coalesce(jsonb_agg(i), '[]') from invitations i where i.sender_id = auth.uid() or i.recipient_id = auth.uid()),
    'messages_sent', (select coalesce(jsonb_agg(jsonb_build_object('conversation_id',conversation_id,'body',body,'created_at',created_at)), '[]') from messages where sender_id = auth.uid()),
    'orders', (select coalesce(jsonb_agg(o), '[]') from orders o where o.buyer_id = auth.uid()),
    'blocks', (select coalesce(jsonb_agg(b), '[]') from blocks b where b.blocker_id = auth.uid()),
    'reports', (select coalesce(jsonb_agg(r), '[]') from reports r where r.reporter_id = auth.uid()),
    'exported_at', now());
$$;

-- Lock down: functions are callable by signed-in users only.
revoke execute on all functions in schema public from public, anon;
grant execute on function public.send_invitation(uuid,uuid,uuid,text), public.respond_invitation(uuid,boolean),
  public.moderate_outing(uuid,boolean,text), public.validate_ticket(text,uuid), public.export_my_data(),
  public.is_verified(uuid), public.has_staff_role(uuid,public.staff_role), public.is_blocked_between(uuid,uuid),
  public.is_conversation_member(uuid,uuid), public.can_see_profile(uuid,uuid), public.is_outing_member(uuid,uuid) to authenticated;
