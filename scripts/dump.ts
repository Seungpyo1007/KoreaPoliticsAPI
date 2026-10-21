// Bundles data/ into dist/: one JSON array per type plus manifest.json with sha256 sums.
// Withdrawn records are left out.
//
//   deno task dump v2026.10.21

import { classify, type Json, type Kind } from "./checks.ts";

// Bump when a field is renamed or removed. Adding a field does not need a bump.
const SCHEMA_VERSION = 1;

const NAMES: Record<Kind, string> = {
  person: "people",
  photo: "photos",
  party: "parties",
  ruling_periods: "ruling_periods",
  office: "offices",
  term: "terms",
  pledge: "pledges",
  tip: "tips",
  assembly: "assemblies",
  event: "events",
};

const tag = Deno.args[0];
// A second release on the same day adds a counter: v2026.10.22.2.
if (!/^v\d{4}\.\d{2}\.\d{2}(\.\d+)?$/.test(tag ?? "")) {
  console.error("usage: deno task dump vYYYY.MM.DD[.N]");
  Deno.exit(2);
}

async function* walk(dir: string): AsyncGenerator<string> {
  for await (const e of Deno.readDir(dir)) {
    const path = `${dir}/${e.name}`;
    if (e.isDirectory) yield* walk(path);
    else yield path;
  }
}

const paths: string[] = [];
for await (const p of walk("data")) paths.push(p);

const groups = new Map<Kind, Json[]>();
for (const path of paths.sort()) {
  const c = classify(path);
  if (!c) continue;
  const data = JSON.parse(await Deno.readTextFile(path));
  if (data.withdrawn === true) continue;
  // ruling_periods.json is one file in data/ but ships as the bare list of periods.
  const records = c.kind === "ruling_periods" ? data.periods : [data];
  groups.set(c.kind, [...(groups.get(c.kind) ?? []), ...records]);
}

const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

await Deno.remove("dist", { recursive: true }).catch(() => {});
await Deno.mkdir("dist");
const files: Record<string, { records: number; sha256: string }> = {};
for (const [kind, name] of Object.entries(NAMES) as [Kind, string][]) {
  const records = groups.get(kind) ?? [];
  const body = new TextEncoder().encode(JSON.stringify(records) + "\n");
  await Deno.writeFile(`dist/${name}.json`, body);
  files[`${name}.json`] = {
    records: records.length,
    sha256: hex(await crypto.subtle.digest("SHA-256", body)),
  };
}
const manifest = { tag, schema_version: SCHEMA_VERSION, license: "CC-BY-4.0", files };
await Deno.writeTextFile("dist/manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify(manifest, null, 2));
