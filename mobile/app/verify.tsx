import { useState } from "react";
import { ScrollView } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import * as WebBrowser from "expo-web-browser";
import { startVerification } from "@/api";
import { useSession } from "@/lib/session";
import { Body, Button, H1, Screen, Status } from "@/components/ui";

/** Opens the identity provider's hosted flow. The result arrives server-side (kyc-webhook) and updates the profile live. */
export default function Verify() {
  const { t } = useTranslation(); const { profile } = useSession();
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const status = profile?.identity_status ?? "none";

  async function start() {
    setBusy(true); setErr(null);
    const { data, error } = await startVerification();
    setBusy(false);
    if (error || !data) { setErr(error === "kyc_not_configured" ? "KYC provider not configured yet." : error ?? "error"); return; }
    await WebBrowser.openBrowserAsync(data.url);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        <H1>{t("v_title")}</H1>
        <Body>{t("v_1")}</Body>
        <Body small muted>{t("v_2")}</Body>
        {status === "verified" ? <Status tone="ok" label={t("verif_ok").replace(/\s*\(.*\)/, "")} />
          : status === "pending" ? <Status tone="warn" label={t("v_pending")} />
          : status === "failed" ? <><Status tone="bad" label={t("verif_failed")} /><Body>{t("v_failed")}</Body></>
          : status === "manual_review" ? <Body>{t("v_manual_sent")}</Body> : null}
        {status !== "verified" && status !== "pending" ? <Button label={t("verify_now")} onPress={start} loading={busy} /> : null}
        {err ? <Body small>{err}</Body> : null}
        <Button label={t("close")} variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  );
}
