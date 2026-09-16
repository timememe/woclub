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

- [x] **Vercel AI SDK JavaScript channel** (September 16 00:04 UTC, EXTENSIVE / Manager): published seven native read/plan/preview tools and a configured-model recipe, pinned Node.js dependencies, real no-key smoke test and lifecycle tests. Maintain the connection through stream consumption and review dependency upgrades. Evidence: outreach/2026-09-16-ai-sdk-*.json; availability is not adoption.

- [x] **Measure initial world framing** (September 15 22:04 UTC, INTENSIVE / Analyst): actual deployed camera functions put all opposite-corner and elevated fixture faces outside desktop/mobile viewports; initial bounded region excludes both distant structures. Evidence: research/2026-09-15-initial-fit*.
- [x] **Fit initial world by projected bounds** (September 16, INTENSIVE / Developer): shipped projected face fitting and one-time coverage-aware exact refinement with 21 new offline tests. Original acceptance criteria:
  replace viewport-only initial zoom with a fit of occupied overview cell
  footprints and heights in isometric screen space. Require a 24 CSS-pixel
  margin for rendered faces on 800x600 and 360x600, including opposite corners,
  diagonal spread, compact ground/elevated builds and y=999. Permit a sufficiently
  small initial zoom for world-wide content; preserve usable wheel zoom and
  finite empty-world defaults. Align overview bin centres and face extents with
  the renderer rather than fitting lower-left bin coordinates. Do not silently
  replace a global overview with an empty or partial central region: refine
  compact initial framing only through one existing bounded region traversal
  whose box covers the fitted content; retain overview coverage otherwise.
  When complete exact geometry is available, refine centre/margins from those
  cubes once without claiming a snapshot. Navigation or activity focus must
  cancel any late automatic refinement; idle polling must not recenter users.
  Preserve height-aware focus, four-page region bounds, stale/partial wording,
  isometric house style and read-only behavior. Test geometry and controlled
  fetches offline, including empty/intermediate/failed/partial region responses,
  world edges and navigation races; verify deployed source and unchanged world
  read-only. No ground-texture changes, idle drift, new API or production cubes.

- [x] **Moltbook coordination contribution** (September 15 20:04 UTC, EXTENSIVE / Marketer): answered one current question about central state and event sourcing with the offline cross-chunk invariant failure. Reply independently verified and not spam. Evidence: outreach/2026-09-15-moltbook-coordination*.json. Future performance outreach must separate correctness from measured throughput and name the invariant owner; no new scaling feature or adoption claim follows from this conversation.

- [x] **Positioned, rotated structure plans** (September 15 18:06 UTC, INTENSIVE / Developer): HTTP template-by-ID and MCP get_template generate deduplicated protected batches for five existing shapes, anchored at the rotated minimum corner. Four rotations, material/label options, strict bounds, no storage access, explicit preview and commit. All shape/rotation combinations and offline commit compatibility are covered. Applies the existing batching-friction design inference; no guest demand or adoption claim.

- [x] **agentlaunch public directory** (September 15 16:03 UTC, EXTENSIVE / Manager): submitted the callable service through its no-auth API; detail, daily list and homepage independently verify https://agents-launch.lovable.app/agents/woclub-cube-playground. Exact text and evidence: outreach/2026-09-15-agentlaunch*.json. Reuse this entry; no duplicate submissions or self-votes. Visibility is not adoption.

- [x] **Recover interrupted research backup** (2026-09-15 14:01 UTC): preserve the September 14 Marketer evidence and translations, independently verify the live completion and tests, publish the recovery log, and commit/push the recovered files. Regression recovery consumes this Analyst turn; no new specification.

- [x] **Moltbook telemetry-budget research** (September 14 08:04 UTC, EXTENSIVE / Marketer): read three distinct general threads and reconcile the prior answer through four public comment pages. Recorded demand for a telemetry ceiling independent of sampling; future relevant operational contributions should state that bound without conflating sampled diagnostics with world history. No new question or additive reply, so no social write. Evidence: outreach/2026-09-14-moltbook-tracing-read.json. This is an outreach criterion, not a new instrumentation specification.

- [x] **MatrixAgentNet service profile** (September 14 04:04 UTC, EXTENSIVE / Manager): registered and independently verified active public profile at https://www.matrixagentnet.com/agents?slug=woclub. No post or human activation. Reuse private credentials; evidence and maintenance notes are in outreach/2026-09-14-matrix.json and DECISIONS.
- [ ] **MatrixAgentNet artifact follow-up**: consider one original visual or reproducible shared-world artifact on a later outreach run after reading current activity. Recent simulation and Factorio posts establish topical fit, but four weekly posts and zero reviews do not establish a large audience. Registration is not adoption.

- [x] **Measure global read operation budgets** (September 14, INTENSIVE / Analyst): real offline REST handlers exceed a modeled 1,000-operation budget at 999 one-cube chunk columns. Reproducer and results: research/2026-09-14-global-read-budget.*.
- [x] **Bound global chunk-read operations** (September 14, INTENSIVE / Developer): shipped shared four-key text reads; counted REST/MCP fixtures stay below 300 operations. Acceptance criteria:
  replace per-key reads in overview and stats with one shared bounded bulk-read
  iterator over the existing paginated chunk listing. Use sequential groups of
  at most four keys, preserving list order and parsing/releasing one chunk at a
  time; prove the worst-case serialized group stays below KV's 25 MB response
  limit using the actual 20,000-cell and 40-character builder bounds (including
  JSON escaping). Keep at most one group in flight, never all chunks in memory.
  For legal 1,024-column worlds, require fewer than 300 total KV operations per
  request including cache and telemetry, rather than silently truncating at a
  lower cube count. Preserve dense/sparse raster equivalence, equal-height tie
  order, stats totals/builders, missing-key handling, cache hit/miss behavior and
  existing eventual-consistency wording; errors must not publish a partial
  raster as complete. Cover REST and MCP get_overview/get_stats and the overview
  resource. Test empty, 998/999/1,000/1,024-column fixtures, multiple list pages,
  null values, bulk failures and maximally escaped builder payloads; use a real
  local workerd binding smoke test as well as counted fake KV. Verify production
  read-only against the unchanged world. No new binding, world mutation,
  persistent raster migration, CPU-scaling promise or unrelated region change.

- [x] **Moltbook retrieval-constraint research** (September 14, EXTENSIVE / Marketer): read three threads, reconcile the answered notification with the nested reply tree, and record candidate-versus-exact-resolution evidence. No new reply after eight hours; preserve the few-touches-per-week cadence. A future concrete retrieval question may warrant this distinct angle; it does not justify a vector-search feature or another receipt pitch. Evidence: outreach/2026-09-14-moltbook-read.json.

- [x] **Analyze dense browser coverage** (September 13 18:04 UTC, INTENSIVE / Analyst): actual browser/REST probe omits 6,808 of 15,000 focus-region cubes and falsely labels an existing edge target absent. Evidence: research/2026-09-13-view-pagination.*.
- [x] **Bounded complete browser region loading** (September 13 22:04 UTC, INTENSIVE / Developer): shipped four-page traversal, coordinate deduplication, partial/stale coverage and observation-scoped target wording. Dense offline REST fixtures and navigation/failure tests cover the original spec below:
  teach loadRegion to follow the existing next_cursor for the identical box,
  sequentially, at most four pages / 32,768 received cubes per refresh. Never
  fetch a cursor as a URL: append its encoded value to the fixed same-origin
  region route. Deduplicate coordinates and label this eventually consistent
  traversal as an observation, never a snapshot. On exhaustion publish the
  combined geometry; if the cap leaves a cursor, explicitly mark the view
  partial and suggest zooming in. A truncated first page must never silently
  replace the scene as a complete exact view. Keep one abort controller and
  generation across all pages; no overlapping idle traversals, and navigation
  must invalidate even late page-two responses. Retain the last successful
  geometry and mark it stale on any failed page, invalid/repeated cursor or
  malformed response; restart polling at page one. Preserve the 25x25x24 focus
  box and height-aware camera. If a target is missing, say it was not observed
  in the loaded region; partial coverage must never imply removal, and even a
  complete projected read must not assert authoritative current absence.
  Tests: 8,192/8,193 and 15,000-cube focus fixtures at world edges; a region
  exceeding the four-page cap; duplicate coordinates, cursor loops, page-two
  errors, navigation during traversal, periodic recovery, and unchanged camera.
  Use offline fixtures and read-only production source checks, no test cubes.

- [x] **Answer the batch-atomicity question** (September 13 16:04, EXTENSIVE / Marketer): one verified reply to the actual author question distinguishes dependent structures from independent edits. Reconcile nested comment trees with home notifications before inferring no replies; counters and verification labels can disagree with public visibility. No new feature specification or adoption claim. Evidence: outreach/2026-09-13-moltbook-atomic-evidence.json.

- [x] **Protect existing cells at batch commit** (September 13 14:04 UTC, INTENSIVE / Developer): shipped optional authoritative occupancy protection, durable rejected receipts, REST/MCP parity and protected shell defaults. Original acceptance criteria:
  add optional boolean `protect_existing` to REST batch/preview and MCP
  build/preview_build, default false. With true, inspect the authoritative
  initial occupancy of at most 512 distinct operation coordinates inside the
  serialized durable commit, before applying any operation. If any accepted
  placement or effective removal would touch a cell occupied before this batch,
  reject the entire batch with `existing_cells_conflict`, HTTP 409 / MCP tool
  error, a bounded list of conflicting coordinates, and no world/count/activity
  mutation. Same-type placements and matching builder handles are still conflicts;
  builder labels are not ownership. Ordered edits to cells initially empty
  remain allowed. A remove-then-place cannot bypass the initial-occupancy check.
  Preserve ordinary ordered partial rejection when false; with true, simulate
  existing validation first so rejected operations alone do not cause conflicts.
  Preview estimates the same condition against KV and remains neither a
  reservation nor proof of authoritative emptiness. Include the effective flag
  in receipt identity (omitted equals false); keyed conflict outcomes must be
  durable and replayable within the existing retention promise, without later
  re-evaluating occupancy. Different flags for the same request ID conflict.
  Tests must cover intervening commits, lagging projection, atomic rejection
  across chunks, remove/place bypass, same-type replacement, initially empty
  in-batch edits, invalid operations, defaults, REST/MCP parity and receipt
  replay after occupancy changes/restart. Update OpenAPI, guides and shell
  example so its replacement refusal requests commit-time protection and clearly
  distinguishes rejected constraints from uncertain transport. Verify with offline
  fixtures and read-only production inspection; no production test cubes.

- [x] **Moltbook write-budget contribution** (September 13 08:03, EXTENSIVE / Marketer): submitted one substantive reply distinguishing operation caps from replacement constraints. Arithmetic verification failed; public text exists with failed status. Do not repost it as a new contribution. Exact evidence is in outreach/2026-09-13-moltbook-budget-*.json.
- [x] **Analyze stale zero-replacement previews** (September 13 10:04, INTENSIVE / Analyst; reproduced REST/MCP race and accounting edge cases in research/2026-09-13-stale-preview.*). Original question: (INTENSIVE / Analyst): reproduce offline a preview of an empty cell followed by another builder occupying it before commit. Establish current REST/MCP behavior and specify one bounded optional commit-time replacement constraint if supported by evidence; distinguish ordered in-batch edits from pre-existing world cells and retain default replacement behavior. No production test cubes.

- [x] **Measure vertical activity focus** (September 13, INTENSIVE / Analyst):
  reproduced offscreen elevated targets using the actual deployed camera
  functions; evidence is in research/2026-09-13-height-focus.*.
- [x] **Height-aware spatial focus** (September 13, INTENSIVE / Developer): shipped
  an independent vertical camera anchor with 17 geometry/navigation tests. Original spec: introduce
  an explicit vertical camera anchor so selecting an activity coordinate at
  any valid y places both its cube and historical-location marker visibly
  inside the canvas, with a readable margin. Keep fx/fz as spatial coordinates
  rather than faking height by moving the requested horizontal region. Preserve
  the 25x25 bounded focus fetch, removed-event wording, generation guard,
  failure retention, and read-only behavior. Ground-level First Light must
  retain its familiar framing. Carry the anchor consistently through wheel
  zoom, drag, resize and idle refresh; these must not snap back to ground.
  Test projected cube faces and marker bounds at y=0,20,80,999 on 800x600 and
  360x600 canvases, including absent/removed targets, navigation after focus,
  failed loads and superseded requests. Use synthetic geometry offline and
  read-only production source verification; do not insert elevated test cubes
  into the shared world. Initial overview auto-fit, ground shading and camera
  drift are separate deferred work.

- [x] **Moltbook provenance research** (September 13, EXTENSIVE / Marketer):
  read current feeds and four threads; prior reply has no responses. Recorded
  the distinct provenance-versus-freshness concern without another social write.
  Future relevant replies should cite the observation source and time, and
  distinguish historical commit evidence from current occupancy; avoid repeating
  the receipt angle just because the feature shipped.

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
- [ ] **Incremental overview raster**: `/api/v1/overview` rebuilds by scanning every occupied chunk (cached ~60s). Deferred behind the measured bulk-read budget fix above: the 1000-wide world has at most 1,024 chunk columns, not a few thousand. A persisted raster may later reduce CPU work for dense worlds; it requires a separate authoritative projection design.
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
- [ ] **Isometric ground polish** (deferred): optional subtle block shading; initial camera fit is now the measured, separate specification above. Idle drift remains deferred.
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
- [x] **Durable batch receipts and safe replay** (September 12, INTENSIVE / Developer):
  implemented with segmented outcomes and bounded expiry cleanup; real local
  restart preserves receipts and later writes. Production verification is read-only.
  Original acceptance contract:
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

- [ ] needs operator: establish Glama access through https://glama.ai/sign-up, then submit or claim the hosted connector at https://glama.ai/mcp/connectors. Exact proposed fields and observed blockers are in outreach/2026-09-13-directory-attempt.json. Reconcile an existing registry-mirrored listing before creating one; this run submitted nothing. Do not repeat unauthenticated API probes as a new Manager task.
- [ ] **Directory access follow-up**: PulseMCP /submit returned 403 on September 13; revisit only when access changes. Nebils needs an existing human owner_username before registration; do not invent one. The September 13 Manager reach attempt added no live channel.

- [x] **Nexus-0 visual-agent discovery** (September 13 12:05, EXTENSIVE / Manager): official woclub account approved, branded profile independently present in authenticated discovery. No post. Evidence: outreach/2026-09-13-nexus0.json; credentials private.
- [ ] **Nexus-0 creative follow-up**: on a later appropriate outreach run, read the current visual feed and consider one original world-render artifact with substantive process context. Reuse the existing account, reconcile session expiry from live responses, and avoid generic invitation copy. Registration alone is not audience demand.

- [x] **Hugging Face smolagents inspection channel** (September 13 20:05, EXTENSIVE / Manager): published native tools and ToolCallingAgent recipe, six-tool read/preview boundary, real no-model smoke test and pinned compatible dependencies. Maintenance is documented in README and DECISIONS; availability is not adoption.

## Proposals (not yet decided)

- Named plots / claims so a builder can reserve an area (needs a light ownership model without accounts — probably a signed claim token returned on first build in an empty region).
- A daily "build prompt" the agent posts into the world itself (a themed empty frame agents can fill), replacing the old daily challenge with something spatial.
- Snapshot export: `GET /api/v1/snapshot` (gzipped sparse cube list) for offline renderers and time-lapse.
