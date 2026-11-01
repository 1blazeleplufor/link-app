-- LINK — ticketing helpers used by Edge Functions (service role) after a verified payment.

-- Validate by ticket id (the rotating QR is verified by the scan-ticket Edge Function first).
create or replace function public.validate_ticket_by_id(p_ticket uuid, p_event uuid, p_scanner uuid)
returns text language plpgsql security definer set search_path = public as $$
declare tk tickets; ev uuid; res text;
begin
  if not (has_staff_role(p_scanner,'support') or exists (
      select 1 from events e join organizers o on o.id = e.organizer_id where e.id = p_event and o.owner_id = p_scanner)) then
    raise exception 'forbidden' using errcode = '42501'; end if;
  select * into tk from tickets where id = p_ticket for update;
  if tk.id is null then res := 'unknown';
  else
    select o.event_id into ev from orders o where o.id = tk.order_id;
    if ev <> p_event then res := 'wrong_event';
    elsif tk.status = 'revoked' then res := 'revoked';
    elsif tk.status = 'scanned' then res := 'already_scanned';
    else update tickets set status = 'scanned', scanned_at = now() where id = tk.id; res := 'ok';
    end if;
  end if;
  insert into ticket_scans(ticket_id, scanner_id, result) values (tk.id, p_scanner, res);
  return res;
end $$;

-- Called once per successful payment (idempotent per order): marks order paid, decrements stock, issues tickets.
create or replace function public.fulfil_order(p_order uuid, p_provider text, p_payment_id text, p_amount numeric, p_currency text)
returns int language plpgsql security definer set search_path = public as $$
declare o orders; it record; n int := 0; i int;
begin
  select * into o from orders where id = p_order for update;
  if o.id is null then raise exception 'order_not_found'; end if;
  if o.status = 'paid' then return 0; end if;                      -- duplicate webhook: nothing to do
  if o.status not in ('pending','held') then raise exception 'order_not_payable: %', o.status; end if;
  if p_amount <> o.total or upper(p_currency) <> o.currency then raise exception 'amount_mismatch'; end if;
  insert into payments(order_id, provider, provider_payment_id, status, amount, currency)
    values (o.id, p_provider, p_payment_id, 'succeeded', p_amount, upper(p_currency))
    on conflict (provider, provider_payment_id) do nothing;
  for it in select * from order_items where order_id = o.id loop
    update ticket_types set sold = sold + it.quantity where id = it.ticket_type_id;   -- capacity check constraint enforces stock
    for i in 1..it.quantity loop
      insert into tickets(order_id, ticket_type_id, holder_id, token_hash)
        values (o.id, it.ticket_type_id, o.buyer_id, digest(gen_random_uuid()::text || clock_timestamp()::text, 'sha256'));
      n := n + 1;
    end loop;
  end loop;
  update orders set status = 'paid' where id = o.id;
  insert into notifications(profile_id, kind, payload) values (o.buyer_id, 'tickets_issued', jsonb_build_object('order_id', o.id, 'count', n));
  return n;
end $$;

-- Refund confirmed by the provider: revoke the tickets so their QR codes stop working.
create or replace function public.apply_refund(p_order uuid, p_amount numeric, p_provider_refund text)
returns void language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  select * into o from orders where id = p_order for update;
  if o.id is null then raise exception 'order_not_found'; end if;
  insert into refunds(order_id, provider_refund_id, amount, status) values (o.id, p_provider_refund, p_amount, 'succeeded');
  if p_amount >= o.total then
    update orders set status = 'refunded' where id = o.id;
    update tickets set status = 'revoked' where order_id = o.id and status = 'valid';
  else
    update orders set status = 'partially_refunded' where id = o.id;
  end if;
  insert into notifications(profile_id, kind, payload) values (o.buyer_id, 'refund', jsonb_build_object('order_id', o.id, 'amount', p_amount));
end $$;

-- Expire unpaid holds (run every minute with pg_cron or a scheduled Edge Function).
create or replace function public.expire_holds() returns int language sql security definer set search_path = public as $$
  with x as (update orders set status = 'cancelled' where status = 'held' and hold_expires_at < now() returning 1)
  select count(*)::int from x;
$$;

revoke execute on function public.validate_ticket_by_id(uuid,uuid,uuid), public.fulfil_order(uuid,text,text,numeric,text),
  public.apply_refund(uuid,numeric,text), public.expire_holds() from public, anon, authenticated;
grant execute on function public.validate_ticket_by_id(uuid,uuid,uuid), public.fulfil_order(uuid,text,text,numeric,text),
  public.apply_refund(uuid,numeric,text), public.expire_holds() to service_role;

-- Identity decision from the KYC webhook (service role only). The only path that can mark someone verified.
create or replace function public.set_identity_status(p_profile uuid, p_status public.verification_status, p_age_verified boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('link.trusted', 'on', true);
  update profiles set identity_status = p_status, age_verified = (age_verified or p_age_verified) where id = p_profile;
  perform set_config('link.trusted', 'off', true);
  insert into audit_logs(actor_id, action, target_table, target_id, details)
    values (null, 'identity.' || p_status, 'profiles', p_profile::text, jsonb_build_object('age_verified', p_age_verified));
end $$;
revoke execute on function public.set_identity_status(uuid, public.verification_status, boolean) from public, anon, authenticated;
grant execute on function public.set_identity_status(uuid, public.verification_status, boolean) to service_role;
