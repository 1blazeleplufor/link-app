// Identity provider webhook (provider-agnostic: Veriff, Onfido, Persona…).
// Verifies an HMAC-SHA256 signature, then stores only the decision and the provider reference — never documents.
import { admin } from "../_shared/http.ts";

const enc = new TextEncoder();
async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }

// Map provider decisions to LINK statuses. Adapt `decision` field names to the chosen provider.
const MAP: Record<string, "verified" | "failed" | "manual_review"> = {
  approved: "verified", declined: "failed", resubmission_requested: "failed", review: "manual_review", expired: "failed", abandoned: "failed",
};

Deno.serve(async (req) => {
  const secret = Deno.env.get("KYC_WEBHOOK_SECRET");
  const sigHeader = req.headers.get(Deno.env.get("KYC_SIGNATURE_HEADER") ?? "x-hmac-signature") ?? "";
  const raw = await req.text();
  if (!secret || !safeEqual(sigHeader.toLowerCase(), await hmacHex(secret, raw))) return new Response("bad signature", { status: 401 });

  let evt: { sessionId?: string; vendorData?: string; decision?: string; reason?: string; ageOver18?: boolean };
  try { evt = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }
  const profileId = evt.vendorData;                 // we pass the LINK user id as vendor data when starting the session
  const status = evt.decision ? MAP[evt.decision] : undefined;
  if (!profileId || !evt.sessionId || !status) return new Response("ignored", { status: 200 });

  const db = admin();
  const provider = Deno.env.get("KYC_PROVIDER") ?? "kyc";
  const { error } = await db.from("verifications").upsert({
    profile_id: profileId, kind: "identity", provider, provider_ref: evt.sessionId, status,
    failure_reason: status === "failed" ? (evt.reason ?? "declined") : null, decided_at: new Date().toISOString(),
  }, { onConflict: "provider,provider_ref" });
  if (error) return new Response("db error", { status: 500 });

  // Profile flags are protected by a trigger; the service role writes them through this RPC only.
  const { error: e2 } = await db.rpc("set_identity_status", { p_profile: profileId, p_status: status, p_age_verified: status === "verified" && evt.ageOver18 !== false });
  if (e2) return new Response("db error", { status: 500 });
  return new Response("ok", { status: 200 });
});
