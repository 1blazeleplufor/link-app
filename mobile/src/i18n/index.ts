import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
import de from "./locales/de.json";
import pt from "./locales/pt.json";
import it from "./locales/it.json";

// To add a language: drop a JSON file with the same keys and register it here (missing keys fall back to English).
export const SUPPORTED = ["fr", "en", "es", "de", "pt", "it"] as const;
export type Lang = (typeof SUPPORTED)[number];
export const LOCALE_TAG: Record<Lang, string> = { fr: "fr-FR", en: "en-GB", es: "es-ES", de: "de-DE", pt: "pt-PT", it: "it-IT" };

const device = getLocales()[0]?.languageCode ?? "en";
const initial: Lang = (SUPPORTED as readonly string[]).includes(device) ? (device as Lang) : "en";

// The prototype's strings use {x} placeholders; i18next is configured to read them as-is.
i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, fr: { translation: fr }, es: { translation: es }, de: { translation: de }, pt: { translation: pt }, it: { translation: it } },
  lng: initial,
  fallbackLng: "en",
  interpolation: { escapeValue: false, prefix: "{", suffix: "}" },
  returnNull: false,
});

export function formatDay(d: Date, lang: Lang): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 864e5);
  if (diff === 0) return i18n.t("today");
  if (diff === 1) return i18n.t("tomorrow");
  return new Intl.DateTimeFormat(LOCALE_TAG[lang], { weekday: "short", day: "numeric", month: "short" }).format(d);
}

/** Event times are shown in the event city's time zone, labelled with the city. */
export function formatTime(d: Date, lang: Lang, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE_TAG[lang], { hour: "2-digit", minute: "2-digit", timeZone }).format(d);
}

export default i18n;
