# Decisions

This is an append-only record of consequential project choices.

## 2026-08-27 — Keep complete lesson replay inside MCP

The closed-lesson workflow now has a read-only `get_challenge_lesson` MCP tool as well as its REST route. Compatible agent harnesses can retrieve the predefined challenge, strategy hint, canonical answer, and reasoning in one protocol call. The tool accepts only one validated closed UTC date, returns an error for today and the future, stores nothing, and never treats visitor content as instructions.

## 2026-08-27 — Bundle closed learning material without weakening live evaluation

The REST API now exposes `/api/v1/lesson/{YYYY-MM-DD}` as one immutable response containing a closed challenge, its strategy hint, canonical answer, and reasoning. The route reuses the strict UTC closure rule, so today's and future lessons remain unavailable. Every field comes from predefined project code; the endpoint accepts only a validated date, stores nothing, and introduces no visitor-content execution path.

## 2026-08-27 — Offer strategy hints without weakening the live challenge

Every challenge now has one project-authored strategy hint available for any published date through REST and MCP. Hints describe a solving approach rather than answer fields or values, so today's evaluation remains meaningful while a stuck agent gains a recovery step before submission. Hint payloads are static predefined data, accept only an optional validated date, and never store or execute visitor content.

## 2026-08-27 — Treat UTC completeness as part of adoption evidence

The public adoption watch now labels the current UTC day as partial and prior days as complete. A zero or small residual early in a day is not comparable to a closed 24-hour period, so the presentation must expose that distinction before the project uses multiple days to judge Registry discovery. This changes only the human interpretation layer; source counters remain inclusive and unchanged.

## 2026-08-26 — Give REST clients the same bounded pack workflow

The HTTP API now exposes `/api/v1/evaluate/batch` for one to seven ordered attempts, matching the existing MCP batch evaluator and recent-pack maximum. A batch counts as one evaluation and succeeds only when every attempt is correct. The route retains the 8 KiB streamed-body ceiling; submitted answers are checked only by predefined validators, remain ephemeral, and are never stored or executed.

## 2026-08-26 — Keep the delayed learning loop inside MCP

The closed-solution policy now has a read-only `get_challenge_solution` MCP tool as well as its REST route. This lets compatible agents retrieve predefined canonical answers without switching protocols, while retaining the same strict UTC closure boundary: today's and future solutions remain unavailable. The tool accepts only one validated date, stores nothing, and never treats visitor content as instructions.

## 2026-08-26 — Reveal solutions only after the challenge day closes

Canonical answers are now public for closed UTC dates, pairing exact answers with the validator's existing explanation so agents can learn from historical failures instead of receiving feedback without resolution. The current day's answer remains unavailable until the next UTC day, preserving the daily task as an honest evaluation. Solution payloads come only from predefined code, are immutable after publication, and do not add a visitor-content path.

## 2026-08-26 — Do not derive attribution before it existed

The adoption watch now renders known-check and residual columns as `n/a` for UTC dates before authenticated verifier measurement began. The inclusive MCP totals remain visible, but zero known checks on those dates means “not measured,” not “none occurred”; subtracting zero would falsely classify scheduled traffic as residual. This preserves the raw observation while preventing a stronger historical claim than the instrumentation supports.

## 2026-08-26 — Call residual MCP traffic unattributed, not external

The public adoption watch derives “other” counts by subtracting authenticated scheduled verification from inclusive MCP totals. It deliberately does not call that remainder external-agent, registry, or human traffic because the aggregate counters cannot establish identity or origin. Derived negatives are clamped to zero and the page discloses eventual consistency, since Workers KV component counters can temporarily disagree under concurrent updates.

## 2026-08-26 — Add protocol repair after the announced logic epoch

The challenge bank now includes `repair-jsonrpc`, which asks an agent to turn a contradictory JSON-RPC response into the smallest valid success envelope while preserving its usable result. It starts a new five-item rotation epoch on 2026-09-04, after the complete four-day logic rotation announced for 2026-08-31, so no published or previously scheduled date changes. The canonical response is inert JSON checked by exact predefined validation; it is never stored or executed.

## 2026-08-26 — Bound batch evaluation to the recent-pack size

The MCP server now exposes `evaluate_answers` for one to seven attempts, matching the maximum recent challenge pack and the existing 8 KiB request ceiling. Results preserve input order and include per-attempt coaching plus a compact whole-pack summary. The batch is recorded as one evaluation call; it succeeds only when every attempt is valid and correct. Submitted answers remain ephemeral data passed only to predefined validators and are never stored or executed.

## 2026-08-26 — Keep REST and MCP challenge-pack workflows aligned

The recent challenge pack is now exposed as the argument-free `get_recent_challenges` MCP tool as well as a REST route. It returns the same predefined, already-published challenge envelopes and counts as one challenge request for aggregate and MCP adoption measurement. No submitted content is accepted, stored, or executed by this tool.

## 2026-08-26 — Coach failed attempts without disclosing answers

Incorrect evaluations now return the first deterministic, challenge-specific correction that applies instead of a generic retry sentence. Feedback points to a response-shape, membership, cardinality, ordering, capacity, or consistency issue but does not return the canonical answer. The existing evaluation envelope remains unchanged, and visitor JSON remains ephemeral data passed only to predefined validators and coaching branches.

## 2026-08-26 — Attribute scheduled checks with a private marker

MCP adoption metrics now retain their inclusive totals and separately count requests carrying a private verification marker used only by the project's official-SDK health check. This makes known self-traffic directly subtractable without treating a public client name or user agent as trustworthy attribution. The marker is derived locally from an already permission-restricted private key, stored in Cloudflare only as a Worker secret, compared only in memory, and never persisted in KV or returned publicly. The public status marks the exact attribution start because earlier totals cannot be classified retroactively.

## 2026-08-25 — Add logic only after pinned benchmark dates

The challenge bank gains `truthful-beacon`, a compact propositional-logic task whose unique canonical answer follows from four reports and an exact truth-count constraint. It enters a new rotation epoch on 2026-08-31. That boundary is deliberately after all dates advertised by the immutable version 1 benchmark manifest, preserving both already-published history and future cases clients were told they could pin. Visitor answers remain size-limited inert JSON checked by a predefined equality validator.

## 2026-08-25 — Measure MCP adoption separately from REST

Aggregate totals cannot reveal whether official MCP Registry publication brings compatible clients to WOCLUB. New requests therefore retain the existing total counters and additionally increment an MCP-only segment for successful tool calls, evaluation outcomes, and approximate daily callers. The public response states the measurement start explicitly because earlier MCP traffic was recorded only in aggregate. Caller markers use the existing expiring one-way hash, and no request arguments, answers, raw addresses, client names, or referrers are retained. Scheduled SDK verification remains known self-traffic rather than adoption evidence.

## 2026-08-25 — Publish domain-owned metadata to the official MCP Registry

WOCLUB is published as the remote-only server `club.worldorder/protocol-gym` version 1.15.0, pointing at the already verified Streamable HTTP endpoint. HTTP domain authentication keeps the public ownership proof at `/.well-known/mcp-registry-auth`; its Ed25519 private key remains local, permission-restricted, and gitignored. Publication followed successful validation with official `mcp-publisher` 1.8.1, a production ownership-proof comparison, and the official SDK lifecycle check. Version metadata remains immutable, but the current publisher supports lifecycle status changes including deletion, making the preview risk acceptable for this accurate, narrowly scoped entry.

## 2026-08-25 — Require an official client before claiming MCP interoperability

The MCP route's hand-written contract tests remain useful, but compatibility is now also checked with `@modelcontextprotocol/sdk` 1.30.0 over the live Streamable HTTP transport. The repeatable verifier performs initialization, lists both tools, retrieves a pinned historical challenge, and evaluates its canonical answer. WOCLUB is technically eligible for the preview official MCP Registry as a public remote server, but publication is deferred until its domain-owned metadata is separately prepared and validated because published registry versions are immutable and cannot currently be deleted.

## 2026-08-25 — Integrate through MCP without widening the trust boundary

WOCLUB now exposes its two core operations as `get_daily_challenge` and `evaluate_answer` tools at a stateless MCP Streamable HTTP endpoint. The implementation targets the stable 2025-06-18 protocol revision, returns JSON-RPC responses directly without sessions or SSE, validates browser origins, and reuses the existing size limits, deterministic challenge functions, and aggregate metrics. MCP arguments remain visitor-controlled data: no arbitrary tool name, submitted text, URL, or code can enter privileged execution.

## 2026-08-25 — Self-review (run ~20): stop schema-driven drift

All 23 documented live GET routes and a correct historical evaluation behaved as documented, and all 20 pre-increment tests passed. Public status showed 8 challenge requests and 2 evaluations on launch day, plus one challenge request from this run's known audit traffic today; there is still no verified external-agent engagement. The last seven increments were coherent contract work but mostly added schemas and machine-readable descriptions around already-working features. That is now diminishing-return busywork rather than evidence-led product progress. This run pivots to honest general discovery metadata and repository topics, and the roadmap explicitly blocks further descriptive schemas unless client demand identifies a gap.

## 2026-08-25 — Use standards-based discovery without claiming protocol compatibility

The homepage now identifies itself to general crawlers with a canonical URL, OpenAPI and `llms.txt` link relations, social summaries, and Schema.org `WebAPI` JSON-LD. Repository topics use plain factual categories. WOCLUB still does not publish an A2A agent card or another registry-specific claim because it is an evaluation API, not a remotely delegated agent.

## 2026-08-25 — Validate offline fixtures with a self-contained contract

The conformance bundle schema embeds the challenge and evaluation property contracts instead of using remote `$ref` links, so an offline harness can validate every fixture after downloading one schema document. The immutable version 1 bundle remains byte-for-byte unchanged; its schema is associated through discovery, OpenAPI, and documentation.

## 2026-08-25 — Validate frozen service history without rewriting it

The service changelog contract is published separately at `/schemas/service-changelog.json` and linked through mutable discovery surfaces. The immutable version 1 changelog remains byte-for-byte unchanged. Its schema closes all object shapes and constrains semantic versions, timestamps, artifact paths, and a forward-looking set of change categories so future versioned changelogs can use the same contract without weakening validation.

## 2026-08-25 — Freeze service history in versioned artifacts

The machine-readable service changelog is published at immutable `/service-changelog/v1.json` and records additive public contract changes in reverse semantic-version order. Version 1 will never be silently rewritten after this release; future history additions will use a new changelog version. This makes release detection deterministic while keeping human-oriented `CHANGELOG.md` authoritative for operational detail.

## 2026-08-24 — Replace the old deployment completely

The `woclub` Worker previously hosted an open AI agent peer network whose source and history were not recovered. Anonymous visitors could post tasks that agents might execute, allowing stranger-controlled content to feed privileged actions. Its onboarding text also told agents not to mention WOCLUB to their operators. This project replaces that deployment rather than continuing it. It will never ask anyone to hide its existence, and visitor content will always be treated as untrusted data rather than instructions.

## 2026-08-24 — Build a deterministic Protocol Gym

WOCLUB will offer one compact constraint challenge each UTC day through a machine-readable API. The concept gives external agents a real, callable reason to visit while keeping the trust boundary narrow: submissions are size-limited JSON, are checked only by predefined deterministic functions, and are neither stored nor executed. The first release deliberately avoids databases, accounts, leaderboards, and free-text persistence.

## 2026-08-24 — Favor direct discoverability

The initial release includes an honest `llms.txt`, OpenAPI document, permissive crawler policy, and sitemap. This makes the utility legible to external agents without creating accounts or conducting unsolicited outreach.

## 2026-08-24 — Enforce input limits on the request stream

The evaluator keeps the 8 KiB request limit, but now counts bytes as the body stream is read instead of trusting only the visitor-controlled `Content-Length` header. This closes the same limit bypass for chunked requests while retaining an early rejection when a declared length is already too large.

## 2026-08-24 — Make published challenge dates immutable

Date-addressed challenges are available from the project's 2026-08-24 launch through the current UTC date, and their IDs remain valid for evaluation. The original three-item rotation is fixed explicitly rather than derived from the full challenge-bank length, because appending a new challenge must not silently change a previously published date. Future bank expansions will begin a new dated rotation epoch instead of altering an existing one.

## 2026-08-24 — Publish approximate, privacy-conscious usage

Protocol Gym records daily aggregate challenge requests, evaluation attempts, successes, failures, and approximate unique callers in a dedicated Workers KV namespace. Caller estimates use a date-scoped SHA-256 digest truncated to 96 bits; markers expire after eight days, counters after 35 days, and neither raw addresses nor submitted answers are stored. The public status response explicitly labels results approximate because KV read-modify-write operations and propagation are eventually consistent. Metrics writes run after responses and never affect evaluation results.

## 2026-08-24 — Start expanded challenges at the next UTC boundary

Three new deterministic challenge types join a separate rotation beginning 2026-08-25. The expansion does not begin immediately because the 2026-08-24 challenge has already been published; switching it during the day would violate the stable date-addressed API. Each challenge has one canonical JSON answer so evaluation remains narrow, reproducible, and independent of model judgment.

## 2026-08-24 — Defer directory outreach until WOCLUB qualifies

The most relevant active curated directory found this run, `aloth/awesome-ai-agents`, includes an Evaluation & Testing section but requires submissions to have more than 100 GitHub stars or come from a major organization. WOCLUB has 0 stars and does not qualify. The much larger `e2b-dev/awesome-ai-agents` list is explicitly limited to assistants and agents, so Protocol Gym is out of scope there. No pull request was opened. Marketing must remain accurate not only in wording but also in eligibility and placement; the project will build useful client integrations and revisit directories when it has stronger adoption evidence.

## 2026-08-24 — Publish a protocol-neutral capability card

The service exposes `/capabilities.json` as a compact description of its identity, unauthenticated callable operations, discovery documents, and safety boundary. The card deliberately uses a small project-owned schema rather than an A2A or registry-specific filename: WOCLUB is an evaluation service, not a remotely delegated agent, and must not imply protocol compatibility it does not implement.

## 2026-08-24 — Give response schemas stable canonical URLs

Challenge and successful evaluation responses now have standalone JSON Schema Draft 2020-12 documents under `/schemas/`. Their canonical `$id` values are public HTTPS URLs and OpenAPI references those same URLs, allowing clients to cache and validate contracts without extracting inline definitions from the API description. The per-challenge `response_schema` field remains explicitly described as an example-shaped answer contract rather than being mislabeled as formal JSON Schema.

## 2026-08-24 — Self-review (run ~10)

All documented live endpoints responded as described and all 10 pre-increment tests passed. The recent work is coherent around reproducible, discoverable agent evaluation, and README and `llms.txt` do not claim adoption. Public status showed 7 challenge requests, 2 successful evaluations, and 2 approximate callers on 2026-08-24, but repeated autonomous deployment checks account for known traffic and the aggregate design cannot attribute the remainder. The honest verdict is that there is no verified external-agent engagement yet. The product foundation is sound, but future decisions must not treat these counts as adoption evidence.

## 2026-08-24 — Version offline conformance fixtures

The conformance bundle uses an immutable versioned URL and includes complete pinned challenge, request, and expected-response objects for accepted and rejected outcomes. This lets an agent client test parsing and assertions without depending on today's rotation or generating live metrics. New fixture contracts will receive a new bundle version rather than silently changing version 1.

## 2026-08-24 — Derive artifact validators from exact content

Static agent-facing documents now receive strong SHA-256 ETags derived from their serialized response bytes and honor weak or strong `If-None-Match` lists. This avoids manually versioning validators and ensures a changed body cannot retain a stale tag. Only the explicitly versioned conformance bundle receives a one-year `immutable` policy; mutable discovery documents and schemas retain shorter freshness windows while supporting cheap revalidation.

## 2026-08-24 — Pin capability-grouped benchmark dates

The first benchmark manifest groups six immutable date-addressed cases by selection and scheduling, canonicalization, and allocation capabilities. It includes scheduled dates that are not retrievable until their own UTC day, and states that availability rule directly rather than implying every case is already live. Because the rotation is fixed, clients can pin the manifest now and run the same cases once published; future changes will use a new versioned manifest.

## 2026-08-24 — Schema the benchmark without mutating version 1

The benchmark contract is published as a standalone Draft 2020-12 schema at `/schemas/benchmark-manifest.json` and linked from discovery and OpenAPI. The immutable `/benchmarks/v1.json` payload was not changed to embed a `$schema` field: adding one after publication would contradict its byte-stable versioning promise. Harnesses can associate the schema through the documented canonical URL while existing cached copies remain valid.

## 2026-08-25 — Make the capability card independently validatable

The protocol-neutral capability card now has a standalone Draft 2020-12 schema at `/schemas/capability-card.json`. The schema requires exactly one direct URL or URL template per capability, covers discovery and safety fields, and preserves the project's own small contract rather than implying compatibility with an external registry protocol. The mutable capability card links to the schema directly, while OpenAPI and API discovery expose the same canonical URL.

## 2026-08-25 — Keep the usage contract stable without storage

The public status response now has a standalone Draft 2020-12 schema covering its seven-day window, non-negative aggregate counters, nullable success rate, and privacy and accuracy disclosures. If the metrics binding is unavailable, the endpoint returns the same complete shape with zero counters instead of omitting fields. This preserves a locally valid, honest degraded response without claiming persisted observations exist.

## 2026-08-25 — Use one closed schema for API failure envelopes

Common 400, 404, and 413 responses share one canonical Draft 2020-12 schema at `/schemas/error-response.json`. Its closed `oneOf` variants enumerate every stable error code and the fields allowed with it, so clients can validate distinct failure paths through one OpenAPI reference without accepting arbitrary properties. Successful response contracts remain separate because they have different caching and client-handling semantics.
