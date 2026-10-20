// Requests every source URL under data/ and prints the ones that fail as a Markdown list.
// Prints nothing when all of them answer. The weekly workflow turns the output into an issue.

import { sourceLists } from "./checks.ts";

const TIMEOUT_MS = 20_000;
const WORKERS = 8;

async function* walk(dir: string): AsyncGenerator<string> {
  for await (const e of Deno.readDir(dir)) {
    const path = `${dir}/${e.name}`;
    if (e.isDirectory) yield* walk(path);
    else if (path.endsWith(".json") && !path.startsWith("data/_verify/")) yield path;
  }
}

// Some party sites answer the first visit with a redirect to the same page plus a cookie,
// and loop forever for clients that drop it. Redirects are followed by hand to keep cookies.
async function get(url: string): Promise<Response> {
  const cookies = new Map<string, string>();
  for (let hop = 0; hop < 10; hop++) {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "user-agent": "KoreaPoliticsAPI link check",
        cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      },
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      cookies.set(pair.slice(0, i).trim(), pair.slice(i + 1));
    }
    const next = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !next) return res;
    await res.body?.cancel();
    url = new URL(next, url).href;
  }
  throw new Error("too many redirects");
}

async function check(url: string): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await get(url);
      await res.body?.cancel();
      if (res.ok) return null;
      if (attempt === 1) return `HTTP ${res.status}`;
    } catch (e) {
      if (attempt === 1) return (e as Error).name;
    }
  }
  return null;
}

const files = new Map<string, Set<string>>();
for await (const path of walk("data")) {
  const data = JSON.parse(await Deno.readTextFile(path));
  const urls = sourceLists(data).flatMap((s) => s.urls);
  if (typeof data.source_url === "string") urls.push(data.source_url);
  for (const u of urls) files.set(u, (files.get(u) ?? new Set()).add(path));
}

const queue = [...files.keys()].sort();
const dead: [string, string][] = [];
await Promise.all(
  Array.from({ length: WORKERS }, async () => {
    for (let u = queue.shift(); u; u = queue.shift()) {
      const why = await check(u);
      if (why) dead.push([u, why]);
    }
  }),
);

console.error(`${files.size} URL(s) checked, ${dead.length} failed`);
for (const [u, why] of dead.sort()) {
  const paths = [...files.get(u)!].sort();
  const shown = paths.slice(0, 3).map((p) => `\`${p}\``).join(", ");
  const more = paths.length > 3 ? ` 외 ${paths.length - 3}개` : "";
  console.log(`- ${u} (${why}) ${shown}${more}`);
}
