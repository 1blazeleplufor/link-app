#!/usr/bin/env bash
# Assemble the single-file prototype (prototype/index.html) from prototype/src/.
# The output is a page fragment (no <html>/<head>) that works both as a claude.ai Artifact and,
# wrapped by build_site, as a standalone site for GitHub Pages (docs/index.html).
set -euo pipefail
cd "$(dirname "$0")"
FONTS='<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Figtree:wght@400;600;700;800&family=Syne:wght@600;800&family=Unbounded:wght@500;800&display=swap">'
QR='<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>'
{
  echo '<title>LINK</title>'
  echo '<meta name="claude:viewport-fit-sides" content="cover">'
  echo '<meta name="description" content="LINK — prototype: find people to share events, outings and trips.">'
  echo "$FONTS"
  echo '<style>'; cat src/style.css; echo '</style>'
  echo '<div class="app"><header class="topbar" id="top"></header><main id="main" tabindex="-1"></main></div>'
  echo '<nav class="tabbar" id="tabs" aria-label="Navigation"></nav>'
  echo "$QR"
  echo '<script>'; cat src/i18n.js; echo; cat src/data.js; echo; cat src/profiles.js; echo; cat src/app.js; echo '</script>'
} > index.html

mkdir -p ../docs
{
  echo '<!doctype html><html lang="fr"><head><meta charset="utf-8">'
  echo '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
  echo '<meta name="theme-color" content="#130F2A"><link rel="manifest" href="manifest.webmanifest">'
  echo '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}[hidden]{display:none!important}img{max-width:100%}</style>'
  echo '</head><body>'
  cat index.html
  echo '</body></html>'
} > ../docs/index.html
cat > ../docs/manifest.webmanifest <<'EOF'
{"name":"LINK","short_name":"LINK","start_url":"./","display":"standalone","background_color":"#130F2A","theme_color":"#130F2A","lang":"fr"}
EOF
echo "Built prototype/index.html ($(wc -c < index.html) bytes) and docs/index.html"
