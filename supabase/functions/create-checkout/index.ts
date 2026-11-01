// POST { eventId, ticketTypeId, quantity } → { orderId, clientSecret, holdExpiresAt, breakdown }
// Creates a held order and a Stripe PaymentIntent. Refuses unless ticketing is enabled for this event.
import Stripe from "npm:stripe@17.4.0";
import { admin, cors, currentUser, fail, json, ticketingMode } from "../_shared/http.ts";
import { priceOrder, MAX_TICKETS_PER_ORDER } from "../_shared/pricing.ts";

const HOLD_MINUTES = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return fail(req, "method_not_allowed", 405);

  const mode = ticketingMode();
  if (mode === "disabled") return fail(req, "ticketing_disabled", 503);
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return fail(req, "payments_not_configured", 503);
  if (mode === "test" && !stripeKey.startsWith("sk_test_")) return fail(req, "live_key_in_test_mode", 500);

  const user = await currentUser(req);
  if (!user) return fail(req, "not_authenticated", 401);

  let body: { eventId?: string; ticketTypeId?: string; quantity?: number };
  try { body = await req.json(); } catch { return fail(req, "invalid_json"); }
  const qty = Number(body.quantity);
  if (!body.eventId || !body.ticketTypeId || !Number.isInteger(qty) || qty < 1 || qty > MAX_TICKETS_PER_ORDER) return fail(req, "invalid_input");

  const db = admin();
  const { data: ev } = await db.from("events").select("id, status, sale_enabled, ticketing, starts_at, min_age").eq("id", body.eventId).single();
  if (!ev || ev.status !== "published") return fail(req, "event_unavailable", 404);
  if (!ev.sale_enabled || ev.ticketing === "none") return fail(req, "sale_not_authorised", 403);   // displaying ≠ right to sell
  if (new Date(ev.starts_at) < new Date()) return fail(req, "event_started", 409);

  const { data: profile } = await db.from("profiles").select("is_suspended").eq("id", user.id).single();
  if (!profile || profile.is_suspended) return fail(req, "account_restricted", 403);

  const { data: tt } = await db.from("ticket_types").select("id, event_id, price, currency, capacity, sold, sales_start, sales_end").eq("id", body.ticketTypeId).single();
  if (!tt || tt.event_id !== ev.id) return fail(req, "ticket_type_not_found", 404);
  const now = new Date();
  if ((tt.sales_start && new Date(tt.sales_start) > now) || (tt.sales_end && new Date(tt.sales_end) < now)) return fail(req, "not_on_sale", 409);

  // Inventory: count sold + currently held quantities.
  const { data: held } = await db.from("order_items").select("quantity, orders!inner(status, hold_expires_at)")
    .eq("ticket_type_id", tt.id).eq("orders.status", "held").gt("orders.hold_expires_at", now.toISOString());
  const heldQty = (held ?? []).reduce((n: number, r: { quantity: number }) => n + r.quantity, 0);
  if (tt.capacity !== null && tt.sold + heldQty + qty > tt.capacity) return fail(req, "sold_out", 409);

  const unitMinor = Math.round(Number(tt.price) * 100);
  const p = priceOrder({ unitPriceMinor: unitMinor, quantity: qty, linkFeeRate: Number(Deno.env.get("LINK_FEE_RATE") ?? "0") });
  const holdExpiresAt = new Date(now.getTime() + HOLD_MINUTES * 60_000);

  const { data: order, error: oErr } = await db.from("orders").insert({
    buyer_id: user.id, event_id: ev.id, status: "held", currency: tt.currency,
    subtotal: p.subtotalMinor / 100, fees: p.feesMinor / 100, taxes: 0, total: p.totalMinor / 100,
    hold_expires_at: holdExpiresAt.toISOString(), environment: mode,
  }).select("id").single();
  if (oErr || !order) return fail(req, "order_failed", 500);
  await db.from("order_items").insert({ order_id: order.id, ticket_type_id: tt.id, quantity: qty, unit_price: Number(tt.price) });

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });
  const intent = await stripe.paymentIntents.create({
    amount: p.totalMinor, currency: tt.currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    metadata: { order_id: order.id, buyer_id: user.id, event_id: ev.id },
  }, { idempotencyKey: `order-${order.id}` });

  return json(req, { orderId: order.id, clientSecret: intent.client_secret, holdExpiresAt, breakdown: p, mode });
});
