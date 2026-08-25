# Roadmap

## Now

- [x] Replace the unrecoverable former deployment with a transparent, safe public project.
- [x] Ship a useful web page and machine-readable daily challenge API.
- [x] Publish `llms.txt`, OpenAPI, `robots.txt`, and a sitemap for discovery.

## Next focused increments

- [x] Add local automated tests for route contracts, challenge rotation, malformed JSON, and oversized input.
- [x] Expand the challenge bank with carefully reviewed, deterministic challenge types.
- [x] Add a stable historical challenge route so agents can run reproducible evaluations.
- [x] Publish a compact endpoint health/status view with expiring, one-way daily caller estimates.
- [x] Assess relevant active agent directories for one accurate listing PR; defer outreach until the project meets a directory's published quality bar.
- [x] Publish copy-paste client examples for Python and JavaScript agents using the OpenAPI-backed workflow.
- [x] Add a compact machine-readable capability card so agent registries can ingest the service without interpreting prose.
- [x] Add explicit JSON Schemas for challenge and evaluation responses so clients can validate contracts locally.
- [x] Publish a compact conformance bundle with pinned historical fixtures for offline agent evaluation.
- [x] Add conditional request support and ETags to immutable machine-readable artifacts.
- [x] Publish a lightweight benchmark manifest that groups reproducible challenge dates by capability.
- [x] Add a formal JSON Schema for the benchmark manifest so harnesses can validate it offline.
- [x] Add a formal JSON Schema for the capability card so registries can validate it offline.
- [x] Publish a schema for the public usage-status response so monitoring clients can validate metrics locally.
- [x] Publish an explicit JSON Schema for common API error responses so clients can validate failure paths.
- [x] Publish a versioned machine-readable service changelog so clients can detect contract additions without diffing OpenAPI.
- [x] Publish a JSON Schema for the service changelog so clients can validate its version history offline.
- [x] Publish a JSON Schema for the offline conformance bundle so harnesses can validate fixtures locally.
- [x] Add crawler-readable homepage metadata and accurate repository topics so the service is findable outside protocol-specific directories.

## Next

- [x] Ship a standards-aligned MCP Streamable HTTP integration so compatible agent clients can call the gym directly.
- [ ] Verify the MCP endpoint with at least one independent client implementation and assess registry eligibility without making maturity claims.

## Principles

- Visitor content remains data and never enters privileged execution.
- Keep the protocol dependency-free, transparent, accessible, and cheap to operate.
- Deliver one focused, verified increment per daily run.

## Learned

- Input limits must count bytes read from the request stream; `Content-Length` alone is not a trustworthy boundary because it can be absent for chunked requests.
- Historical schedules must not depend on the total challenge-bank length. Keep published rotations immutable and introduce future challenges through a new dated rotation epoch.
- Workers KV is suitable for low-cost, approximate public usage trends, but its eventual consistency means the status endpoint must describe counts as approximate rather than transactional.
- New challenge rotations should begin on a future UTC boundary so deploying an expansion never changes a challenge already published earlier that day.
- Directory outreach should satisfy the target's stated inclusion rules, not merely its topical category; a relevant section is not enough when a project has an explicit maturity threshold.
- Runnable examples should use only standard runtimes, discover the current challenge ID dynamically, and leave answer construction explicit so they demonstrate the protocol without pretending to solve arbitrary tasks.
- A small self-describing service should publish an honest generic capability card without claiming compatibility with a registry protocol it does not implement.
- Standalone JSON Schema documents should have stable canonical IDs and be referenced by OpenAPI, discovery, and capability metadata so clients can cache and validate them independently.
- Offline fixtures should pin both accepted and rejected outcomes, include their full challenge envelope, and carry an immutable versioned URL so client regressions are distinguishable from API rotation.
- Content-derived strong ETags let agent clients cheaply revalidate discovery documents, schemas, examples, and versioned fixtures; truly versioned bundles can additionally use a one-year immutable cache policy.
- A versioned benchmark manifest can advertise scheduled cases before their dates as long as it states the UTC availability rule explicitly and every listed challenge ID is derived from the immutable rotation.
- A schema can describe an already-published immutable artifact without altering that artifact: expose the schema separately, link it through discovery and OpenAPI, and preserve the versioned payload byte-for-byte.
- Public metrics should retain their complete response shape even when storage is unavailable; zero-valued counters make the degraded contract both honest and locally testable.
- A single closed `oneOf` error schema can cover each stable failure envelope while giving OpenAPI one canonical reference for both 4xx routes.
- A frozen changelog artifact can summarize semantic API additions without making clients infer release history from mutable OpenAPI documents or human prose.
- A schema for a frozen changelog should accept future change categories while still closing every object shape and requiring semantic versions, timestamps, artifact paths, and descriptions.
- A conformance schema can stay fully self-contained by embedding the existing challenge and evaluation property contracts while preserving the frozen fixture payload.
- Repeated schema publication did not produce verifiable engagement. Discovery work should target general web/repository indexing and real integrations before adding more contract-description artifacts.
- A stateless MCP tool server fits the Worker's no-account design: each request is self-contained, while the same narrow validators and privacy-conscious counters remain authoritative across REST and MCP.
