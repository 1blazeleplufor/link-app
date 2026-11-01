// Fails if any language is missing a key, has an extra key, or drops a {placeholder}. Run: node scripts/check-i18n.mjs
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "mobile", "src", "i18n", "locales");
const files = readdirSync(dir).filter(f => f.endsWith(".json"));
const data = Object.fromEntries(files.map(f => [f.replace(".json", ""), JSON.parse(readFileSync(join(dir, f), "utf8"))]));
const ref = data.en; let problems = 0;
const ph = s => (s.match(/\{[a-z]+\}/g) ?? []).sort().join(",");
for (const [lang, strings] of Object.entries(data)) {
  for (const k of Object.keys(ref)) {
    if (!(k in strings)) { console.error(`${lang}: missing "${k}"`); problems++; }
    else if (ph(strings[k]) !== ph(ref[k])) { console.error(`${lang}: placeholder mismatch in "${k}"`); problems++; }
  }
  for (const k of Object.keys(strings)) if (!(k in ref)) { console.error(`${lang}: extra key "${k}"`); problems++; }
}
console.log(`${files.length} languages × ${Object.keys(ref).length} keys — ${problems ? problems + " problem(s)" : "all consistent"}`);
process.exit(problems ? 1 : 0);
