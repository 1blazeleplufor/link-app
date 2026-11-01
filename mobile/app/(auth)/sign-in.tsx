import { useState } from "react";
import { Platform, TextInput, View, KeyboardAvoidingView, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import * as Crypto from "expo-crypto";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/theme/ThemeProvider";
import { Body, Button, Chip, H1, Screen } from "@/components/ui";

WebBrowser.maybeCompleteAuthSession();

/** Email or phone one-time code (no password to leak), Sign in with Apple, Google. */
export default function SignIn() {
  const { t } = useTranslation(); const { c } = useTheme();
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [id, setId] = useState(""); const [code, setCode] = useState("");
  const [sent, setSent] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);

  const input = { borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, color: c.fg, borderRadius: 12, padding: 12, minHeight: 46, fontSize: 16 } as const;

  async function sendCode() {
    setBusy(true); setErr(null);
    const { error } = method === "email" ? await supabase.auth.signInWithOtp({ email: id.trim() }) : await supabase.auth.signInWithOtp({ phone: id.trim() });
    setBusy(false); if (error) setErr(error.message); else setSent(true);
  }
  async function verify() {
    setBusy(true); setErr(null);
    const { error } = method === "email"
      ? await supabase.auth.verifyOtp({ email: id.trim(), token: code.trim(), type: "email" })
      : await supabase.auth.verifyOtp({ phone: id.trim(), token: code.trim(), type: "sms" });
    setBusy(false); if (error) setErr(error.message);
  }
  async function apple() {
    const rawNonce = Crypto.randomUUID();
    const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
    const cred = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL], nonce: hashed });
    if (cred.identityToken) {
      const { error } = await supabase.auth.signInWithIdToken({ provider: "apple", token: cred.identityToken, nonce: rawNonce });
      if (error) setErr(error.message);
    }
  }
  async function google() {
    const redirectTo = makeRedirectUri({ scheme: "link" });
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo, skipBrowserRedirect: true } });
    if (error || !data.url) { setErr(error?.message ?? "oauth_failed"); return; }
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type === "success") {
      const authCode = new URL(res.url).searchParams.get("code");
      if (authCode) await supabase.auth.exchangeCodeForSession(authCode);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 80, gap: 16 }}>
          <H1>LINK</H1>
          <Body muted>{t("tagline")}</Body>
          <View style={{ flexDirection: "row" }}>
            <Chip label="Email" selected={method === "email"} onPress={() => { setMethod("email"); setSent(false); }} />
            <Chip label="SMS" selected={method === "phone"} onPress={() => { setMethod("phone"); setSent(false); }} />
          </View>
          <TextInput accessibilityLabel={method === "email" ? "Email" : "Phone"} style={input} value={id} onChangeText={setId}
            keyboardType={method === "email" ? "email-address" : "phone-pad"} autoCapitalize="none" autoComplete={method === "email" ? "email" : "tel"}
            placeholder={method === "email" ? "you@example.com" : "+33 6 12 34 56 78"} placeholderTextColor={c.muted} />
          {sent ? (
            <>
              <TextInput accessibilityLabel="Code" style={input} value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" placeholder="123456" placeholderTextColor={c.muted} />
              <Button label={t("ob_start")} onPress={verify} loading={busy} disabled={code.length < 6} />
            </>
          ) : <Button label={t("send")} onPress={sendCode} loading={busy} disabled={!id} />}
          {err ? <Body small>{err}</Body> : null}
          {Platform.OS === "ios" ? (
            <AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK} cornerRadius={999} style={{ height: 48 }} onPress={apple} />
          ) : null}
          <Button label="Google" variant="ghost" onPress={google} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
