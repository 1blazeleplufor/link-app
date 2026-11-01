import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useTranslation } from "react-i18next";
import QRCode from "react-native-qrcode-svg";
import { ticketQr } from "@/api";
import { useTheme } from "@/theme/ThemeProvider";
import { Body, Button, H1, Screen, Status } from "@/components/ui";

/** Rotating QR: refreshed from the server every 30 s, so a screenshot stops working quickly. */
export default function Ticket() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation(); const { c } = useTheme();
  const [payload, setPayload] = useState<string | null>(null); const [status, setStatus] = useState<string>("…");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>; let alive = true;
    const tick = async () => {
      const { data } = await ticketQr(id);
      if (!alive) return;
      setStatus(data?.status ?? "error"); setPayload(data?.payload ?? null);
      if (data?.payload) timer = setTimeout(tick, Math.max(5, (data.refreshInSeconds ?? 30) - 5) * 1000);
    };
    tick();
    return () => { alive = false; clearTimeout(timer); };
  }, [id]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, alignItems: "center" }}>
        <H1>{t("act_tickets")}</H1>
        <View style={{ padding: 16, backgroundColor: "#fff", borderRadius: 16, borderWidth: 2, borderColor: c.line }} accessibilityLabel="QR">
          {payload ? <QRCode value={payload} size={220} /> : <View style={{ width: 220, height: 220 }} />}
        </View>
        {status === "valid" ? <Status tone="ok" label="✓" /> : status === "scanned" ? <Status tone="muted" label={t("already", { t: "" }).split(".")[0]} /> : status === "revoked" ? <Status tone="bad" label={t("revoked")} /> : <Body muted>{status}</Body>}
        <Button label={t("close")} variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  );
}
