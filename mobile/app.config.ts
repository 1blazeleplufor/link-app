import type { ExpoConfig } from "expo/config";

// Bundle identifiers are placeholders until Indira's Apple/Google developer accounts exist.
const config: ExpoConfig = {
  name: "LINK",
  slug: "link-app",
  scheme: "link",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: process.env.IOS_BUNDLE_ID ?? "app.link.social",
    supportsTablet: false,
    usesAppleSignIn: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription: "LINK uses your approximate location only to suggest outings near you. You can always pick a city by hand instead.",
      NSCameraUsageDescription: "The camera is used to scan tickets at the entrance (organizers only).",
    },
  },
  android: {
    package: process.env.ANDROID_PACKAGE ?? "app.link.social",
    permissions: ["ACCESS_COARSE_LOCATION", "CAMERA", "POST_NOTIFICATIONS"],
    blockedPermissions: ["ACCESS_FINE_LOCATION"],
  },
  plugins: [
    "expo-router",
    "expo-localization",
    "expo-secure-store",
    "expo-apple-authentication",
    ["expo-location", { locationWhenInUsePermission: "LINK uses your approximate location only to suggest outings near you." }],
    ["expo-camera", { cameraPermission: "The camera is used to scan tickets at the entrance (organizers only)." }],
    "expo-notifications",
    ["@stripe/stripe-react-native", { merchantIdentifier: process.env.APPLE_MERCHANT_ID ?? "merchant.app.link.social", enableGooglePay: true }],
  ],
  experiments: { typedRoutes: true },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    ticketingMode: process.env.EXPO_PUBLIC_TICKETING_MODE ?? "disabled",
  },
};
export default config;
