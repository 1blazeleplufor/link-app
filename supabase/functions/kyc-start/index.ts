// POST {} → { url } : opens a hosted identity-verification session for the signed-in user.
// Written against Veriff's session API (recommended in the Phase 0 brief); swap the adapter for another provider.
// Not exercised against the real provider yet: needs a provider contract and API keys.
import { admin, cors, currentUser, fail, json } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  const user = await currentUser(req);
  if (!user) return fail(req, "not_authenticated", 401);
  const apiKey = Deno.env.get("KYC_API_KEY"); const base = Deno.env.get("KYC_API_URL") ?? "https://stationapi.veriff.com";
  if (!apiKey) return fail(req, "kyc_not_configured", 503);

  const db = admin();
  const { data: profile } = await db.from("profiles").select("first_name, identity_status, is_suspended").eq("id", user.id).single();
  if (!profile || profile.is_suspended) return fail(req, "account_restricted", 403);
  if (profile.identity_status === "verified") return fail(req, "already_verified", 409);

  // Throttle: at most 3 attempts per 24 h.
  const since = new Date(Date.now() - 864e5).toISOString();
  const { count } = await db.from("verifications").select("id", { count: "exact", head: true }).eq("profile_id", user.id).gte("created_at", since);
  if ((count ?? 0) >= 3) return fail(req, "too_many_attempts", 429);

  const res = await fetch(`${base}/v1/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-AUTH-CLIENT": apiKey },
    body: JSON.stringify({ verification: { callback: Deno.env.get("KYC_RETURN_URL") ?? "link://verify", vendorData: user.id, person: { firstName: profile.first_name } } }),
  });
  if (!res.ok) return fail(req, "kyc_provider_error", 502);
  const body = await res.json() as { verification?: { id: string; url: string } };
  if (!body.verification) return fail(req, "kyc_provider_error", 502);

  await db.from("verifications").insert({ profile_id: user.id, kind: "identity", provider: Deno.env.get("KYC_PROVIDER") ?? "veriff", provider_ref: body.verification.id, status: "pending" });
  return json(req, { url: body.verification.url });
});
