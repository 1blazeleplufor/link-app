import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { listPeople, type PublicProfile } from "@/api";
import { useIsVerified, useSession } from "@/lib/session";
import { useTheme } from "@/theme/ThemeProvider";
import { Body, Chip, EmptyState, ErrorState, H1, Screen, Status, VerificationGate } from "@/components/ui";

export default function People() {
  const { t } = useTranslation(); const { c } = useTheme(); const insets = useSafeAreaInsets();
  const { profile } = useSession(); const verified = useIsVerified();
  const [all, setAll] = useState(false); const [rows, setRows] = useState<PublicProfile[]>([]); const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const list = (await listPeople(all ? null : profile?.home_city_id ?? null)).filter(p => p.id !== profile?.id);
      const mine = new Set(profile?.interests ?? []);
      setRows(list.sort((a, b) => b.interests.filter(i => mine.has(i)).length - a.interests.filter(i => mine.has(i)).length));
    } catch { setError(true); }
  }, [all, profile]);
  useEffect(() => { load(); }, [load]);

  return (
    <Screen>
      <FlatList contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, gap: 12 }} data={rows} keyExtractor={p => p.id}
        ListHeaderComponent={<View style={{ gap: 12, paddingBottom: 8 }}>
          <H1>{t("tab_people")}</H1><Body muted>{t("people_sub")}</Body>
          <View style={{ flexDirection: "row" }}><Chip label={t("people_filter_city", { c: profile?.home_city_id ?? "" })} selected={!all} onPress={() => setAll(false)} /><Chip label={t("people_all")} selected={all} onPress={() => setAll(true)} /></View>
          {!verified ? <VerificationGate /> : null}
        </View>}
        renderItem={({ item: p }) => (
          <Pressable accessibilityRole="button" onPress={() => router.push(`/person/${p.id}`)} style={{ flexDirection: "row", gap: 12, padding: 14, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 18 }}>
            <View style={{ width: 58, height: 58, borderRadius: 18, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}><Text style={{ color: c.accentFg, fontSize: 22, fontWeight: "800" }}>{p.first_name[0]}</Text></View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: c.fg, fontWeight: "700", fontSize: 17 }}>{p.first_name}{p.age ? `, ${t("years", { n: p.age })}` : ""}</Text>
              {p.bio ? <Body small>{p.bio}</Body> : null}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>{p.interests.map(i => <Text key={i} style={{ fontSize: 12, color: profile?.interests.includes(i) ? "#fff" : c.fg, backgroundColor: profile?.interests.includes(i) ? c.accent3 : c.surface2, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, overflow: "hidden" }}>{t(`cat_${i}`)}</Text>)}</View>
              {p.is_verified ? <Status tone="ok" label={t("verified_badge").replace(/\s*\(.*\)/, "")} /> : null}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={error ? <ErrorState onRetry={load} /> : <EmptyState title={t("no_results")} />}
      />
    </Screen>
  );
}
