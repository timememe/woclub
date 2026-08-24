# Changelog

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
