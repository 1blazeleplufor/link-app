// POST { ticketId } → { payload, refreshInSeconds }. Only the ticket holder gets a code; it rotates every 30 s.
import { admin, cors, currentUser, fail, json } from "../_shared/http.ts";
import { makeQrPayload, QR_WINDOW_SECONDS } from "../_shared/ticketQr.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  const user = await currentUser(req);
  if (!user) return fail(req, "not_authenticated", 401);
  const { ticketId } = await req.json().catch(() => ({}));
  if (typeof ticketId !== "string") return fail(req, "invalid_input");
  const { data: tk } = await admin().from("tickets").select("id, holder_id, status").eq("id", ticketId).single();
  if (!tk || tk.holder_id !== user.id) return fail(req, "not_found", 404);
  if (tk.status !== "valid") return json(req, { status: tk.status });
  const secret = Deno.env.get("TICKET_QR_SECRET");
  if (!secret) return fail(req, "qr_not_configured", 503);
  return json(req, { payload: await makeQrPayload(tk.id, secret), refreshInSeconds: QR_WINDOW_SECONDS, status: "valid" });
});
