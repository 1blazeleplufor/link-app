import type { ReactNode } from "react";
export const metadata = { title: "LINK Console", robots: { index: false } };
export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#FFF7F0", color: "#2B1A12" }}>
        <header style={{ padding: "14px 24px", borderBottom: "1px solid #F1D9CA", display: "flex", gap: 24, alignItems: "baseline" }}>
          <strong style={{ fontSize: 22 }}>LINK Console</strong>
          <nav style={{ display: "flex", gap: 16 }}><a href="/moderation">Modération</a><a href="/moderation#reports">Signalements</a></nav>
        </header>
        <main style={{ padding: 24, maxWidth: 1000 }}>{children}</main>
      </body>
    </html>
  );
}
