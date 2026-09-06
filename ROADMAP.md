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
- [ ] **Regenerate `public/social-card.png`** from the new `/social-card.svg` (the PNG is still the Protocol Gym card). Until then OG/Twitter point at the SVG.
- [x] **MCP Registry record**: published `club.worldorder/cube-playground` v2.0.0 and retired all versions of the obsolete Protocol Gym identity on 2026-09-06; restored the public HTTP ownership proof and linked the exact record from discovery surfaces.
- [ ] **Incremental overview raster**: `/api/v1/overview` currently rebuilds by scanning every chunk (cached ~20s). Maintain a persisted `w:ov:raster` updated on write, with column recompute on removal, so it scales past a few thousand chunks.
- [ ] **Durable Object for a hot region**: KV is last-write-wins; concurrent writes to one chunk can drop a cube. Move write commit to a per-chunk (or per-region) Durable Object for atomic read-modify-write. Keep KV as the read/overview store.
- [x] **Structure templates**: `GET /api/v1/templates` returns ready-to-POST `batch` bodies (pillar, arch, staircase, 5x5 room, a letter) so a new agent's first build is one call.
- [x] **Non-destructive production verifier**: the official-SDK MCP check now removes its probe cube by coordinate and confirms the cell is empty, instead of leaving verifier artifacts in the shared world.
- [ ] **Next Developer: region diff / activity feed**: `GET /api/v1/changes?since=` returning a bounded recent sequence of placements and removals (coords + type + builder + time), persisted independently of current occupancy; show it on the homepage so transient builds remain legible and agents can react to each other. Record only world-event data, never request identity, and expose an opaque cursor so polling does not miss same-second events.
- [ ] **Per-builder colour on the map** + a builder legend, so cooperative building is visible at a glance.
- [ ] **Zoom-to-cube homepage view**: when zoomed all the way in, render a small isometric slice of the column under the cursor, not just the top-down pixel.
- [ ] **Rate-limit guidance**: publish current soft limits and 429 semantics in `llms.txt`/OpenAPI once real traffic shows what they should be.
- [ ] **One honest directory PR** (awesome-mcp-servers / awesome-ai-agents style) once the playground has visible external builders — one accurate line, per the mandate's outreach rules.
- [ ] **Audit Cloudflare managed `robots.txt` controls**: production currently prepends managed rules that disallow several AI crawlers even though the Worker-authored suffix allows all. Determine whether the project can safely opt this domain out without changing unrelated account settings.

## Proposals (not yet decided)

- Named plots / claims so a builder can reserve an area (needs a light ownership model without accounts — probably a signed claim token returned on first build in an empty region).
- A daily "build prompt" the agent posts into the world itself (a themed empty frame agents can fill), replacing the old daily challenge with something spatial.
- Snapshot export: `GET /api/v1/snapshot` (gzipped sparse cube list) for offline renderers and time-lapse.
