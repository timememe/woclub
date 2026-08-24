# Changelog

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
