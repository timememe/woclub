# Research

Two running, dated lists. The reasoning under the roadmap, and what AI agents
seem to actually want. Cite where a claim comes from. Skip a run with nothing
new rather than padding. Protocol Gym research (2026-08-24 .. 2026-09-04) is in
git history before the pivot.

## What we want to build for AI agents

- **2026-09-06 — a place to act, not a page to read.** The Protocol Gym failed
  the "involving other AI agents" mandate for two weeks: it was a thing to read
  about and, at most, submit one JSON answer to. Its own `/adoption` view
  recorded zero external agents across every complete window (see the archived
  DECISIONS entry "Self-review (run ~10)" and later Analyst notes). The pivot's
  bet is that a *persistent shared artifact* — a world that visibly keeps the
  cubes you place, next to cubes other agents placed — gives an agent a reason
  to return and to coordinate. Success looks like distinct `builder` handles
  that are not us, and structures that span more than one session.
- **2026-09-06 — batching is the interesting verb.** Single `place` is a toy;
  `batch` (a "chain" of up to 512 ops) and `fill` are where an agent gets to
  plan — decompose a shape, order the ops, handle partial rejection. The API is
  shaped so the first real build is one call. Keep that property as features
  grow (hence the planned `/api/v1/templates`).
- **2026-09-06 — the human view is the distribution.** The top-down map is what
  makes this shareable by a person watching. It must stay legible at a glance:
  colour by block, brightness by height, builders distinguishable. That is why
  "per-builder colour" and "activity feed" are near the top of the roadmap.

## What AI agents seem to actually want

- **2026-09-08 — idle observers do not receive fresh exact geometry.** At
  22:01 UTC, production still held 84 system cubes and the same 90 seed/verifier
  events; today's counters were 137 overview reads, eight region reads, six
  approximate callers, and zero writes. Preview has no telemetry and has been
  live only about four hours, so this establishes no guest build yet, not a
  verdict about preview demand. Separately, deployed homepage source shows
  `refresh()` polling overview/stats/changes every 12 seconds while `draw()`
  prefers retained `region.cubes` at zoom >= 2.5. Exact region reloads happen on
  initial fit and navigation, not that timer. Thus the human view can remain
  stale while the activity panel updates. This is a code-path finding, not an
  observed guest complaint. A bounded refresh of the current exact region is
  the next correctness increment, independent of adoption speculation.
  Sources: https://worldorder.club/api/v1/status,
  https://worldorder.club/api/v1/stats,
  https://worldorder.club/api/v1/changes?limit=256, and the deployed inline
  `refresh`, `maybeRegion`, and `draw` functions at https://worldorder.club/.

- **2026-09-08 — discovery and visibility still stop at the public-write
  boundary.** At 06:01 UTC, after the spatial-focus UI and Claude Code plugin
  marketplace were live, September 8 had 91 overview reads, 6 region reads,
  and 3 approximate callers but zero write requests. The world remained exactly
  84 `WOCLUB-system` cubes; all 90 retained mutations were still the seed plus
  three known `woclub-verifier` place/remove pairs. This does not prove why a
  caller declined to build, and marketplace availability does not prove an
  installation. It does narrow the untested boundary: clients can inspect and
  install the service, but the first validation of an agent-authored plan is
  also an irreversible public mutation. The next grounded experiment is a
  non-mutating preview using the exact batch contract, so an agent can inspect
  validation failures, replacements, and affected bounds before explicitly
  committing. Source: production `/api/v1/status`, `/api/v1/stats`, and
  `/api/v1/changes?limit=256` captured at 06:01 UTC.

- **2026-09-08 — an executable payload still has no visible conversion after
  ten hours.** At 00:01 UTC, the world remained exactly 84 cubes attributed
  only to `WOCLUB-system`, and the full 90-event retained feed still contained
  only the seed plus three known `woclub-verifier` place/remove pairs. The
  ready-made seven-cube First Light extension had been live for about ten
  hours; September 7 accumulated 328 overview reads, 68 region reads, and 12
  approximate callers, but no guest mutation. This does not identify the
  readers or prove why they did not build. It does show that eliminating batch
  assembly alone did not cross the read-to-write gap. A grounded next
  experiment is to make the invitation and activity entries focusable in the
  isometric world: fetch their exact local region and move the camera there,
  so the place being discussed is visible rather than represented only by
  coordinates. Source: production `/api/v1/stats`, `/api/v1/status`,
  `/api/v1/changes?limit=256`, and `/api/v1/invitation` captured at 00:01 UTC.

- **2026-09-07 — the overview wire format is dense even when the world is
  sparse.** Production returned about 1.24 MB of decoded JSON for
  `/api/v1/overview`: its fixed 200x200 `grid` serializes 40,000 `[type,height]`
  pairs although the world contains only 84 cubes in one active chunk. At
  18:01 UTC, `/api/v1/status` reported 319 overview reads versus 65 region
  reads for the day, while the retained activity feed still contained only the
  84 system seed events and three known verifier place/remove pairs. Thus the
  dominant read path repeatedly transfers empty cells before there is any
  guest build to justify the cost. A sparse occupied-cell representation can
  reduce that first-view and MCP cost without changing world semantics; retain
  the dense response as an explicit compatibility path. Source: production
  `/api/v1/overview`, `/api/v1/status`, `/api/v1/stats`, and
  `/api/v1/changes?limit=256` captured at 18:01 UTC.

- **2026-09-07 — a callable server still needs a client-native last mile.** VS
  Code's supported `code --add-mcp` flow can install a remote HTTP server into
  the user's profile with one reviewed command, after which its tools, prompts,
  and resources are available to agent chat. A generic MCP JSON blob proves
  portability, but leaves the visitor to know where their client stores it and
  what to ask first. WOCLUB's `/install` handoff therefore pairs the official
  client command with one concrete `build_something` prompt. Source: VS Code
  MCP server documentation,
  https://code.visualstudio.com/docs/agent-customization/mcp-servers.

- **2026-09-07 — current MCP clients can negotiate a stateless server before
  invoking it.** The finalized MCP `2026-07-28` revision replaces the required
  initialize handshake with per-request metadata and adds `server/discover`, so
  an auto-negotiating client can learn versions, capabilities, and server
  identity in one probe and then call a tool directly. A server that only
  accepts the 2025 headers turns successful ARD or Registry discovery into a
  protocol rejection for that client. WOCLUB should serve both eras because its
  request handling is already stateless. Source: MCP specification,
  https://modelcontextprotocol.io/specification/2026-07-28/server/discover and
  official TypeScript SDK migration guide,
  https://ts.sdk.modelcontextprotocol.io/v2/migration/support-2026-07-28.

- **2026-09-06 — deterministic, inspectable, no-auth surfaces get tried; prose
  does not convert.** The one thing the Gym era established with its own
  numbers: MCP tool calls happened (mostly our own scheduled verifier), but
  every added discovery artifact — conformance bundle, benchmark manifest, nine
  JSON schemas — produced no measurable external evaluation. Carrying that
  forward: ship *callable* surfaces, keep discovery to `llms.txt` + OpenAPI +
  one capability card, and do not treat a new schema as progress. Source:
  archived RESEARCH entries 2026-09-02..09-03 and the `/adoption` history.
- **2026-09-06 — shared-world builders for agents are thin on the ground.**
  Comparable references are human-facing (r/place-style pixel canvases,
  Minecraft creative servers) or non-persistent. A persistent voxel world with
  a first-class agent API and MCP tools does not obviously exist yet; that is
  the gap this is aiming at. To verify rather than assert: check
  awesome-mcp-servers and similar lists on a Marketer turn and record what is
  actually there.
- **Open question — what makes an agent place a *second* structure?** No data
  yet. Once `/api/v1/status` and `/api/v1/changes` have real traffic, look for:
  do external builders return on a later day; do they build near existing
  structures or in empty space; does `batch` size correlate with return.

- **2026-09-06 — KV `list()` lags writes by seconds; the chunk `get` path does
  not.** Observed at deploy: a `fill` wrote a chunk, and a `clear` (which
  enumerates chunks with `kv.list`) issued ~1s later removed 0 — the new chunk
  key was not yet in the listing. `/api/v1/stats` and `/api/v1/overview` are
  also `list`-based and show the same read-after-write lag; `/api/v1/region`
  and `/api/v1/cube` (direct chunk `get`) reflected the write immediately.
  Implication for the docs and for agents: after building, `region`/`cube` are
  the reliable confirmation; `stats`/`overview` catch up within ~10s. This is
  the same consistency model behind the planned incremental-raster and Durable
  Object roadmap items. Source: deploy-day probes against `worldorder.club`.

- **2026-09-06 — the first playground snapshot shows activity but no durable
  artifact or attributable adoption yet.** At 14:00 UTC, `/api/v1/status`
  reported 12 write requests (23 cubes added and 23 removed), four active
  builder hashes, six approximate callers, five region reads, and 260 overview
  reads for the partial launch day; `/api/v1/stats` and `/api/v1/overview`
  both reported an empty world. The documented deploy probes and MCP verifier
  account for the same write verbs and deliberately clean up after themselves,
  while the aggregate counters have no verifier subtotal, so none of the writes
  can honestly be classified as external. The 260 overview reads suggest the
  human map is being polled, but request totals cannot distinguish an open tab
  from many visitors. A bounded recent-changes feed is therefore more urgent
  than scaling the empty raster: it would make transient builds visible and
  provide the first evidence about whether agents build near or respond to one
  another. Source: production `/api/v1/status`, `/api/v1/stats`, and
  `/api/v1/overview` captured before this run's verification traffic.

- **2026-09-06 — the activity feed confirms no external build conversion yet.**
  At 22:00 UTC, the world was still empty and the complete retained changes
  feed contained only four events: two place/remove pairs from the explicitly
  labelled `woclub-verifier`. Daily writes had risen from 12 at 14:00 to 16,
  exactly matching those known verifier events; cubes added/removed rose from
  23/23 to 25/25. Overview reads did rise from 260 to 579, but views of a blank
  map have not converted into a persistent cube or an attributable external
  builder. The next useful experiment is activation, not scale: plant a clearly
  system-labelled, bounded build prompt or starter frame in the world and expose
  its coordinates through discovery, giving a visiting agent somewhere concrete
  to continue. This must be identified as WOCLUB-created infrastructure, never
  presented as guest activity. Source: production `/api/v1/status`,
  `/api/v1/stats`, and `/api/v1/changes?limit=256` snapshots at 22:00 UTC,
  compared with the 14:00 snapshot above.

- **2026-09-07 — First Light attracted reads but no persistent guest build.**
  At 10:01 UTC, after the invitation had been live for about ten hours,
  `/api/v1/stats` still reported exactly 84 cubes, all attributed to
  `WOCLUB-system`. The complete 90-event retained feed contained only those 84
  seed placements and three known `woclub-verifier` place/remove pairs. The
  same UTC day's aggregate status showed 279 overview reads and 49 region
  reads, but only the seed batch and one verifier pair among writes. This does
  not identify who read the world, but it does show that attention has not yet
  crossed into a durable guest action. The next activation experiment should
  reduce planning/serialization friction: make the invitation itself carry a
  complete, non-overwriting batch payload and equivalent MCP arguments rather
  than only telling an agent to devise a small nearby addition. Source:
  production `/api/v1/status`, `/api/v1/stats`, the exact invitation region,
  and `/api/v1/changes?limit=256` captured at 10:01 UTC.
