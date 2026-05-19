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

## OQ-0012-0006: Per-spec iter-dir migration wiring in `prototypingIterate.ts`

- Gate: implement
- Disposition: open
- Owner: backend-engineer
- Due: 2026-06-30
- Severity: low
- Source: CHG-002 PR #208 review (FYI thread r3264491197, raised 2026-05-19).
- Question: `iterationPaths.ts` ships the per-spec helpers (`iterationDir(idx, specId)`, `iterationReviewPath(idx, specId, screen)`, `findIterationReviewFiles`, `purgeStaleIterDirs`, `parseIterationReviewPath`) with full unit coverage, but `prototypingIterate.ts` still composes the legacy flat `iter-NN/index.html` layout via `core/prototyping/iteration.ts#iterationDir(cycle)`. Production wire-in must switch the iterate command from the single-lineage helpers to the per-`(idx, spec, screen)` helpers so the on-disk evidence layout matches the multi-spec contract before convergence/certify reads it.
- Recommendation: Land alongside the next wave that resolves OQ-0012-0002 (prototyping.json#iterations[] shape) — the iter-dir migration and the JSON-shape migration share the same per-spec namespace and must ship atomically to keep `certify` parsing consistent.
- Resolves: blocks legacy-to-per-spec layout cutover in `prototypingIterate.ts`. Couples with TDD-0384 deferral noted in the PR #208 description.

## OQ-0012-0007: Reviewer dispatch wiring in `prototypingIterate.ts`

- Gate: implement
- Disposition: open
- Owner: backend-engineer
- Due: 2026-06-30
- Severity: low
- Source: CHG-002 PR #208 review (FYI thread r3264491197, raised 2026-05-19).
- Question: `core/prototyping/reviewerDispatch.ts#dispatchReviewerToPair(specId, screen, options)` is the interface boundary for invoking the Reviewer sub-agent (Playwright runner is injected) but no production caller currently invokes it. The iterate command writes `iterate-plan.json` and hands control to the skill, which today still relies on out-of-process Reviewer invocation. Production wire-in must call `dispatchReviewerToPair` per per-`(spec, screen)` cycle with an injected runner and persist the resulting `<screen>.review.json` payload.
- Recommendation: Wire after OQ-0012-0006 (per-spec layout) lands so the dispatch result has a stable iter-dir target. Couples with TDD-0401 / TDD-0402 (live Playwright runner) — until the runner is shipped, the dispatch wire-in remains a no-op gated on `options.playwrightRunner`.
- Resolves: blocks Reviewer-orchestration cutover from skill-driven to command-driven dispatch in `prototypingIterate.ts`.

## OQ-0012-0008: `parseEvaluatorReview` runtime wire-in for per-cycle review.json validation

- Gate: implement
- Disposition: open
- Owner: backend-engineer
- Due: 2026-06-30
- Severity: low
- Source: CHG-002 PR #208 review (FYI thread r3264491197, raised 2026-05-19).
- Question: `core/prototyping/evaluatorReview.ts#parseEvaluatorReview` validates the v2.0 `*Feel`-schema reviewer payload (six bounded `*Feel` fields, four ordinal axes, closed-schema unknown-key rejection) with full unit coverage, but no per-cycle review-loader currently invokes it. The candidate read path lives in `core/prototyping/iteration.ts` (single-lineage loader) or `cli/commands/prototypingCertify.ts` (multi-spec aggregator). Wire-in must identify the read path and route every loaded `<screen>.review.json` through `parseEvaluatorReview` so schema drift fails fast at iterate/certify rather than at downstream consumers.
- Recommendation: Land in the same wave as OQ-0012-0006 / 0007 (per-spec layout + dispatch) so the validator sees the v2.0 file layout it was designed for. Resolves: blocks v2.0 `*Feel` schema runtime enforcement.

## OQ-0012-0009: `validateImageSources` runtime wire-in at certify gate

- Gate: implement
- Disposition: open
- Owner: backend-engineer
- Due: 2026-06-30
- Severity: low
- Source: CHG-002 PR #208 review (FYI thread r3264491197, raised 2026-05-19).
- Question: The handoff schema validator (`core/prototyping/handoff/validateImageSources.ts`) checks `prototype-handoff.yaml#imageSources[]` shape with full unit coverage, but `cli/commands/prototypingCertify.ts` does not yet gate on the handoff yaml read path. Today `licenseVerify` consumes `prototyping.json#imageSources` directly; the handoff-yaml population path is left to a later batch (see iterate.ts 4b inline note). Wire-in must either add the certify-gate read of `prototype-handoff.yaml` and route entries through `validateImageSources` before `licenseVerify`, or document the deferral if the handoff.yaml population path is not ready.
- Recommendation: Defer until the handoff-yaml population path (DESIGN.md pool + handoff extraction) lands; until then `validateImageSources` is correctly tested-only. Track the population deferral as a coupled item under the same wave.
- Resolves: blocks `prototype-handoff.yaml#imageSources[]` schema gate at certify.

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
