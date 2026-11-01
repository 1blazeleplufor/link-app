import { useEffect, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useIsVerified, useSession } from "@/lib/session";
import { block, listEvents, report, sendInvitation, type EventRow, type PublicProfile } from "@/api";
import { useTheme } from "@/theme/ThemeProvider";
import { Body, Button, Chip, H1, Screen, VerificationGate } from "@/components/ui";

const REASONS: [string, string][] = [["fake", "report_r1"], ["harassment", "report_r2"], ["spam", "report_r3"], ["underage", "report_r4"], ["other", "report_r5"]];
const ERR: Record<string, string> = { rate_limited: "invite_limit", verification_required: "lock_title", recipient_unavailable: "no_results" };

export default function Person() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation(); const { c } = useTheme(); const { profile } = useSession(); const verified = useIsVerified();
  const [p, setP] = useState<PublicProfile | null>(null); const [events, setEvents] = useState<EventRow[]>([]);
  const [eventId, setEventId] = useState<string | null>(null); const [note, setNote] = useState(""); const [mode, setMode] = useState<"view" | "report">("view");
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    supabase.from("public_profiles").select("*").eq("id", id).maybeSingle().then(({ data }) => setP(data as PublicProfile | null));
    listEvents({ cityId: undefined }).then(e => setEvents(e.slice(0, 15))).catch(() => undefined);
  }, [id]);
  if (!p || !profile) return <Screen><View style={{ padding: 20 }}><Body muted>…</Body></View></Screen>;

  async function invite() {
    if (!eventId) return; setMsg(null);
    try { await sendInvitation(p!.id, { eventId }, note); setMsg(t("invite_sent", { n: p!.first_name })); }
    catch (e) { const k = ERR[(e as Error).message]; setMsg(k ? t(k) : (e as Error).message); }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <H1>{p.first_name}{p.age ? `, ${t("years", { n: p.age })}` : ""}</H1>
        {p.bio ? <Body>{p.bio}</Body> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{p.interests.map(i => <Chip key={i} label={t(`cat_${i}`)} selected={profile.interests.includes(i)} onPress={() => undefined} />)}</View>
        {mode === "view" ? (verified ? <>
          <Body small>{t("invite_pick")}</Body>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>{events.map(e => <Chip key={e.id} label={e.title} selected={eventId === e.id} onPress={() => setEventId(e.id)} />)}</ScrollView>
          <TextInput accessibilityLabel={t("invite_note")} placeholder={t("invite_note")} placeholderTextColor={c.muted} value={note} onChangeText={setNote} maxLength={200}
            style={{ borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, color: c.fg, borderRadius: 12, padding: 12, minHeight: 46 }} />
          <Button label={t("send_invite")} onPress={invite} disabled={!eventId} />
        </> : <VerificationGate />) : (
          <View style={{ gap: 8 }}>{REASONS.map(([code, key]) => <Button key={code} label={t(key)} variant="secondary" onPress={async () => { await report(profile.id, "profile", p.id, code); setMsg(t("report_sent")); setMode("view"); }} />)}</View>
        )}
        {msg ? <Body small>{msg}</Body> : null}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button label={t("block")} variant="ghost" onPress={async () => { await block(profile.id, p.id); router.back(); }} />
          <Button label={t("report")} variant="danger" onPress={() => setMode("report")} />
        </View>
      </ScrollView>
    </Screen>
  );
}
