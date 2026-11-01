// Data access. Every call goes through Supabase with the user's session; RLS and SQL functions enforce the rules.
import { supabase, callFunction } from "@/lib/supabase";

export interface City { id: string; name: string; country_code: string; timezone: string; currency: string; is_priority: boolean; priority_rank: number | null }
export interface EventRow {
  id: string; city_id: string; category_id: string; title: string; description: string | null; venue_name: string | null; area: string | null;
  starts_at: string; min_age: number; price_min: number | null; currency: string | null; availability: "verified" | "unknown" | "sold_out";
  accessibility: { step_free?: boolean }; ticketing: "link_operated" | "partner" | "third_party_api" | "none"; sale_enabled: boolean;
  source_id: string; organizer_id: string | null; last_synced_at: string | null;
}
export interface PublicProfile { id: string; first_name: string; bio: string | null; age: number | null; home_city_id: string | null; languages: string[]; interests: string[]; music_genres: string[]; is_verified: boolean }

const PAGE = 30;

export async function listCities(): Promise<City[]> {
  const { data, error } = await supabase.from("cities").select("*").eq("is_active", true).order("is_priority", { ascending: false }).order("priority_rank").order("name");
  if (error) throw error; return data as City[];
}

/** Free-text city search: any active city, not only the 13 priority ones. */
export async function searchCities(q: string): Promise<City[]> {
  const { data, error } = await supabase.from("cities").select("*").ilike("name", `%${q.replace(/[%_]/g, "")}%`).limit(20);
  if (error) throw error; return data as City[];
}

export interface EventFilters { cityId?: string; categoryId?: string; from?: Date; to?: Date; maxPrice?: number | "free"; page?: number }
export async function listEvents(f: EventFilters): Promise<EventRow[]> {
  let q = supabase.from("events").select("*").eq("status", "published").gte("starts_at", (f.from ?? new Date(Date.now() - 3 * 3600e3)).toISOString());
  if (f.cityId) q = q.eq("city_id", f.cityId);
  if (f.categoryId) q = q.eq("category_id", f.categoryId);
  if (f.to) q = q.lte("starts_at", f.to.toISOString());
  if (f.maxPrice === "free") q = q.eq("price_min", 0);
  else if (typeof f.maxPrice === "number") q = q.lte("price_min", f.maxPrice);  // unknown prices are excluded from budget filters, never guessed
  const page = f.page ?? 0;
  const { data, error } = await q.order("starts_at").range(page * PAGE, page * PAGE + PAGE - 1);
  if (error) throw error; return data as EventRow[];
}

export async function getEvent(id: string) {
  const { data, error } = await supabase.from("events").select("*, ticket_types(*), organizers(display_name), event_sources(name, attribution)").eq("id", id).single();
  if (error) throw error; return data;
}

export async function listPeople(cityId: string | null): Promise<PublicProfile[]> {
  let q = supabase.from("public_profiles").select("*").limit(50);
  if (cityId) q = q.eq("home_city_id", cityId);
  const { data, error } = await q; if (error) throw error; return data as PublicProfile[];
}

export async function sendInvitation(recipient: string, target: { eventId?: string; outingId?: string }, note: string) {
  const { data, error } = await supabase.rpc("send_invitation", { p_recipient: recipient, p_event: target.eventId ?? null, p_outing: target.outingId ?? null, p_note: note });
  if (error) throw new Error(error.message); return data as string;
}
export async function respondInvitation(id: string, accept: boolean) {
  const { data, error } = await supabase.rpc("respond_invitation", { p_invitation: id, p_accept: accept });
  if (error) throw new Error(error.message); return data as string | null;
}
export async function listInvitations() {
  const { data, error } = await supabase.from("invitations").select("*, events(title, starts_at, city_id), outings(title, starts_at, city_id)").order("created_at", { ascending: false });
  if (error) throw error; return data;
}

export async function createOuting(o: { kind: "public" | "private"; title: string; description: string; rules: string; cityId: string; categoryId: string; meetingPlace: string; startsAt: Date; capacity: number; creatorId: string; eventId?: string }) {
  const { data, error } = await supabase.from("outings").insert({
    creator_id: o.creatorId, kind: o.kind, title: o.title, description: o.description || null, rules: o.rules || null, city_id: o.cityId,
    category_id: o.categoryId, meeting_place: o.meetingPlace || null, starts_at: o.startsAt.toISOString(), capacity: o.capacity, event_id: o.eventId ?? null,
    status: o.kind === "public" ? "pending_review" : "private",
  }).select("id").single();
  if (error) throw error; return data.id as string;
}

export async function listConversations() {
  const { data, error } = await supabase.from("conversations").select("id, kind, outing_id, conversation_members(profile_id), messages(body, created_at)").order("created_at", { ascending: false });
  if (error) throw error; return data;
}
export async function listMessages(conversationId: string) {
  const { data, error } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at").limit(200);
  if (error) throw error; return data;
}
export async function sendMessage(conversationId: string, senderId: string, body: string) {
  const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: senderId, body });
  if (error) throw error;
}

export async function block(me: string, other: string) { const { error } = await supabase.from("blocks").insert({ blocker_id: me, blocked_id: other }); if (error) throw error; }
export async function report(me: string, targetType: string, targetId: string, reason: string, details?: string) {
  const { error } = await supabase.from("reports").insert({ reporter_id: me, target_type: targetType, target_id: targetId, reason, details });
  if (error) throw error;
}

export async function listTickets() {
  const { data, error } = await supabase.from("tickets").select("id, status, issued_at, scanned_at, ticket_types(name), orders(id, event_id, events(title, starts_at, venue_name, city_id))").order("issued_at", { ascending: false });
  if (error) throw error; return data;
}

export const createCheckout = (eventId: string, ticketTypeId: string, quantity: number) =>
  callFunction<{ orderId: string; clientSecret: string; holdExpiresAt: string; breakdown: { subtotalMinor: number; feesMinor: number; totalMinor: number }; mode: string }>("create-checkout", { eventId, ticketTypeId, quantity });
export const ticketQr = (ticketId: string) => callFunction<{ payload?: string; refreshInSeconds?: number; status: string }>("ticket-qr", { ticketId });
export const startVerification = () => callFunction<{ url: string }>("kyc-start", {});
export async function exportMyData() { const { data, error } = await supabase.rpc("export_my_data"); if (error) throw error; return data; }
