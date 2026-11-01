import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useStripe } from "@stripe/stripe-react-native";
import Constants from "expo-constants";
import { createCheckout, getEvent } from "@/api";
import { useTheme } from "@/theme/ThemeProvider";
import { LOCALE_TAG, formatDay, type Lang } from "@/i18n";
import { formatMoney } from "@link/shared/pricing";
import { Body, Button, Chip, H1, Screen, Status } from "@/components/ui";

const ticketingMode = ((Constants.expoConfig?.extra ?? {}) as { ticketingMode?: string }).ticketingMode ?? "disabled";

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation(); const { c } = useTheme(); const lang = i18n.language as Lang;
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [ev, setEv] = useState<any>(null); const [typeId, setTypeId] = useState<string | null>(null); const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { getEvent(id).then(e => { setEv(e); setTypeId(e.ticket_types?.[0]?.id ?? null); }).catch(() => setMsg(t("no_results"))); }, [id]);
  if (!ev) return <Screen><View style={{ padding: 20 }}><Body muted>{msg ?? "…"}</Body></View></Screen>;

  // The buy button exists only when LINK has the right and the integration to sell this event.
  const canSell = ev.sale_enabled && ev.ticketing !== "none" && ticketingMode !== "disabled" && ev.availability !== "sold_out";
  const tt = ev.ticket_types?.find((x: any) => x.id === typeId);

  async function buy() {
    if (!tt) return; setBusy(true); setMsg(null);
    const { data, error } = await createCheckout(ev.id, tt.id, qty);
    if (error || !data) { setBusy(false); setMsg(error === "sold_out" ? t("avail_soldout") : error ?? "error"); return; }
    const init = await initPaymentSheet({ paymentIntentClientSecret: data.clientSecret, merchantDisplayName: "LINK", returnURL: "link://stripe-redirect" });
    if (init.error) { setBusy(false); setMsg(init.error.message); return; }
    const res = await presentPaymentSheet();
    setBusy(false);
    // Tickets are issued by the server webhook after Stripe confirms; the app only shows what the server returns.
    if (res.error) setMsg(res.error.code === "Canceled" ? null : t("declined_pay"));
    else router.replace("/(tabs)/activity");
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <H1>{ev.title}</H1>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
          {ev.availability === "verified" ? <Status tone="ok" label={t("avail_verified")} /> : ev.availability === "sold_out" ? <Status tone="bad" label={t("avail_soldout")} /> : <Status tone="muted" label={t("avail_unknown")} />}
          {ticketingMode === "test" && canSell ? <Status tone="test" label="TEST" /> : null}
        </View>
        <Body>{formatDay(new Date(ev.starts_at), lang)} · {ev.venue_name ?? "—"}{ev.area ? `, ${ev.area}` : ""}</Body>
        {ev.description ? <Body>{ev.description}</Body> : null}
        <Body small muted>{t("age_min")} : {ev.min_age}+ · {t("access")} : {ev.accessibility?.step_free ? t("access_yes") : t("access_unknown")}</Body>
        <Body small muted>{t("source")} : {ev.event_sources?.attribution ?? ev.event_sources?.name}{ev.organizers ? ` · ${t("organizer")} : ${ev.organizers.display_name}` : ""}</Body>
        {canSell && ev.ticket_types?.length ? (
          <View style={{ gap: 10, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface }}>
            <Text style={{ color: c.fg, fontWeight: "700" }}>{t("choose_ticket")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{ev.ticket_types.map((x: any) => <Chip key={x.id} label={`${x.name} · ${formatMoney(Math.round(x.price * 100), x.currency, LOCALE_TAG[lang])}`} selected={typeId === x.id} onPress={() => setTypeId(x.id)} />)}</View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Button label="−" variant="secondary" onPress={() => setQty(q => Math.max(1, q - 1))} /><Text style={{ color: c.fg, fontWeight: "800" }}>{qty}</Text><Button label="+" variant="secondary" onPress={() => setQty(q => Math.min(10, q + 1))} />
            </View>
            {tt ? <Body>{t("total")} : {formatMoney(Math.round(tt.price * 100) * qty, tt.currency, LOCALE_TAG[lang])} · {t("fees")} : {t("fees_free", { p: formatMoney(0, tt.currency, LOCALE_TAG[lang]) })}</Body> : null}
            <Button label={t("buy")} onPress={buy} loading={busy} />
          </View>
        ) : ev.ticketing === "none" ? <Body small muted>{t("no_ticketing")}</Body> : null}
        {msg ? <Body small>{msg}</Body> : null}
        <Button label={t("join")} variant="secondary" onPress={() => router.push({ pathname: "/(tabs)/create", params: { eventId: ev.id } })} />
        <Button label={t("close")} variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  );
}
