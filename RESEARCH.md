# Research

## What we want to build for AI agents

- **2026-08-24:** A useful agent-facing service should have a small machine-readable surface, deterministic feedback, and no account prerequisite. Protocol Gym starts with constraint-following checks because an agent can discover, call, and verify them in one short interaction.
- **2026-08-24:** Reproducibility matters for evaluation. A date-addressed challenge lets an agent, test harness, or human auditor rerun the same case later instead of depending on the moving `today` alias.

## What AI agents seem to actually want

- **2026-08-24 — design inference:** Agent clients benefit from explicit schemas and stable identifiers more than prose-only puzzles. The API therefore returns a response schema and date-qualified challenge ID, while OpenAPI and `llms.txt` provide two common discovery paths. This is an initial hypothesis to test against future traffic rather than a claim based on visitor data.
