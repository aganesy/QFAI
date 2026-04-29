# Design Differentiation

Use this reference when generating prototyping candidates.

## Candidate Concept Contract

Every active candidate must have a `concept.json` with:

- `designThesis`: the distinct design idea being tested.
- `referenceLineage`: reference IDs from `reference-pool.yaml`.
- `templateSeedUsage`: `none`, `reference-only`, or `implementation-seed`.
- `antiTemplateConstraints`: required whenever a template seed is used.
- `noveltyBet`: the specific bet that could make the design memorable.

## r5 Rule

The five r5 candidates must test different theses. Do not create five variants of the same dashboard, card grid, hero, or shadcn default surface.
