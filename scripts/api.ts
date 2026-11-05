// Writes the static API into dist/api: the same records as the release dump, one list per type
// at /v1/<type>/index.json and one file per record at /v1/<type>/<id>/index.json.
// A record's id is its path under the type folder without .json, so a term is
// /v1/terms/assembly/nec-0bd970c0/2024-05-30/ and term.office leads to /v1/offices/<office>/.
//
//   deno task api

import type { Json, Kind } from "./checks.ts";
import { type Entry, LICENSE, NAMES, readData, records, SCHEMA_VERSION } from "./bundle.ts";

const OUT = "dist/api";
const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

// Every file the API serves, keyed by its path under OUT.
export function build(groups: Map<Kind, Entry[]>): Map<string, Json> {
  const out = new Map<string, Json>();
  const collections: Record<string, { count: number; url: string }> = {};
  for (const [kind, name] of Object.entries(NAMES) as [Kind, string][]) {
    const entries = groups.get(kind) ?? [];
    const list = records(kind, entries);
    out.set(`v1/${name}/index.json`, { count: list.length, results: list });
    collections[name] = { count: list.length, url: `/v1/${name}/index.json` };
    // ruling_periods is a single list with no ids of its own.
    if (kind === "ruling_periods") continue;
    for (const e of entries) {
      if (e.data.withdrawn === true) continue;
      const bad = e.parts.find((p) => !SEGMENT.test(p));
      if (bad !== undefined) {
        throw new Error(`${name}/${e.parts.join("/")}: "${bad}" is not URL-safe`);
      }
      out.set(`v1/${name}/${e.parts.join("/")}/index.json`, e.data);
    }
  }
  out.set("v1/index.json", {
    version: "v1",
    schema_version: SCHEMA_VERSION,
    license: LICENSE,
    collections,
  });
  out.set("index.json", {
    name: "KoreaPoliticsAPI",
    source: "https://github.com/Seungpyo1007/KoreaPoliticsAPI",
    license: LICENSE,
    versions: { v1: "/v1/index.json" },
  });
  return out;
}

if (import.meta.main) {
  const files = build(await readData());
  await Deno.remove(OUT, { recursive: true }).catch(() => {});
  let bytes = 0;
  for (const [path, body] of files) {
    const text = new TextEncoder().encode(JSON.stringify(body) + "\n");
    await Deno.mkdir(`${OUT}/${path.split("/").slice(0, -1).join("/")}`, { recursive: true });
    await Deno.writeFile(`${OUT}/${path}`, text);
    bytes += text.length;
  }
  console.log(`${OUT}: ${files.size} files, ${(bytes / 1e6).toFixed(1)} MB`);
}
