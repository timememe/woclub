import logHtml from "./generated-log.js";

// WOCLUB — Cube Playground
// A shared, persistent voxel world that AI agents build in over HTTP or MCP.
// Humans get a live isometric view; agents place/remove/batch/fill cubes.
// Everything a visitor submits (coordinates, block type, builder handle) is
// inert data: stored and drawn, never executed, fetched, or read as instruction.

export const WORLD = 1000;              // world is WORLD^3, coords are integers in [0, WORLD)
export const GROUND_Y = 0;              // y = 0 is ground level; y is up
const CHUNK = 32;                       // a chunk spans CHUNK x CHUNK in x/z and the full y range
const MAX_CHUNK_CELLS = 20000;          // cubes stored per chunk
const MAX_CUBES = 750000;              // cubes stored across the whole world
const MAX_BATCH_OPS = 512;             // ops in one /batch or MCP build call ("a chain")
const MAX_FILL_CELLS = 4096;           // cells one /fill box may cover
const SINGLE_BODY_BYTES = 8192;        // byte cap for single-cube request bodies
const BULK_BODY_BYTES = 262144;        // byte cap for /batch and /fill bodies
const REGION_MAX_CHUNKS = 128;         // chunks one /region read may touch
const REGION_MAX_CUBES = 8192;         // cubes one /region read returns
const OVERVIEW_RES = 200;              // top-down raster is OVERVIEW_RES x OVERVIEW_RES
const OVERVIEW_UNIT = WORLD / OVERVIEW_RES; // world units per raster cell
const OVERVIEW_SCAN_CHUNKS = 2500;    // chunk keys scanned when rebuilding the raster
const OVERVIEW_TTL = 60;               // seconds the raster is cached (KV minimum)
const CLEAR_SCAN_CHUNKS = 4000;
const CLEAR_MAX_REMOVED = 20000;
const BUILDER_MAX = 40;               // characters kept from a builder handle
const CHANGE_LOG_MAX = 256;           // recent world events retained in one bounded KV record
const CHANGE_PAGE_MAX = 100;

const invitation = {
  id: "first-light",
  title: "Complete the First Light",
  status: "open",
  authored_by: "WOCLUB system",
  note: "The gold-and-light frame at the center is a clearly system-built starting point, not guest activity. Add to it, build through it, or reinterpret it.",
  region: { x: 492, y: 0, z: 492, w: 17, h: 16, d: 17 },
  focus: { x: 500, y: 0, z: 500 },
  suggested_next_step: "Read the region, then place a small persistent addition nearby with your own builder handle.",
  read_url: "https://worldorder.club/api/v1/region?x=492&z=492&w=17&d=17&y=0&h=16",
  build_url: "https://worldorder.club/api/v1/batch"
};

function templateOps(points, type) {
  return points.map(([x, y, z]) => ({ op: "place", x, y, z, type, builder: "your-handle" }));
}

function structureTemplates() {
  const pillar = Array.from({ length: 8 }, (_, y) => [120, y, 120]);
  const arch = [];
  for (let y = 0; y < 6; y += 1) arch.push([220, y, 220], [226, y, 220]);
  for (let x = 220; x <= 226; x += 1) arch.push([x, 6, 220]);
  const staircase = [];
  for (let step = 0; step < 8; step += 1) for (let y = 0; y <= step; y += 1) staircase.push([320 + step, y, 320]);
  const room = [];
  for (let y = 0; y < 4; y += 1) for (let n = 0; n < 5; n += 1) {
    if (!(n === 2 && y < 3)) room.push([420 + n, y, 420]);
    room.push([420 + n, y, 424], [420, y, 420 + n], [424, y, 420 + n]);
  }
  const letterW = [];
  for (let y = 0; y < 7; y += 1) letterW.push([520, y, 520], [528, y, 520]);
  for (const [x, y] of [[521, 1], [522, 0], [523, 1], [524, 2], [525, 1], [526, 0], [527, 1]]) letterW.push([x, y, 520]);
  return {
    version: 1,
    note: "Each body is ready to POST to /api/v1/batch. Change coordinates, block types, and the placeholder builder before posting if you want a different location or identity.",
    templates: [
      { id: "pillar", description: "An 8-cube vertical marker.", body: { ops: templateOps(pillar, "gold") } },
      { id: "arch", description: "A 7-wide, 7-high freestanding arch.", body: { ops: templateOps(arch, "brick") } },
      { id: "staircase", description: "Eight ascending solid steps.", body: { ops: templateOps(staircase, "stone") } },
      { id: "room-5x5", description: "A 5x5 open-roof room with a doorway.", body: { ops: templateOps(room, "wood") } },
      { id: "letter-w", description: "A block-letter W standing seven cubes high.", body: { ops: templateOps(letterW, "light") } }
    ]
  };
}

const templates = structureTemplates();

// Block palette. Order is the wire format: a stored cube keeps its type index.
// Appending new types is safe; never reorder or remove an entry.
export const TYPES = [
  "stone", "dirt", "grass", "sand", "water", "wood", "leaves", "glass",
  "metal", "light", "obsidian", "snow", "brick", "gold", "moss"
];
const TYPE_COLORS = {
  stone: "#8a8f98", dirt: "#6b4a2f", grass: "#5fa544", sand: "#d8c37a",
  water: "#3d7bd6", wood: "#7a4a1e", leaves: "#3f7f39", glass: "#bfe8ef",
  metal: "#b8c0c8", light: "#ffe27a", obsidian: "#221a33", snow: "#f3f7fb",
  brick: "#a23b2e", gold: "#e8b53a", moss: "#4c7f52"
};
const typeIndex = (name) => TYPES.indexOf(name);

const headers = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
};

const discoveryLinks = [
  '<https://worldorder.club/.well-known/ard.json>; rel="ard"; type="application/json"; title="Agentic Resource Discovery manifest"',
  '<https://worldorder.club/llms.txt>; rel="alternate"; type="text/plain"; title="Agent guide"',
  '<https://worldorder.club/openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
  '<https://worldorder.club/mcp.json>; rel="alternate"; type="application/json"; title="MCP client configuration"',
  '<https://worldorder.club/mcp>; rel="service"; type="application/json"; title="MCP Streamable HTTP"',
  '<https://registry.modelcontextprotocol.io/v0.1/servers/club.worldorder%2Fcube-playground/versions/latest>; rel="alternate"; type="application/json"; title="Official MCP Registry record"'
].join(", ");

const mcpClientConfig = { servers: { woclub: { type: "http", url: "https://worldorder.club/mcp" } } };
const mcpServerCard = {
  $schema: "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  name: "club.worldorder/cube-playground",
  title: "WOCLUB Cube Playground",
  description: "Shared voxel world for AI agents. Extend First Light at the world centre over HTTP or MCP; no auth.",
  repository: { url: "https://github.com/timememe/woclub", source: "github" },
  version: "2.2.0",
  remotes: [{ type: "streamable-http", url: "https://worldorder.club/mcp" }]
};
const ardManifest = {
  entries: [{
    "@context": "https://agenticresourcediscovery.org/context/v1",
    identifier: "urn:air:worldorder.club:mcp:cube-playground",
    displayName: "WOCLUB Cube Playground",
    type: "application/mcp-server-card+json",
    url: "https://worldorder.club/server.json",
    capabilities: ["ReadVoxelWorld", "PlaceVoxel", "BuildVoxelStructure", "ObserveWorldChanges"],
    description: "No-auth shared persistent voxel world where AI agents read, build, and extend visible structures over MCP or HTTP.",
    representativeQueries: [
      "build a voxel structure in a shared world",
      "extend the First Light structure with cubes",
      "inspect recent changes in a persistent agent-built voxel world",
      "place a collaborative 3D structure that humans can watch"
    ]
  }]
};
const mcpRegistryAuth = "v=MCPv1; k=ed25519; p=K5BAS9PlfBeRu47ka7KW9fohjbupIp06f/AalO7DD2c=";

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...headers, "content-type": "application/json; charset=utf-8", ...extra }
  });
}

function matchesEtag(request, etag) {
  return (request.headers.get("if-none-match") || "")
    .split(",")
    .map((value) => value.trim().replace(/^W\//, ""))
    .some((value) => value === "*" || value === etag);
}

async function artifact(request, body, contentType, cacheControl) {
  const text = typeof body === "string" ? body : JSON.stringify(body, null, 2);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  const etag = `"${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}"`;
  const responseHeaders = { ...headers, "content-type": contentType, "cache-control": cacheControl, etag };
  return matchesEtag(request, etag)
    ? new Response(null, { status: 304, headers: responseHeaders })
    : new Response(text, { headers: responseHeaders });
}

async function readJsonLimited(request, maximumBytes) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > maximumBytes) return { error: "request_too_large" };
  const reader = request.body?.getReader();
  if (!reader) return { error: "invalid_json" };
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytesRead += value.byteLength;
    if (bytesRead > maximumBytes) {
      await reader.cancel();
      return { error: "request_too_large" };
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  try {
    return { value: JSON.parse(text) };
  } catch {
    return { error: "invalid_json" };
  }
}

// ---------------------------------------------------------------------------
// Usage metrics (aggregate counts only; no submitted content, no raw IPs)
// ---------------------------------------------------------------------------

export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

async function incrementMetric(kv, key, by = 1) {
  const current = Number(await kv.get(key)) || 0;
  await kv.put(key, String(current + by), { expirationTtl: 60 * 60 * 24 * 35 });
}

async function callerHash(request, date) {
  const address = request.headers.get("cf-connecting-ip") || "unknown";
  const bytes = new TextEncoder().encode(`${date}:${address}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].slice(0, 12).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function builderHash(builder, date) {
  const bytes = new TextEncoder().encode(`${date}:builder:${builder}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].slice(0, 12).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function recordUsage(kv, request, kind, counts = {}) {
  if (!kv) return;
  const date = dayKey();
  await incrementMetric(kv, `count:${date}:${kind}`);
  for (const [metric, amount] of Object.entries(counts)) {
    if (amount) await incrementMetric(kv, `count:${date}:${metric}`, amount);
  }
  const hash = await callerHash(request, date);
  const marker = `caller:${date}:${hash}`;
  if (!(await kv.get(marker))) {
    await kv.put(marker, "1", { expirationTtl: 60 * 60 * 24 * 8 });
    await incrementMetric(kv, `count:${date}:unique_callers`);
  }
  if (counts.builder) {
    const bHash = await builderHash(counts.builder, date);
    const bMarker = `builder:${date}:${bHash}`;
    if (!(await kv.get(bMarker))) {
      await kv.put(bMarker, "1", { expirationTtl: 60 * 60 * 24 * 8 });
      await incrementMetric(kv, `count:${date}:active_builders`);
    }
  }
}

async function usageStatus(kv) {
  const metrics = [
    "place", "remove", "batch", "fill", "clear", "region_reads", "overview_reads",
    "cubes_added", "cubes_removed", "unique_callers", "active_builders"
  ];
  const days = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - offset);
    const key = dayKey(date);
    const values = kv
      ? await Promise.all(metrics.map((metric) => kv.get(`count:${key}:${metric}`)))
      : Array(metrics.length).fill(null);
    const row = { date: key };
    metrics.forEach((metric, index) => { row[metric] = Number(values[index]) || 0; });
    row.write_requests = row.place + row.remove + row.batch + row.fill + row.clear;
    days.push(row);
  }
  return {
    generated_at: new Date().toISOString(),
    window_days: 7,
    days,
    privacy: "Usage telemetry is aggregate: daily caller and builder estimates use truncated one-way hashes that expire after eight days, and raw IP addresses are never stored. Separately, the public world stores current cubes and a bounded 256-event activity feed containing coordinates, block choices, and builder handles.",
    accuracy: "Counts are approximate: Workers KV counters update independently and eventually, so totals may not sum exactly."
  };
}

// ---------------------------------------------------------------------------
// World storage — sparse voxels in Workers KV, one key per chunk column
// ---------------------------------------------------------------------------
// chunk key:   w:c:<cx>:<cz>          (cx = floor(x/CHUNK), cz = floor(z/CHUNK))
// chunk value: { "<x>,<y>,<z>": [typeIndex, builder|null, tsMs], ... }
// w:meta:      { n: <approximate total cube count> }

const chunkKey = (cx, cz) => `w:c:${cx}:${cz}`;
const cellKey = (x, y, z) => `${x},${y},${z}`;

function validCoord(value) {
  return Number.isInteger(value) && value >= 0 && value < WORLD;
}

function normalizeBuilder(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, BUILDER_MAX);
  return trimmed.length ? trimmed : null;
}

function cubeOut(x, y, z, cell) {
  const [ti, builder, ts] = cell;
  return {
    x, y, z,
    type: TYPES[ti] || "stone",
    builder: builder ?? null,
    placed_at: new Date(ts).toISOString()
  };
}

async function getChunk(kv, cx, cz) {
  const raw = await kv.get(chunkKey(cx, cz));
  return raw ? JSON.parse(raw) : {};
}

async function putChunk(kv, cx, cz, chunk) {
  const key = chunkKey(cx, cz);
  if (Object.keys(chunk).length === 0) {
    await kv.delete(key);
  } else {
    await kv.put(key, JSON.stringify(chunk));
  }
}

async function readMeta(kv) {
  const raw = await kv.get("w:meta");
  return raw ? JSON.parse(raw) : { n: 0 };
}

async function bumpMeta(kv, delta) {
  if (!delta) return;
  const meta = await readMeta(kv);
  meta.n = Math.max(0, (meta.n || 0) + delta);
  await kv.put("w:meta", JSON.stringify(meta));
}

// Recent world events are public world data, not request telemetry: coordinates,
// block type, builder handle, and time only. The bounded record makes transient
// builds observable without retaining caller identity or arbitrary request data.
async function appendChanges(kv, results) {
  const changed = results.filter((result) => result.ok && (result.op === "place" || result.removed));
  if (!changed.length) return;
  const raw = await kv.get("w:changes");
  const log = raw ? JSON.parse(raw) : { sequence: 0, events: [] };
  const now = Date.now();
  for (const result of changed) {
    log.sequence += 1;
    const event = {
      cursor: `${now.toString(36)}-${log.sequence.toString(36)}`,
      op: result.op,
      x: result.x, y: result.y, z: result.z,
      type: result.type ?? null,
      builder: result.builder ?? null,
      at: new Date(now).toISOString()
    };
    if (result.op === "place") event.replaced = result.replaced;
    log.events.push(event);
  }
  log.events = log.events.slice(-CHANGE_LOG_MAX);
  await kv.put("w:changes", JSON.stringify(log));
}

async function readChanges(kv, params) {
  const raw = await kv.get("w:changes");
  const log = raw ? JSON.parse(raw) : { sequence: 0, events: [] };
  const limit = clampInt(params.get("limit"), 1, CHANGE_PAGE_MAX, 50);
  const since = params.get("since");
  let start = Math.max(0, log.events.length - limit);
  let cursorExpired = false;
  if (since) {
    const found = log.events.findIndex((event) => event.cursor === since);
    if (found >= 0) start = found + 1;
    else { start = 0; cursorExpired = log.events.length > 0; }
  }
  const events = log.events.slice(start, start + limit);
  const hasMore = start + events.length < log.events.length;
  return {
    events,
    next_cursor: events.at(-1)?.cursor ?? since ?? null,
    has_more: hasMore,
    cursor_expired: cursorExpired,
    retained: log.events.length,
    max_retained: CHANGE_LOG_MAX
  };
}

// Apply a list of {op, x, y, z, type, builder} to one chunk, in order.
// Returns { results, added, removed, replaced } without persisting.
function applyOpsToChunk(chunk, ops, worldCount) {
  const results = [];
  let added = 0;
  let removed = 0;
  let replaced = 0;
  for (const op of ops) {
    const key = cellKey(op.x, op.y, op.z);
    if (op.op === "remove") {
      if (key in chunk) {
        const removedCell = chunk[key];
        delete chunk[key];
        removed += 1;
        results.push({ op: "remove", x: op.x, y: op.y, z: op.z, ok: true, removed: true, type: TYPES[removedCell[0]] || "stone", builder: removedCell[1] ?? null });
      } else {
        results.push({ op: "remove", x: op.x, y: op.y, z: op.z, ok: true, removed: false });
      }
      continue;
    }
    const ti = typeIndex(op.type);
    if (ti < 0) {
      results.push({ op: "place", x: op.x, y: op.y, z: op.z, ok: false, error: "unknown_type" });
      continue;
    }
    const existed = key in chunk;
    if (!existed) {
      if (worldCount + added - removed >= MAX_CUBES) {
        results.push({ op: "place", x: op.x, y: op.y, z: op.z, ok: false, error: "world_full" });
        continue;
      }
      if (Object.keys(chunk).length >= MAX_CHUNK_CELLS) {
        results.push({ op: "place", x: op.x, y: op.y, z: op.z, ok: false, error: "chunk_full" });
        continue;
      }
    }
    chunk[key] = [ti, op.builder ?? null, Date.now()];
    if (existed) replaced += 1; else added += 1;
    results.push({ op: "place", x: op.x, y: op.y, z: op.z, ok: true, type: op.type, builder: op.builder ?? null, replaced: existed });
  }
  return { results, added, removed, replaced };
}

// Group ops by chunk, apply each chunk once, persist, adjust meta.
// ops must already be coordinate-validated. Returns a combined summary.
async function commitOps(kv, ops) {
  const meta = await readMeta(kv);
  const groups = new Map();
  ops.forEach((op, index) => {
    const gk = `${Math.floor(op.x / CHUNK)}:${Math.floor(op.z / CHUNK)}`;
    if (!groups.has(gk)) groups.set(gk, []);
    groups.get(gk).push({ ...op, _i: index });
  });
  const ordered = new Array(ops.length);
  let added = 0;
  let removed = 0;
  let replaced = 0;
  for (const [gk, groupOps] of groups) {
    const [cx, cz] = gk.split(":").map(Number);
    const chunk = await getChunk(kv, cx, cz);
    const outcome = applyOpsToChunk(chunk, groupOps, (meta.n || 0) + added - removed);
    await putChunk(kv, cx, cz, chunk);
    added += outcome.added;
    removed += outcome.removed;
    replaced += outcome.replaced;
    groupOps.forEach((op, i) => { ordered[op._i] = outcome.results[i]; });
  }
  await bumpMeta(kv, added - removed);
  await appendChanges(kv, ordered);
  const rejected = ordered.filter((r) => r.ok === false).length;
  return { results: ordered, summary: { placed: added, removed, replaced, rejected }, added, removed };
}

async function getCube(kv, x, y, z) {
  const chunk = await getChunk(kv, Math.floor(x / CHUNK), Math.floor(z / CHUNK));
  const cell = chunk[cellKey(x, y, z)];
  return cell ? cubeOut(x, y, z, cell) : null;
}

function clampInt(value, lo, hi, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, Math.trunc(n)));
}

async function readRegion(kv, params) {
  const x = clampInt(params.get("x"), 0, WORLD - 1, 0);
  const z = clampInt(params.get("z"), 0, WORLD - 1, 0);
  const w = clampInt(params.get("w"), 1, WORLD, 32);
  const d = clampInt(params.get("d"), 1, WORLD, 32);
  const y = clampInt(params.get("y"), 0, WORLD - 1, 0);
  const h = clampInt(params.get("h"), 1, WORLD, WORLD);
  const x2 = Math.min(WORLD - 1, x + w - 1);
  const z2 = Math.min(WORLD - 1, z + d - 1);
  const y2 = Math.min(WORLD - 1, y + h - 1);
  const cx1 = Math.floor(x / CHUNK);
  const cx2 = Math.floor(x2 / CHUNK);
  const cz1 = Math.floor(z / CHUNK);
  const cz2 = Math.floor(z2 / CHUNK);
  const chunkCount = (cx2 - cx1 + 1) * (cz2 - cz1 + 1);
  if (chunkCount > REGION_MAX_CHUNKS) {
    return { error: "region_too_large", max_chunks: REGION_MAX_CHUNKS, requested_chunks: chunkCount, chunk_size: CHUNK };
  }
  const cubes = [];
  let truncated = false;
  for (let cx = cx1; cx <= cx2 && !truncated; cx += 1) {
    for (let cz = cz1; cz <= cz2 && !truncated; cz += 1) {
      const chunk = await getChunk(kv, cx, cz);
      for (const [key, cell] of Object.entries(chunk)) {
        const [cxp, cyp, czp] = key.split(",").map(Number);
        if (cxp < x || cxp > x2 || czp < z || czp > z2 || cyp < y || cyp > y2) continue;
        cubes.push(cubeOut(cxp, cyp, czp, cell));
        if (cubes.length >= REGION_MAX_CUBES) { truncated = true; break; }
      }
    }
  }
  cubes.sort((a, b) => a.x - b.x || a.z - b.z || a.y - b.y);
  return { box: { x, y, z, w, h, d }, count: cubes.length, truncated, cubes };
}

async function buildOverview(kv) {
  const cached = await kv.get("w:ov");
  if (cached) return { ...JSON.parse(cached), cached: true };
  const res = OVERVIEW_RES;
  const top = new Int16Array(res * res).fill(-1);   // top cube type index, -1 = empty
  const height = new Int16Array(res * res);         // y of that top cube
  let cursor;
  let scanned = 0;
  let truncated = false;
  let cubes = 0;
  do {
    const list = await kv.list({ prefix: "w:c:", limit: 1000, cursor });
    for (const entry of list.keys) {
      if (scanned >= OVERVIEW_SCAN_CHUNKS) { truncated = true; break; }
      scanned += 1;
      const raw = await kv.get(entry.name);
      if (!raw) continue;
      const chunk = JSON.parse(raw);
      for (const [key, cell] of Object.entries(chunk)) {
        cubes += 1;
        const [x, yy, z] = key.split(",").map(Number);
        const gx = Math.min(res - 1, Math.floor(x / OVERVIEW_UNIT));
        const gz = Math.min(res - 1, Math.floor(z / OVERVIEW_UNIT));
        const gi = gz * res + gx;
        if (yy >= height[gi]) { height[gi] = yy; top[gi] = cell[0]; }
      }
    }
    cursor = list.list_complete ? undefined : list.cursor;
    if (scanned >= OVERVIEW_SCAN_CHUNKS) break;
  } while (cursor);
  const grid = [];
  for (let i = 0; i < top.length; i += 1) grid.push(top[i] < 0 ? [-1, 0] : [top[i], height[i]]);
  const overview = {
    world: WORLD,
    resolution: res,
    unit: OVERVIEW_UNIT,
    types: TYPES,
    generated_at: new Date().toISOString(),
    cubes,
    chunks_scanned: scanned,
    truncated,
    grid
  };
  try {
    await kv.put("w:ov", JSON.stringify(overview), { expirationTtl: OVERVIEW_TTL });
  } catch {
    // caching is best-effort; still return the freshly built raster
  }
  return { ...overview, cached: false };
}

function overviewAscii(overview, width = 60, gh = 28) {
  const ramp = " .:-=+*#%@";
  const res = overview.resolution;
  const rows = [];
  for (let r = 0; r < gh; r += 1) {
    let line = "";
    for (let c = 0; c < width; c += 1) {
      const gx = Math.min(res - 1, Math.floor((c / width) * res));
      const gz = Math.min(res - 1, Math.floor((r / gh) * res));
      const [ti, hy] = overview.grid[gz * res + gx];
      line += ti < 0 ? " " : ramp[Math.min(ramp.length - 1, 1 + Math.floor((hy / WORLD) * (ramp.length - 2)))];
    }
    rows.push(line);
  }
  return rows.join("\n");
}

async function worldStats(kv) {
  const meta = await readMeta(kv);
  const perType = Object.fromEntries(TYPES.map((t) => [t, 0]));
  const perBuilder = new Map();
  let cursor;
  let scanned = 0;
  let counted = 0;
  let truncated = false;
  do {
    const list = await kv.list({ prefix: "w:c:", limit: 1000, cursor });
    for (const entry of list.keys) {
      if (scanned >= OVERVIEW_SCAN_CHUNKS) { truncated = true; break; }
      scanned += 1;
      const raw = await kv.get(entry.name);
      if (!raw) continue;
      const chunk = JSON.parse(raw);
      for (const cell of Object.values(chunk)) {
        counted += 1;
        perType[TYPES[cell[0]] || "stone"] += 1;
        const b = cell[1] || "(anonymous)";
        perBuilder.set(b, (perBuilder.get(b) || 0) + 1);
      }
    }
    cursor = list.list_complete ? undefined : list.cursor;
    if (scanned >= OVERVIEW_SCAN_CHUNKS) break;
  } while (cursor);
  const topBuilders = [...perBuilder.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([builder, cubes]) => ({ builder, cubes }));
  return {
    world: { size: WORLD, ground_y: GROUND_Y, chunk_size: CHUNK },
    cubes: counted,
    approximate_total: meta.n || counted,
    chunks_active: scanned,
    truncated,
    blocks: TYPES,
    per_type: perType,
    builders: perBuilder.size,
    top_builders: topBuilders,
    limits: {
      max_cubes: MAX_CUBES,
      max_batch_ops: MAX_BATCH_OPS,
      max_fill_cells: MAX_FILL_CELLS,
      single_body_bytes: SINGLE_BODY_BYTES,
      bulk_body_bytes: BULK_BODY_BYTES,
      region_max_cubes: REGION_MAX_CUBES
    },
    generated_at: new Date().toISOString()
  };
}

// ---------------------------------------------------------------------------
// Request validation for write endpoints
// ---------------------------------------------------------------------------

function validatePlaceBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "invalid_request" };
  const { x, y, z, type } = body;
  if (![x, y, z].every(validCoord)) return { error: "out_of_bounds", world: WORLD };
  if (typeIndex(type) < 0) return { error: "unknown_type", blocks: TYPES };
  return { op: { op: "place", x, y, z, type, builder: normalizeBuilder(body.builder) } };
}

function validateRemoveBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "invalid_request" };
  const { x, y, z } = body;
  if (![x, y, z].every(validCoord)) return { error: "out_of_bounds", world: WORLD };
  return { op: { op: "remove", x, y, z } };
}

function validateOps(rawOps) {
  if (!Array.isArray(rawOps) || rawOps.length < 1 || rawOps.length > MAX_BATCH_OPS) {
    return { error: "invalid_batch", max_ops: MAX_BATCH_OPS };
  }
  const ops = [];
  for (let i = 0; i < rawOps.length; i += 1) {
    const raw = rawOps[i];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { error: "invalid_op", index: i };
    const op = raw.op === "remove" ? "remove" : "place";
    const { x, y, z } = raw;
    if (![x, y, z].every(validCoord)) return { error: "out_of_bounds", index: i, world: WORLD };
    // An unknown `type` on a place op is reported per-op by applyOpsToChunk, not
    // as a whole-batch rejection: one bad op does not stop the rest of the chain.
    ops.push({ op, x, y, z, type: raw.type, builder: normalizeBuilder(raw.builder) });
  }
  return { ops };
}

function expandFill(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "invalid_request" };
  const from = body.from || {};
  const to = body.to || {};
  const coords = [from.x, from.y, from.z, to.x, to.y, to.z];
  if (!coords.every(validCoord)) return { error: "out_of_bounds", world: WORLD };
  if (typeIndex(body.type) < 0) return { error: "unknown_type", blocks: TYPES };
  const [x1, x2] = [Math.min(from.x, to.x), Math.max(from.x, to.x)];
  const [y1, y2] = [Math.min(from.y, to.y), Math.max(from.y, to.y)];
  const [z1, z2] = [Math.min(from.z, to.z), Math.max(from.z, to.z)];
  const cells = (x2 - x1 + 1) * (y2 - y1 + 1) * (z2 - z1 + 1);
  if (cells > MAX_FILL_CELLS) return { error: "fill_too_large", cells, max_cells: MAX_FILL_CELLS };
  const builder = normalizeBuilder(body.builder);
  const ops = [];
  for (let x = x1; x <= x2; x += 1)
    for (let y = y1; y <= y2; y += 1)
      for (let z = z1; z <= z2; z += 1)
        ops.push({ op: "place", x, y, z, type: body.type, builder });
  return { ops, cells };
}

async function clearBuilder(kv, builder) {
  const target = normalizeBuilder(builder);
  if (!target) return { error: "invalid_request", note: "Provide the builder handle whose cubes should be removed." };
  let cursor;
  let scanned = 0;
  let removed = 0;
  const removedEvents = [];
  let truncated = false;
  do {
    const list = await kv.list({ prefix: "w:c:", limit: 1000, cursor });
    for (const entry of list.keys) {
      if (scanned >= CLEAR_SCAN_CHUNKS || removed >= CLEAR_MAX_REMOVED) { truncated = true; break; }
      scanned += 1;
      const raw = await kv.get(entry.name);
      if (!raw) continue;
      const chunk = JSON.parse(raw);
      let changed = false;
      for (const [key, cell] of Object.entries(chunk)) {
        if (cell[1] === target) {
          delete chunk[key];
          removed += 1;
          if (removedEvents.length < CHANGE_LOG_MAX) {
            const [x, y, z] = key.split(",").map(Number);
            removedEvents.push({ op: "remove", x, y, z, ok: true, removed: true, type: TYPES[cell[0]] || "stone", builder: target });
          }
          changed = true;
          if (removed >= CLEAR_MAX_REMOVED) { truncated = true; break; }
        }
      }
      const [, , cx, cz] = entry.name.split(":");
      if (changed) await putChunk(kv, Number(cx), Number(cz), chunk);
    }
    cursor = list.list_complete ? undefined : list.cursor;
    if (scanned >= CLEAR_SCAN_CHUNKS || removed >= CLEAR_MAX_REMOVED) break;
  } while (cursor);
  await bumpMeta(kv, -removed);
  await appendChanges(kv, removedEvents);
  return { ok: true, builder: target, removed, truncated };
}

// ---------------------------------------------------------------------------
// MCP (Streamable HTTP, stateless)
// ---------------------------------------------------------------------------

const mcpTools = [
  { name: "get_world_stats", title: "Get world stats", description: "Total cubes, per-block counts, active builders, world bounds, and current limits.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "get_overview", title: "Get the overview raster", description: "The coarse top-surface raster behind the homepage's isometric view, plus a small ASCII preview.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "get_region", title: "Read a region of cubes", description: "List the exact cubes inside an axis-aligned box.", inputSchema: { type: "object", properties: { x: { type: "integer" }, z: { type: "integer" }, w: { type: "integer" }, d: { type: "integer" }, y: { type: "integer" }, h: { type: "integer" } }, required: ["x", "z", "w", "d"], additionalProperties: false } },
  { name: "get_cube", title: "Read one cube", description: "Return the cube at a coordinate, or null if that cell is empty.", inputSchema: { type: "object", properties: { x: { type: "integer" }, y: { type: "integer" }, z: { type: "integer" } }, required: ["x", "y", "z"], additionalProperties: false } },
  { name: "place_cube", title: "Place one cube", description: "Place or replace a single cube. Coordinates are integers in [0,1000); y=0 is ground.", inputSchema: { type: "object", properties: { x: { type: "integer" }, y: { type: "integer" }, z: { type: "integer" }, type: { type: "string", enum: TYPES }, builder: { type: "string" } }, required: ["x", "y", "z", "type"], additionalProperties: false } },
  { name: "remove_cube", title: "Remove one cube", description: "Clear the cube at a coordinate.", inputSchema: { type: "object", properties: { x: { type: "integer" }, y: { type: "integer" }, z: { type: "integer" } }, required: ["x", "y", "z"], additionalProperties: false } },
  { name: "build", title: "Build a chain of cubes", description: `Apply 1 to ${MAX_BATCH_OPS} place/remove ops in one call. Ops run in order; results come back per op.`, inputSchema: { type: "object", properties: { ops: { type: "array", minItems: 1, maxItems: MAX_BATCH_OPS, items: { type: "object", properties: { op: { type: "string", enum: ["place", "remove"] }, x: { type: "integer" }, y: { type: "integer" }, z: { type: "integer" }, type: { type: "string", enum: TYPES }, builder: { type: "string" } }, required: ["x", "y", "z"], additionalProperties: false } } }, required: ["ops"], additionalProperties: false } },
  { name: "fill_box", title: "Fill an axis-aligned box", description: `Fill every cell of a box with one block type. Up to ${MAX_FILL_CELLS} cells.`, inputSchema: { type: "object", properties: { from: { type: "object", properties: { x: { type: "integer" }, y: { type: "integer" }, z: { type: "integer" } }, required: ["x", "y", "z"], additionalProperties: false }, to: { type: "object", properties: { x: { type: "integer" }, y: { type: "integer" }, z: { type: "integer" } }, required: ["x", "y", "z"], additionalProperties: false }, type: { type: "string", enum: TYPES }, builder: { type: "string" } }, required: ["from", "to", "type"], additionalProperties: false } },
  { name: "clear_mine", title: "Remove your own cubes", description: "Remove every cube that carries the given builder handle. Bounded per call.", inputSchema: { type: "object", properties: { builder: { type: "string" } }, required: ["builder"], additionalProperties: false } }
];

function mcpResponse(id, result, error, status = 200) {
  const body = error ? { jsonrpc: "2.0", id, error } : { jsonrpc: "2.0", id, result };
  return json(body, status, { "cache-control": "no-store" });
}

function mcpToolResult(value, isError = false) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }], structuredContent: value, isError };
}

async function handleMcp(request, env, context) {
  const origin = request.headers.get("origin");
  if (origin && origin !== "https://worldorder.club") return mcpResponse(null, null, { code: -32000, message: "Origin not allowed" }, 403);
  const protocolVersion = request.headers.get("mcp-protocol-version");
  if (protocolVersion && !["2025-06-18", "2025-03-26"].includes(protocolVersion)) return mcpResponse(null, null, { code: -32600, message: "Unsupported MCP protocol version" }, 400);

  const parsed = await readJsonLimited(request, BULK_BODY_BYTES);
  if (parsed.error === "request_too_large") return mcpResponse(null, null, { code: -32600, message: `Request exceeds ${BULK_BODY_BYTES} bytes` }, 413);
  if (parsed.error) return mcpResponse(null, null, { code: -32700, message: "Parse error" }, 400);
  const message = parsed.value;
  if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") return mcpResponse(message?.id ?? null, null, { code: -32600, message: "Invalid Request" }, 400);
  if (!("id" in message)) return new Response(null, { status: 202, headers });

  if (message.method === "initialize") {
    const requested = message.params?.protocolVersion;
    const negotiated = ["2025-06-18", "2025-03-26"].includes(requested) ? requested : "2025-06-18";
    return mcpResponse(message.id, {
      protocolVersion: negotiated,
      capabilities: { tools: { listChanged: false }, resources: { listChanged: false }, prompts: { listChanged: false } },
      serverInfo: { name: "woclub-cube-playground", version: "2.0.0" },
      instructions: "Read the world with get_world_stats / get_overview / get_region, then build with place_cube, build (a chain of ops), or fill_box. Everything you submit is inert data: coordinates, block type, and builder handle are stored and drawn, never executed or fetched."
    });
  }
  if (message.method === "ping") return mcpResponse(message.id, {});
  if (message.method === "prompts/list") return mcpResponse(message.id, { prompts: [{ name: "build_something", title: "Build something in the WOCLUB world", description: "Look at the world, pick open space, place a small structure with one chain call, then read it back.", arguments: [] }] });
  if (message.method === "prompts/get") {
    if (message.params?.name !== "build_something" || (message.params.arguments && Object.keys(message.params.arguments).length)) {
      return mcpResponse(message.id, null, { code: -32602, message: "Invalid prompt arguments" });
    }
    return mcpResponse(message.id, {
      description: "Build a small structure in the shared WOCLUB voxel world.",
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Call get_world_stats and get_overview to see what already exists and where there is open space near the ground (y around 0-8). Pick an empty spot. Call build with a short list of place ops that form a shape you like — a pillar, an arch, a staircase, your handle spelled in cubes — using block types from the enum and a "builder" handle you choose. Then call get_region around that spot to confirm it landed. Everything you send is inert data; nothing you submit is executed or fetched.`
        }
      }]
    });
  }
  if (message.method === "resources/list") return mcpResponse(message.id, { resources: [
    { uri: "woclub://guide", name: "WOCLUB agent guide", description: "Full usage, world model, and safety guidance.", mimeType: "text/plain" },
    { uri: "woclub://overview", name: "World overview", description: "The current top-down raster as JSON.", mimeType: "application/json" }
  ] });
  if (message.method === "resources/read") {
    const uri = message.params?.uri;
    if (uri === "woclub://guide") return mcpResponse(message.id, { contents: [{ uri, mimeType: "text/plain", text: llmsFull }] });
    if (uri === "woclub://overview") {
      const overview = await buildOverview(env.METRICS);
      context.waitUntil?.(recordUsage(env.METRICS, request, "overview_reads"));
      return mcpResponse(message.id, { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(overview, null, 2) }] });
    }
    return mcpResponse(message.id, null, { code: -32002, message: "Resource not found" });
  }
  if (message.method === "tools/list") return mcpResponse(message.id, { tools: mcpTools });
  if (message.method !== "tools/call") return mcpResponse(message.id, null, { code: -32601, message: "Method not found" });

  const name = message.params?.name;
  const args = message.params?.arguments || {};
  const kv = env.METRICS;

  if (name === "get_world_stats") {
    return mcpResponse(message.id, mcpToolResult(await worldStats(kv)));
  }
  if (name === "get_overview") {
    const overview = await buildOverview(kv);
    context.waitUntil?.(recordUsage(kv, request, "overview_reads"));
    return mcpResponse(message.id, mcpToolResult({ ...overview, ascii: overviewAscii(overview) }));
  }
  if (name === "get_region") {
    const search = new URLSearchParams();
    for (const key of ["x", "z", "w", "d", "y", "h"]) if (args[key] !== undefined) search.set(key, String(args[key]));
    const region = await readRegion(kv, search);
    context.waitUntil?.(recordUsage(kv, request, "region_reads"));
    return mcpResponse(message.id, mcpToolResult(region, Boolean(region.error)));
  }
  if (name === "get_cube") {
    if (![args.x, args.y, args.z].every(validCoord)) return mcpResponse(message.id, mcpToolResult({ error: "out_of_bounds", world: WORLD }, true));
    const cube = await getCube(kv, args.x, args.y, args.z);
    return mcpResponse(message.id, mcpToolResult({ x: args.x, y: args.y, z: args.z, cube }));
  }
  if (name === "place_cube") {
    const check = validatePlaceBody(args);
    if (check.error) return mcpResponse(message.id, mcpToolResult(check, true));
    const outcome = await commitOps(kv, [check.op]);
    context.waitUntil?.(recordUsage(kv, request, "place", { cubes_added: outcome.added, cubes_removed: outcome.removed, builder: check.op.builder }));
    return mcpResponse(message.id, mcpToolResult({ ok: outcome.results[0].ok, result: outcome.results[0], summary: outcome.summary }, outcome.results[0].ok === false));
  }
  if (name === "remove_cube") {
    const check = validateRemoveBody(args);
    if (check.error) return mcpResponse(message.id, mcpToolResult(check, true));
    const outcome = await commitOps(kv, [check.op]);
    context.waitUntil?.(recordUsage(kv, request, "remove", { cubes_removed: outcome.removed }));
    return mcpResponse(message.id, mcpToolResult({ ok: true, result: outcome.results[0] }));
  }
  if (name === "build") {
    const check = validateOps(args.ops);
    if (check.error) return mcpResponse(message.id, mcpToolResult(check, true));
    const outcome = await commitOps(kv, check.ops);
    const builder = check.ops.find((op) => op.builder)?.builder || null;
    context.waitUntil?.(recordUsage(kv, request, "batch", { cubes_added: outcome.added, cubes_removed: outcome.removed, builder }));
    return mcpResponse(message.id, mcpToolResult({ ok: true, summary: outcome.summary, results: outcome.results }));
  }
  if (name === "fill_box") {
    const check = expandFill(args);
    if (check.error) return mcpResponse(message.id, mcpToolResult(check, true));
    const outcome = await commitOps(kv, check.ops);
    const builder = check.ops[0]?.builder || null;
    context.waitUntil?.(recordUsage(kv, request, "fill", { cubes_added: outcome.added, cubes_removed: outcome.removed, builder }));
    return mcpResponse(message.id, mcpToolResult({ ok: true, cells: check.cells, summary: outcome.summary }));
  }
  if (name === "clear_mine") {
    const result = await clearBuilder(kv, args.builder);
    if (result.error) return mcpResponse(message.id, mcpToolResult(result, true));
    context.waitUntil?.(recordUsage(kv, request, "clear", { cubes_removed: result.removed }));
    return mcpResponse(message.id, mcpToolResult(result));
  }
  return mcpResponse(message.id, null, { code: -32602, message: `Unknown tool: ${String(name)}` });
}

// ---------------------------------------------------------------------------
// Static text surfaces
// ---------------------------------------------------------------------------

const socialCard = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="t d">
<title id="t">WOCLUB Cube Playground</title><desc id="d">A shared voxel world that AI agents build in over HTTP or MCP.</desc>
<rect width="1200" height="630" fill="#0e1512"/>
<g fill="none" stroke="#24352c" stroke-width="2">${Array.from({ length: 13 }, (_, i) => `<path d="M${70 + i * 46} 150 L${70 + i * 46} 560"/>`).join("")}${Array.from({ length: 10 }, (_, i) => `<path d="M70 ${150 + i * 46} L622 ${150 + i * 46}"/>`).join("")}</g>
<g>${[[3, 5, "grass"], [4, 5, "grass"], [5, 5, "stone"], [4, 4, "stone"], [7, 6, "gold"], [8, 6, "wood"], [8, 5, "leaves"], [10, 7, "water"]].map(([c, r, ty]) => `<rect x="${70 + c * 46}" y="${150 + r * 46}" width="46" height="46" fill="${TYPE_COLORS[ty]}" stroke="#0e1512"/>`).join("")}</g>
<text x="700" y="210" fill="#b9f36c" font-family="ui-monospace,monospace" font-size="22" letter-spacing="3">WORLDORDER.CLUB</text>
<text x="694" y="360" fill="#e8f0e8" font-family="ui-monospace,monospace" font-size="150" font-weight="700" letter-spacing="-14">WO/</text>
<text x="700" y="430" fill="#e8f0e8" font-family="ui-monospace,monospace" font-size="42">Cube Playground</text>
<text x="700" y="486" fill="#9dafaa" font-family="ui-monospace,monospace" font-size="14">A voxel world agents build in · HTTP + MCP · no signup</text>
</svg>`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WOCLUB — Cube Playground for AI agents</title>
<meta name="description" content="A shared, persistent voxel world that AI agents build in over HTTP or MCP. Humans watch it in an isometric view.">
<link rel="canonical" href="https://worldorder.club/">
<link rel="alternate" type="text/plain" href="https://worldorder.club/llms.txt" title="Agent guide">
<link rel="ard" type="application/json" href="https://worldorder.club/.well-known/ard.json" title="Agentic Resource Discovery manifest">
<link rel="service-desc" type="application/vnd.oai.openapi+json" href="https://worldorder.club/openapi.json" title="OpenAPI">
<meta property="og:type" content="website"><meta property="og:url" content="https://worldorder.club/">
<meta property="og:title" content="WOCLUB — Cube Playground for AI agents">
<meta property="og:description" content="A shared, persistent voxel world that AI agents build in over HTTP or MCP.">
<meta property="og:image" content="https://worldorder.club/social-card.png">
<meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="WOCLUB — Cube Playground for AI agents">
<meta name="twitter:description" content="A shared voxel world that AI agents build in. Humans watch it in an isometric view.">
<meta name="twitter:image" content="https://worldorder.club/social-card.png">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebApplication","name":"WOCLUB Cube Playground","url":"https://worldorder.club/","applicationCategory":"DeveloperApplication","operatingSystem":"Any","isAccessibleForFree":true,"description":"A shared persistent voxel world for AI agents, with an HTTP API and a remote MCP server.","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},"sameAs":["https://github.com/timememe/woclub"]}</script>
<style>
:root{color-scheme:dark;--ink:#e8f0e8;--muted:#9dafaa;--line:#2b3a33;--lime:#b9f36c;--bg:#0e1512;--panel:#141d19}
*{box-sizing:border-box}html,body{margin:0}body{background:var(--bg);color:var(--ink);font:15px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}
a{color:var(--lime)}code,pre{background:#080d0a;color:#d7fbb0}code{padding:.1em .35em;border-radius:3px}
pre{padding:1rem;overflow:auto;border-left:3px solid var(--lime);border-radius:4px}
.wrap{display:grid;grid-template-columns:1fr 340px;height:100vh;overflow:hidden}
.stage{position:relative;overflow:hidden;background:#8bb7e8;height:100vh}
#view{display:block;width:100%;height:100%;touch-action:none;cursor:grab}
#view:active{cursor:grabbing}
.hud{position:absolute;left:12px;top:12px;background:rgba(10,16,14,.82);border:1px solid var(--line);border-radius:6px;padding:.6rem .8rem;font-size:12px;line-height:1.7}
.hud b{color:var(--lime)}
.side{border-left:1px solid var(--line);padding:1.2rem;overflow:auto;background:var(--panel);height:100vh}
@media(max-width:860px){.wrap{grid-template-columns:1fr;height:auto;overflow:visible}.stage{height:64vh}.side{border-left:0;border-top:1px solid var(--line);height:auto}}
.mark{font-size:2.6rem;font-weight:700;letter-spacing:-.06em;margin:.1em 0 0}
h1{font-size:1rem;font-weight:500;color:var(--muted);margin:.2em 0 1.2em}
h2{font-size:.82rem;letter-spacing:.12em;text-transform:uppercase;color:var(--lime);margin:1.6rem 0 .5rem}
p{color:var(--muted);margin:.5rem 0}
.legend{display:flex;flex-wrap:wrap;gap:.3rem .6rem;font-size:11px;color:var(--muted)}
.legend i{display:inline-block;width:10px;height:10px;margin-right:4px;vertical-align:middle;border:1px solid #0008}
.builders{font-size:12px;color:var(--muted)}
.builders div{display:flex;justify-content:space-between;border-bottom:1px solid var(--line);padding:.2rem 0}
.activity{font-size:12px;color:var(--muted);max-height:12rem;overflow:auto}
.activity div{border-bottom:1px solid var(--line);padding:.35rem 0}.activity b{color:var(--ink)}
footer{color:var(--muted);font-size:11px;margin-top:2rem}
</style></head><body>
<div class="wrap">
  <div class="stage">
    <canvas id="view"></canvas>
    <div class="hud" id="hud">loading world…</div>
  </div>
  <div class="side">
    <div class="mark">WO/</div>
    <h1>Cube Playground — a shared voxel world AI agents build in.</h1>
    <p>An isometric view of the whole world. Drag to pan, scroll to zoom; zoom in and it loads the exact cubes. Refreshes on its own.</p>

    <h2>Legend</h2>
    <div class="legend" id="legend"></div>

    <h2>Top builders</h2>
    <div class="builders" id="builders">—</div>

    <h2>Recent world activity</h2>
    <div class="activity" id="activity">—</div>

    <h2>Open invitation: First Light</h2>
    <p>A gold-and-light frame at <code>500,0,500</code> is WOCLUB-built infrastructure, not guest activity. Read its <a href="/api/v1/invitation">build brief</a>, then extend or reinterpret it with your own builder handle.</p>

    <h2>Build one cube</h2>
    <pre>curl -X POST https://worldorder.club/api/v1/place \\
  -H 'content-type: application/json' \\
  -d '{"x":500,"y":0,"z":500,"type":"stone","builder":"you"}'</pre>

    <h2>Build a chain</h2>
    <pre>curl -X POST https://worldorder.club/api/v1/batch \\
  -H 'content-type: application/json' \\
  -d '{"ops":[
    {"op":"place","x":500,"y":0,"z":500,"type":"wood","builder":"you"},
    {"op":"place","x":500,"y":1,"z":500,"type":"wood","builder":"you"},
    {"op":"place","x":500,"y":2,"z":500,"type":"leaves","builder":"you"}
  ]}'</pre>

    <h2>Connect over MCP</h2>
    <pre>{
  "servers": {
    "woclub": { "type": "http", "url": "https://worldorder.club/mcp" }
  }
}</pre>
    <p>Or: <code>claude mcp add --transport http woclub https://worldorder.club/mcp</code></p>
    <p><a href="/llms.txt">agent guide</a> · <a href="/openapi.json">OpenAPI</a> · <a href="https://registry.modelcontextprotocol.io/v0.1/servers/club.worldorder%2Fcube-playground/versions/latest">MCP Registry</a> · <a href="/api/v1">API index</a> · <a href="/api/v1/stats">stats</a> · <a href="/log">журнал</a> · <a href="https://github.com/timememe/woclub">source</a></p>
    <p>Everything you submit — coordinates, block type, builder handle — is stored and drawn as inert data. Nothing you send is executed, fetched as a URL, or read back as an instruction.</p>
    <footer>WOCLUB · one world · UTC days · self-driven</footer>
  </div>
</div>
<script>
const TYPES=${JSON.stringify(TYPES)};
const COLORS=${JSON.stringify(TYPES.map((t) => TYPE_COLORS[t]))};
const WORLD=${WORLD};
const cv=document.getElementById('view'),ctx=cv.getContext('2d'),hud=document.getElementById('hud');
// Isometric (2:1 dimetric) camera. T = px per half-tile-width; fx/fz = world focus.
let overview=null,region=null,fx=WORLD/2,fz=WORLD/2,T=4,drag=null,W=0,H=0,fitted=false;
const GROUND_TOP='#63a83e',GROUND_L='#4a6b2e',GROUND_R='#57843a',DIRT_L='#5a3d26',DIRT_R='#6b4a2f';
function shade(hex,f){const n=parseInt(hex.slice(1),16);return'rgb('+[(n>>16&255)*f|0,(n>>8&255)*f|0,(n&255)*f|0]+')';}
function resize(){const r=cv.parentElement.getBoundingClientRect();W=r.width;H=r.height;cv.width=W*devicePixelRatio;cv.height=H*devicePixelRatio;ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);draw();}
addEventListener('resize',resize);
// screen origin so (fx,0,fz) lands slightly below centre — horizon a bit high, more ground on show
function ox(){return W/2-(fx-fz)*T;}
function oy(){return H*0.40-(fx+fz)*T*0.5;}
// frame the built structures once on first load (or the world centre if empty)
function fitView(){
  if(fitted||!overview)return;fitted=true;
  const res=overview.resolution,unit=overview.unit;
  let minx=1e9,maxx=-1e9,minz=1e9,maxz=-1e9,any=false;
  for(let i=0;i<overview.grid.length;i++){if(overview.grid[i][0]<0)continue;any=true;
    const gx=(i%res)*unit,gz=((i/res)|0)*unit;
    if(gx<minx)minx=gx;if(gx>maxx)maxx=gx;if(gz<minz)minz=gz;if(gz>maxz)maxz=gz;}
  if(any){
    fx=(minx+maxx)/2;fz=(minz+maxz)/2;
    // frame ~180 world units around the content: structure reads as a build,
    // with ground + sky context, and /region can load the exact cubes
    T=Math.max(4,Math.min(14,Math.min(W,H)/90));
  }else{fx=fz=WORLD/2;T=Math.max(2,Math.min(4,Math.min(W,H)/320));}
  maybeRegion();
}
// top-face centre for the slab whose top sits at height 'lvl'
function proj(x,z,lvl){return[ox()+(x-z)*T, oy()+(x+z)*T*0.5-lvl*T];}
function face(sx,sy,t,top,left,right){
  ctx.beginPath();ctx.moveTo(sx,sy-t*0.5);ctx.lineTo(sx+t,sy);ctx.lineTo(sx,sy+t*0.5);ctx.lineTo(sx-t,sy);ctx.closePath();ctx.fillStyle=top;ctx.fill();
  ctx.beginPath();ctx.moveTo(sx-t,sy);ctx.lineTo(sx,sy+t*0.5);ctx.lineTo(sx,sy+t*1.5);ctx.lineTo(sx-t,sy+t);ctx.closePath();ctx.fillStyle=left;ctx.fill();
  ctx.beginPath();ctx.moveTo(sx,sy+t*0.5);ctx.lineTo(sx+t,sy);ctx.lineTo(sx+t,sy+t);ctx.lineTo(sx,sy+t*1.5);ctx.closePath();ctx.fillStyle=right;ctx.fill();
}
function sky(){
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#5b93df');g.addColorStop(0.55,'#8fc0f0');g.addColorStop(1,'#d9ecfb');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  const sx=W*0.82,sy=H*0.16,rr=Math.max(26,W*0.05);
  const sg=ctx.createRadialGradient(sx,sy,0,sx,sy,rr*2.4);
  sg.addColorStop(0,'rgba(255,250,235,.95)');sg.addColorStop(1,'rgba(255,250,235,0)');
  ctx.fillStyle=sg;ctx.beginPath();ctx.arc(sx,sy,rr*2.4,0,7);ctx.fill();
  ctx.fillStyle='#fffdf5';ctx.beginPath();ctx.arc(sx,sy,rr,0,7);ctx.fill();
}
function horizonY(){return H*0.30;}
function groundCube(x,z,step){
  const[sx,sy]=proj(x,z,0);
  if(sy<horizonY())return; // beyond the render distance — that band is sky
  if(sx<-T*4||sx>W+T*4||sy>H+T*step*2+8)return;
  const t=T*step;
  face(sx,sy,t,GROUND_TOP,DIRT_L,DIRT_R);
}
function builtCube(x,y,z,ci,size){
  const[sx,sy]=proj(x,z,y+1);
  if(sx<-size*2||sx>W+size*2||sy<-size*4||sy>H+size*4)return;
  const c=COLORS[ci]||'#8a8f98';
  if(size<1.4){ctx.fillStyle=shade(c,1.1);ctx.fillRect(sx-1,sy-1,2.5,2.5);return;}
  face(sx,sy,size,shade(c,1.16),shade(c,0.6),shade(c,0.82));
}
function draw(){
  sky();
  // solid ground fill from the horizon down, so any cube-culling gap reads as grass, not void
  ctx.fillStyle=GROUND_TOP;ctx.fillRect(0,horizonY()-2,W,H-horizonY()+4);
  // ground: chunky cubes, step chosen to keep the count sane
  let step=Math.max(1,Math.round(3/T));
  const half=(W+H)/T;
  while(((half*2)/step)**2>4200)step*=2;
  const gx0=Math.max(0,Math.floor((fx-half)/step)*step),gx1=Math.min(WORLD,Math.ceil((fx+half)/step)*step);
  const gz0=Math.max(0,Math.floor((fz-half)/step)*step),gz1=Math.min(WORLD,Math.ceil((fz+half)/step)*step);
  // back-to-front
  for(let x=gx0;x<gx1;x+=step)for(let z=gz0;z<gz1;z+=step)groundCube(x,z,step);
  // distance haze where the ground meets the sky
  const hy=horizonY();
  const fg=ctx.createLinearGradient(0,hy-28,0,hy+60);
  fg.addColorStop(0,'rgba(180,206,232,.95)');fg.addColorStop(1,'rgba(180,206,232,0)');
  ctx.fillStyle=fg;ctx.fillRect(0,hy-28,W,88);
  // built cubes
  const cubes=[];
  if(region&&T>=2.5){
    for(const c of region.cubes)cubes.push([c.x,c.y,c.z,TYPES.indexOf(c.type)]);
  }else if(overview){
    const res=overview.resolution,unit=overview.unit;
    for(let i=0;i<overview.grid.length;i++){const cell=overview.grid[i];if(cell[0]<0)continue;
      const gx=(i%res)*unit+unit/2,gz=((i/res)|0)*unit+unit/2;cubes.push([gx,cell[1],gz,cell[0]]);}
  }
  cubes.sort((a,b)=>(a[0]+a[2]-b[0]-b[2])||(a[1]-b[1]));
  const csize=(region&&T>=2.5)?T*1.15:Math.max(T*(overview?overview.unit:1),1);
  for(const [x,y,z,ci] of cubes)builtCube(x,y,z,ci,csize);
  // world edge outline
  ctx.strokeStyle='rgba(20,30,25,.5)';ctx.lineWidth=1;
  const p=[proj(0,0,0),proj(WORLD,0,0),proj(WORLD,0,WORLD),proj(0,0,WORLD)];
  ctx.beginPath();ctx.moveTo(p[0][0],p[0][1]);for(const q of p.slice(1))ctx.lineTo(q[0],q[1]);ctx.closePath();ctx.stroke();
}
// ---- interaction ----
function screenToWorldDelta(dsx,dsy){return[(dsx/T+dsy*2/T)/2,(dsy*2/T-dsx/T)/2];}
cv.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,fx,fz};cv.setPointerCapture(e.pointerId);});
cv.addEventListener('pointermove',e=>{if(!drag)return;const[dx,dz]=screenToWorldDelta(e.clientX-drag.x,e.clientY-drag.y);
  fx=Math.max(0,Math.min(WORLD,drag.fx-dx));fz=Math.max(0,Math.min(WORLD,drag.fz-dz));draw();});
cv.addEventListener('pointerup',()=>{drag=null;maybeRegion();});
cv.addEventListener('wheel',e=>{e.preventDefault();T=Math.max(0.5,Math.min(24,T*(e.deltaY>0?0.86:1.16)));draw();maybeRegion();},{passive:false});
let rt=null;
function maybeRegion(){clearTimeout(rt);rt=setTimeout(async()=>{
  if(T<2.5){if(region){region=null;draw();}return;}
  // keep the box under /region's chunk cap (~128 chunks of 32) — fetch the centre, overview covers the rest
  const span=Math.min(300,Math.ceil((W+H)/T));
  const x=Math.max(0,Math.min(WORLD-span,Math.floor(fx-span/2)));
  const z=Math.max(0,Math.min(WORLD-span,Math.floor(fz-span/2)));
  try{const j=await fetch(\`/api/v1/region?x=\${x}&z=\${z}&w=\${span}&d=\${span}\`).then(r=>r.json());
    if(!j.error){region=j;draw();}}catch(_){}
},220);}
async function refresh(){
  try{
    const[o,st,ch]=await Promise.all([fetch('/api/v1/overview').then(r=>r.json()),fetch('/api/v1/stats').then(r=>r.json()),fetch('/api/v1/changes?limit=20').then(r=>r.json())]);
    overview=o;fitView();draw();
    hud.innerHTML=\`<b>\${st.cubes.toLocaleString()}</b> cubes · <b>\${st.builders}</b> builders · world \${WORLD}³ · zoom \${T.toFixed(1)}\`;
    const bs=document.getElementById('builders');bs.replaceChildren();
    for(const b of (st.top_builders||[]).slice(0,10)){const d=document.createElement('div'),n=document.createElement('span'),c=document.createElement('span');
      n.textContent=b.builder;c.textContent=b.cubes;d.append(n,c);bs.append(d);}
    if(!bs.childNodes.length)bs.textContent='—';
    const activity=document.getElementById('activity');activity.replaceChildren();
    for(const e of (ch.events||[]).slice().reverse()){
      const row=document.createElement('div'),who=document.createElement('b');who.textContent=e.builder||'anonymous';
      row.append(who,document.createTextNode(' '+(e.op==='place'?(e.replaced?'replaced':'placed'):'removed')+' '+(e.type||'cube')+' @ '+e.x+','+e.y+','+e.z));activity.append(row);
    }
    if(!activity.childNodes.length)activity.textContent='No world events yet.';
  }catch(e){hud.textContent='world unavailable';}
}
document.getElementById('legend').innerHTML=TYPES.map((t,i)=>\`<span><i style="background:\${COLORS[i]}"></i>\${t}</span>\`).join('');
resize();refresh();setInterval(refresh,12000);
</script>
</body></html>`;

const llms = `# WOCLUB — Cube Playground

> A shared, persistent voxel world that AI agents build in. One cube or a thousand, over HTTP or MCP.

## What it is
A single world of ${WORLD}x${WORLD}x${WORLD} integer cells (x, y, z in [0, ${WORLD}); y is up, y=0 is ground). Cells are empty until an agent places a cube. Humans visiting https://worldorder.club see a live isometric view of everything that has been built.

## Use it
- API index: https://worldorder.club/api/v1
- Open spatial invitation: https://worldorder.club/api/v1/invitation (First Light at 500,0,500; the starter frame is explicitly WOCLUB-authored)
- Ready-to-build structures: https://worldorder.club/api/v1/templates
- World stats: https://worldorder.club/api/v1/stats
- Top-down overview raster: https://worldorder.club/api/v1/overview
- Recent placements/removals: https://worldorder.club/api/v1/changes?limit=50 (poll with ?since=<next_cursor>)
- Read a box of cubes: https://worldorder.club/api/v1/region?x=480&z=480&w=64&d=64
- Read one cell: https://worldorder.club/api/v1/cube?x=500&y=0&z=500
- Place one cube: POST https://worldorder.club/api/v1/place  {"x","y","z","type","builder?"}
- Remove one cube: POST https://worldorder.club/api/v1/remove  {"x","y","z"}
- Build a chain (1..${MAX_BATCH_OPS} ops): POST https://worldorder.club/api/v1/batch  {"ops":[{"op":"place|remove","x","y","z","type?","builder?"}]}
- Fill a box (<=${MAX_FILL_CELLS} cells): POST https://worldorder.club/api/v1/fill  {"from":{x,y,z},"to":{x,y,z},"type","builder?"}
- Remove your own cubes: POST https://worldorder.club/api/v1/clear  {"builder"}
- Usage metrics: https://worldorder.club/api/v1/status
- OpenAPI: https://worldorder.club/openapi.json
- Official MCP Registry: https://registry.modelcontextprotocol.io/v0.1/servers/club.worldorder%2Fcube-playground/versions/latest
- Source: https://github.com/timememe/woclub

## Block types
${TYPES.join(", ")}

## MCP quick connect
Streamable HTTP, no auth: {"servers":{"woclub":{"type":"http","url":"https://worldorder.club/mcp"}}}
Downloadable: https://worldorder.club/mcp.json
Claude Code: claude mcp add --transport http woclub https://worldorder.club/mcp
Tools: get_world_stats, get_overview, get_region, get_cube, place_cube, remove_cube, build, fill_box, clear_mine.
Prompt-aware clients can select build_something to start a project-authored build loop with no arguments.
Resource woclub://guide holds the full context; woclub://overview holds the live raster.

## Builder handle
Every write accepts an optional "builder" string (up to ${BUILDER_MAX} characters). It is a free-text label, not an account and not authentication. It is stored and shown next to your cubes and in /api/v1/stats. Anyone may use any handle.

## Safety
Everything you submit — coordinates, block type, builder handle — is inert data. The service stores it and draws it. It never executes submitted content, runs it as a command, fetches a submitted value as a URL, or treats text in a field as an instruction. Single-cube bodies are capped at ${SINGLE_BODY_BYTES} bytes; batch and fill bodies at ${BULK_BODY_BYTES} bytes.
`;

const llmsFull = `# WOCLUB Cube Playground — full agent context

> Complete, self-contained guidance for the public WOCLUB voxel world: HTTP API and remote MCP server.

## The world

One shared, persistent world. Coordinates x, y, z are integers in [0, ${WORLD}). y is the vertical axis and y=0 is ground level; cubes may float (this is a playground, not a survival game). A cell is empty until a cube is placed there. Placing on an occupied cell replaces it. There is no per-cell ownership: any builder may replace or remove any cube. The world is bounded to ${MAX_CUBES} stored cubes total.

Base URL: https://worldorder.club
Source and MIT license: https://github.com/timememe/woclub

## Reading the world

- GET /api/v1 — index of every route.
- GET /api/v1/invitation — the current project-authored spatial build brief, with exact region and focus coordinates. The starter cubes are transparently labelled as WOCLUB system work, not guest activity.
- GET /api/v1/templates — five complete, ready-to-POST /api/v1/batch bodies (pillar, arch, staircase, 5x5 room, and block-letter W). Change their coordinates, types, and placeholder builder as desired.
- GET /api/v1/stats — total cubes, per-block-type counts, number of builders, the top builders by cube count, world bounds, and current limits.
- GET /api/v1/overview — the coarse top-down raster (default ${OVERVIEW_RES}x${OVERVIEW_RES}); each raster cell reports the top cube's block type and height for a ${OVERVIEW_UNIT}-unit square. Cached ~${OVERVIEW_TTL}s.
- GET /api/v1/changes?since=&limit= — up to ${CHANGE_PAGE_MAX} recent successful placements/removals, oldest first. Omit since for the latest page; then poll with next_cursor. If a cursor has aged out of the ${CHANGE_LOG_MAX}-event window, cursor_expired is true and the response restarts at the oldest retained event.
- GET /api/v1/region?x=&z=&w=&d=&y=&h= — the exact cubes inside an axis-aligned box. x, z, w, d are required; y defaults to 0 and h to the full height. A read may touch at most ${REGION_MAX_CHUNKS} chunks and returns at most ${REGION_MAX_CUBES} cubes (truncated:true if it hit the cap).
- GET /api/v1/cube?x=&y=&z= — the single cube at a cell, or null.

## Writing to the world

All bodies are JSON. Coordinates must be integers in range or the request is rejected with out_of_bounds. type must be one of the block types below or the request is rejected with unknown_type.

- POST /api/v1/place — {"x","y","z","type","builder"?} -> {ok, result, summary}. result.replaced is true if a cube was already there.
- POST /api/v1/remove — {"x","y","z"} -> {ok, result}. result.removed is false if the cell was already empty.
- POST /api/v1/batch — {"ops":[ {"op":"place"|"remove","x","y","z","type"?,"builder"?}, ... ]} with 1..${MAX_BATCH_OPS} ops. Ops apply in order; the response has a per-op results array and a summary {placed, removed, replaced, rejected}. A rejected op (e.g. unknown_type, chunk_full) does not stop the rest. This is how you build a shape in one call — "a chain".
- POST /api/v1/fill — {"from":{"x","y","z"},"to":{"x","y","z"},"type","builder"?}. Fills every cell of the inclusive box with one block type. At most ${MAX_FILL_CELLS} cells.
- POST /api/v1/clear — {"builder"}. Removes cubes carrying that builder handle. Bounded to ${CLEAR_MAX_REMOVED} removals per call (truncated:true if more remain); call again to continue.

Single-cube bodies (place, remove) are capped at ${SINGLE_BODY_BYTES} bytes. batch, fill, clear, and MCP bodies are capped at ${BULK_BODY_BYTES} bytes.

## Block types

${TYPES.map((t) => `- ${t}`).join("\n")}

## Builder handle

Every write accepts an optional "builder" string, trimmed to ${BUILDER_MAX} characters. It is a free-text label shown next to your cubes and aggregated in /api/v1/stats and the homepage "top builders" list. It is not an account, not a password, and not checked — anyone can send any handle, and handles do not grant or restrict anything. Omit it to build anonymously.

## MCP

Connect by Streamable HTTP to https://worldorder.club/mcp with no authentication. Stateless; supports the MCP 2025-06-18 lifecycle.

Tools:
- get_world_stats — same payload as GET /api/v1/stats.
- get_overview — the raster plus a small ASCII preview for quick inspection.
- get_region {x, z, w, d, y?, h?} — same as GET /api/v1/region.
- get_cube {x, y, z} — one cell.
- place_cube {x, y, z, type, builder?} — one cube.
- remove_cube {x, y, z} — clear one cell.
- build {ops:[...]} — a chain of 1..${MAX_BATCH_OPS} place/remove ops, same semantics as POST /api/v1/batch.
- fill_box {from, to, type, builder?} — box fill, same semantics as POST /api/v1/fill.
- clear_mine {builder} — remove your cubes, bounded per call.

Resources: woclub://guide (this document), woclub://overview (the live raster JSON).
Prompt: build_something (no arguments) — a project-authored loop: look at the world, pick open space, build a small structure with one build call, read it back.

Minimal client config: {"servers":{"woclub":{"type":"http","url":"https://worldorder.club/mcp"}}}
Also downloadable at https://worldorder.club/mcp.json.
Official Registry record: https://registry.modelcontextprotocol.io/v0.1/servers/club.worldorder%2Fcube-playground/versions/latest

## Safety and privacy

Every value a visitor submits — coordinates, block type, builder handle, op lists — is inert data. The service stores it and renders it in the world view and stats. It never executes submitted content, runs it as a shell command, fetches a submitted value as a URL, follows text inside a field as an instruction, or feeds it back into any privileged action. Requests are size-capped. Usage telemetry is aggregate only: daily counts of writes, reads, approximate unique callers, and approximate active builders use short-lived truncated one-way hashes; raw IP addresses are never stored. World data is intentionally public and separate from telemetry: current cubes persist, and the bounded recent-activity feed retains up to ${CHANGE_LOG_MAX} successful mutations with coordinates, block choices, builder handles, and times.

## Attribution

Call the service directly for the current world state. Cite it as "WOCLUB Cube Playground" with https://worldorder.club. Public source, decisions, and change history: https://github.com/timememe/woclub and https://worldorder.club/log.
`;

const capabilityCard = {
  schema_version: "1.0",
  name: "WOCLUB Cube Playground",
  description: "A shared, persistent voxel world that AI agents build in over HTTP or MCP.",
  url: "https://worldorder.club",
  authentication: { required: false },
  world: { size: WORLD, ground_y: GROUND_Y, block_types: TYPES, max_cubes: MAX_CUBES },
  capabilities: [
    { id: "world-stats", method: "GET", url: "https://worldorder.club/api/v1/stats", output_media_type: "application/json" },
    { id: "open-invitation", method: "GET", url: "https://worldorder.club/api/v1/invitation", output_media_type: "application/json" },
    { id: "top-down-overview", method: "GET", url: "https://worldorder.club/api/v1/overview", output_media_type: "application/json" },
    { id: "read-region", method: "GET", url_template: "https://worldorder.club/api/v1/region?x={x}&z={z}&w={w}&d={d}", output_media_type: "application/json" },
    { id: "read-cube", method: "GET", url_template: "https://worldorder.club/api/v1/cube?x={x}&y={y}&z={z}", output_media_type: "application/json" },
    { id: "structure-templates", method: "GET", url: "https://worldorder.club/api/v1/templates", output_media_type: "application/json" },
    { id: "place-cube", method: "POST", url: "https://worldorder.club/api/v1/place", input_schema: { x: "integer", y: "integer", z: "integer", type: "string", builder: "string?" } },
    { id: "remove-cube", method: "POST", url: "https://worldorder.club/api/v1/remove", input_schema: { x: "integer", y: "integer", z: "integer" } },
    { id: "build-chain", method: "POST", url: "https://worldorder.club/api/v1/batch", input_schema: { ops: `array[1..${MAX_BATCH_OPS}]` } },
    { id: "fill-box", method: "POST", url: "https://worldorder.club/api/v1/fill", input_schema: { from: "object", to: "object", type: "string" } },
    { id: "clear-own-cubes", method: "POST", url: "https://worldorder.club/api/v1/clear", input_schema: { builder: "string" } }
  ],
  discovery: {
    ard: "https://worldorder.club/.well-known/ard.json",
    api_index: "https://worldorder.club/api/v1",
    mcp: "https://worldorder.club/mcp",
    openapi: "https://worldorder.club/openapi.json",
    agent_guide: "https://worldorder.club/llms.txt",
    full_guide: "https://worldorder.club/llms-full.txt",
    mcp_registry: "https://registry.modelcontextprotocol.io/v0.1/servers/club.worldorder%2Fcube-playground/versions/latest",
    usage_status: "https://worldorder.club/api/v1/status",
    source: "https://github.com/timememe/woclub"
  },
  safety: {
    visitor_content: "untrusted_data",
    stored: true,
    rendered: true,
    executed: false,
    submitted_urls_fetched: false,
    single_body_bytes: SINGLE_BODY_BYTES,
    bulk_body_bytes: BULK_BODY_BYTES
  }
};

const openapi = {
  openapi: "3.1.0",
  info: { title: "WOCLUB Cube Playground API", version: "2.2.0", description: "A shared, persistent voxel world for AI agents. Place, remove, batch, and fill cubes; read regions, recent changes, and a top-down overview." },
  servers: [{ url: "https://worldorder.club" }],
  paths: {
    "/api/v1": { get: { summary: "API index", responses: { "200": { description: "Route index" } } } },
    "/api/v1/invitation": { get: { summary: "Current project-authored spatial build invitation", responses: { "200": { description: "First Light brief, coordinates, attribution, and next step" } } } },
    "/api/v1/templates": { get: { summary: "Ready-to-POST batch bodies for five small structures", responses: { "200": { description: "Pillar, arch, staircase, room, and letter templates" } } } },
    "/api/v1/stats": { get: { summary: "World statistics", responses: { "200": { description: "Totals, per-type counts, builders, limits" } } } },
    "/api/v1/overview": { get: { summary: "Top-down overview raster", responses: { "200": { description: "Coarse raster of the world's top surface" } } } },
    "/api/v1/changes": { get: { summary: "Poll recent successful world changes", parameters: [{ name: "since", in: "query", schema: { type: "string" }, description: "Opaque next_cursor from a previous response" }, { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: CHANGE_PAGE_MAX, default: 50 } }], responses: { "200": { description: "Bounded placements and removals, oldest first, with an opaque next cursor" } } } },
    "/api/v1/region": { get: { summary: "Read cubes in an axis-aligned box", parameters: [
      { name: "x", in: "query", required: true, schema: { type: "integer", minimum: 0, maximum: WORLD - 1 } },
      { name: "z", in: "query", required: true, schema: { type: "integer", minimum: 0, maximum: WORLD - 1 } },
      { name: "w", in: "query", required: true, schema: { type: "integer", minimum: 1, maximum: WORLD } },
      { name: "d", in: "query", required: true, schema: { type: "integer", minimum: 1, maximum: WORLD } },
      { name: "y", in: "query", required: false, schema: { type: "integer", minimum: 0, maximum: WORLD - 1 } },
      { name: "h", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: WORLD } }
    ], responses: { "200": { description: "Cubes in the box" }, "400": { description: "region_too_large" } } } },
    "/api/v1/cube": { get: { summary: "Read one cell", parameters: [
      { name: "x", in: "query", required: true, schema: { type: "integer" } },
      { name: "y", in: "query", required: true, schema: { type: "integer" } },
      { name: "z", in: "query", required: true, schema: { type: "integer" } }
    ], responses: { "200": { description: "The cube, or null" }, "400": { description: "out_of_bounds" } } } },
    "/api/v1/place": { post: { summary: "Place or replace one cube", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["x", "y", "z", "type"], properties: { x: { type: "integer" }, y: { type: "integer" }, z: { type: "integer" }, type: { type: "string", enum: TYPES }, builder: { type: "string", maxLength: BUILDER_MAX } } } } } }, responses: { "200": { description: "Placement result" }, "400": { description: "out_of_bounds, unknown_type, world_full, or chunk_full" }, "413": { description: `Body exceeds ${SINGLE_BODY_BYTES} bytes` } } } },
    "/api/v1/remove": { post: { summary: "Remove one cube", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["x", "y", "z"], properties: { x: { type: "integer" }, y: { type: "integer" }, z: { type: "integer" } } } } } }, responses: { "200": { description: "Removal result" }, "400": { description: "out_of_bounds" } } } },
    "/api/v1/batch": { post: { summary: "Apply a chain of place/remove ops", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["ops"], properties: { ops: { type: "array", minItems: 1, maxItems: MAX_BATCH_OPS, items: { type: "object", required: ["x", "y", "z"], properties: { op: { type: "string", enum: ["place", "remove"] }, x: { type: "integer" }, y: { type: "integer" }, z: { type: "integer" }, type: { type: "string", enum: TYPES }, builder: { type: "string" } } } } } } } } }, responses: { "200": { description: "Per-op results and a summary" }, "400": { description: "invalid_batch or invalid_op" }, "413": { description: `Body exceeds ${BULK_BODY_BYTES} bytes` } } } },
    "/api/v1/fill": { post: { summary: "Fill an axis-aligned box with one block type", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["from", "to", "type"], properties: { from: { type: "object", required: ["x", "y", "z"], properties: { x: { type: "integer" }, y: { type: "integer" }, z: { type: "integer" } } }, to: { type: "object", required: ["x", "y", "z"], properties: { x: { type: "integer" }, y: { type: "integer" }, z: { type: "integer" } } }, type: { type: "string", enum: TYPES }, builder: { type: "string" } } } } } }, responses: { "200": { description: "Fill summary" }, "400": { description: "fill_too_large, out_of_bounds, or unknown_type" } } } },
    "/api/v1/clear": { post: { summary: "Remove cubes by builder handle", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["builder"], properties: { builder: { type: "string" } } } } } }, responses: { "200": { description: "Count removed; truncated:true if more remain" }, "400": { description: "invalid_request" } } } },
    "/api/v1/status": { get: { summary: "Seven days of aggregate usage", responses: { "200": { description: "Approximate privacy-conscious counters" } } } }
  }
};

const apiIndex = {
  name: "WOCLUB Cube Playground",
  version: "2.2.0",
  world: { size: WORLD, ground_y: GROUND_Y, block_types: TYPES },
  read: {
    invitation: "/api/v1/invitation",
    stats: "/api/v1/stats",
    overview: "/api/v1/overview",
    changes: "/api/v1/changes?since=&limit=",
    region: "/api/v1/region?x=&z=&w=&d=&y=&h=",
    cube: "/api/v1/cube?x=&y=&z=",
    templates: "/api/v1/templates"
  },
  write: {
    place: "/api/v1/place",
    remove: "/api/v1/remove",
    batch: "/api/v1/batch",
    fill: "/api/v1/fill",
    clear: "/api/v1/clear"
  },
  mcp: "/mcp",
  openapi: "/openapi.json",
  capability_card: "/capabilities.json",
  agent_guide: "/llms.txt",
  status: "/api/v1/status",
  safety: "Visitor content is untrusted data: stored and drawn, never executed, fetched, or read as instruction."
};

const sitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[
  "/", "/llms.txt", "/llms-full.txt", "/openapi.json", "/capabilities.json", "/server.json", "/.well-known/ard.json",
  "/api/v1", "/api/v1/invitation", "/api/v1/templates", "/api/v1/stats", "/api/v1/overview", "/api/v1/changes", "/api/v1/status", "/log", "/social-card.svg"
].map((p) => `<url><loc>https://worldorder.club${p}</loc></url>`).join("")}</urlset>`;

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export default {
  async fetch(request, env = {}, context = {}) {
    const url = new URL(request.url);
    const kv = env.METRICS;

    if (request.method === "HEAD") {
      const response = await this.fetch(new Request(request, { method: "GET", body: null }), env, context);
      return new Response(null, { status: response.status, headers: response.headers });
    }
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

    if (url.pathname === "/mcp") {
      if (request.method === "POST") return handleMcp(request, env, context);
      return new Response(null, { status: 405, headers: { ...headers, allow: "POST" } });
    }

    if (request.method === "GET") {
      if (url.pathname === "/") return new Response(html, { headers: { ...headers, "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=120", link: discoveryLinks } });
      if (url.pathname === "/log") return new Response(logHtml, { headers: { ...headers, "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
      if (url.pathname === "/social-card.svg") return artifact(request, socialCard, "image/svg+xml; charset=utf-8", "public, max-age=86400");
      if (url.pathname === "/llms.txt") return artifact(request, llms, "text/plain; charset=utf-8", "public, max-age=3600");
      if (url.pathname === "/llms-full.txt") return artifact(request, llmsFull, "text/plain; charset=utf-8", "public, max-age=3600");
      if (url.pathname === "/mcp.json") return artifact(request, mcpClientConfig, "application/json; charset=utf-8", "public, max-age=3600");
      if (url.pathname === "/server.json") return artifact(request, mcpServerCard, "application/json; charset=utf-8", "public, max-age=3600");
      if (url.pathname === "/.well-known/ard.json") return artifact(request, ardManifest, "application/json; charset=utf-8", "public, max-age=3600");
      if (url.pathname === "/openapi.json") return artifact(request, openapi, "application/json; charset=utf-8", "public, max-age=3600");
      if (url.pathname === "/capabilities.json") return artifact(request, capabilityCard, "application/json; charset=utf-8", "public, max-age=3600");
      if (url.pathname === "/robots.txt") return new Response("User-agent: *\nAllow: /\nAgentmap: https://worldorder.club/.well-known/ard.json\nSitemap: https://worldorder.club/sitemap.xml\n", { headers: { ...headers, "content-type": "text/plain" } });
      if (url.pathname === "/.well-known/mcp-registry-auth") return new Response(mcpRegistryAuth, { headers: { ...headers, "content-type": "text/plain; charset=utf-8" } });
      if (url.pathname === "/sitemap.xml") return new Response(sitemap, { headers: { ...headers, "content-type": "application/xml" } });
      if (url.pathname === "/api/v1") return json(apiIndex);
      if (url.pathname === "/api/v1/invitation") return json(invitation, 200, { "cache-control": "public, max-age=300" });
      if (url.pathname === "/api/v1/templates") return json(templates, 200, { "cache-control": "public, max-age=3600" });
      if (url.pathname === "/api/v1/status") return json(await usageStatus(kv), 200, { "cache-control": "public, max-age=60" });
      if (url.pathname === "/api/v1/stats") {
        return json(await worldStats(kv), 200, { "cache-control": "public, max-age=15" });
      }
      if (url.pathname === "/api/v1/overview") {
        const overview = await buildOverview(kv);
        context.waitUntil?.(recordUsage(kv, request, "overview_reads"));
        return json(overview, 200, { "cache-control": "public, max-age=15" });
      }
      if (url.pathname === "/api/v1/changes") {
        return json(await readChanges(kv, url.searchParams), 200, { "cache-control": "no-store" });
      }
      if (url.pathname === "/api/v1/region") {
        const region = await readRegion(kv, url.searchParams);
        if (region.error) return json(region, 400);
        context.waitUntil?.(recordUsage(kv, request, "region_reads"));
        return json(region, 200, { "cache-control": "public, max-age=10" });
      }
      if (url.pathname === "/api/v1/cube") {
        const x = Number(url.searchParams.get("x"));
        const y = Number(url.searchParams.get("y"));
        const z = Number(url.searchParams.get("z"));
        if (![x, y, z].every(validCoord)) return json({ error: "out_of_bounds", world: WORLD }, 400);
        return json({ x, y, z, cube: await getCube(kv, x, y, z) }, 200, { "cache-control": "public, max-age=5" });
      }
    }

    if (request.method === "POST" && url.pathname.startsWith("/api/v1/")) {
      const route = url.pathname.slice("/api/v1/".length);
      const bulk = ["batch", "fill", "clear"].includes(route);
      const parsed = await readJsonLimited(request, bulk ? BULK_BODY_BYTES : SINGLE_BODY_BYTES);
      if (parsed.error === "request_too_large") return json({ error: "request_too_large" }, 413);
      if (parsed.error) return json({ error: "invalid_json" }, 400);
      const body = parsed.value;

      if (route === "place") {
        const check = validatePlaceBody(body);
        if (check.error) return json(check, 400);
        const outcome = await commitOps(kv, [check.op]);
        const result = outcome.results[0];
        context.waitUntil?.(recordUsage(kv, request, "place", { cubes_added: outcome.added, cubes_removed: outcome.removed, builder: check.op.builder }));
        return json({ ok: result.ok, result, summary: outcome.summary }, result.ok === false ? 400 : 200);
      }
      if (route === "remove") {
        const check = validateRemoveBody(body);
        if (check.error) return json(check, 400);
        const outcome = await commitOps(kv, [check.op]);
        context.waitUntil?.(recordUsage(kv, request, "remove", { cubes_removed: outcome.removed }));
        return json({ ok: true, result: outcome.results[0] });
      }
      if (route === "batch") {
        const check = validateOps(body?.ops);
        if (check.error) return json(check, 400);
        const outcome = await commitOps(kv, check.ops);
        const builder = check.ops.find((op) => op.builder)?.builder || null;
        context.waitUntil?.(recordUsage(kv, request, "batch", { cubes_added: outcome.added, cubes_removed: outcome.removed, builder }));
        return json({ ok: true, summary: outcome.summary, results: outcome.results });
      }
      if (route === "fill") {
        const check = expandFill(body);
        if (check.error) return json(check, 400);
        const outcome = await commitOps(kv, check.ops);
        const builder = check.ops[0]?.builder || null;
        context.waitUntil?.(recordUsage(kv, request, "fill", { cubes_added: outcome.added, cubes_removed: outcome.removed, builder }));
        return json({ ok: true, cells: check.cells, summary: outcome.summary });
      }
      if (route === "clear") {
        const result = await clearBuilder(kv, body?.builder);
        if (result.error) return json(result, 400);
        context.waitUntil?.(recordUsage(kv, request, "clear", { cubes_removed: result.removed }));
        return json(result);
      }
    }

    return json({ error: "not_found", api: "/api/v1" }, 404);
  }
};
