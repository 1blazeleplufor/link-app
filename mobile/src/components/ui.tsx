import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";

export function Screen({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return <View style={{ flex: 1, backgroundColor: c.bg }}>{children}</View>;
}

export function H1({ children }: { children: ReactNode }) {
  const { c, displayFont } = useTheme();
  return <Text accessibilityRole="header" style={{ color: c.fg, fontFamily: displayFont, fontSize: 30, fontWeight: "800", letterSpacing: -0.5 }}>{children}</Text>;
}

export function Body({ children, muted, small }: { children: ReactNode; muted?: boolean; small?: boolean }) {
  const { c } = useTheme();
  return <Text style={{ color: muted ? c.muted : c.fg, fontSize: small ? 13 : 15, lineHeight: small ? 18 : 21 }}>{children}</Text>;
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "test";
export function Button({ label, variant = "primary", loading, style, ...p }: { label: string; variant?: Variant; loading?: boolean; style?: ViewStyle } & PressableProps) {
  const { c } = useTheme();
  const bg = { primary: c.accent, secondary: c.surface2, ghost: "transparent", danger: "transparent", test: c.test }[variant];
  const fg = { primary: c.accentFg, secondary: c.fg, ghost: c.fg, danger: c.bad, test: "#fff" }[variant];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!p.disabled, busy: !!loading }}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, borderColor: variant === "danger" ? c.bad : c.line, borderWidth: variant === "ghost" || variant === "danger" ? 1 : 0, opacity: p.disabled ? 0.45 : pressed ? 0.85 : 1 }, style]} {...p}>
      {loading ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontWeight: "700", fontSize: 15 }}>{label}</Text>}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
      style={[s.chip, { backgroundColor: selected ? c.fg : c.surface, borderColor: selected ? c.fg : c.line }]}>
      <Text style={{ color: selected ? c.bg : c.fg, fontWeight: "600", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function Status({ tone, label }: { tone: "ok" | "warn" | "bad" | "test" | "muted"; label: string }) {
  const { c } = useTheme();
  const color = tone === "muted" ? c.muted : c[tone];
  return (
    <View style={[s.status, { backgroundColor: c.surface2 }]}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ color, fontWeight: "700", fontSize: 12 }}>{label}</Text>
    </View>
  );
}

/** Shown wherever an action needs a verified identity (invitations, messages). */
export function VerificationGate() {
  const { c } = useTheme(); const { t } = useTranslation();
  return (
    <View style={[s.card, { backgroundColor: c.surface2, borderColor: c.line }]}>
      <Text style={{ color: c.fg, fontWeight: "700", fontSize: 16 }}>{t("lock_title")}</Text>
      <Body muted small>{t("lock_sub")}</Body>
      <Button label={t("verify_now")} onPress={() => router.push("/verify")} style={{ alignSelf: "flex-start" }} />
    </View>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={[s.empty, { borderColor: c.line }]}>
      <Text style={{ color: c.fg, fontWeight: "700", fontSize: 17, textAlign: "center" }}>{title}</Text>
      {body ? <Body muted>{body}</Body> : null}
      {action}
    </View>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return <EmptyState title={t("offline")} action={<Button label={t("back")} variant="secondary" onPress={onRetry} />} />;
}

export function DemoBanner() {
  const { c } = useTheme(); const { t } = useTranslation();
  return <View style={[s.card, { backgroundColor: c.surface2, borderColor: c.test }]}><Body small>{t("demo_banner")}</Body></View>;
}

export const s = StyleSheet.create({
  btn: { minHeight: 46, borderRadius: 999, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  chip: { minHeight: 36, borderRadius: 999, borderWidth: 1, paddingHorizontal: 13, justifyContent: "center", marginRight: 7 },
  status: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignSelf: "flex-start" },
  card: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 8 },
  empty: { borderRadius: 18, borderWidth: 2, borderStyle: "dashed", padding: 28, gap: 10, alignItems: "center" },
});
