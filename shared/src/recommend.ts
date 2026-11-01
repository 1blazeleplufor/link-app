/** Explainable recommendations: every score comes with the reasons shown to the user.
 *  Deliberately uses only explicit preferences (interests, trips, city, languages). No inferred sensitive data. */
export type DiscoveryMode = "local" | "international" | "personal";

export interface EventLike { id: string; cityId: string; categoryId: string; startsAt: Date; goingCount?: number; }
export interface Preferences { homeCityId: string | null; interests: string[]; trips: { cityId: string; from?: Date; to?: Date }[]; }
export type Reason = { kind: "interest"; category: string } | { kind: "trip"; cityId: string } | { kind: "home_city" } | { kind: "popular" };
export interface Scored<E> { event: E; score: number; reasons: Reason[] }

const W = { interest: 3, trip: 3, homeCity: 2, popular: 0.5 } as const;
export const POPULAR_THRESHOLD = 20;

function tripCovers(trip: Preferences["trips"][number], d: Date): boolean {
  if (trip.from && d < trip.from) return false;
  if (trip.to && d > new Date(trip.to.getTime() + 864e5)) return false;
  return true;
}

export function scoreEvent<E extends EventLike>(e: E, p: Preferences): Scored<E> {
  const reasons: Reason[] = []; let score = 0;
  if (p.interests.includes(e.categoryId)) { score += W.interest; reasons.push({ kind: "interest", category: e.categoryId }); }
  const trip = p.trips.find(tr => tr.cityId === e.cityId && tripCovers(tr, e.startsAt));
  if (trip) { score += W.trip; reasons.push({ kind: "trip", cityId: e.cityId }); }
  if (p.homeCityId && e.cityId === p.homeCityId) { score += W.homeCity; reasons.push({ kind: "home_city" }); }
  if ((e.goingCount ?? 0) > POPULAR_THRESHOLD) { score += W.popular; reasons.push({ kind: "popular" }); }
  return { event: e, score, reasons };
}

/** Applies the discovery mode. Local = selected city; international = everything by date; personal = scored and explained. */
export function discover<E extends EventLike>(events: E[], mode: DiscoveryMode, selectedCityId: string, p: Preferences, now = new Date()): Scored<E>[] {
  const upcoming = events.filter(e => e.startsAt >= new Date(now.getTime() - 3 * 3600e3));
  if (mode === "local") return upcoming.filter(e => e.cityId === selectedCityId).sort(byDate).map(e => ({ event: e, score: 0, reasons: [] }));
  if (mode === "international") return [...upcoming].sort(byDate).map(e => ({ event: e, score: 0, reasons: [] }));
  return upcoming.map(e => scoreEvent(e, p)).filter(s => s.score > 0 && s.reasons.some(r => r.kind !== "popular"))
    .sort((a, b) => b.score - a.score || a.event.startsAt.getTime() - b.event.startsAt.getTime());
}
const byDate = (a: EventLike, b: EventLike) => a.startsAt.getTime() - b.startsAt.getTime();
