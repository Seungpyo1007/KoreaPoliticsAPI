// Checks that need no file system, so the tests can feed them records directly.

export type Tier = "T1" | "T2" | "T3" | "banned";
export type Tiers = Record<Tier, string[]>;
export type Status = "green" | "yellow" | "red";
export type Kind =
  | "person"
  | "photo"
  | "party"
  | "ruling_periods"
  | "office"
  | "term"
  | "pledge"
  | "tip"
  | "assembly";

// deno-lint-ignore no-explicit-any
export type Json = any;

export interface Rec {
  path: string;
  kind: Kind;
  data: Json;
}

export interface Problem {
  path: string;
  message: string;
}

const BLOCKED =
  /\.(jpe?g|png|gif|webp|heic|bmp|tiff?|svg|pdf|hwpx?|docx?|xlsx?|pptx?|zip|7z|rar)$/i;

// Which kind a path under data/ holds, and the parts of the path the record must agree with.
export function classify(path: string): { kind: Kind; parts: string[] } | null {
  const p = path.split("/");
  if (p[0] !== "data") return null;
  const rest = p.slice(1);
  const base = (s: string) => s.replace(/\.json$/, "");
  if (!rest.at(-1)!.endsWith(".json")) return null;
  if (rest.length === 1 && rest[0] === "ruling_periods.json") {
    return { kind: "ruling_periods", parts: [] };
  }
  if (rest.length === 2) {
    const kinds: Record<string, Kind> = {
      people: "person",
      photos: "photo",
      parties: "party",
      tips: "tip",
      assemblies: "assembly",
    };
    const kind = kinds[rest[0]];
    return kind ? { kind, parts: [base(rest[1])] } : null;
  }
  if (rest.length === 3 && rest[0] === "offices") {
    return { kind: "office", parts: [rest[1], base(rest[2])] };
  }
  if (rest.length === 4 && rest[0] === "terms") {
    return { kind: "term", parts: [rest[1], rest[2], base(rest[3])] };
  }
  if (rest.length === 4 && rest[0] === "pledges") {
    return { kind: "pledge", parts: [rest[1], rest[2], base(rest[3])] };
  }
  return null;
}

export function checkFiles(paths: string[]): Problem[] {
  const out: Problem[] = [];
  for (const path of paths) {
    if (BLOCKED.test(path)) {
      out.push({ path, message: "images and documents are not allowed in this repository" });
    } else if (path.startsWith("data/") && path !== "data/_verify/status.json" && !classify(path)) {
      out.push({ path, message: "unexpected file under data/" });
    }
  }
  return out;
}

// The file name and folders repeat values inside the record. They have to match.
export function checkPath(rec: Rec, parts: string[]): string[] {
  const d = rec.data;
  const want: [string, unknown, string][] = [];
  switch (rec.kind) {
    case "person":
    case "party":
    case "tip":
    case "assembly":
      want.push(["id", d.id, parts[0]]);
      break;
    case "photo":
      want.push(["person_id", d.person_id, parts[0]]);
      break;
    case "office":
      want.push(["type", d.type, parts[0]], ["id", d.id, parts[1]]);
      break;
    case "term": {
      // Offices with several seats name each term <starts-on>_<person-id>.
      const [starts, person] = parts[2].split("_");
      want.push(["office", d.office, `${parts[0]}/${parts[1]}`], [
        "starts_on",
        d.starts_on,
        starts,
      ]);
      if (person !== undefined) want.push(["person_id", d.person_id, person]);
      break;
    }
    case "pledge":
      want.push(["election_id", d.election_id, parts[0]], [
        "office",
        d.office,
        `${parts[1]}/${parts[2]}`,
      ]);
      break;
  }
  return want
    .filter(([, got, path]) => got !== path)
    .map(([field, got, path]) => `${field} is ${JSON.stringify(got)} but the path says ${path}`);
}

const DATE_KEYS = new Set(["starts_on", "ends_on", "from", "to", "date", "checked_at"]);

export function isRealDate(s: string): boolean {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function checkDates(data: Json, today: string): string[] {
  const out: string[] = [];
  const walk = (v: Json, where: string) => {
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
    else if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) {
        const at = where ? `${where}.${k}` : k;
        if (DATE_KEYS.has(k) && typeof x === "string") {
          if (!isRealDate(x)) out.push(`${at}: ${x} is not a real date`);
          else if (k === "checked_at" && x > today) out.push(`${at}: ${x} is in the future`);
        }
        walk(x, at);
      }
      const pairs = [["from", "to"], ["starts_on", "ends_on"]];
      for (const [a, b] of pairs) {
        if (typeof v[a] === "string" && typeof v[b] === "string" && v[a] > v[b]) {
          out.push(`${where || "record"}: ${a} ${v[a]} is after ${b} ${v[b]}`);
        }
      }
    }
  };
  walk(data, "");
  return out;
}

export function hostOf(url: string): string {
  let u = new URL(url);
  // An archived copy counts as the page it archived.
  const m = u.hostname === "web.archive.org" && u.pathname.match(/^\/web\/[^/]+\/(https?:\/\/.+)$/);
  if (m) u = new URL(m[1]);
  return u.hostname.replace(/^www\./, "");
}

export function tierOf(url: string, tiers: Tiers): Tier {
  const host = hostOf(url);
  let best: Tier = "T3";
  let len = 0;
  for (const tier of Object.keys(tiers) as Tier[]) {
    for (const d of tiers[tier]) {
      if ((host === d || host.endsWith(`.${d}`)) && d.length > len) {
        best = tier;
        len = d.length;
      }
    }
  }
  return best;
}

// One source list backs one fact. T1 alone is enough, or two T2 from different hosts.
export function factStatus(urls: string[], tiers: Tiers): Status {
  const t = urls.map((u) => tierOf(u, tiers));
  if (t.includes("banned")) return "red";
  if (t.includes("T1")) return "green";
  const t2 = new Set(urls.filter((_, i) => t[i] === "T2").map(hostOf));
  if (t2.size >= 2) return "green";
  if (t2.size === 1) return "yellow";
  return "red";
}

export function sourceLists(data: Json): { where: string; urls: string[] }[] {
  const out: { where: string; urls: string[] }[] = [];
  const walk = (v: Json, where: string) => {
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
    else if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) {
        const at = where ? `${where}.${k}` : k;
        if (k === "source_urls" && Array.isArray(x)) out.push({ where: at, urls: x });
        else walk(x, at);
      }
    }
  };
  walk(data, "");
  return out;
}

export function recordStatus(data: Json, tiers: Tiers): { status: Status; problems: string[] } {
  const problems: string[] = [];
  let status: Status = "green";
  for (const { where, urls } of sourceLists(data)) {
    for (const u of urls) {
      if (tierOf(u, tiers) === "banned") {
        problems.push(`${where}: ${hostOf(u)} is not allowed as a source`);
      }
    }
    const s = factStatus(urls, tiers);
    if (s === "red" && !problems.some((p) => p.startsWith(`${where}:`))) {
      problems.push(`${where}: needs a T1 source or two T2 sources from different sites`);
    }
    if (s === "red" || (s === "yellow" && status === "green")) status = s;
  }
  if (data.verified === true && status !== "green") {
    problems.push(`verified is true but the record is ${status}`);
  }
  if (data.withdrawn === true && !data.withdrawn_reason) {
    problems.push("withdrawn records need withdrawn_reason");
  }
  return { status, problems };
}

export function checkRefs(recs: Rec[]): Problem[] {
  const ids = (kind: Kind) => new Set(recs.filter((r) => r.kind === kind).map((r) => r.data.id));
  const people = ids("person");
  const parties = ids("party");
  const offices = new Set(
    recs.filter((r) => r.kind === "office").map((r) => `${r.data.type}/${r.data.id}`),
  );
  const out: Problem[] = [];
  const need = (path: string, field: string, value: unknown, set: Set<string>) => {
    if (typeof value === "string" && !set.has(value)) {
      out.push({ path, message: `${field} ${value} does not exist` });
    }
  };
  for (const r of recs) {
    const d = r.data;
    switch (r.kind) {
      case "party":
        need(r.path, "predecessor", d.predecessor, parties);
        break;
      case "ruling_periods":
        d.periods.forEach((p: Json, i: number) =>
          need(r.path, `periods[${i}].party_id`, p.party_id, parties)
        );
        break;
      case "photo":
        need(r.path, "person_id", d.person_id, people);
        break;
      case "term":
        need(r.path, "office", d.office, offices);
        need(r.path, "person_id", d.person_id, people);
        need(r.path, "party_id", d.party_id, parties);
        break;
      case "pledge":
        need(r.path, "office", d.office, offices);
        need(r.path, "candidate.person_id", d.candidate.person_id, people);
        need(r.path, "candidate.party_id", d.candidate.party_id, parties);
        break;
    }
  }
  return out;
}

const electionDay = (id: string) => `${id.slice(0, 4)}-${id.slice(4, 6)}-${id.slice(6, 8)}`;

// Terms of one office must not overlap, except an acting holder. A term never starts
// before the election that produced it. Ruling periods are half-open and leave no gap.
export function checkTime(recs: Rec[]): Problem[] {
  const out: Problem[] = [];
  const byOffice = new Map<string, Rec[]>();
  for (const r of recs.filter((r) => r.kind === "term")) {
    const d = r.data;
    if (d.election_id && d.starts_on < electionDay(d.election_id)) {
      out.push({
        path: r.path,
        message: `starts_on ${d.starts_on} is before election ${d.election_id}`,
      });
    }
    if (d.how === "acting") continue;
    byOffice.set(d.office, [...(byOffice.get(d.office) ?? []), r]);
  }
  const seats = new Map<string, number>(
    recs.filter((r) => r.kind === "office").map((
      r,
    ) => [`${r.data.type}/${r.data.id}`, r.data.seats ?? 1]),
  );
  for (const [office, terms] of byOffice) {
    const limit = seats.get(office) ?? 1;
    terms.sort((a, b) => a.data.starts_on.localeCompare(b.data.starts_on));
    const open: Rec[] = [];
    for (const t of terms) {
      // Terms are half-open, so one that ends the day the next starts does not overlap it.
      for (let i = open.length - 1; i >= 0; i--) {
        const end = open[i].data.ends_on;
        if (end !== null && end <= t.data.starts_on) open.splice(i, 1);
      }
      if (open.length >= limit) {
        const message = limit === 1
          ? `overlaps ${open[0].path}`
          : `more than ${limit} terms at once`;
        out.push({ path: t.path, message });
      }
      open.push(t);
    }
  }
  for (const r of recs.filter((r) => r.kind === "ruling_periods")) {
    const ps = r.data.periods;
    for (let i = 0; i < ps.length; i++) {
      const last = i === ps.length - 1;
      if (!last && ps[i].ends_on !== ps[i + 1].starts_on) {
        out.push({
          path: r.path,
          message: `periods[${i}] ends ${ps[i].ends_on} but periods[${i + 1}] starts ${
            ps[i + 1].starts_on
          }`,
        });
      }
      if (last && ps[i].ends_on !== null) {
        out.push({ path: r.path, message: "the last period should be open (ends_on null)" });
      }
    }
  }
  for (const r of recs.filter((r) => r.kind === "party")) {
    const from = r.data.colors.map((c: Json) => c.from ?? "");
    if (from.some((f: string, i: number) => i > 0 && f <= from[i - 1])) {
      out.push({ path: r.path, message: "colors must be ordered by from, oldest first" });
    }
  }
  return out;
}
