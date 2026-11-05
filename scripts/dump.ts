// Bundles data/ into dist/: one JSON array per type plus manifest.json with sha256 sums.
// Withdrawn records are left out.
//
//   deno task dump v2026.10.21

import type { Kind } from "./checks.ts";
import { LICENSE, NAMES, readData, records, SCHEMA_VERSION } from "./bundle.ts";

const tag = Deno.args[0];
// A second release on the same day adds a counter: v2026.10.22.2.
if (!/^v\d{4}\.\d{2}\.\d{2}(\.\d+)?$/.test(tag ?? "")) {
  console.error("usage: deno task dump vYYYY.MM.DD[.N]");
  Deno.exit(2);
}

const groups = await readData();

const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

await Deno.remove("dist", { recursive: true }).catch(() => {});
await Deno.mkdir("dist");
const files: Record<string, { records: number; sha256: string }> = {};
for (const [kind, name] of Object.entries(NAMES) as [Kind, string][]) {
  const list = records(kind, groups.get(kind) ?? []);
  const body = new TextEncoder().encode(JSON.stringify(list) + "\n");
  await Deno.writeFile(`dist/${name}.json`, body);
  files[`${name}.json`] = {
    records: list.length,
    sha256: hex(await crypto.subtle.digest("SHA-256", body)),
  };
}
const manifest = { tag, schema_version: SCHEMA_VERSION, license: LICENSE, files };
await Deno.writeTextFile("dist/manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify(manifest, null, 2));
