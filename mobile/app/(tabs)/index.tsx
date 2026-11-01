import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { listCities, listEvents, type City, type EventRow } from "@/api";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { discover, type DiscoveryMode } from "@link/shared/recommend";
import { EventCard } from "@/components/EventCard";
import { Body, Button, Chip, EmptyState, ErrorState, H1, Screen } from "@/components/ui";

const CATS = ["concerts", "festivals", "clubs", "rooftops", "culture", "activities", "sports", "trips", "food", "private"];
type When = "all" | "today" | "weekend" | "week";

function range(w: When): { from?: Date; to?: Date } {
  const now = new Date(); const end = (d: number) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(23, 59, 59); return x; };
  if (w === "today") return { from: now, to: end(0) };
  if (w === "week") return { from: now, to: end(7) };
  if (w === "weekend") { const day = now.getDay(); const toSun = (7 - day) % 7; const fri = new Date(); fri.setDate(now.getDate() + Math.max(0, toSun - 2)); fri.setHours(17, 0, 0); return { from: day >= 5 || day === 0 ? now : fri, to: end(toSun) }; }
  return {};
}

export default function Explore() {
  const { t } = useTranslation(); const insets = useSafeAreaInsets(); const { profile } = useSession();
  const [cities, setCities] = useState<City[]>([]); const [events, setEvents] = useState<EventRow[]>([]);
  const [mode, setMode] = useState<DiscoveryMode>(profile?.discovery_mode ?? "local");
  const [cityId, setCityId] = useState(profile?.home_city_id ?? "paris");
  const [cat, setCat] = useState<string | null>(null); const [when, setWhen] = useState<When>("all");
  const [loading, setLoading] = useState(true); const [error, setError] = useState(false);
  const [trips, setTrips] = useState<{ cityId: string; from?: Date; to?: Date }[]>([]);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const [cs, evs] = await Promise.all([cities.length ? Promise.resolve(cities) : listCities(),
        listEvents({ cityId: mode === "local" ? cityId : undefined, categoryId: cat ?? undefined, ...range(when) })]);
      setCities(cs); setEvents(evs);
    } catch { setError(true); } finally { setLoading(false); }
  }, [mode, cityId, cat, when]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!profile) return;
    supabase.from("trips").select("city_id, starts_on, ends_on").eq("profile_id", profile.id)
      .then(({ data }) => setTrips((data ?? []).map(r => ({ cityId: r.city_id, from: r.starts_on ? new Date(r.starts_on) : undefined, to: r.ends_on ? new Date(r.ends_on) : undefined }))));
  }, [profile]);

  const cityMap = useMemo(() => Object.fromEntries(cities.map(c => [c.id, c])), [cities]);
  const scored = useMemo(() => discover(
    events.map(e => ({ ...e, cityId: e.city_id, categoryId: e.category_id, startsAt: new Date(e.starts_at) })),
    mode, cityId, { homeCityId: profile?.home_city_id ?? null, interests: profile?.interests ?? [], trips }), [events, mode, cityId, profile, trips]);

  const header = (
    <View style={{ gap: 12, paddingBottom: 12 }}>
      <H1>{t("tagline")}</H1>
      <View style={{ flexDirection: "row" }}>{(["local", "international", "personal"] as DiscoveryMode[]).map(m => <Chip key={m} label={t(`mode_${m}`)} selected={mode === m} onPress={() => setMode(m)} />)}</View>
      {mode === "local" ? <ScrollView horizontal showsHorizontalScrollIndicator={false}>{cities.map(c => <Chip key={c.id} label={c.name} selected={c.id === cityId} onPress={() => setCityId(c.id)} />)}</ScrollView> : null}
      <Body small muted>{mode === "local" ? t("mode_local_d", { c: cityMap[cityId]?.name ?? cityId }) : t(`mode_${mode}_d`)}</Body>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Chip label={t("cat_all")} selected={!cat} onPress={() => setCat(null)} />
        {CATS.map(k => <Chip key={k} label={t(`cat_${k}`)} selected={cat === k} onPress={() => setCat(k)} />)}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>{(["all", "today", "weekend", "week"] as When[]).map(w => <Chip key={w} label={t(`when_${w}`)} selected={when === w} onPress={() => setWhen(w)} />)}</ScrollView>
    </View>
  );

  return (
    <Screen>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, gap: 12 }}
        data={error ? [] : scored} keyExtractor={s => s.event.id} ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item }) => <EventCard ev={item.event} city={cityMap[item.event.city_id]} reasons={item.reasons} showCity={mode !== "local"} />}
        ListEmptyComponent={loading ? null : error ? <ErrorState onRetry={load} /> :
          <EmptyState title={t("no_results")} body={t("no_results_sub")} action={<Button label={t("create_first")} onPress={() => router.push("/(tabs)/create")} />} />}
      />
    </Screen>
  );
}
