// What the release dump and the static API share: which records ship and under what name.

import { classify, type Json, type Kind } from "./checks.ts";

// Bump when a field is renamed or removed. Adding a field does not need a bump.
export const SCHEMA_VERSION = 1;
export const LICENSE = "CC-BY-4.0";

// Folder names under data/ are singular in the code, plural in the dump and the API.
export const NAMES: Record<Kind, string> = {
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

export interface Entry {
  // Path parts after the type folder, e.g. ["assembly", "nec-0bd970c0", "2024-05-30"] for a term.
  parts: string[];
  data: Json;
}

async function* walk(dir: string): AsyncGenerator<string> {
  for await (const e of Deno.readDir(dir)) {
    const path = `${dir}/${e.name}`;
    if (e.isDirectory) yield* walk(path);
    else yield path;
  }
}

// Reads data/ in path order. Files that classify() does not know (data/_verify) are skipped.
export async function readData(dir = "data"): Promise<Map<Kind, Entry[]>> {
  const paths: string[] = [];
  for await (const p of walk(dir)) paths.push(p);
  const groups = new Map<Kind, Entry[]>();
  for (const path of paths.sort()) {
    const c = classify(path);
    if (!c) continue;
    const data = JSON.parse(await Deno.readTextFile(path));
    groups.set(c.kind, [...(groups.get(c.kind) ?? []), { parts: c.parts, data }]);
  }
  return groups;
}

// The records a type ships, withdrawn ones left out.
// ruling_periods.json is one file in data/ but ships as the bare list of periods.
export function records(kind: Kind, entries: Entry[]): Json[] {
  const live = entries.filter((e) => e.data.withdrawn !== true);
  return kind === "ruling_periods" ? live.flatMap((e) => e.data.periods) : live.map((e) => e.data);
}
