// One-off recovery: rebuilds data/sites/*.json from the prerendered RSC payloads
// left in .next/server/app. Usage: node scripts/recover-from-build.mjs
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";

const REQUIRED_KEYS = [
  "slug",
  "generatedAt",
  "candidate",
  "hero",
  "review",
  "experience",
  "skills",
  "whyCompany",
  "education",
  "builtWith",
  "contact",
];

// Walks a string-aware brace match starting from the `{` at `open`.
function matchObject(text, open) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(open, i + 1);
    }
  }
  return null;
}

function extractConfig(payload, slug) {
  const needle = `"slug":"${slug}"`;
  let from = 0;
  for (;;) {
    const hit = payload.indexOf(needle, from);
    if (hit === -1) return null;
    from = hit + 1;
    // Walk back to the opening brace of the object holding this key.
    for (let open = hit; open >= 0; open--) {
      if (payload[open] !== "{") continue;
      const candidate = matchObject(payload, open);
      if (!candidate) continue;
      let parsed;
      try {
        parsed = JSON.parse(candidate);
      } catch {
        continue;
      }
      if (parsed.slug !== slug) continue;
      if (REQUIRED_KEYS.every((k) => k in parsed)) return parsed;
    }
  }
}

const APP_DIR = join(process.cwd(), ".next", "server", "app");
const SITES_DIR = join(process.cwd(), "data", "sites");

const payloads = readdirSync(APP_DIR).filter((f) => f.endsWith(".rsc"));
if (payloads.length === 0) {
  console.error("No .rsc payloads found in .next/server/app -- nothing to recover.");
  process.exit(1);
}

mkdirSync(SITES_DIR, { recursive: true });
let recovered = 0;
for (const file of payloads) {
  const slug = file.slice(0, -".rsc".length);
  const config = extractConfig(readFileSync(join(APP_DIR, file), "utf-8"), slug);
  if (!config) {
    console.log(`skipped ${slug} (no complete config in payload)`);
    continue;
  }
  writeFileSync(
    join(SITES_DIR, `${slug}.json`),
    JSON.stringify(config, null, 2),
    "utf-8"
  );
  console.log(`recovered ${slug}.json`);
  recovered++;
}
console.log(`\n${recovered} config(s) restored to data/sites/`);
