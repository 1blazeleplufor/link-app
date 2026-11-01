import { useEffect, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { createOuting, listCities, type City } from "@/api";
import { useSession } from "@/lib/session";
import { useTheme } from "@/theme/ThemeProvider";
import { Body, Button, Chip, H1, Screen } from "@/components/ui";

const CATS = ["concerts", "festivals", "clubs", "rooftops", "culture", "activities", "sports", "trips", "food", "private"];

export default function Create() {
  const { t } = useTranslation(); const { c } = useTheme(); const insets = useSafeAreaInsets(); const { profile } = useSession();
  const [kind, setKind] = useState<"public" | "private" | "org">("public");
  const [cities, setCities] = useState<City[]>([]);
  const [f, setF] = useState({ title: "", cat: "food", city: profile?.home_city_id ?? "paris", date: "", time: "19:00", place: "", cap: "6", desc: "", rules: "" });
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { listCities().then(setCities).catch(() => undefined); }, []);
  const set = (k: keyof typeof f) => (v: string) => setF(s => ({ ...s, [k]: v }));
  const input = { borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, color: c.fg, borderRadius: 12, padding: 12, minHeight: 46 } as const;

  async function submit() {
    if (!profile || kind === "org") return;
    const startsAt = new Date(`${f.date}T${f.time}:00`);
    if (!f.title.trim() || isNaN(startsAt.getTime())) { setMsg(t("form_missing")); return; }
    setBusy(true); setMsg(null);
    try {
      await createOuting({ kind, title: f.title.trim(), description: f.desc, rules: f.rules, cityId: f.city, categoryId: f.cat, meetingPlace: f.place, startsAt, capacity: Math.max(2, Number(f.cap) || 6), creatorId: profile.id });
      setMsg(kind === "public" ? t("created_public") : t("created_private"));
      router.push("/(tabs)/activity");
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, gap: 12 }} keyboardShouldPersistTaps="handled">
        <H1>{t("create_title")}</H1><Body muted>{t("create_sub")}</Body>
        <View style={{ flexDirection: "row" }}>{(["public", "private", "org"] as const).map(k => <Chip key={k} label={t(`type_${k}`)} selected={kind === k} onPress={() => setKind(k)} />)}</View>
        <Body small muted>{t(`type_${kind}_d`)}</Body>
        {kind === "org" ? <Body>{t("org_locked")}</Body> : (
          <>
            <TextInput accessibilityLabel={t("f_title")} placeholder={t("f_title_ph")} placeholderTextColor={c.muted} style={input} value={f.title} onChangeText={set("title")} maxLength={80} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>{CATS.map(k => <Chip key={k} label={t(`cat_${k}`)} selected={f.cat === k} onPress={() => set("cat")(k)} />)}</ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>{cities.map(ci => <Chip key={ci.id} label={ci.name} selected={f.city === ci.id} onPress={() => set("city")(ci.id)} />)}</ScrollView>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TextInput accessibilityLabel={t("f_date")} placeholder="YYYY-MM-DD" placeholderTextColor={c.muted} style={[input, { flex: 1 }]} value={f.date} onChangeText={set("date")} />
              <TextInput accessibilityLabel={t("f_time")} placeholder="19:00" placeholderTextColor={c.muted} style={[input, { flex: 1 }]} value={f.time} onChangeText={set("time")} />
            </View>
            <TextInput accessibilityLabel={t("f_place")} placeholder={t("f_place_ph")} placeholderTextColor={c.muted} style={input} value={f.place} onChangeText={set("place")} />
            <TextInput accessibilityLabel={t("f_capacity")} placeholder={t("f_capacity")} placeholderTextColor={c.muted} style={input} value={f.cap} onChangeText={set("cap")} keyboardType="number-pad" />
            <TextInput accessibilityLabel={t("f_desc")} placeholder={t("f_desc_ph")} placeholderTextColor={c.muted} style={[input, { minHeight: 90 }]} value={f.desc} onChangeText={set("desc")} multiline maxLength={600} />
            <TextInput accessibilityLabel={t("f_rules")} placeholder={t("f_rules_ph")} placeholderTextColor={c.muted} style={input} value={f.rules} onChangeText={set("rules")} maxLength={160} />
            <Button label={kind === "public" ? t("publish") : t("save_private")} onPress={submit} loading={busy} />
            {msg ? <Body small>{msg}</Body> : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
