import { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { listMessages, sendMessage } from "@/api";
import { useIsVerified, useSession } from "@/lib/session";
import { useTheme } from "@/theme/ThemeProvider";
import { Body, Button, Screen, VerificationGate } from "@/components/ui";

interface Msg { id: string; sender_id: string; body: string; created_at: string }

export default function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation(); const { c } = useTheme(); const insets = useSafeAreaInsets();
  const { profile } = useSession(); const verified = useIsVerified();
  const [msgs, setMsgs] = useState<Msg[]>([]); const [text, setText] = useState(""); const [err, setErr] = useState<string | null>(null);
  const list = useRef<FlatList<Msg>>(null);

  useEffect(() => {
    listMessages(id).then(m => setMsgs(m as Msg[])).catch(() => undefined);
    // Realtime: new rows arrive only if RLS lets this user read them.
    const ch = supabase.channel(`conv-${id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
      (p) => setMsgs(m => m.some(x => x.id === (p.new as Msg).id) ? m : [...m, p.new as Msg])).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  if (!verified) return <Screen><View style={{ padding: 20, paddingTop: insets.top + 20 }}><VerificationGate /></View></Screen>;

  async function send() {
    const body = text.trim(); if (!body || !profile) return;
    setErr(null); setText("");
    try { await sendMessage(id, profile.id, body); } catch { setErr(t("declined")); setText(body); }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, paddingTop: insets.top }}>
        <View style={{ padding: 12, margin: 12, borderRadius: 14, backgroundColor: c.surface2 }}><Body small>{t("msg_safety")}</Body></View>
        <FlatList ref={list} data={msgs} keyExtractor={m => m.id} contentContainerStyle={{ padding: 12, gap: 8 }} onContentSizeChange={() => list.current?.scrollToEnd()}
          renderItem={({ item }) => {
            const me = item.sender_id === profile?.id;
            return <View style={{ alignSelf: me ? "flex-end" : "flex-start", maxWidth: "80%", backgroundColor: me ? c.accent : c.surface, borderColor: c.line, borderWidth: me ? 0 : 1, padding: 10, borderRadius: 18 }}>
              <Text style={{ color: me ? c.accentFg : c.fg }}>{item.body}</Text>
            </View>;
          }} />
        {err ? <Body small>{err}</Body> : null}
        <View style={{ flexDirection: "row", gap: 8, padding: 12, paddingBottom: insets.bottom + 12 }}>
          <TextInput accessibilityLabel={t("msg_placeholder")} placeholder={t("msg_placeholder")} placeholderTextColor={c.muted} value={text} onChangeText={setText} maxLength={2000}
            style={{ flex: 1, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, color: c.fg, borderRadius: 999, paddingHorizontal: 16, minHeight: 46 }} onSubmitEditing={send} returnKeyType="send" />
          <Button label={t("send")} onPress={send} disabled={!text.trim()} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
