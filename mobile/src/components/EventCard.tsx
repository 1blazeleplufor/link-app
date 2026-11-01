import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { CATEGORY_ART } from "@/theme/brands";
import { formatDay, formatTime, LOCALE_TAG, type Lang } from "@/i18n";
import { priceLabel } from "@link/shared/pricing";
import type { Reason } from "@link/shared/recommend";
import type { City, EventRow } from "@/api";
import { Status } from "./ui";

export function EventCard({ ev, city, reasons, showCity }: { ev: EventRow; city?: City; reasons?: Reason[]; showCity?: boolean }) {
  const { c, displayFont } = useTheme();
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const [a, b, word] = CATEGORY_ART[ev.category_id] ?? CATEGORY_ART.activities;
  const start = new Date(ev.starts_at);
  const tz = city?.timezone ?? "UTC";
  const price = priceLabel(ev.price_min === null ? null : Math.round(ev.price_min * 100), ev.currency ?? city?.currency ?? "EUR", LOCALE_TAG[lang], (k, v) => t(k, v));
  const avail = ev.availability === "verified" ? <Status tone="ok" label={t("avail_verified")} />
    : ev.availability === "sold_out" ? <Status tone="bad" label={t("avail_soldout")} /> : <Status tone="muted" label={t("avail_unknown")} />;
  const why = reasons?.map(r => r.kind === "interest" ? t("why_interest", { x: t(`cat_${r.category}`).toLowerCase() })
    : r.kind === "trip" ? t("why_trip", { x: city?.name ?? r.cityId }) : r.kind === "home_city" ? t("why_city") : null).filter(Boolean);

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${ev.title}, ${formatDay(start, lang)}`} onPress={() => router.push(`/event/${ev.id}`)}
      style={{ backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 18, overflow: "hidden" }}>
      <View style={{ aspectRatio: 2, backgroundColor: a, justifyContent: "flex-end", padding: 12, overflow: "hidden" }}>
        <View style={{ position: "absolute", width: "70%", aspectRatio: 1, borderRadius: 999, backgroundColor: b, opacity: 0.7, right: -40, top: -30 }} />
        <Text style={{ position: "absolute", right: -6, bottom: -22, fontFamily: displayFont, fontWeight: "800", fontSize: 88, color: "#fff", opacity: 0.25 }}>{word}</Text>
        <Text style={{ alignSelf: "flex-start", color: "#fff", backgroundColor: "rgba(0,0,0,.35)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, fontSize: 11, fontWeight: "800", textTransform: "uppercase" }}>{t(`cat_${ev.category_id}`)}</Text>
      </View>
      <View style={{ padding: 14, gap: 8 }}>
        <Text style={{ color: c.fg, fontSize: 17, fontWeight: "700" }}>{ev.title}</Text>
        <Text style={{ color: c.muted, fontSize: 13 }}>
          {formatDay(start, lang)} · {formatTime(start, lang, tz)} · {ev.venue_name ?? "—"}{showCity && city ? `, ${city.name}` : ""}
        </Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: c.fg, fontWeight: "800" }}>{price}</Text>{avail}
        </View>
        {why && why.length ? <Text style={{ color: c.accent3, fontSize: 12, fontWeight: "700" }}>{t("why")} : {why.join(" · ")}</Text> : null}
      </View>
    </Pressable>
  );
}
