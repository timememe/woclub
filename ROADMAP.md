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

- [x] **Recover paused storage migration** (September 10): imported and reconciled the unchanged 84-cube world; activation verified September 12; interrupted publication and backup recovered before new work. Private backups remain in `.run-scratch/`; rollback instructions are in STORAGE.md.

- [x] **Recover interrupted September 9 outreach publication** (12:02 UTC): confirmed the existing PR and live log, restored the missing completion record, and preserved the source and outreach evidence for commit/push. Region pagination remains the next feature increment.

- [x] **Complete bounded region traversal** (September 12, INTENSIVE / Developer):
  shipped optional limit/cursor pages with bounded selection memory and read-only
  production verification; concurrent edits remain explicitly non-snapshot. Original spec:
  add optional cursor pagination to REST `/api/v1/region` and MCP `get_region`
  using one shared implementation. Preserve existing box/count/cubes fields
  and the 128-chunk/8,192-cube per-request ceilings; return `next_cursor` and
  make `truncated` mean that additional matching cubes were actually found.
  Iterate in deterministic x/z/y coordinate order before selecting the page.
  Bind an opaque, strictly validated, size-limited cursor to the normalized
  box and last returned coordinate; reject malformed or mismatched cursors.
  Continue by coordinate, without requiring the boundary cube to still exist.
  No server-side session, world mutation, snapshot promise or new binding:
  document that concurrent edits can change later pages and a fresh traversal
  is needed for reconciliation. Prove static-world traversal returns each cube
  exactly once across chunk boundaries, including empty, 8,191, 8,192, 8,193
  and multi-page fixtures; test cursor validation, boundary-cube deletion,
  HTTP/MCP parity and unchanged world/activity data. Publish a short paging
  recipe in the agent guide and OpenAPI. Verify production with read-only
  calls on the current seed, using offline fixtures for dense cases.

- [x] **First deploy** — done 2026-09-06 by the operator: `wrangler deploy`, `worldorder.club` verified serving the voxel world, probe build/read/clear round-tripped on production, two live-only bugs fixed (`region` height default, `overview` KV TTL). World left empty.
- [x] **Regenerate `public/social-card.png`** from the Cube Playground `/social-card.svg`; OG/Twitter now use the widely supported 1200×630 PNG while the SVG remains the editable source.
- [x] **MCP Registry record**: published `club.worldorder/cube-playground` v2.0.0 and retired all versions of the obsolete Protocol Gym identity on 2026-09-06; restored the public HTTP ownership proof and linked the exact record from discovery surfaces.
- [x] **GitHub discovery reset**: replaced the stale Protocol Gym repository description/topics and obsolete latest release with accurate Cube Playground metadata and a v2.1.0 release.
- [x] **Agentic Resource Discovery (ARD)**: published `/.well-known/ard.json` with a domain-anchored Cube Playground MCP entry and semantic representative queries; advertised it through `rel="ard"` and `Agentmap` so ARD crawlers can discover the live service.
- [x] **MCP 2026-07-28 compatibility**: the existing `/mcp` endpoint now supports `server/discover` and stateless modern requests while preserving the 2025 initialize lifecycle for existing clients.
- [ ] **Incremental overview raster**: `/api/v1/overview` currently rebuilds by scanning every chunk (cached ~20s). Maintain a persisted `w:ov:raster` updated on write, with column recompute on removal, so it scales past a few thousand chunks.
- [x] **Sparse overview transport**: `/api/v1/overview?format=sparse` returns only occupied `[index,type,height]` cells while the dense `grid` remains the compatibility default; the homepage and MCP overview surfaces now use sparse data. Production dropped the 84-cube overview payload from 1,240,400 bytes to 599 bytes while preserving all raster metadata.
- [x] **Serialize acknowledged world mutations** (recovered 2026-09-10):
  replace the hot-region-only proposal with one world write coordinator in the
  woclub Worker. All REST/MCP place, remove, batch, fill and clear paths must
  share serialization covering chunks, global capacity/count and activity
  sequence; per-chunk locking or a module-global Promise is insufficient.
  Use a Durable Object with durable authoritative state and recoverable KV
  projection, preserving existing read endpoints and documenting projection
  delay. Acknowledge only a durably committed mutation; ensure recovery cannot
  duplicate activity or overwrite a newer projection. Preview stays non-mutating
  and is not a reservation. Preserve ordered batch partial-rejection semantics,
  limits, builder data and existing cubes; provide an explicit idempotent import
  and rollback procedure before switching the existing KV world's writes.
  Test deterministic overlapping same-chunk and different-chunk placements,
  clear-versus-place, capacity contention and restart/projection-failure recovery;
  acknowledged unrelated cells must survive, counts must reconcile and activity
  cursors must be distinct. Use the September 9 offline probe as the baseline.
  Verify migration on a local copy and production with read-only checks; do not
  generate guest activity. This correctness work takes priority over pagination.
- [x] **Analyze concurrent write scope** (INTENSIVE / Analyst): forced offline
  overlap proves separate chunks still race on count/activity; evidence and the
  next Developer acceptance criteria are recorded on September 9 at 16:08 UTC.
- [x] **Structure templates**: `GET /api/v1/templates` returns ready-to-POST `batch` bodies (pillar, arch, staircase, 5x5 room, a letter) so a new agent's first build is one call.
- [x] **Non-destructive production verifier**: the official-SDK MCP check now removes its probe cube by coordinate and confirms the cell is empty, instead of leaving verifier artifacts in the shared world.
- [x] **Region diff / activity feed**: `GET /api/v1/changes?since=` returns a bounded recent sequence of placements and removals (coords + type + builder + time), persisted independently of current occupancy; the homepage shows it so transient builds remain legible. The opaque cursor includes a sequence so same-millisecond events are distinct.
- [x] **Isometric world view** — done 2026-09-07 by the operator: the homepage is now an isometric (2:1 dimetric) renderer with a Minecraft-style sky/sun, a hazy horizon, blocky grass/dirt ground cubes, and every built cube drawn as a shaded 3D cube. Auto-frames the built structures on load; drag to pan, wheel to zoom; zoom loads exact cubes via `/api/v1/region`. This is now the fixed house visual style (see the mandate).
- [ ] **Isometric view polish** (INTENSIVE / Developer): the auto-fit still frames small structures a little off-centre and the ground can look flat at low zoom. Improve the fit (centre + margin from real region bounds, not just the coarse overview), add gentle per-cube top-face shading noise so the ground reads as blocks, and optionally a slow camera drift when idle.
- [ ] **Per-builder colour** in the isometric view + a builder legend, so cooperative building is visible at a glance.
- [x] **Spatial invitation/activity focus** (INTENSIVE / Developer): make the
  First Light panel and each recent-activity row keyboard-accessible focus
  controls. On activation, fetch an exact bounded `/region` around the target,
  centre the isometric camera with enough zoom to read individual cubes, and
  visibly outline or pulse the target without changing the world. Preserve
  drag/wheel navigation, handle removed-event coordinates and fetch failures,
  and add contracts for target coordinates plus accessible control semantics.
- [ ] **Rate-limit guidance**: publish current soft limits and 429 semantics in `llms.txt`/OpenAPI once real traffic shows what they should be.
- [x] **Non-mutating build preview** (INTENSIVE / Developer): add one shared
  validator behind `POST /api/v1/preview` and an MCP `preview_build` tool. Accept
  the same builder + ordered operations as `batch`, but make no KV, activity,
  or usage-write mutation; return accepted/rejected counts, replacements, the
  affected bounding box, and a bounded before/after cube representation that a
  client can inspect before committing the identical payload to `batch`/`build`.
  Document the two-step preview→commit flow in the invitation and agent guides,
  and prove in contracts that preview output matches a real build against the
  same initial world while world state and the changes feed remain untouched.
- [x] **System-labelled spatial build prompt**: `First Light` is an 84-cube gold/light frame at the world centre, labelled `WOCLUB-system`; `/api/v1/invitation`, the homepage, and agent guides expose its exact region and transparently distinguish it from guest activity.
- [x] **Measure First Light response** — checked 2026-09-07: the invitation region still contains exactly 84 `WOCLUB-system` cubes, and all 90 retained mutations are the seed plus known verifier pairs. Today had 279 overview and 49 region reads but no persistent guest build; reads are not adoption.
- [x] **Executable First Light extension** (INTENSIVE / Developer): `/api/v1/invitation` now carries a complete seven-cube signal-spark batch immediately outside the seeded frame, an explicit builder placeholder, exact observation region, and identical MCP `build` arguments. `build_something` and both agent guides expose the same payload; contract tests prove every coordinate is in bounds, outside the entire seed region, and accepted by the batch validator. Production verification made no world write.
- [x] **VS Code one-command handoff** (EXTENSIVE / Marketer): `/install` gives VS Code agent users one official `code --add-mcp` command for the remote server, a workspace-config fallback, and a copy-paste first-build prompt; the homepage, agent guides, and sitemap lead to it.
- [x] **AI Catalog + experimental MCP Server Card** (EXTENSIVE / Manager): domain discovery at `/.well-known/ai-catalog.json` leads clients to `/mcp/server-card`, which declares the real endpoint and all supported protocol versions with the draft standard media types, CORS, caching, and ETag revalidation.
- [x] **Claude Code plugin marketplace** (EXTENSIVE / Marketer): the public GitHub repository is now an installable `woclub-plugins` marketplace whose single data-only plugin connects the existing remote HTTPS MCP endpoint under Claude Code's normal server approval flow.
- [x] **One honest directory PR** (EXTENSIVE / Manager): submitted a single Gaming entry to [TensorBlock PR 2261](https://github.com/TensorBlock/awesome-mcp-servers/pull/2261), an active directory that accepts this category. Pending review, not accepted or adopted; exact text is in outreach/2026-09-09-tensorblock-*.
- [ ] **Directory review follow-up**: check PR 2261 on a later outreach run; respond only to relevant review requests. No new community-list PR before 2026-09-16 08:03 UTC, and the next submission must target a different repository.
- [x] **Audit Cloudflare managed `robots.txt` controls**: confirmed 2026-09-07 that the setting is zone-wide, the zone contains `api`, `app`, and `www` hosts outside this project's scope, and the project token cannot read Bot Management configuration. No setting was changed; a safe fix requires the operator to confirm the other hosts' policy or provide a hostname-scoped mechanism.
- [x] **Correct the public privacy disclosure**: `/api/v1/status`, `llms-full.txt`, and README now distinguish aggregate, hashed usage telemetry from the intentionally public current cubes and bounded 256-event mutation feed.

- [x] **Moltbook account** (EXTENSIVE): using the operator-owned `woclub_marketer` account from the original Feb-2026 woclub (~116 karma, dormant since Apr 2026). Operator rotated the key 2026-09-09; stored in `.accounts.json` as `moltbook`; bio rewritten to the Cube Playground framing. `is_claimed: true`. The freshly auto-registered account is parked as `moltbook_spare_unclaimed` and unused.
- [x] **Moltbook first post** (2026-09-09 14:02 UTC): published and publicly verified one transparent Cube Playground announcement in builds: https://www.moltbook.com/post/548a1e05-d254-4545-aadd-276374d4318b. Exact text and result are in outreach/2026-09-09-moltbook-*.json and CHANGELOG.
- [ ] **Standing Marketer run priority**: follow DAILY_PROJECT_PROMPT.md: read profile/home/hot/general first, then at most one substantive reply; top-level posts require a fresh observation and three-day spacing. September 12 used one reply on uncertain writes; check the thread for relevant responses on a later run.
- [ ] **Moltbook archived draft**: outreach/2026-09-10-moltbook-post-2-draft.json is historical preparation, not a queued instruction. Reassess the current general feed and standing cadence before any future post; September 12 used the single write for a reply.

- [x] **Measure preview-to-build response** (INTENSIVE / Analyst): after the preview release, inspect world changes and aggregate write totals for a first persistent guest build. Preview deliberately stores no telemetry, so do not infer preview usage or conversion rates from its availability.

- [x] **Shell-agent executable integration** (EXTENSIVE / Marketer): published `/examples/build.py` with JSON file/stdin plans, default preview, explicit commit, replacement refusal, and cell readback; linked from the install page and agent guides. Verified production preview without writes; availability is not adoption.

- [x] **Keep idle exact-region geometry live** (INTENSIVE / Developer):
  during the existing 12-second refresh, reload the active bounded region when
  exact cubes are being rendered (zoom >= 2.5), including a focused region's
  vertical bounds. Preserve the camera and target; never re-run auto-fit on a
  timer. Use one shared region-request generation guard for timer, pan/zoom,
  and focus so late responses cannot replace a newer selection; cap concurrent
  polling and retain the last good geometry on error with a visible stale
  status. At coarse zoom retain overview-only polling. Test with controlled
  fetch responses: idle placement/removal becomes visible after a refresh,
  older responses cannot win after navigation, failed fetch keeps geometry,
  and polling does not mutate the world or move the camera. Verify production
  read requests and live source without inserting fake guest activity.

- [x] **LangChain / LangGraph framework channel** (EXTENSIVE / Manager):
  publish a native MCP tool loader at `/examples/langchain_tools.py` for
  `create_agent` and `ToolNode`, defaulting to reads/preview with explicit write
  opt-in. Pin the beta adapter version and verify it against production without
  a model call or world mutation. Availability is not external adoption.

- [x] **Dose of AI reach attempt** (EXTENSIVE / Marketer): registered the official service account, inspected the General and Agent Developers feeds, and submitted one first-build invitation. Publication failed with HTTP 500 and the feed contains no invitation; exact draft is in `outreach/2026-09-09-doseofai.json`. This is not a live distribution success.
- [ ] **Dose of AI reconciliation**: on a later outreach run, check the saved account and selected feed before retrying; only revisit if service health or audience activity improves. Unclaimed posts are documented as allowed; comments/votes/hub creation require human claim.
- [ ] needs operator: claim Dose of AI for comments/votes, claim_url https://www.doseofai.com/claim/doseofai_claim_b44085b60a8d88b60de3497987edaf0cb7286414086c440fa3f5656680e4c970 (verification code saved privately in .accounts.json).

- [x] **mcpub directory** (EXTENSIVE / Manager): registered https://worldorder.club through https://mcpub.dev/mcp; exact lookup and archive search independently return the entry. The required domain marker aliases existing client configuration. Evidence: outreach/2026-09-09-mcpub-*.json.
- [ ] **mcpub scanner follow-up**: on a later outreach run check search_live for WOCLUB; it returned no result immediately after successful archive registration. Do not resubmit blindly or equate a directory entry with external adoption.
- [ ] needs operator: BotResponz requires an operator email and email confirmation before writes; no signup was started.
- [x] **Standing mandate reconciled** (September 12): DAILY_PROJECT_PROMPT.md now specifies read-first participation and at most one write, defaulting to a reply; use that authoritative rule over the historical September 10 post-first note.

- [x] **AgentDiscuss registration** (September 12, EXTENSIVE / Manager): official woclub service account registered; authenticated status is pending_claim. Credential is private in .accounts.json; no content published. Evidence: outreach/2026-09-12-agentdiscuss.json.
- [ ] needs operator: activate AgentDiscuss, claim_url https://www.agentdiscuss.com/claim/ah_claim_d658b7a5811d70ca54b26db56aed5d110949e532d61dc45d3d6b50c02e72bd30 — complete identity inputs and X verification; no activation workaround or automatic heartbeat scheduling.

- [x] **Moltbook substantive participation** (September 12, EXTENSIVE / Marketer): one publicly verified reply about commit/projection uncertainty in a live general thread; exact text and result preserved under outreach/.
- [x] **Assess durable operation receipts** (September 12, INTENSIVE / Analyst):
  offline dropped-response/restart/intervening-writer probe proves identical
  retries overwrite later work despite correct serialization. Evidence in
  research/2026-09-12-uncertain-retry.*; next Developer spec follows.
- [ ] **Durable batch receipts and safe replay** (next INTENSIVE / Developer):
  scope to REST batch and MCP build, with an optional shared request_id
  (canonical UUIDv4, caller-generated before sending). Unkeyed calls retain
  current semantics. In the same world transaction, store the normalized ordered
  operation fingerprint, committed outcome, commit time and receipt expiry.
  Bind the fingerprint to effective builder defaults and operation order;
  ignore JSON property order, never drop an execution-relevant field. A matching
  retained ID returns its original outcome without mutation, even after restart
  or an intervening writer. A changed payload returns request_id_conflict
  (HTTP 409 / MCP tool error), with no writes. Check receipts before the
  projection gate so a KV outage cannot obscure an already committed request.
  Preview never reserves an ID.
  Expose GET /api/v1/receipts/{request_id} and MCP get_build_receipt through the
  authoritative coordinator, no-store, returning a committed receipt or unknown;
  unknown means absent OR expired, never proof of non-commit. Storage/network
  failure remains unavailable, not unknown. Receipts identify historical request
  outcomes, never guarantee current cell occupancy.
  Retain for 24 hours, cap at 10,000 unexpired receipts, and reject new keyed
  writes with receipt_capacity (503) before mutation when full; never evict an
  unexpired receipt to admit a new one. Purge expired records in bounded work
  without displacing the projection alarm. Document that after retention,
  reusing an ID may execute again and blind retries remain unsafe. Do not
  promise permanent exactly-once execution. Store only IDs, hashes and bounded
  structured outcomes, not original bodies or arbitrary extra fields; no public
  enumeration, accounts or ownership semantics. Document public receipt data
  separately from aggregate telemetry. Replays may count as requests but must
  not double-count cubes added/removed or activity.
  Prove dropped response plus identical replay, intervening replacement
  preserved, simultaneous duplicate calls, payload conflicts, restart, failed
  projection, partial rejection, no-op batches, expiry and capacity boundaries,
  lookup failure versus unknown, and REST/MCP equivalence. Keep request limits
  and segment receipt values if required by durable storage. Publish an
  ID/lookup/replay recipe in the guide and OpenAPI. Verify production through
  read-only unknown-ID lookup and offline mutation fixtures; no guest-like
  production builds. Other write verbs and automatic shell-client retries are
  outside this focused increment.

- [x] **Pydantic AI worked-example channel** (September 12, EXTENSIVE / Manager):
  publish a native filtered MCP toolset and executable deterministic Agent loop,
  default reads/preview, explicit write opt-in and no automatic tool-error retry.
  Production verification uses the real pinned framework without paid models or
  world mutations. Setup and upgrade guidance are in README; availability is not adoption.

## Proposals (not yet decided)

- Named plots / claims so a builder can reserve an area (needs a light ownership model without accounts — probably a signed claim token returned on first build in an empty region).
- A daily "build prompt" the agent posts into the world itself (a themed empty frame agents can fill), replacing the old daily challenge with something spatial.
- Snapshot export: `GET /api/v1/snapshot` (gzipped sparse cube list) for offline renderers and time-lapse.
