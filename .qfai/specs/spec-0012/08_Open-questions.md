# 08 Open Questions

- Historical runtime/mode questions are superseded by [07_Decisions.md](./07_Decisions.md).

## OQ-0012-0002: `prototyping.json#iterations[]` shape under per-spec namespacing

- Gate: implement
- Disposition: open
- Owner: solution-architect
- Due: 2026-06-15
- Severity: medium
- Source: CHG-002 integration follow-up (requirements-analyst flagged 2026-05-18).
- Question: When iter-dir layout becomes `iter-NN/spec-NNNN/<screen>.review.json`, the top-level `prototyping.json#iterations[]` array recorded per absorbed spec-0017 / DR-0012-0024 needs to be re-modeled. Options: (A) keep flat `iterations[]` with `spec` discriminator on each entry; (B) nest as `iterationsBySpec[specId][]`; (C) split into per-spec `prototyping-<specId>.json`.
- Recommendation: (B) for read locality with `readFrozenSpecsCovered()` / certify aggregation.
- Resolves: blocks final code landing in `iteration.ts` / `prototypingIterate.ts`.

## OQ-0012-0003: `pivotDirective` retention vs supersede

- Gate: implement
- Disposition: open
- Owner: solution-architect
- Due: 2026-06-15
- Severity: medium
- Source: CHG-002 integration follow-up (requirements-analyst flagged 2026-05-18).
- Question: BR-0012-0021 / AC-0012-0023 / AC-0012-0026 / AC-0012-0027 define `computePivotDirective(history)` as a per-iter `continue | refine | pivot` hint to the generator. The new qualitative-only convergence (BR-0012-0032 / AC-0012-0042) does not consume it. Options: (A) retain as per-`(spec, cycle)` generator hint (no functional change); (B) supersede entirely (clean removal).
- Recommendation: (A) — directional hint to the generator is independent of the convergence gate.
- Resolves: blocks reviewer-prompt / generator-prompt reference cleanup.

## OQ-0012-0004: `critique` field cleanup under `*Feel` schema

- Gate: implement
- Disposition: open
- Owner: solution-architect
- Due: 2026-06-15
- Severity: low
- Source: CHG-002 integration follow-up (requirements-analyst flagged 2026-05-18).
- Question: AC-0012-0022 was superseded by AC-0012-0041. Does `<screen>.review.json` schema also drop the `critique: string` field entirely, or keep it as an optional global summary alongside the six `*Feel` fields? Options: (A) drop entirely (six `*Feel` fields cover all prose); (B) keep optional `summary` field (e.g. ≤ 100 words) for cycle-level synthesis.
- Recommendation: (A) — six `*Feel` fields already provide structured prose coverage.
- Resolves: blocks `evaluatorReview.ts` schema implementation.

## OQ-0012-0005: Capture role removal in steering / agent-routing

- Gate: implement
- Disposition: open
- Owner: solution-architect
- Due: 2026-06-15
- Severity: low
- Source: CHG-002 integration follow-up (requirements-analyst flagged 2026-05-18).
- Question: BR-0012-0004 / BR-0012-0023 / DR-0012-0017 reference a separate `devops-ci-engineer` capture role. CHG-002 removes capture entirely. Does `agent-routing.yml` / `agent-catalog.yml` also need a follow-up edit to remove the capture entry from prototyping routing, or is the role retained for other (non-prototyping) use?
- Recommendation: Retain the role in the catalog for non-prototyping use; remove only the prototyping-specific routing entry. Update via spec-0015 / `_policies/02_routing.md` in a follow-up.
- Resolves: blocks agent-catalog / agent-routing cleanup.

## OQ-0012-0001: Airgapped run support (stock-photo fetch over restricted network)

- Gate: ops
- Disposition: deferred (post-v1; trigger = consumer project files a blocker citing airgapped / network-restricted environment)
- Owner: ops
- Due: 2026-08-31
- Severity: medium
- Source: discussion-20260516144141078 OQ-0003 (mirrored here per `_policies` requirement that spec-level OQs deferred from the discussion pack are tracked on the spec).
- Rationale for deferral: v1 ships multi-spec / autonomous / Playwright-operate / qualitative-only / license recording (CHG-002). Airgapped infra (pre-baked stock-photo bundle, license-class cache, version-tracking) adds scope that risks delaying the primary delivery. v1 fails fast on network unavailability via deterministic exit 66 (license-verify failure cascading from fetch failure) with a clear error message naming the network egress requirement.
- Options:
  - A) Require HTTPS network egress to allowlisted sources for v1 (current decision; recommended).
  - B) Ship pre-baked CC0 / Unsplash / Pexels bundle with QFAI package; license-class cache built at install time.
  - C) Hybrid (network-first with bundle fallback when egress fails).
- Recommendation: Option A for v1; revisit on first airgapped consumer blocker.
- Mitigation while deferred: deterministic exit 66 + error message naming "network egress to {unsplash.com, pexels.com} required for stock-photo fill"; ops gate tracks consumer-project demand and v2 roadmap.
- Next decision point: Ops gate post-v1 dogfooding.
- Evidence: discussion-20260516144141078 `11_OQ-Register.md` (OQ-0003 row) and `13_Deferred.md` (OQ-0003 row).
