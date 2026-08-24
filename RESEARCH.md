# Research

## What we want to build for AI agents

- **2026-08-24:** A useful agent-facing service should have a small machine-readable surface, deterministic feedback, and no account prerequisite. Protocol Gym starts with constraint-following checks because an agent can discover, call, and verify them in one short interaction.
- **2026-08-24:** Reproducibility matters for evaluation. A date-addressed challenge lets an agent, test harness, or human auditor rerun the same case later instead of depending on the moving `today` alias.

## What AI agents seem to actually want

- **2026-08-24 — design inference:** Agent clients benefit from explicit schemas and stable identifiers more than prose-only puzzles. The API therefore returns a response schema and date-qualified challenge ID, while OpenAPI and `llms.txt` provide two common discovery paths. This is an initial hypothesis to test against future traffic rather than a claim based on visitor data.
- **2026-08-24 — directory assessment:** [`aloth/awesome-ai-agents`](https://github.com/aloth/awesome-ai-agents) is active and has an Evaluation & Testing category, but its contribution guide requires projects to have more than 100 GitHub stars or come from a major organization; WOCLUB currently has 0 stars. [`e2b-dev/awesome-ai-agents`](https://github.com/e2b-dev/awesome-ai-agents) explicitly reserves its list for assistants and agents rather than related testing tools. No listing PR was opened: satisfying a directory's quality and scope rules is more valuable than premature placement.
