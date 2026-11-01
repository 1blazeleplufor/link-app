/** Rotating ticket QR codes: payload = "LNK1.<ticketId>.<window>.<mac>".
 *  The MAC is an HMAC-SHA256 of "<ticketId>.<window>" with a server secret, so codes cannot be forged,
 *  and expire after one window (screenshots stop working). Validation also enforces single use server-side.
 *  Uses Web Crypto, available in Deno (Edge Functions), modern browsers and Node 18+. */
export const QR_WINDOW_SECONDS = 30;
const PREFIX = "LNK1";

const enc = new TextEncoder();
function b64url(buf: ArrayBuffer): string {
  let s = ""; const b = new Uint8Array(buf);
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(msg))).slice(0, 22);
}
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
export const windowOf = (ms: number) => Math.floor(ms / 1000 / QR_WINDOW_SECONDS);

export async function makeQrPayload(ticketId: string, secret: string, nowMs = Date.now()): Promise<string> {
  if (!/^[0-9a-f-]{36}$/i.test(ticketId)) throw new Error("invalid ticket id");
  const w = windowOf(nowMs);
  return `${PREFIX}.${ticketId}.${w}.${await hmac(secret, `${ticketId}.${w}`)}`;
}

export type QrCheck = { ok: true; ticketId: string } | { ok: false; reason: "malformed" | "bad_signature" | "expired" };

/** Accepts the current and previous window to tolerate clock skew and slow scanners. */
export async function verifyQrPayload(payload: string, secret: string, nowMs = Date.now()): Promise<QrCheck> {
  const parts = payload.trim().split(".");
  if (parts.length !== 4 || parts[0] !== PREFIX || !/^[0-9a-f-]{36}$/i.test(parts[1]) || !/^\d+$/.test(parts[2])) return { ok: false, reason: "malformed" };
  const [, ticketId, wStr, mac] = parts; const w = Number(wStr);
  const expected = await hmac(secret, `${ticketId}.${w}`);
  if (!timingSafeEqual(expected, mac)) return { ok: false, reason: "bad_signature" };
  const cur = windowOf(nowMs);
  if (w > cur + 1 || w < cur - 1) return { ok: false, reason: "expired" };
  return { ok: true, ticketId };
}
