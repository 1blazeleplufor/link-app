import "@/i18n";
import { useEffect } from "react";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StripeProvider } from "@stripe/stripe-react-native";
import Constants from "expo-constants";
import { useFonts } from "expo-font";
import { BricolageGrotesque_800ExtraBold } from "@expo-google-fonts/bricolage-grotesque";
import { Unbounded_800ExtraBold } from "@expo-google-fonts/unbounded";
import { Syne_800ExtraBold } from "@expo-google-fonts/syne";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider, useSession } from "@/lib/session";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";

function Gate() {
  const { session, profile, loading } = useSession();
  const segments = useSegments();
  const { c } = useTheme();

  // Routing rules: no session → sign-in; session but no profile yet → onboarding; otherwise the app.
  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "onboarding";
    if (!session && !inAuth) router.replace("/(auth)/sign-in");
    else if (session && !profile && !inOnboarding) router.replace("/onboarding");
    else if (session && profile && (inAuth || inOnboarding)) router.replace("/(tabs)");
  }, [loading, session, profile, segments]);

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="event/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="person/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="verify" options={{ presentation: "modal" }} />
        <Stack.Screen name="ticket/[id]" options={{ presentation: "modal" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ BricolageGrotesque: BricolageGrotesque_800ExtraBold, Unbounded: Unbounded_800ExtraBold, Syne: Syne_800ExtraBold });
  const pk = (Constants.expoConfig?.extra as { stripePublishableKey?: string } | undefined)?.stripePublishableKey ?? "";
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SessionProvider>
          <StripeProvider publishableKey={pk} merchantIdentifier="merchant.app.link.social" urlScheme="link">
            <Gate />
          </StripeProvider>
        </SessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
