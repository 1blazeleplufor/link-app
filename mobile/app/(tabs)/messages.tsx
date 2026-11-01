import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { listConversations } from "@/api";
import { useIsVerified } from "@/lib/session";
import { useTheme } from "@/theme/ThemeProvider";
import { Body, EmptyState, H1, Screen, VerificationGate } from "@/components/ui";

export default function Messages() {
  const { t } = useTranslation(); const { c } = useTheme(); const insets = useSafeAreaInsets(); const verified = useIsVerified();
  const [rows, setRows] = useState<any[]>([]);
  const load = useCallback(async () => { if (verified) setRows(await listConversations().catch(() => [])); }, [verified]);
  useEffect(() => { load(); }, [load]);

  if (!verified) return <Screen><FlatList data={[]} renderItem={null} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, gap: 12 }} ListHeaderComponent={<><H1>{t("tab_messages")}</H1><VerificationGate /></>} /></Screen>;
  return (
    <Screen>
      <FlatList contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, gap: 12 }} data={rows} keyExtractor={r => r.id}
        ListHeaderComponent={<H1>{t("tab_messages")}</H1>} onRefresh={load} refreshing={false}
        renderItem={({ item }) => {
          const last = [...(item.messages ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
          return (
            <Pressable accessibilityRole="button" onPress={() => router.push(`/conversation/${item.id}`)} style={{ padding: 14, gap: 4, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 18 }}>
              <Text style={{ color: c.fg, fontWeight: "700" }}>{item.kind === "outing" ? t("msg_group", { t: "" }) : t("tab_messages")}</Text>
              {last ? <Body small muted>{last.body}</Body> : null}
            </Pressable>);
        }}
        ListEmptyComponent={<EmptyState title={t("msg_empty")} body={t("msg_empty_sub")} />} />
    </Screen>
  );
}
