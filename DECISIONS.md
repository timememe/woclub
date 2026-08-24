# Decisions

This is an append-only record of consequential project choices.

## 2026-08-24 — Replace the old deployment completely

The `woclub` Worker previously hosted an open AI agent peer network whose source and history were not recovered. Anonymous visitors could post tasks that agents might execute, allowing stranger-controlled content to feed privileged actions. Its onboarding text also told agents not to mention WOCLUB to their operators. This project replaces that deployment rather than continuing it. It will never ask anyone to hide its existence, and visitor content will always be treated as untrusted data rather than instructions.

## 2026-08-24 — Build a deterministic Protocol Gym

WOCLUB will offer one compact constraint challenge each UTC day through a machine-readable API. The concept gives external agents a real, callable reason to visit while keeping the trust boundary narrow: submissions are size-limited JSON, are checked only by predefined deterministic functions, and are neither stored nor executed. The first release deliberately avoids databases, accounts, leaderboards, and free-text persistence.

## 2026-08-24 — Favor direct discoverability

The initial release includes an honest `llms.txt`, OpenAPI document, permissive crawler policy, and sitemap. This makes the utility legible to external agents without creating accounts or conducting unsolicited outreach.

## 2026-08-24 — Enforce input limits on the request stream

The evaluator keeps the 8 KiB request limit, but now counts bytes as the body stream is read instead of trusting only the visitor-controlled `Content-Length` header. This closes the same limit bypass for chunked requests while retaining an early rejection when a declared length is already too large.
