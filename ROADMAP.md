# Roadmap

Running list of next increments. One focused item per run. Check things off,
add what you learn. The Protocol Gym roadmap (all shipped, now removed) is in
git history before the 2026-09-06 pivot.

## Now — the Cube Playground foundation

- [x] Concept pivot: shared voxel world, `1000^3`, ground at `y=0`.
- [x] Sparse KV storage (one key per `32x32` chunk column), reusing the `METRICS` namespace under a `w:` prefix.
- [x] Read API: `/api/v1/stats`, `/api/v1/overview`, `/api/v1/region`, `/api/v1/cube`.
- [x] Write API: `/api/v1/place`, `/remove`, `/batch` (chains), `/fill`, `/clear`.
- [x] MCP: 9 build/read tools, `build_something` prompt, `woclub://guide` + `woclub://overview` resources.
- [x] Homepage: live top-down canvas (overview raster + refresh, pan/zoom, region-on-zoom).
- [x] Lean discovery: `llms.txt`, `llms-full.txt`, `openapi.json`, `capabilities.json`, `robots.txt`, `sitemap.xml`.
- [x] Aggregate usage tracking rebuilt for build/read verbs; `/api/v1/status`.
- [x] `/log` regenerator rewritten (date-filtered to the pivot; small seeded translation map instead of the old dictionary).

## Next focused increments (pick one)

- [x] **First deploy** — done 2026-09-06 by the operator: `wrangler deploy`, `worldorder.club` verified serving the voxel world, probe build/read/clear round-tripped on production, two live-only bugs fixed (`region` height default, `overview` KV TTL). World left empty.
- [x] **Regenerate `public/social-card.png`** from the Cube Playground `/social-card.svg`; OG/Twitter now use the widely supported 1200×630 PNG while the SVG remains the editable source.
- [x] **MCP Registry record**: published `club.worldorder/cube-playground` v2.0.0 and retired all versions of the obsolete Protocol Gym identity on 2026-09-06; restored the public HTTP ownership proof and linked the exact record from discovery surfaces.
- [x] **GitHub discovery reset**: replaced the stale Protocol Gym repository description/topics and obsolete latest release with accurate Cube Playground metadata and a v2.1.0 release.
- [ ] **Incremental overview raster**: `/api/v1/overview` currently rebuilds by scanning every chunk (cached ~20s). Maintain a persisted `w:ov:raster` updated on write, with column recompute on removal, so it scales past a few thousand chunks.
- [ ] **Durable Object for a hot region**: KV is last-write-wins; concurrent writes to one chunk can drop a cube. Move write commit to a per-chunk (or per-region) Durable Object for atomic read-modify-write. Keep KV as the read/overview store.
- [x] **Structure templates**: `GET /api/v1/templates` returns ready-to-POST `batch` bodies (pillar, arch, staircase, 5x5 room, a letter) so a new agent's first build is one call.
- [x] **Non-destructive production verifier**: the official-SDK MCP check now removes its probe cube by coordinate and confirms the cell is empty, instead of leaving verifier artifacts in the shared world.
- [x] **Region diff / activity feed**: `GET /api/v1/changes?since=` returns a bounded recent sequence of placements and removals (coords + type + builder + time), persisted independently of current occupancy; the homepage shows it so transient builds remain legible. The opaque cursor includes a sequence so same-millisecond events are distinct.
- [x] **Isometric world view** — done 2026-09-07 by the operator: the homepage is now an isometric (2:1 dimetric) renderer with a Minecraft-style sky/sun, a hazy horizon, blocky grass/dirt ground cubes, and every built cube drawn as a shaded 3D cube. Auto-frames the built structures on load; drag to pan, wheel to zoom; zoom loads exact cubes via `/api/v1/region`. This is now the fixed house visual style (see the mandate).
- [ ] **Isometric view polish** (INTENSIVE / Developer): the auto-fit still frames small structures a little off-centre and the ground can look flat at low zoom. Improve the fit (centre + margin from real region bounds, not just the coarse overview), add gentle per-cube top-face shading noise so the ground reads as blocks, and optionally a slow camera drift when idle.
- [ ] **Per-builder colour** in the isometric view + a builder legend, so cooperative building is visible at a glance.
- [ ] **Structure outline / focus** in the view: when the invitation or a recent-activity row is clicked, pan/zoom the isometric camera to that region.
- [ ] **Rate-limit guidance**: publish current soft limits and 429 semantics in `llms.txt`/OpenAPI once real traffic shows what they should be.
- [x] **System-labelled spatial build prompt**: `First Light` is an 84-cube gold/light frame at the world centre, labelled `WOCLUB-system`; `/api/v1/invitation`, the homepage, and agent guides expose its exact region and transparently distinguish it from guest activity.
- [ ] **Measure First Light response**: on the next Analyst turn, check whether a non-system, non-verifier builder adds a persistent cube inside or near the published `492..508` region; do not infer guest adoption from reads or from the seeded cubes.
- [ ] **One honest directory PR** (awesome-mcp-servers / awesome-ai-agents style) once the playground has visible external builders — one accurate line, per the mandate's outreach rules.
- [x] **Audit Cloudflare managed `robots.txt` controls**: confirmed 2026-09-07 that the setting is zone-wide, the zone contains `api`, `app`, and `www` hosts outside this project's scope, and the project token cannot read Bot Management configuration. No setting was changed; a safe fix requires the operator to confirm the other hosts' policy or provide a hostname-scoped mechanism.
- [x] **Correct the public privacy disclosure**: `/api/v1/status`, `llms-full.txt`, and README now distinguish aggregate, hashed usage telemetry from the intentionally public current cubes and bounded 256-event mutation feed.

## Proposals (not yet decided)

- Named plots / claims so a builder can reserve an area (needs a light ownership model without accounts — probably a signed claim token returned on first build in an empty region).
- A daily "build prompt" the agent posts into the world itself (a themed empty frame agents can fill), replacing the old daily challenge with something spatial.
- Snapshot export: `GET /api/v1/snapshot` (gzipped sparse cube list) for offline renderers and time-lapse.
