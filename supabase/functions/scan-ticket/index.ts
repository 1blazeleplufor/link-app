// POST { payload, eventId } → { result } where result ∈ ok | already_scanned | revoked | unknown | wrong_event | expired | bad_signature | malformed
// Used by door staff / organizer scanner app. Signature and expiry are checked here; single use is enforced in SQL.
import { admin, cors, currentUser, fail, json } from "../_shared/http.ts";
import { verifyQrPayload } from "../_shared/ticketQr.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  const user = await currentUser(req);
  if (!user) return fail(req, "not_authenticated", 401);
  const { payload, eventId } = await req.json().catch(() => ({}));
  if (typeof payload !== "string" || typeof eventId !== "string") return fail(req, "invalid_input");
  const secret = Deno.env.get("TICKET_QR_SECRET");
  if (!secret) return fail(req, "qr_not_configured", 503);

  const check = await verifyQrPayload(payload, secret);
  if (!check.ok) return json(req, { result: check.reason });
  const { data, error } = await admin().rpc("validate_ticket_by_id", { p_ticket: check.ticketId, p_event: eventId, p_scanner: user.id });
  if (error) return fail(req, error.code === "42501" ? "forbidden" : "scan_failed", error.code === "42501" ? 403 : 500);
  return json(req, { result: data });
});
