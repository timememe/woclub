# Changelog

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
