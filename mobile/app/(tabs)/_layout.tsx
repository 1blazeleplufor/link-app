import type { ReactElement } from "react";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";

const icons: Record<string, (color: string) => ReactElement> = {
  index: (c) => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}><Circle cx={12} cy={12} r={9} /><Path d="m15.5 8.5-2 5-5 2 2-5z" /></Svg>,
  people: (c) => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}><Circle cx={9} cy={8} r={3.5} /><Path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5" /><Circle cx={17} cy={9} r={2.5} /></Svg>,
  create: (c) => <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.4}><Path d="M12 5v14M5 12h14" /></Svg>,
  activity: (c) => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}><Path d="M3 9V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v3a2.5 2.5 0 0 0 0 5v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a2.5 2.5 0 0 0 0-5z" /></Svg>,
  messages: (c) => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}><Path d="M4 5h16v11H9l-5 4z" /></Svg>,
  profile: (c) => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}><Circle cx={12} cy={8} r={4} /><Path d="M4 21c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5" /></Svg>,
};

export default function TabsLayout() {
  const { t } = useTranslation(); const { c } = useTheme();
  const tab = (name: string, key: string) => (
    <Tabs.Screen key={name} name={name} options={{ title: t(key), tabBarIcon: ({ color }) => icons[name](color), tabBarAccessibilityLabel: t(key) }} />
  );
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: c.accent, tabBarInactiveTintColor: c.muted, tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line } }}>
      {tab("index", "tab_explore")}{tab("people", "tab_people")}{tab("create", "tab_create")}
      {tab("activity", "tab_activity")}{tab("messages", "tab_messages")}{tab("profile", "tab_profile")}
    </Tabs>
  );
}
