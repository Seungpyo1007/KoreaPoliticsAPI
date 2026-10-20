// Validates everything under data/ and keeps data/_verify/status.json in step.
//
//   deno task validate                    all records
//   deno task validate --changed <ref>    per-record checks only for files changed since <ref>
//   deno task status                      rewrite data/_verify/status.json
//
// References and dates across records are always checked in full, since a change in one
// file can break another.

import { Ajv2020 } from "ajv/dist/2020.js";
import {
  checkDates,
  checkFiles,
  checkPath,
  checkRefs,
  checkTime,
  classify,
  type Kind,
  type Problem,
  type Rec,
  recordStatus,
  type Status,
  type Tiers,
} from "./checks.ts";

const STATUS_PATH = "data/_verify/status.json";
const KINDS: Kind[] = [
  "person",
  "photo",
  "party",
  "ruling_periods",
  "office",
  "term",
  "pledge",
  "tip",
];

async function git(...args: string[]): Promise<string[]> {
  const { code, stdout, stderr } = await new Deno.Command("git", { args }).output();
  if (code !== 0) throw new Error(new TextDecoder().decode(stderr));
  return new TextDecoder().decode(stdout).split("\n").filter(Boolean);
}

async function loadAjv() {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  for (const entry of Deno.readDirSync("schema")) {
    ajv.addSchema(JSON.parse(await Deno.readTextFile(`schema/${entry.name}`)));
  }
  const base = "https://github.com/Seungpyo1007/KoreaPoliticsAPI/schema/";
  return (kind: Kind) => ajv.getSchema(`${base}${kind}.json`)!;
}

function statusJson(counts: Record<Kind, Record<Status, number>>): string {
  return JSON.stringify(counts, null, 2) + "\n";
}

async function main() {
  const args = Deno.args;
  const writeStatus = args.includes("--write-status");
  const i = args.indexOf("--changed");
  const changed = i >= 0
    ? new Set(await git("diff", "--name-only", `${args[i + 1]}...HEAD`))
    : null;

  const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  const tiers: Tiers = JSON.parse(await Deno.readTextFile("scripts/tiers.json"));
  const schemaFor = await loadAjv();
  const files = await git("ls-files", "--cached", "--others", "--exclude-standard");
  const problems: Problem[] = checkFiles(files);

  const recs: Rec[] = [];
  const counts = Object.fromEntries(
    KINDS.map((k) => [k, { green: 0, yellow: 0, red: 0 }]),
  ) as Record<Kind, Record<Status, number>>;

  for (const path of files.filter((f) => f.startsWith("data/")).sort()) {
    const c = classify(path);
    if (!c) continue;
    const mine = changed === null || changed.has(path);
    const report = (message: string) => mine && problems.push({ path, message });
    let data;
    try {
      data = JSON.parse(await Deno.readTextFile(path));
    } catch (e) {
      report(`not valid JSON: ${(e as Error).message}`);
      continue;
    }
    const validate = schemaFor(c.kind);
    if (!validate(data)) {
      for (const e of validate.errors ?? []) report(`${e.instancePath || "/"} ${e.message}`);
      continue;
    }
    const rec = { path, kind: c.kind, data };
    recs.push(rec);
    checkPath(rec, c.parts).forEach(report);
    checkDates(data, today).forEach(report);
    const { status, problems: p } = recordStatus(data, tiers);
    p.forEach(report);
    counts[c.kind][status]++;
  }

  problems.push(...checkRefs(recs), ...checkTime(recs));

  const want = statusJson(counts);
  if (writeStatus) {
    await Deno.mkdir("data/_verify", { recursive: true });
    await Deno.writeTextFile(STATUS_PATH, want);
  } else {
    const have = await Deno.readTextFile(STATUS_PATH).catch(() => "");
    if (have !== want) {
      problems.push({ path: STATUS_PATH, message: "out of date, run deno task status" });
    }
  }

  for (const p of problems) console.error(`${p.path}: ${p.message}`);
  const n = recs.length;
  if (problems.length > 0) {
    console.error(`\n${problems.length} problem(s) in ${n} record(s)`);
    Deno.exit(1);
  }
  console.log(`${n} record(s) ok`);
}

if (import.meta.main) await main();
