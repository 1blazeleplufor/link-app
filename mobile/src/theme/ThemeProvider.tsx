import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { BRANDS, type BrandId, type Palette } from "./brands";

type Appearance = "system" | "light" | "dark";
interface ThemeState { brand: BrandId; appearance: Appearance; c: Palette; displayFont: string; setBrand: (b: BrandId) => void; setAppearance: (a: Appearance) => void }
const Ctx = createContext<ThemeState | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [brand, setBrandState] = useState<BrandId>("fiesta");
  const [appearance, setAppearanceState] = useState<Appearance>("system");

  useEffect(() => {
    AsyncStorage.multiGet(["link.brand", "link.appearance"]).then(([[, b], [, a]]) => {
      if (b && b in BRANDS) setBrandState(b as BrandId);
      if (a === "light" || a === "dark" || a === "system") setAppearanceState(a);
    }).catch(() => undefined);
  }, []);

  const value = useMemo<ThemeState>(() => {
    const dark = appearance === "dark" || (appearance === "system" && system === "dark");
    const b = BRANDS[brand];
    return {
      brand, appearance, c: dark ? b.dark : b.light, displayFont: b.displayFont,
      setBrand: (x) => { setBrandState(x); AsyncStorage.setItem("link.brand", x).catch(() => undefined); },
      setAppearance: (x) => { setAppearanceState(x); AsyncStorage.setItem("link.appearance", x).catch(() => undefined); },
    };
  }, [brand, appearance, system]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme outside ThemeProvider");
  return v;
}
