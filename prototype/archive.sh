#!/usr/bin/env bash
# Publishes frozen earlier versions next to the current one, each with the version switcher:
#   docs/v0/ = first prototype (59c4dc3), docs/v1/ = Afterglow + Hinge profiles (98acdaf), docs/v2/ = Noë profile + gold, no yellow filters (c1215f5).
# Old versions share the browser storage of the current one (same site), so data created in one shows in the others.
set -euo pipefail
cd "$(dirname "$0")/.."
for spec in v0:59c4dc3 v1:98acdaf v2:c1215f5; do
  v=${spec%%:*}; c=${spec##*:}
  mkdir -p docs/$v
  sw="<script>window.LINK_VERSION=\"$v\"</script>$(cat prototype/src/version-switcher.html)"
  git show "$c:docs/index.html" | python3 -c "import sys,re; h=sys.stdin.read(); h=re.sub(r'<script>window\.LINK_VERSION=.*?\}\)\(\);\s*</script>', '', h, flags=re.S); sw=sys.argv[1]; i=h.rfind('</body>'); sys.stdout.write(h[:i]+sw+h[i:])" "$sw" > docs/$v/index.html
  sed -i 's#<link rel="manifest" href="manifest.webmanifest">##' docs/$v/index.html
  if [ "$v" = "v0" ]; then
    # v0 predates Afterglow: show it as Midnight (Indira's pick in v0) without touching the shared saved data.
    css='<style>:root[data-brand="afterglow"]{--font-display:"Unbounded","Arial Black",system-ui,sans-serif;--bg:#140F2E;--surface:#1E1842;--surface-2:#2A2257;--fg:#F4F0FF;--muted:#B5ABDB;--line:#3A3170;--accent:#FF3DA0;--accent-fg:#140F2E;--accent-2:#3FDFFF;--accent-3:#FFD23F;--ok:#4CE29A;--warn:#FFC24A;--bad:#FF6680;--test:#C9A6FF;color-scheme:dark}</style>'
    python3 -c "import sys; p=sys.argv[1]; h=open(p).read(); i=h.rfind('</body>'); open(p,'w').write(h[:i]+sys.argv[2]+h[i:])" docs/$v/index.html "$css"
  fi
done
echo "Archived v0, v1 and v2 in docs/"
