// Stripe webhook: verifies the signature, records each event id once (idempotency),
// fulfils paid orders, applies refunds and flags disputes. Tickets are only issued here, never from the client.
import Stripe from "npm:stripe@17.4.0";
import { admin } from "../_shared/http.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: "2024-11-20.acacia" });
const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!sig || !secret) return new Response("missing signature", { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, secret, undefined, cryptoProvider);
  } catch {
    return new Response("bad signature", { status: 400 });
  }

  const db = admin();
  // Idempotency: a duplicate delivery hits the primary key and is acknowledged without side effects.
  const { error: dupErr } = await db.from("webhook_events").insert({ provider: "stripe", event_id: event.id });
  if (dupErr) return new Response("duplicate", { status: 200 });

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata.order_id;
        if (!orderId) break;
        const { error } = await db.rpc("fulfil_order", {
          p_order: orderId, p_provider: "stripe", p_payment_id: pi.id, p_amount: pi.amount_received / 100, p_currency: pi.currency,
        });
        if (error) throw error;
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        if (pi.metadata.order_id) await db.from("orders").update({ status: "failed" }).eq("id", pi.metadata.order_id).in("status", ["pending", "held"]);
        break;
      }
      case "charge.refunded": {
        const ch = event.data.object as Stripe.Charge;
        const pi = typeof ch.payment_intent === "string" ? await stripe.paymentIntents.retrieve(ch.payment_intent) : ch.payment_intent;
        const orderId = pi?.metadata?.order_id;
        if (orderId) {
          const { error } = await db.rpc("apply_refund", { p_order: orderId, p_amount: ch.amount_refunded / 100, p_provider_refund: ch.refunds?.data?.[0]?.id ?? ch.id });
          if (error) throw error;
        }
        break;
      }
      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const pi = typeof dispute.payment_intent === "string" ? await stripe.paymentIntents.retrieve(dispute.payment_intent) : dispute.payment_intent;
        if (pi?.metadata?.order_id) await db.from("orders").update({ status: "disputed" }).eq("id", pi.metadata.order_id);
        break;
      }
    }
  } catch (e) {
    // Remove the idempotency marker so Stripe's retry can process the event again.
    await db.from("webhook_events").delete().eq("provider", "stripe").eq("event_id", event.id);
    console.error("webhook processing failed", event.type, e);
    return new Response("processing failed", { status: 500 });
  }
  return new Response("ok", { status: 200 });
});
