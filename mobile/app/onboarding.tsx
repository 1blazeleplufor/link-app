import { useEffect, useState } from "react";
import { ScrollView, Switch, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { useTheme } from "@/theme/ThemeProvider";
import { BRANDS, type BrandId } from "@/theme/brands";
import { listCities, type City } from "@/api";
import { SUPPORTED } from "@/i18n";
import { Body, Button, Chip, H1, Screen } from "@/components/ui";

/** First run: language, look, first name, birth date (18+), home city. The birth date is never shown publicly. */
export default function Onboarding() {
  const { t, i18n } = useTranslation(); const { c, brand, setBrand } = useTheme();
  const { session, refreshProfile } = useSession();
  const [name, setName] = useState(""); const [birth, setBirth] = useState(""); const [cityId, setCityId] = useState("paris");
  const [adult, setAdult] = useState(false); const [cities, setCities] = useState<City[]>([]); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { listCities().then(setCities).catch(() => undefined); }, []);

  const validBirth = /^\d{4}-\d{2}-\d{2}$/.test(birth) && new Date(birth) <= new Date(new Date().setFullYear(new Date().getFullYear() - 18));
  const input = { borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, color: c.fg, borderRadius: 12, padding: 12, minHeight: 46 } as const;

  async function save() {
    if (!session) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.from("profiles").insert({
      id: session.user.id, first_name: name.trim(), birth_date: birth, home_city_id: cityId, ui_language: i18n.language, languages: [i18n.language],
    });
    setBusy(false);
    if (error) setErr(error.message); else refreshProfile();
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 70, gap: 14 }}>
        <H1>{t("ob_title")}</H1><Body muted>{t("ob_sub")}</Body>
        <Body small>{t("ob_lang")}</Body>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>{SUPPORTED.map(l => <Chip key={l} label={l.toUpperCase()} selected={i18n.language === l} onPress={() => i18n.changeLanguage(l)} />)}</ScrollView>
        <Body small>{t("ob_brand")}</Body>
        <View style={{ flexDirection: "row" }}>{(Object.keys(BRANDS) as BrandId[]).map(b => <Chip key={b} label={BRANDS[b].name} selected={brand === b} onPress={() => setBrand(b)} />)}</View>
        <TextInput accessibilityLabel={t("name")} placeholder={t("name")} placeholderTextColor={c.muted} style={input} value={name} onChangeText={setName} maxLength={40} />
        <TextInput accessibilityLabel="Birth date" placeholder="YYYY-MM-DD" placeholderTextColor={c.muted} style={input} value={birth} onChangeText={setBirth} keyboardType="numbers-and-punctuation" />
        <Body small muted>{t("show_age_d")}</Body>
        <Body small>{t("city_home")}</Body>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>{cities.map(ci => <Chip key={ci.id} label={ci.name} selected={cityId === ci.id} onPress={() => setCityId(ci.id)} />)}</ScrollView>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Body>{t("ob_age")}</Body><Switch value={adult} onValueChange={setAdult} accessibilityLabel={t("ob_age")} />
        </View>
        {err ? <Body small>{err}</Body> : null}
        <Button label={t("ob_start")} onPress={save} loading={busy} disabled={!adult || !validBirth || name.trim().length < 1} />
      </ScrollView>
    </Screen>
  );
}
