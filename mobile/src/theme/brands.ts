/** The three visual directions from the prototype. Indira picks one; the others are removed before launch. */
export type BrandId = "fiesta" | "midnight" | "riviera";
export interface Palette { bg: string; surface: string; surface2: string; fg: string; muted: string; line: string; accent: string; accentFg: string; accent2: string; accent3: string; ok: string; warn: string; bad: string; test: string }
export interface Brand { id: BrandId; name: string; displayFont: string; light: Palette; dark: Palette }

export const BRANDS: Record<BrandId, Brand> = {
  fiesta: {
    id: "fiesta", name: "Fiesta", displayFont: "BricolageGrotesque",
    light: { bg: "#FFF7F0", surface: "#FFFFFF", surface2: "#FFEDE1", fg: "#2B1A12", muted: "#7A6255", line: "#F1D9CA", accent: "#FF5A4E", accentFg: "#FFFFFF", accent2: "#FFC233", accent3: "#0E9F9A", ok: "#1F8A4C", warn: "#B26A00", bad: "#C62D2D", test: "#7A3DD1" },
    dark: { bg: "#1C1411", surface: "#271C17", surface2: "#33251E", fg: "#FBEDE3", muted: "#C2A898", line: "#43322A", accent: "#FF7568", accentFg: "#1C1411", accent2: "#FFCF5C", accent3: "#3CC9C3", ok: "#4CC17C", warn: "#F0A63A", bad: "#FF6B6B", test: "#B48CFF" },
  },
  midnight: {
    id: "midnight", name: "Midnight Club", displayFont: "Unbounded",
    light: { bg: "#140F2E", surface: "#1E1842", surface2: "#2A2257", fg: "#F4F0FF", muted: "#B5ABDB", line: "#3A3170", accent: "#FF3DA0", accentFg: "#140F2E", accent2: "#3FDFFF", accent3: "#FFD23F", ok: "#4CE29A", warn: "#FFC24A", bad: "#FF6680", test: "#C9A6FF" },
    dark: { bg: "#140F2E", surface: "#1E1842", surface2: "#2A2257", fg: "#F4F0FF", muted: "#B5ABDB", line: "#3A3170", accent: "#FF3DA0", accentFg: "#140F2E", accent2: "#3FDFFF", accent3: "#FFD23F", ok: "#4CE29A", warn: "#FFC24A", bad: "#FF6680", test: "#C9A6FF" },
  },
  riviera: {
    id: "riviera", name: "Riviera", displayFont: "Syne",
    light: { bg: "#F3F8FF", surface: "#FFFFFF", surface2: "#E3EEFF", fg: "#0D2140", muted: "#56698A", line: "#CFDDF3", accent: "#1559D6", accentFg: "#FFFFFF", accent2: "#F2D635", accent3: "#19B58C", ok: "#14804A", warn: "#A86400", bad: "#C42B3B", test: "#7A3DD1" },
    dark: { bg: "#0B1729", surface: "#13223B", surface2: "#1B2E4D", fg: "#EAF2FF", muted: "#9FB3D3", line: "#2A3F63", accent: "#5B93FF", accentFg: "#0B1729", accent2: "#F5DF5A", accent3: "#3FD3A8", ok: "#4CC17C", warn: "#F0A63A", bad: "#FF6B7A", test: "#B48CFF" },
  },
};

export const CATEGORY_ART: Record<string, [string, string, string]> = {
  concerts: ["#FF5A4E", "#7A1FA2", "LIVE"], festivals: ["#FFB020", "#E8436B", "FEST"], clubs: ["#3A1C71", "#D76D77", "NIGHT"],
  rooftops: ["#FF8C42", "#2E5BBA", "SKY"], culture: ["#0E9F9A", "#1D3557", "ART"], activities: ["#19B58C", "#F2C230", "PLAY"],
  sports: ["#1559D6", "#00B3A4", "GAME"], trips: ["#00A6D6", "#F7B32B", "GO"], food: ["#E85D2F", "#8C2F39", "EAT"], private: ["#5B3E96", "#E0447C", "VIP"],
};
