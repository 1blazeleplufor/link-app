#!/usr/bin/env bash
# Edge Functions can only import files inside supabase/functions, so shared logic is copied there.
set -euo pipefail; cd "$(dirname "$0")/.."
cp shared/src/ticketQr.ts shared/src/pricing.ts supabase/functions/_shared/
echo "shared → supabase/functions/_shared synced"
