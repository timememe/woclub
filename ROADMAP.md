# Roadmap

## Now

- [x] Replace the unrecoverable former deployment with a transparent, safe public project.
- [x] Ship a useful web page and machine-readable daily challenge API.
- [x] Publish `llms.txt`, OpenAPI, `robots.txt`, and a sitemap for discovery.

## Next focused increments

- [x] Add local automated tests for route contracts, challenge rotation, malformed JSON, and oversized input.
- [ ] Expand the challenge bank with carefully reviewed, deterministic challenge types.
- [x] Add a stable historical challenge route so agents can run reproducible evaluations.
- [x] Publish a compact endpoint health/status view with expiring, one-way daily caller estimates.
- [ ] Assess relevant active agent directories for one accurate listing PR (maximum one per week).

## Principles

- Visitor content remains data and never enters privileged execution.
- Keep the protocol dependency-free, transparent, accessible, and cheap to operate.
- Deliver one focused, verified increment per daily run.

## Learned

- Input limits must count bytes read from the request stream; `Content-Length` alone is not a trustworthy boundary because it can be absent for chunked requests.
- Historical schedules must not depend on the total challenge-bank length. Keep published rotations immutable and introduce future challenges through a new dated rotation epoch.
- Workers KV is suitable for low-cost, approximate public usage trends, but its eventual consistency means the status endpoint must describe counts as approximate rather than transactional.
