# Changelog

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
