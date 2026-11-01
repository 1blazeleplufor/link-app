import { test } from "node:test";
import assert from "node:assert/strict";
import { priceOrder, formatMoney, priceLabel, MAX_TICKETS_PER_ORDER } from "../src/pricing.ts";
import { discover, scoreEvent } from "../src/recommend.ts";
import { makeQrPayload, verifyQrPayload, QR_WINDOW_SECONDS } from "../src/ticketQr.ts";
import { canInvite, canMessage, inviteState } from "../src/invitations.ts";

test("pricing: free launch has no fees and exact totals", () => {
  assert.deepEqual(priceOrder({ unitPriceMinor: 2200, quantity: 2 }), { subtotalMinor: 4400, feesMinor: 0, taxesIncludedMinor: 0, totalMinor: 4400 });
});
test("pricing: future fee and included VAT", () => {
  const p = priceOrder({ unitPriceMinor: 1000, quantity: 3, linkFeeRate: 0.05, vatRate: 0.2 });
  assert.equal(p.feesMinor, 150); assert.equal(p.totalMinor, 3150); assert.equal(p.taxesIncludedMinor, 500);
});
test("pricing: rejects bad quantities and negative prices", () => {
  assert.throws(() => priceOrder({ unitPriceMinor: 100, quantity: 0 }));
  assert.throws(() => priceOrder({ unitPriceMinor: 100, quantity: MAX_TICKETS_PER_ORDER + 1 }));
  assert.throws(() => priceOrder({ unitPriceMinor: -1, quantity: 1 }));
  assert.throws(() => priceOrder({ unitPriceMinor: 10.5, quantity: 1 }));
});
test("pricing: free event never gets a fee", () => {
  assert.equal(priceOrder({ unitPriceMinor: 0, quantity: 2, linkFeeRate: 0.1, linkFeeFixedMinor: 50 }).totalMinor, 0);
});
test("money formatting follows locale and currency", () => {
  assert.match(formatMoney(2200, "EUR", "fr-FR"), /22\s?€/);
  assert.match(formatMoney(1850, "GBP", "en-GB"), /£18\.50/);
});
test("unknown price is labelled unknown, not zero", () => {
  const t = (k: string, v?: Record<string, string>) => k + (v ? ":" + v.p : "");
  assert.equal(priceLabel(null, "EUR", "fr-FR", t), "price_unknown");
  assert.equal(priceLabel(0, "EUR", "fr-FR", t), "free");
});

const now = new Date("2026-11-02T10:00:00Z");
const d = (days: number) => new Date(now.getTime() + days * 864e5);
const events = [
  { id: "a", cityId: "paris", categoryId: "concerts", startsAt: d(1) },
  { id: "b", cityId: "lisbon", categoryId: "rooftops", startsAt: d(5) },
  { id: "c", cityId: "berlin", categoryId: "sports", startsAt: d(2), goingCount: 50 },
  { id: "old", cityId: "paris", categoryId: "concerts", startsAt: d(-2) },
];
const prefs = { homeCityId: "paris", interests: ["concerts"], trips: [{ cityId: "lisbon", from: d(4), to: d(8) }] };

test("local mode keeps only the selected city, upcoming, by date", () => {
  assert.deepEqual(discover(events, "local", "paris", prefs, now).map(s => s.event.id), ["a"]);
});
test("international mode keeps everything upcoming by date", () => {
  assert.deepEqual(discover(events, "international", "paris", prefs, now).map(s => s.event.id), ["a", "c", "b"]);
});
test("personal mode explains every pick and ignores popularity-only matches", () => {
  const r = discover(events, "personal", "paris", prefs, now);
  assert.deepEqual(r.map(s => s.event.id), ["a", "b"]);
  assert.deepEqual(r[0].reasons.map(x => x.kind), ["interest", "home_city"]);
  assert.deepEqual(r[1].reasons.map(x => x.kind), ["trip"]);
});
test("trip outside its dates does not count", () => {
  const s = scoreEvent({ id: "x", cityId: "lisbon", categoryId: "food", startsAt: d(20) }, prefs);
  assert.equal(s.score, 0);
});

const SECRET = "test-secret-not-for-prod";
const TID = "3f1c2b8e-1d2a-4f4b-9b1e-6a7d8c9e0f11";
test("QR: valid payload verifies", async () => {
  const p = await makeQrPayload(TID, SECRET, now.getTime());
  assert.deepEqual(await verifyQrPayload(p, SECRET, now.getTime()), { ok: true, ticketId: TID });
});
test("QR: tolerates one window of skew but expires after", async () => {
  const p = await makeQrPayload(TID, SECRET, now.getTime());
  assert.equal((await verifyQrPayload(p, SECRET, now.getTime() + QR_WINDOW_SECONDS * 1000)).ok, true);
  assert.deepEqual(await verifyQrPayload(p, SECRET, now.getTime() + QR_WINDOW_SECONDS * 3000), { ok: false, reason: "expired" });
});
test("QR: forged or tampered payloads are rejected", async () => {
  const p = await makeQrPayload(TID, SECRET, now.getTime());
  assert.deepEqual(await verifyQrPayload(p, "other-secret", now.getTime()), { ok: false, reason: "bad_signature" });
  const other = p.replace(TID, "00000000-0000-0000-0000-000000000000");
  assert.deepEqual(await verifyQrPayload(other, SECRET, now.getTime()), { ok: false, reason: "bad_signature" });
  assert.deepEqual(await verifyQrPayload("hello", SECRET, now.getTime()), { ok: false, reason: "malformed" });
});

test("invitations: verification gate, blocks and rate limit", () => {
  const base = { me: "a", target: "b", myStatus: "verified" as const, blocked: false, sentLast24h: 0 };
  assert.equal(canInvite(base), null);
  assert.equal(canInvite({ ...base, myStatus: "pending" }), "verification_required");
  assert.equal(canInvite({ ...base, blocked: true }), "blocked");
  assert.equal(canInvite({ ...base, sentLast24h: 20 }), "rate_limited");
  assert.equal(canInvite({ ...base, target: "a" }), "self");
  assert.equal(canMessage("none", true, false), false);
  assert.equal(canMessage("verified", true, false), true);
  assert.equal(inviteState("pending", d(-1), now), "expired");
});
