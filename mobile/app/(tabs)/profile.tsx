import { useState } from "react";
import { Alert, ScrollView, Share, Switch, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { useTheme } from "@/theme/ThemeProvider";
import { BRANDS, type BrandId } from "@/theme/brands";
import { SUPPORTED } from "@/i18n";
import { exportMyData } from "@/api";
import { Body, Button, Chip, H1, Screen, Status } from "@/components/ui";

const INTERESTS = ["concerts", "festivals", "clubs", "rooftops", "culture", "activities", "sports", "trips", "food"];

export default function Profile() {
  const { t, i18n } = useTranslation(); const { c, brand, setBrand, appearance, setAppearance } = useTheme(); const insets = useSafeAreaInsets();
  const { profile, refreshProfile, signOut } = useSession();
  const [name, setName] = useState(profile?.first_name ?? ""); const [bio, setBio] = useState(profile?.bio ?? "");
  if (!profile) return null;

  async function update(patch: Record<string, unknown>) {
    const { error } = await supabase.from("profiles").update(patch).eq("id", profile!.id);
    if (error) Alert.alert(error.message); else refreshProfile();
  }
  const toggleInterest = (i: string) => update({ interests: profile.interests.includes(i) ? profile.interests.filter(x => x !== i) : [...profile.interests, i] });
  const vs = { none: ["muted", "verif_none"], pending: ["warn", "verif_pending"], verified: ["ok", "verif_ok"], failed: ["bad", "verif_failed"], manual_review: ["warn", "v_manual"], revoked: ["bad", "revoked"] }[profile.identity_status] as ["ok" | "warn" | "bad" | "muted", string];
  const input = { borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, color: c.fg, borderRadius: 12, padding: 12, minHeight: 46 } as const;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, gap: 14 }}>
        <H1>{profile.first_name}</H1>
        <Status tone={vs[0]} label={`${t("verif_status")} : ${t(vs[1]).replace(/\s*\(.*\)/, "")}`} />
        {profile.identity_status !== "verified" ? <Button label={t("verify_now")} onPress={() => router.push("/verify")} /> : null}

        <Body small>{t("name")}</Body>
        <TextInput accessibilityLabel={t("name")} style={input} value={name} onChangeText={setName} maxLength={40} />
        <Body small>{t("bio")}</Body>
        <TextInput accessibilityLabel={t("bio")} style={[input, { minHeight: 80 }]} value={bio} onChangeText={setBio} multiline maxLength={300} />
        <Button label={t("save")} variant="secondary" onPress={() => update({ first_name: name.trim(), bio: bio.trim() })} />

        <Body small>{t("interests")}</Body>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{INTERESTS.map(i => <Chip key={i} label={t(`cat_${i}`)} selected={profile.interests.includes(i)} onPress={() => toggleInterest(i)} />)}</View>

        <Body small>{t("visibility")}</Body>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{(["public", "verified_only", "hidden"] as const).map(v => <Chip key={v} label={t(v === "verified_only" ? "vis_verified" : `vis_${v}`)} selected={profile.visibility === v} onPress={() => update({ visibility: v })} />)}</View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Body>{t("show_age")}</Body><Switch value={profile.show_age} onValueChange={v => update({ show_age: v })} accessibilityLabel={t("show_age")} /></View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><View style={{ flex: 1 }}><Body>{t("dating")}</Body><Body small muted>{t("dating_d")}</Body></View><Switch value={profile.dating_enabled} onValueChange={v => update({ dating_enabled: v })} accessibilityLabel={t("dating")} /></View>

        <Body small>{t("brand")}</Body>
        <View style={{ flexDirection: "row" }}>{(Object.keys(BRANDS) as BrandId[]).map(b => <Chip key={b} label={BRANDS[b].name} selected={brand === b} onPress={() => setBrand(b)} />)}</View>
        <View style={{ flexDirection: "row" }}>{(["system", "light", "dark"] as const).map(a => <Chip key={a} label={t(`theme_${a}`)} selected={appearance === a} onPress={() => setAppearance(a)} />)}</View>
        <Body small>{t("app_lang")}</Body>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{SUPPORTED.map(l => <Chip key={l} label={l.toUpperCase()} selected={i18n.language === l} onPress={() => { i18n.changeLanguage(l); update({ ui_language: l }); }} />)}</View>

        <Body small>{t("privacy")}</Body>
        <Button label={t("export")} variant="secondary" onPress={async () => { const data = await exportMyData(); await Share.share({ message: JSON.stringify(data, null, 2) }); }} />
        <Button label={t("sign_out")} variant="ghost" onPress={() => signOut(false)} />
        <Button label={t("sign_out_all")} variant="danger" onPress={() => signOut(true)} />
      </ScrollView>
    </Screen>
  );
}
