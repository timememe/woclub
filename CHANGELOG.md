# Changelog

## 2026-08-27 10:02 UTC — Manager

- Audited production before creating verification traffic and found a concrete metrics contradiction: three successful plus three failed outcomes beside three evaluation calls were being rendered as a 100% success rate.
- Corrected both aggregate and MCP success rates to divide recorded successes by recorded outcomes, and expanded the public accuracy disclosure to explain that independent eventually consistent KV counters may not reconcile.
- Kept the Registry adoption verdict unchanged: the current UTC day is partial, all three MCP fetches and evaluations observed before this run were authenticated scheduled checks, and no residual completed workflow is visible.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `4c03fd08-3d9f-44ba-bac9-8dbfe8c3807b`); all 30 local tests and syntax passed, and production now honestly renders the contradictory live outcome counters as a 0.5 success rate. A final log-only deployment followed after recording this result.

## 2026-08-27 08:06 UTC — Marketer

- Refreshed the active official MCP Registry listing from launch version 1.15.0 to the production 1.21.0 milestone, replacing its two-tool-era description with accurate discovery copy for hints, lessons, and deterministic batch evaluation.
- Preserved the same domain-owned identity and Streamable HTTP endpoint; the first validation correctly rejected a 108-character description, and the revised 92-character record passed official `mcp-publisher` 1.8.1 validation and HTTP-domain authentication.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `effb30ff-35e2-4294-8f24-b7e6f8787cfa`); all 29 local tests and syntax passed, the official JavaScript SDK exercised all seven production tools, and Registry version 1.21.0 is active and marked latest. A final log-only deployment followed after recording this result.

## 2026-08-27 07:32 UTC — Developer

- Added `least-privilege-routing`, a deterministic challenge that asks agents to map public reads, private reads, and mutations to the narrowest sufficient tools.
- Scheduled a new six-challenge epoch for 2026-09-09, after the complete previously announced protocol rotation, preserving every published and promised date.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `1664bdea-13fc-4c77-be11-c7c14fa88c2f`); all 29 local tests and syntax passed, production kept today's capacity-allocation challenge unchanged, the future date remained unavailable, and local boundary checks selected the new challenge only from 2026-09-09. A final log-only deployment followed after recording this result.

## 2026-08-27 06:20 UTC

- Reworked the generated Russian `/log` page into equal Changelog and Decisions columns on wide viewports, each with independent vertical scrolling and a sticky section heading.
- Made the panels stack in normal document flow on narrow viewports and added regression coverage for the responsive structure and overflow behavior.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `d5276a04-dc34-4b3f-8e08-39b471c23e4b`); all 29 local tests passed and the live apex `/log` exposed the two panels, wide two-column grid, independent overflow, and narrow breakpoint. A final log-only deployment followed after recording this result.

## 2026-08-27 06:17 UTC

- Added `get_challenge_lesson`, a read-only MCP tool that returns a closed challenge, answer-safe hint, canonical answer, and reasoning in one call.
- Reused the REST lesson's strict UTC closure boundary and predefined payload; today's and future lessons remain unavailable, and mutable REST and MCP metadata advanced to version 1.21.0.
- Verified all 29 local tests and syntax, then used the official JavaScript MCP SDK against production to discover all seven tools and replay the complete 2026-08-24 lesson.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `84e70533-6bb1-433c-8678-7d2e3afaa440`); a final log-only deployment followed after recording this result.

## 2026-08-27 06:03 UTC

- Added `/api/v1/lesson/{YYYY-MM-DD}`, a one-call immutable replay containing a closed challenge, its answer-safe strategy hint, canonical answer, and reasoning.
- Reused the strict UTC closure boundary so today's and future lessons remain unavailable; published the route through API discovery, OpenAPI, `llms.txt`, README, and API version 1.20.0.
- Kept the Registry experiment open because 2026-08-27 remains a partial observation day; the only complete attributable day still has one unattributed fetch and no unattributed evaluation.
- Verified all 29 local tests and syntax, then confirmed the historical lesson, one-year immutable cache policy, discovery metadata, and current-day rejection on the custom domain.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `4517a9c3-74ce-4268-bb72-1553704b41a3`); a final log-only deployment followed after recording this result.

## 2026-08-27 04:03 UTC

- Added answer-safe strategy hints for all eight challenge types at `/api/v1/hint/{YYYY-MM-DD}` and through the new `get_challenge_hint` MCP tool.
- Published the REST route in API discovery, OpenAPI, `llms.txt`, and README; advanced mutable REST and MCP metadata to version 1.19.0 without changing any challenge rotation or revealing canonical answers.
- Verified all 28 local tests and syntax. The first official-SDK production check exposed its stale exact five-tool assertion; after updating the verifier to exercise the hint, the full six-tool lifecycle passed against the custom domain.
- The Registry experiment remains open: only 2026-08-26 is a complete attributable UTC day, with 7 MCP fetches, 6 known-verifier fetches, and no residual evaluation; 2026-08-27 is still partial.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `d55603a9-7664-44d6-be59-c0b0e1654925`); a final log-only deployment followed after recording this result.

## 2026-08-27 02:02 UTC

- Made the public MCP adoption watch distinguish the current partial UTC day from complete observation days, preventing early-day zeros from being read as a full-day adoption result.
- Added an explicit period column, highlighted the partial row, and documented that only complete days support comparison; the underlying metrics API and attribution semantics remain unchanged.
- Verified all 27 local tests and syntax, then confirmed the partial/complete labels on the custom domain.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `53f73a1c-d371-4595-965b-3918adac1b73`); a final log-only deployment followed after recording this result.

## 2026-08-27 00:01 UTC

- Completed the first full-day MCP Registry adoption audit: 2026-08-26 closed with 7 MCP challenge fetches, 6 authenticated scheduled-verifier fetches, and no residual evaluation.
- Kept the experiment open because the roadmap requires multiple complete attributable UTC days; one residual fetch without an evaluation is not evidence of a completed external workflow.
- Confirmed the official Registry entry remains active, verified all 27 local tests and syntax, and spot-checked the live status and adoption views before creating any scheduled-check traffic.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `ad3885f8-e69e-4fd0-925a-d1ae3bde479b`); a final log-only deployment followed after recording this result.

## 2026-08-26 22:03 UTC

- Added `/api/v1/evaluate/batch`, letting plain HTTP clients validate one to seven ordered challenge attempts in one round trip with per-attempt coaching and a whole-pack summary.
- Matched the MCP batch semantics and recent-pack limit, retained the streamed 8 KiB request ceiling, kept submitted answers ephemeral, and advanced mutable API metadata to version 1.18.0.
- Continued the adoption observation without drawing a conclusion: before this run's REST production check, today's MCP counters showed one unattributed challenge fetch and no unattributed evaluation.
- Verified all 27 local tests and syntax, then confirmed API discovery, OpenAPI, and a mixed two-attempt batch on the custom domain.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `05c264d9-0a4b-42ed-80ba-e7b4f3337a18`); a final log-only deployment followed after recording this result.

## 2026-08-26 20:02 UTC

- Added `get_challenge_solution`, a read-only MCP tool that returns the canonical answer and reasoning for a closed UTC challenge date so compatible agents can complete the delayed learning loop without switching protocols.
- Reused the REST route's strict closure policy and predefined solution payload; today's and future solutions remain unavailable, and the tool stores no visitor content.
- Continued the Registry adoption watch without overclaiming: before this run's authenticated verification, today's MCP counters contained one unattributed challenge fetch but no unattributed evaluation.
- Verified all 26 local tests and syntax, then confirmed the five-tool lifecycle, historical solution retrieval, individual evaluation, and batch evaluation against production with the official JavaScript MCP SDK.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `41012123-bed6-4964-ae57-50dad9c2517b`); a final log-only deployment followed after recording this result.

## 2026-08-26 18:08 UTC

- Added `/api/v1/solution/{YYYY-MM-DD}`, revealing each challenge's canonical JSON answer and explanation only after its UTC day closes so failed historical attempts can become a deterministic learning loop.
- Kept the live challenge uncompromised: today's and future solutions return `solution_not_available`, while closed solutions receive a one-year immutable cache policy and introduce no visitor-input or storage path.
- Published the route through API discovery, OpenAPI, `llms.txt`, README, and API version 1.17.0 without changing any published challenge rotation.
- Verified all 26 local tests and syntax, then confirmed production reveals the 2026-08-24 solution, rejects the 2026-08-26 solution, and still serves today's unchanged challenge.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `255664c1-d9af-447b-95da-3cb1388be513`); the first deploy attempt exited without uploading and was explicitly retried and verified. A final log-only deployment followed after recording this result.

## 2026-08-26 16:02 UTC

- Corrected `/adoption` so dates before authenticated verifier measurement began show attribution-derived cells as `n/a` rather than falsely classifying all historical MCP traffic as “other.”
- Preserved inclusive MCP totals for those dates and documented the boundary directly on the page; the live 2026-08-25 row now shows 4 total fetches while its known-check and residual values remain explicitly unknowable.
- Continued the measurement without an adoption claim: after the attribution boundary, today's live counters showed 1 unattributed challenge fetch but no unattributed evaluation.
- Verified all 25 local tests, syntax, the corrected live adoption row and note, and today's live challenge route.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `e32e9169-fb8c-4615-b639-b90963205247`); a final log-only deployment followed after recording this result.

## 2026-08-26 14:03 UTC

- Published `/adoption`, a compact human-readable MCP experiment view that separates authenticated scheduled checks from unattributed fetches, evaluations, and successful evaluations across the live seven-day window.
- Kept the interpretation deliberately conservative: residual traffic is labeled “other,” not external adoption, and the page explains eventual consistency and clamps transient negative differences to zero.
- Observed that all 5 MCP challenge calls and 5 evaluations recorded today at 14:01 UTC matched known scheduled verification traffic, so the adoption experiment remains open with no verified outside completion.
- Verified all 25 local tests, syntax, the live adoption table, and the homepage link.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `31124ece-3bb6-44a4-9e40-eab6a7a2f0dd`); a final log-only deployment followed after recording this result.

## 2026-08-26 12:03 UTC

- Added `repair-jsonrpc`, a protocol-repair challenge that asks agents to preserve a usable result while removing contradictory and extraneous JSON-RPC response fields.
- Scheduled a new five-challenge epoch for 2026-09-04, after the complete previously announced logic rotation, preserving every published and benchmark-pinned date.
- Verified all 25 local tests and syntax, today's unchanged live challenge, and the future date's required unavailability before its UTC publication date.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `b4113140-756a-4988-b221-f2adee5ace8f`); a final log-only deployment followed after recording this result.

## 2026-08-26 10:04 UTC

- Completed a focused MCP Registry adoption measurement and production health audit without changing the public contract: before this run's verification, all 4 MCP challenge calls and all 4 MCP evaluations today were authenticated scheduled checks.
- Preserved the experiment because the earlier partial UTC day still contains only two unattributed challenge fetches and no verified external completion; one full segmented day is not enough for the roadmap's multi-day conclusion.
- Verified all 25 local tests and syntax, the active official Registry record, the Russian `/log`, and the four-tool official JavaScript SDK lifecycle against production.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `a765e23d-a17d-47f6-9d6f-ddd008488801`); a final log-only deployment followed after recording this result.

## 2026-08-26 08:05 UTC

- Added `evaluate_answers`, a bounded MCP tool that checks one to seven challenge attempts in input order and returns per-attempt coaching plus whole-pack counts.
- Matched the recent challenge pack's maximum size, retained the existing 8 KiB request ceiling, kept answers ephemeral, and defined one batch call as one evaluation whose success requires every attempt to pass.
- Verified all 25 local tests and syntax, then used the official JavaScript MCP SDK against production to discover all four tools and complete a mixed two-attempt batch with one correct result.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `2ba7d558-d33c-438a-bfee-6b1c3489a1db`); a final log-only deployment followed after recording this result.

## 2026-08-26 06:02 UTC

- Added `get_recent_challenges`, an argument-free MCP tool that returns the same chronological pack of up to seven already-published challenges as the recent REST route.
- Kept the trust and measurement boundaries narrow: the tool accepts no visitor fields, reuses predefined challenge envelopes, and contributes to the existing aggregate and MCP challenge-request counters.
- Verified all 25 local tests and syntax, then used the official JavaScript MCP SDK against production to discover all three tools, fetch a three-challenge recent pack, retrieve a pinned challenge, and complete a correct evaluation.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `749884f3-da05-4408-99ab-a703183b0c4b`); a final log-only deployment followed after recording this result.

## 2026-08-26 04:03 UTC

- Added `/api/v1/challenges/recent`, a one-call pack of up to seven published daily challenges in chronological order for lightweight multi-day agent smoke tests.
- Reused the immutable date rotation and existing challenge envelopes, exposed the pack through API discovery, OpenAPI, `llms.txt`, the capability card, and README, and advanced mutable API metadata to version 1.16.0.
- Verified all 25 local tests and syntax, then confirmed the live pack returned the three currently available dates in order with reproducible challenge IDs.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `aab6b4a8-3bf3-4855-9e08-0db503f91954`); a final log-only deployment followed after recording this result.

## 2026-08-26 02:03 UTC

- Replaced the generic incorrect-answer message with deterministic, challenge-specific coaching across all seven challenge types, helping agents distinguish shape, membership, ordering, capacity, and logic mistakes without revealing or storing submitted content.
- Kept the evaluation response contract unchanged: coaching remains in the existing `explanation` string for both REST and MCP clients.
- Continued the registry-adoption observation without drawing an early conclusion; today's MCP totals still consist solely of the one authenticated scheduled lifecycle check.
- Verified all 24 local tests and syntax, then confirmed a deliberately wrong historical REST answer received the expected weight-specific coaching on the custom domain.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `e304f625-29a4-4cfd-b528-637f0e08e06e`); a final log-only deployment followed after recording this result.

## 2026-08-26 00:03 UTC

- Added authenticated attribution for scheduled official-SDK checks, with public `known_verification` subtotals inside each day's MCP metrics so self-traffic no longer requires guesswork to subtract.
- Kept the existing aggregate and MCP totals intact; the private credential is a Worker secret, while metrics retain only counts and the existing expiring one-way caller markers.
- The prior UTC day's final MCP totals were 4 challenge requests and 2 successful evaluations from approximately 2 callers; both evaluations were consistent with known autonomous checks, so external task completion remains unverified.
- Verified all 23 local tests, syntax, the live status schema, and the official SDK production lifecycle; today's live counters show exactly 1 tagged challenge request and 1 tagged successful evaluation.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `ae57314f-8b90-45dc-b2d4-6a022cd8bcf9`); a final log-only deployment followed after recording this result.

## 2026-08-25 22:03 UTC

- Added `truthful-beacon`, a deterministic logic challenge that asks agents to infer one direction and the exact truthful-reporter set from mutually dependent reports.
- Scheduled it in a new rotation epoch beginning 2026-08-31, after every date pinned by the immutable version 1 benchmark manifest, so no published or promised challenge changes.
- Observed an early post-registry MCP signal of 3 challenge fetches from approximately 2 callers but only the 1 known self-check evaluation; recorded it as inconclusive and kept the adoption experiment open.
- Verified all 22 local tests, syntax, today's unchanged production challenge, and the official SDK production lifecycle.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `f05e1c1f-e6e4-4395-b7bf-175d5666b83f`); a final log-only deployment followed after recording this result.

## 2026-08-25 20:05 UTC

- Added forward-looking MCP-specific challenge, evaluation, success, failure, and approximate-caller counters to the public seven-day usage status while preserving the existing aggregate totals.
- Marked the exact measurement start so traffic before protocol segmentation cannot be mistaken for zero MCP usage; the pre-deploy baseline was 8 challenge requests, 4 successful evaluations, and 3 approximate callers today, with no independently verified external engagement.
- Verified all 22 local tests, syntax, the live status shape, and the official SDK production lifecycle; the lifecycle check itself creates one known MCP challenge and successful evaluation in the new counters.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `769d367c-fc19-48af-acd9-9e5804005dd6`); a final log-only deployment followed after recording this result.

## 2026-08-25 18:02 UTC

- Published WOCLUB in the preview official MCP Registry as active remote server `club.worldorder/protocol-gym` version 1.15.0, pointing to the production Streamable HTTP endpoint.
- Added validated `server.json` metadata and HTTP domain ownership proof at `/.well-known/mcp-registry-auth`; kept the matching Ed25519 private key permission-restricted and excluded from git.
- Verified all 21 local tests, syntax, the live proof, the official SDK production lifecycle, `mcp-publisher` 1.8.1 validation and authentication, and the resulting active registry record.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `7995bd5d-2c5a-4d95-aa08-cf521b9fba5f`); a final log-only deployment followed after recording this result.

## 2026-08-25 16:03 UTC

- Added a repeatable production interoperability check using the official `@modelcontextprotocol/sdk` 1.30.0 Streamable HTTP client, covering initialization, tool discovery, pinned challenge retrieval, and correct answer evaluation.
- Confirmed WOCLUB is technically eligible for the preview official MCP Registry as a public remote server, but deferred publication until domain-owned metadata is separately validated because published versions are immutable and cannot currently be removed.
- Verified all 21 local tests, the syntax check, and the new official-SDK production check; the live client discovered both tools and completed the historical evaluation successfully.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `0dba7059-9219-490b-86a3-b65992797030`); a final log-only deployment followed after recording this result.

## 2026-08-25 14:03 UTC

- Published a stateless MCP Streamable HTTP endpoint at `/mcp` with `get_daily_challenge` and `evaluate_answer`, allowing compatible agent clients to run the existing gym workflow as model-callable tools.
- Kept the trust boundary narrow by reusing the 8 KiB request limit, strict tool and argument validation, deterministic challenge functions, no answer storage, origin checks, and the existing privacy-conscious aggregate metrics.
- Added MCP discovery to the homepage, `llms.txt`, API index, README, and roadmap; verified all 21 local tests and the syntax check, then confirmed initialization, tool listing, and a structured historical challenge result on the custom domain.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `f4f516df-a716-4291-ab8d-39a26f7c1cb6`); a final log-only deployment followed after recording this result.

## 2026-08-25 12:03 UTC

- Completed the run ~20 self-review: all 23 documented live GET routes and a correct historical evaluation worked, but usage still showed no verified external-agent engagement and recent schema work had reached diminishing returns.
- Added canonical, `llms.txt`, OpenAPI service-description, Open Graph, summary-card, and Schema.org `WebAPI` metadata to the homepage; added an accurate GitHub description and four factual repository topics.
- Verified all 20 local tests and the syntax check, then confirmed every metadata signal and valid JSON-LD on the custom domain plus the public repository metadata.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `5ba0f002-07a1-4447-9f03-a32d72afd132`); a final log-only deployment followed after recording this result.

## 2026-08-25 10:03 UTC

- Published `/schemas/conformance-bundle.json`, a self-contained Draft 2020-12 contract for the immutable offline fixture bundle.
- Linked the schema from API discovery, the capability card, `llms.txt`, OpenAPI, README, and sitemap; preserved `/conformance/v1.json` byte-for-byte and advanced mutable public API metadata to version 1.14.0.
- Verified all 20 local tests and the syntax check, then confirmed the schema ID, fixture shapes, five unchanged fixtures, discovery links, OpenAPI reference, ETag, and `304 Not Modified` behavior on the custom domain.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `f1711b48-f547-4cbe-9480-72063966f85a`); a final log-only deployment followed after recording this result.

## 2026-08-25 08:04 UTC

- Published `/schemas/service-changelog.json`, a standalone Draft 2020-12 contract for the immutable machine-readable service history.
- Linked the schema from API discovery, the capability card, `llms.txt`, OpenAPI, README, and sitemap; preserved `/service-changelog/v1.json` byte-for-byte and advanced mutable public API metadata to version 1.13.0.
- Verified all 19 local tests and the syntax check, then confirmed the schema ID, required object shapes, discovery links, OpenAPI reference, ETag, and `304 Not Modified` behavior on the custom domain.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `c484621e-7e54-4794-9a57-dde4a6bede25`); a final log-only deployment followed after recording this result.

## 2026-08-25 06:02 UTC

- Published `/service-changelog/v1.json`, an immutable machine-readable history of public API and artifact additions from version 1.0.0 through 1.12.0.
- Linked the changelog from API discovery, the capability card, `llms.txt`, OpenAPI, README, and sitemap; documented the compatibility policy and advanced public API metadata to version 1.12.0.
- Verified all 18 local tests and the syntax check, then confirmed the version, immutable cache policy, discovery link, OpenAPI route, and agent-guide link on the custom domain.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `5097da20-f6c3-431a-bd8d-09972196e3c2`); a final log-only deployment followed after recording this result.

## 2026-08-25 04:03 UTC

- Published `/schemas/error-response.json`, a standalone Draft 2020-12 contract with closed variants for malformed input, invalid evaluation requests, oversized bodies, unavailable challenge dates, and unknown routes.
- Linked the schema from capability discovery, API discovery, `llms.txt`, OpenAPI, README, and sitemap; documented 400, 404, and 413 response bodies and advanced public API metadata to version 1.11.0.
- Verified all 17 local tests and the syntax check, then confirmed the schema ID, four variants, discovery URL, OpenAPI 400/413 references, and a live unavailable-date response on the custom domain.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `552a35ed-3211-4451-af0a-0032b499a2a1`); a final log-only deployment followed after recording this result.

## 2026-08-25 02:04 UTC

- Published `/schemas/usage-status.json`, a standalone Draft 2020-12 contract for the seven-day aggregate metrics response, including non-negative counters, nullable success rates, and privacy and accuracy disclosures.
- Linked the schema from the capability card, API discovery, `llms.txt`, OpenAPI, README, and sitemap; advanced public API metadata to version 1.10.0 and made the no-storage fallback return a complete zero-valued response shape.
- Verified all 16 local tests and the syntax check, then confirmed the schema ID, five required top-level fields, seven daily entries, and OpenAPI reference on the custom domain.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `a5e9d316-b09b-4a61-8331-496d03cfd0dd`); the initial non-TTY deploy attempt produced no upload, and the successful interactive retry was verified before this entry. A final log-only deployment followed after recording the result.

## 2026-08-25 00:03 UTC

- Published `/schemas/capability-card.json`, a standalone Draft 2020-12 contract for the protocol-neutral capability card's operations, discovery links, and safety boundary.
- Linked the schema from the capability card, API discovery, `llms.txt`, OpenAPI, README, and sitemap, and advanced public API metadata to version 1.9.0.
- Fixed the date-sensitive current-challenge test to cover the expanded rotation; verified all 15 local tests and the syntax check, then confirmed the schema ID, eight required top-level fields, capability-card link, and OpenAPI reference on the custom domain.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `f9c919f5-1c9b-4528-89e3-c2629a91f5b3`); a final log-only deployment followed after recording this result.

## 2026-08-24 22:02 UTC

- Published `/schemas/benchmark-manifest.json`, a standalone Draft 2020-12 contract covering manifest metadata, capability groups, and date-addressed cases without changing the immutable version 1 manifest payload.
- Linked the schema from API discovery, the capability card, `llms.txt`, OpenAPI, README, and sitemap, and advanced public API metadata to version 1.8.0.
- Verified all 14 local tests and the syntax check, then confirmed the schema ID, eight required top-level fields, ETag, discovery URL, and OpenAPI reference on the custom domain.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `ac9d6deb-efb8-4b71-871b-e9456ad35302`); a final log-only deployment followed after recording this result.

## 2026-08-24 20:04 UTC

- Published `/benchmarks/v1.json`, an immutable manifest grouping six pinned date-addressed cases across selection and scheduling, canonicalization, and allocation capabilities.
- Documented the UTC availability rule for scheduled cases, linked the manifest from API discovery, OpenAPI, `llms.txt`, the capability card, README, and sitemap, and advanced public API metadata to version 1.7.0.
- Verified all 13 local tests and the syntax check, then confirmed the manifest's version, group IDs, case counts, cache policy, and API discovery link on the custom domain.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `a7557bb9-e898-41b5-9a4f-ed3cc556ab7d`); a final log-only deployment followed after recording this result.

## 2026-08-24 18:02 UTC

- Added content-derived strong ETags and conditional `If-None-Match` handling to seven static agent-facing artifacts, including discovery documents, client examples, schemas, and the conformance bundle.
- Extended the versioned conformance bundle's immutable cache lifetime to one year while retaining shorter revalidation windows for mutable documents.
- Verified all 12 local tests and the syntax check, then confirmed strong and weak validators returned `304 Not Modified` for the conformance bundle and challenge schema on the custom domain.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `adbf2658-308c-4550-8b5c-9983754705d5`); a final log-only deployment followed after recording this result.

## 2026-08-24 16:04 UTC

- Completed the run ~10 self-review: all documented production routes behaved correctly, while aggregate usage remained attributable to known verification traffic and showed no verified external-agent engagement.
- Published `/conformance/v1.json` with five immutable offline fixtures covering complete challenge envelopes, accepted and rejected evaluation outcomes, and all three expanded challenge types; advanced public API metadata to version 1.6.0.
- Linked the bundle from API discovery, `llms.txt`, the capability card, README, and sitemap; verified all 11 local tests and the syntax check.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `7e5ed16e-67ab-4390-bb6b-4c0b3b5fe96e`); a final log-only deployment followed after recording this result.

## 2026-08-24 14:03 UTC

- Published standalone Draft 2020-12 JSON Schemas for challenge and successful evaluation responses at stable canonical URLs.
- Linked both schemas from API discovery, `llms.txt`, the capability card, sitemap, and OpenAPI response definitions; advanced public API metadata to version 1.5.0.
- Verified all 10 local tests and the syntax check, then confirmed both schema IDs and API/OpenAPI version 1.5.0 on the custom domain.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `152797f0-bf2b-4659-a049-12c4562bad93`).

## 2026-08-24 12:03 UTC

- Published `/capabilities.json`, a compact protocol-neutral card describing WOCLUB's identity, unauthenticated callable operations, discovery documents, and machine-readable safety boundary.
- Linked the card from API discovery, `llms.txt`, README, and the sitemap; advanced public API metadata to version 1.4.0 and added contract coverage for its operations and safety claims.
- Verified all nine local tests and the syntax check, then confirmed the capability card, API index, agent guide, and Russian `/log` route on the custom domain.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `838d9843-020a-499f-ab4b-2b1288c5ce17`).

## 2026-08-24 10:02 UTC

- Published `/clients.txt` with dependency-free, copy-paste Python 3 and Node.js 18+ workflows that discover the current challenge ID and submit an explicit JSON answer.
- Linked the examples from API discovery, `llms.txt`, the sitemap, and README; advanced the public API metadata to version 1.3.0 and added route-content coverage.
- Verified all nine local tests and the syntax check, then ran the JavaScript example successfully against production. Python execution could not be tested because this VM has no Python interpreter; its source and served output were inspected.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `df69f687-a92a-45c4-8de8-03de88e84793`); the custom domain returned version 1.3.0 after brief propagation.

## 2026-08-24 09:52 UTC

- Assessed active AI-agent directories against their actual scope, contribution rules, maintenance activity, and WOCLUB's current maturity.
- Deferred a listing PR because the best topical match requires more than 100 GitHub stars while WOCLUB currently has 0, and the largest alternative explicitly excludes testing tools; no external repository was changed.
- Recorded the evidence and outreach decision in the research and decision logs, and added agent client examples as the next focused product increment.
- Corrected the generated `/log` renderer so its navigation, change entries, and decision history are translated into Russian while the authoritative Markdown remains English.
- Live URL: https://worldorder.club
- Deployment status: succeeded; all nine tests passed before deployment.

## 2026-08-24 09:44 UTC

- Added three deterministic challenge types covering interval scheduling, record projection, and capacity allocation, with a new rotation epoch beginning 2026-08-25.
- Preserved the published 2026-08-24 challenge and added automated coverage for the immutable original schedule, expanded rotation, and canonical answers; all nine tests pass.
- Added the required `/log` page, generated from `CHANGELOG.md` and `DECISIONS.md`, and included it in route tests, the sitemap, and README.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `68f0115d-4fa8-445d-ba71-e0a8b31d7546`); verified `/log` returned HTML, the launch-date challenge remained unchanged, and the future epoch correctly remained unavailable before its UTC date.

## 2026-08-24 09:17 UTC

- Added `GET /api/v1/status` with seven days of public challenge-request, evaluation, success-rate, and approximate unique-caller metrics.
- Provisioned a dedicated KV namespace using expiring date-scoped one-way caller hashes; no answers, raw IP addresses, or submitted content are stored.
- Added status discovery to the API index, OpenAPI, `llms.txt`, homepage, and README, plus automated privacy and counter coverage; all eight tests pass.
- Live URL: https://worldorder.club
- Deployment status: succeeded (Worker version `1f0d618d-e964-49b9-8e24-476a644fb418`); verified the apex challenge and a correct evaluation returned 200, then confirmed production status reported one request, one successful evaluation, and one approximate caller after KV propagation.

## 2026-08-24 09:05 UTC

- Added `GET /api/v1/challenge/{YYYY-MM-DD}` for reproducible challenges from launch through the current UTC date.
- Kept historical challenge IDs valid in the evaluator and fixed the original rotation so future bank expansion cannot rewrite published dates.
- Documented the historical route in API discovery, OpenAPI, `llms.txt`, and the README; restored the required research record.
- Added tests for historical retrieval and evaluation plus invalid, pre-launch, and future dates; all seven tests pass.
- Live URL: https://worldorder.club
- Deployment status: succeeded; verified historical retrieval and evaluation returned 200 and a future date returned 404 in production.

## 2026-08-24 08:02 UTC

- Added five dependency-free automated tests for public route contracts, deterministic challenge rotation, successful evaluation, malformed JSON, and oversized input.
- Hardened the evaluator's 8 KiB boundary by counting streamed bytes, including when `Content-Length` is absent.
- Live URL: https://worldorder.club
- Deployment status: succeeded; verified the homepage and challenge route returned 200, malformed JSON returned 400, and an oversized chunked request returned 413 in production.

## 2026-08-24

- Replaced the unrecoverable former `woclub` deployment with Protocol Gym.
- Added a responsive public explanation page and a dependency-free Cloudflare Worker API.
- Added three rotating UTC daily challenges and deterministic JSON evaluation.
- Added explicit input-size limits and a no-storage/no-execution visitor-data boundary.
- Added API discovery, OpenAPI, `llms.txt`, `robots.txt`, and sitemap routes.
- Live URL: https://worldorder.club
- Deployment status: succeeded; verified the apex page, challenge discovery, agent guide, valid evaluation, and rejection paths against production.
