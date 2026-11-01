import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { listInvitations, listTickets, respondInvitation } from "@/api";
import { supabase } from "@/lib/supabase";
import { useIsVerified, useSession } from "@/lib/session";
import { useTheme } from "@/theme/ThemeProvider";
import { inviteState } from "@link/shared/invitations";
import { Body, Button, Chip, EmptyState, H1, Screen, Status, VerificationGate } from "@/components/ui";

type Tab = "invites" | "outings" | "tickets";
const TONE = { pending: "warn", accepted: "ok", declined: "bad", cancelled: "muted", expired: "muted" } as const;

export default function Activity() {
  const { t } = useTranslation(); const { c } = useTheme(); const insets = useSafeAreaInsets();
  const { profile } = useSession(); const verified = useIsVerified();
  const [tab, setTab] = useState<Tab>("invites"); const [dir, setDir] = useState<"in" | "out">("in");
  const [invites, setInvites] = useState<any[]>([]); const [outings, setOutings] = useState<any[]>([]); const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false); const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return; setLoading(true);
    try {
      const [inv, tk, out] = await Promise.all([listInvitations(), listTickets(), supabase.from("outings").select("*").eq("creator_id", profile.id).order("starts_at")]);
      setInvites(inv ?? []); setTickets(tk ?? []); setOutings(out.data ?? []);
    } finally { setLoading(false); }
  }, [profile]);
  useEffect(() => { load(); }, [load]);

  async function respond(id: string, accept: boolean) {
    setErr(null);
    try { const conv = await respondInvitation(id, accept); await load(); if (conv) router.push(`/conversation/${conv}`); }
    catch (e) { setErr((e as Error).message === "verification_required" ? t("lock_title") : (e as Error).message); }
  }

  const list = invites.filter(i => (dir === "in" ? i.recipient_id : i.sender_id) === profile?.id);
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, gap: 12 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        <H1>{t("tab_activity")}</H1>
        <View style={{ flexDirection: "row" }}>{(["invites", "outings", "tickets"] as Tab[]).map(k => <Chip key={k} label={t(`act_${k}`)} selected={tab === k} onPress={() => setTab(k)} />)}</View>
        {tab === "invites" ? <>
          <View style={{ flexDirection: "row" }}><Chip label={t("received")} selected={dir === "in"} onPress={() => setDir("in")} /><Chip label={t("sent")} selected={dir === "out"} onPress={() => setDir("out")} /></View>
          {!verified && dir === "in" ? <VerificationGate /> : null}
          {err ? <Body small>{err}</Body> : null}
          {list.length ? list.map(i => {
            const st = inviteState(i.status, new Date(i.expires_at));
            const target = i.events ?? i.outings;
            return (
              <View key={i.id} style={{ padding: 14, gap: 8, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 18 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: c.fg, fontWeight: "700" }}>{target?.title ?? "—"}</Text><Status tone={TONE[st]} label={t(st)} /></View>
                {i.note ? <Body small muted>« {i.note} »</Body> : null}
                {st === "pending" && dir === "in" ? <View style={{ flexDirection: "row", gap: 8 }}><Button label={t("accept")} onPress={() => respond(i.id, true)} /><Button label={t("decline")} variant="ghost" onPress={() => respond(i.id, false)} /></View> : null}
              </View>);
          }) : <EmptyState title={t("no_invites")} />}
        </> : null}
        {tab === "outings" ? (outings.length ? outings.map(o => (
          <View key={o.id} style={{ padding: 14, gap: 6, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 18 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: c.fg, fontWeight: "700" }}>{o.title}</Text>
              <Status tone={o.status === "published" ? "ok" : o.status === "rejected" ? "bad" : o.kind === "private" ? "muted" : "warn"} label={t(o.kind === "private" ? "private_label" : o.status === "published" ? "approved" : o.status === "rejected" ? "rejected" : "pending_mod")} /></View>
            <Body small muted>{new Date(o.starts_at).toLocaleString()} · {o.meeting_place ?? "—"}</Body>
          </View>)) : <EmptyState title={t("no_outings")} action={<Button label={t("create_first")} onPress={() => router.push("/(tabs)/create")} />} />) : null}
        {tab === "tickets" ? (tickets.length ? tickets.map(k => (
          <Pressable key={k.id} accessibilityRole="button" onPress={() => router.push(`/ticket/${k.id}`)} style={{ padding: 14, gap: 6, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 18 }}>
            <Text style={{ color: c.fg, fontWeight: "700" }}>{k.orders?.events?.title ?? "—"}</Text>
            <Status tone={k.status === "valid" ? "ok" : k.status === "revoked" ? "bad" : "muted"} label={k.status === "valid" ? k.ticket_types?.name ?? "" : k.status === "revoked" ? t("revoked") : t("already", { t: "" }).split(".")[0]} />
          </Pressable>)) : <EmptyState title={t("no_tickets")} />) : null}
      </ScrollView>
    </Screen>
  );
}
