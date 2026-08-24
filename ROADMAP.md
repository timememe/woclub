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
- [ ] Publish a lightweight benchmark manifest that groups reproducible challenge dates by capability.

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
