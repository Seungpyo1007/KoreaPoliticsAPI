import { assertEquals, assertThrows } from "@std/assert";
import type { Kind } from "./checks.ts";
import type { Entry } from "./bundle.ts";
import { build } from "./api.ts";

const groups = new Map<Kind, Entry[]>([
  ["person", [
    { parts: ["a-1970"], data: { id: "a-1970" } },
    { parts: ["b-1980"], data: { id: "b-1980", withdrawn: true } },
  ]],
  ["term", [{ parts: ["assembly", "nec-1", "2024-05-30"], data: { office: "assembly/nec-1" } }]],
  ["ruling_periods", [{ parts: [], data: { periods: [{ starts_on: "2022-05-10" }] } }]],
]);

Deno.test("api lists and details leave withdrawn records out", () => {
  const out = build(groups);
  assertEquals(out.get("v1/people/index.json"), { count: 1, results: [{ id: "a-1970" }] });
  assertEquals(out.get("v1/people/a-1970/index.json"), { id: "a-1970" });
  assertEquals(out.has("v1/people/b-1980/index.json"), false);
});

Deno.test("api ids keep the path under the type folder", () => {
  const out = build(groups);
  assertEquals(out.get("v1/terms/assembly/nec-1/2024-05-30/index.json"), {
    office: "assembly/nec-1",
  });
});

Deno.test("api ships ruling periods as a list only", () => {
  const out = build(groups);
  assertEquals(out.get("v1/ruling_periods/index.json"), {
    count: 1,
    results: [{ starts_on: "2022-05-10" }],
  });
  assertEquals([...out.keys()].filter((k) => k.startsWith("v1/ruling_periods/")).length, 1);
});

Deno.test("api index counts every type, empty ones too", () => {
  const index = build(groups).get("v1/index.json");
  assertEquals(index.schema_version, 1);
  assertEquals(index.collections.people, { count: 1, url: "/v1/people/index.json" });
  assertEquals(index.collections.tips, { count: 0, url: "/v1/tips/index.json" });
  assertEquals(Object.keys(index.collections).length, 10);
});

Deno.test("api rejects ids that are not URL-safe", () => {
  const bad = new Map<Kind, Entry[]>([["tip", [{ parts: ["a b"], data: {} }]]]);
  assertThrows(() => build(bad));
});
