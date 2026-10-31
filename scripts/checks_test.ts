import { assertEquals } from "@std/assert";
import {
  checkDates,
  checkFiles,
  checkPath,
  checkRefs,
  checkTime,
  classify,
  factStatus,
  type Rec,
  recordStatus,
  tierOf,
  type Tiers,
} from "./checks.ts";

const tiers: Tiers = JSON.parse(Deno.readTextFileSync("scripts/tiers.json"));

Deno.test("classify maps folders to kinds", () => {
  assertEquals(classify("data/parties/gungminui-him.json")?.kind, "party");
  assertEquals(classify("data/ruling_periods.json")?.kind, "ruling_periods");
  assertEquals(classify("data/terms/assembly/nec-0bd970c0/2024-05-30.json")?.parts, [
    "assembly",
    "nec-0bd970c0",
    "2024-05-30",
  ]);
  assertEquals(classify("data/assemblies/22.json")?.kind, "assembly");
  assertEquals(classify("data/events/2016-12-09_impeachment.json")?.kind, "event");
  assertEquals(classify("data/tips/ruling-party.json")?.parts, ["ruling-party"]);
  assertEquals(classify("data/tips/term/ruling-party.json"), null);
  assertEquals(classify("data/people/a/b.json"), null);
});

Deno.test("photos and documents are rejected anywhere", () => {
  const bad = checkFiles(["data/photos/x.jpg", "notes/scan.PDF", "data/people/x.txt"]);
  assertEquals(bad.length, 3);
  assertEquals(checkFiles(["data/photos/x.json", "data/_verify/status.json"]), []);
});

Deno.test("path must agree with the record", () => {
  const rec: Rec = {
    path: "data/terms/assembly/nec-1/2024-05-30.json",
    kind: "term",
    data: { office: "assembly/nec-2", starts_on: "2024-05-30" },
  };
  assertEquals(checkPath(rec, ["assembly", "nec-1", "2024-05-30"]).length, 1);
  const tip: Rec = { path: "data/tips/veto.json", kind: "tip", data: { id: "impeachment" } };
  assertEquals(checkPath(tip, ["veto"]).length, 1);
});

Deno.test("dates must exist and run forward", () => {
  assertEquals(checkDates({ checked_at: "2026-02-30" }, "2026-10-21").length, 1);
  assertEquals(checkDates({ checked_at: "2026-10-22" }, "2026-10-21").length, 1);
  assertEquals(
    checkDates({ career: [{ from: "2020-01-01", to: "2019-01-01" }] }, "2026-10-21").length,
    1,
  );
});

Deno.test("tiers use the most specific domain and unwrap archives", () => {
  assertEquals(tierOf("https://open.assembly.go.kr/x", tiers), "T1");
  assertEquals(tierOf("https://mlbpark.donga.com/x", tiers), "banned");
  assertEquals(tierOf("https://www.donga.com/x", tiers), "T2");
  assertEquals(tierOf("https://namu.wiki/w/x", tiers), "banned");
  assertEquals(tierOf("https://example.com", tiers), "T3");
  assertEquals(
    tierOf("https://web.archive.org/web/20240414230234/https://www.justice21.org/a", tiers),
    "T1",
  );
});

Deno.test("fact status", () => {
  assertEquals(factStatus(["https://www.nec.go.kr/a"], tiers), "green");
  assertEquals(factStatus(["https://www.yna.co.kr/a", "https://www.hani.co.kr/b"], tiers), "green");
  assertEquals(factStatus(["https://www.yna.co.kr/a", "https://www.yna.co.kr/b"], tiers), "yellow");
  assertEquals(factStatus(["https://example.com"], tiers), "red");
  assertEquals(factStatus(["https://www.nec.go.kr/a", "https://namu.wiki/w/x"], tiers), "red");
});

Deno.test("verified needs green", () => {
  const data = { verified: true, source_urls: ["https://www.yna.co.kr/a"] };
  const { status, problems } = recordStatus(data, tiers);
  assertEquals(status, "yellow");
  assertEquals(problems.length, 1);
});

Deno.test("references must resolve", () => {
  const recs: Rec[] = [
    { path: "p", kind: "party", data: { id: "a", predecessor: "missing", colors: [] } },
  ];
  assertEquals(checkRefs(recs).length, 1);
});

Deno.test("terms of one office do not overlap", () => {
  const term = (starts_on: string, ends_on: string | null, how = "elected"): Rec => ({
    path: starts_on,
    kind: "term",
    data: { office: "assembly/x", starts_on, ends_on, how, election_id: null },
  });
  assertEquals(checkTime([term("2020-05-30", "2024-05-29"), term("2024-05-30", null)]), []);
  assertEquals(checkTime([term("2020-05-30", null), term("2024-05-30", null)]).length, 1);
  assertEquals(checkTime([term("2020-05-30", null), term("2024-01-01", null, "acting")]), []);
});

Deno.test("a term's party existed on its election day", () => {
  const party: Rec = {
    path: "p",
    kind: "party",
    data: { id: "a", colors: [], period: { starts_on: "1963-02-26", ends_on: "1980-10-27" } },
  };
  const term = (starts_on: string, election_id: string | null = null): Rec => ({
    path: starts_on,
    kind: "term",
    data: { office: `assembly/${starts_on}`, party_id: "a", starts_on, ends_on: null, election_id },
  });
  assertEquals(checkTime([party, term("1963-12-17"), term("1980-10-26")]), []);
  assertEquals(checkTime([party, term("1980-10-27")]).length, 1);
  assertEquals(checkTime([party, term("1981-04-11")]).length, 1);
  assertEquals(checkTime([party, term("1981-04-11", "19801001")]), []);
});

Deno.test("ruling periods leave no gap", () => {
  const rp = (periods: unknown[]): Rec[] => [
    { path: "r", kind: "ruling_periods", data: { periods } },
  ];
  const ok = [
    { starts_on: "2017-05-10", ends_on: "2022-05-10" },
    { starts_on: "2022-05-10", ends_on: null },
  ];
  assertEquals(checkTime(rp(ok)), []);
  assertEquals(checkTime(rp([{ ...ok[0], ends_on: "2022-05-09" }, ok[1]])).length, 1);
});

Deno.test("an office with seats allows that many terms at once", () => {
  const office: Rec = {
    path: "o",
    kind: "office",
    data: { type: "assembly", id: "proportional-22", seats: 2 },
  };
  const term = (person_id: string, starts_on: string): Rec => ({
    path: person_id,
    kind: "term",
    data: {
      office: "assembly/proportional-22",
      person_id,
      starts_on,
      ends_on: null,
      how: "elected",
    },
  });
  assertEquals(checkTime([office, term("a", "2024-05-30"), term("b", "2024-05-30")]), []);
  assertEquals(
    checkTime([office, term("a", "2024-05-30"), term("b", "2024-05-30"), term("c", "2024-05-30")])
      .length,
    1,
  );
});
