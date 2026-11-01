import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const extra = (Constants.expoConfig?.extra ?? {}) as { supabaseUrl?: string; supabaseAnonKey?: string };

/** Session tokens go to the iOS Keychain / Android Keystore, not plain storage. */
const secureStorage = {
  getItem: (k: string) => SecureStore.getItemAsync(k),
  setItem: (k: string, v: string) => SecureStore.setItemAsync(k, v),
  removeItem: (k: string) => SecureStore.deleteItemAsync(k),
};

export const isConfigured = Boolean(extra.supabaseUrl && extra.supabaseAnonKey);

export const supabase = createClient(extra.supabaseUrl ?? "http://localhost:54321", extra.supabaseAnonKey ?? "missing-key", {
  auth: {
    storage: Platform.OS === "web" ? undefined : secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});

/** Calls an Edge Function with the user's session and returns typed JSON or a coded error. */
export async function callFunction<T>(name: string, body: unknown): Promise<{ data?: T; error?: string }> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) {
    let code = "network_error";
    try { code = (await (error as { context?: Response }).context?.json())?.error ?? code; } catch { /* keep default */ }
    return { error: code };
  }
  return { data: data ?? undefined };
}
