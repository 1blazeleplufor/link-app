// Renders documentation/PHASE0_CADRAGE.md to docs/cadrage.html (published on GitHub Pages).
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let marked;
try { ({ marked } = require("marked")); } catch { ({ marked } = require(require("child_process").execSync("npm root -g").toString().trim() + "/marked")); }
const md = readFileSync(new URL("../documentation/PHASE0_CADRAGE.md", import.meta.url), "utf8");
const body = marked.parse(md);
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LINK — Dossier de cadrage</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Figtree:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#FFF7F0;--fg:#2B1A12;--muted:#7A6255;--line:#F1D9CA;--accent:#FF5A4E;--surface:#fff;--soft:#FFEDE1}
@media (prefers-color-scheme:dark){:root{--bg:#1C1411;--fg:#FBEDE3;--muted:#C2A898;--line:#43322A;--accent:#FF7568;--surface:#271C17;--soft:#33251E;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 Figtree,system-ui,sans-serif;padding:32px max(16px,env(safe-area-inset-left)) 64px}
main{max-width:780px;margin:0 auto}h1,h2,h3{font-family:"Bricolage Grotesque",system-ui,sans-serif;line-height:1.15;text-wrap:balance}
h1{font-size:clamp(30px,6vw,44px);margin:.2em 0}h1::after{content:"";display:block;width:64px;height:6px;border-radius:3px;background:var(--accent);margin-top:14px}
h2{font-size:24px;margin-top:2.2em;padding-top:1em;border-top:1px solid var(--line)}a{color:var(--accent)}
table{width:100%;border-collapse:collapse;font-size:14px;display:block;overflow-x:auto}th,td{text-align:left;vertical-align:top;padding:8px 10px;border-bottom:1px solid var(--line)}th{background:var(--soft)}
code{background:var(--soft);padding:1px 5px;border-radius:5px;font-size:.9em}hr{border:0;border-top:1px solid var(--line);margin:2em 0}em{color:var(--muted)}
.cta{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:999px;margin:4px 8px 4px 0}
</style></head><body><main>
<p><a class="cta" href="./">Ouvrir le prototype</a><a class="cta" style="background:var(--fg);color:var(--bg)" href="https://github.com/1blazeleplufor/link-app">Voir le code</a></p>
${body}</main></body></html>`;
writeFileSync(new URL("../docs/cadrage.html", import.meta.url), html);
console.log("docs/cadrage.html written", html.length, "bytes");
