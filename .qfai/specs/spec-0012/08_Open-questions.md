# 08 Open Questions

- Historical runtime/mode questions are superseded by [07_Decisions.md](./07_Decisions.md).
- v1.9.2 Second-Wave: OQ-0152 (cycle-0 skeleton UX shape), OQ-0153 (DESIGN.md patch-zone shape), and OQ-0154 (exploration-mode gate-relaxation scope) are RESOLVED by `_policies/08_Decisions.md` DR-0261 (+ DR-0273), DR-0262, and DR-0263 respectively. No open items are added for REQ-0150 / REQ-0151 / REQ-0152; REQ-0162 / REQ-0165 are straight MUSTs with no deferred decision. See `09_delta.md` § 2026-05-27 — v1.9.2 Second-Wave (spec-0012).

## Open Questions

### OQ-0012-0002: `prototyping.json#iterations[]` shape under per-spec namespacing

- Gate: implement
- Disposition: open
- Owner: solution-architect
- Due: 2026-06-15
- Severity: medium
- Source: CHG-002 integration follow-up (requirements-analyst flagged 2026-05-18).
- Question: When iter-dir layout becomes `iter-NN/spec-NNNN/<screen>.review.json`, the top-level `prototyping.json#iterations[]` array recorded per absorbed spec-0017 / DR-0012-0024 needs to be re-modeled. Options: (A) keep flat `iterations[]` with `spec` discriminator on each entry; (B) nest as `iterationsBySpec[specId][]`; (C) split into per-spec `prototyping-<specId>.json`.
- Recommendation: (B) for read locality with `readFrozenSpecsCovered()` / certify aggregation.
- Resolves: blocks final code landing in `iteration.ts` / `prototypingIterate.ts`.

### OQ-0012-0003: `pivotDirective` retention vs supersede

- Gate: implement
- Disposition: open
- Owner: solution-architect
- Due: 2026-06-15
- Severity: medium
- Source: CHG-002 integration follow-up (requirements-analyst flagged 2026-05-18).
- Question: BR-0012-0021 / AC-0012-0023 / AC-0012-0026 / AC-0012-0027 define `computePivotDirective(history)` as a per-iter `continue | refine | pivot` hint to the generator. The new qualitative-only convergence (BR-0012-0032 / AC-0012-0042) does not consume it. Options: (A) retain as per-`(spec, cycle)` generator hint (no functional change); (B) supersede entirely (clean removal).
- Recommendation: (A) — directional hint to the generator is independent of the convergence gate.
- Resolves: blocks reviewer-prompt / generator-prompt reference cleanup.

### OQ-0012-0004: `critique` field cleanup under `*Feel` schema

- Gate: implement
- Disposition: open
- Owner: solution-architect
- Due: 2026-06-15
- Severity: low
- Source: CHG-002 integration follow-up (requirements-analyst flagged 2026-05-18).
- Question: AC-0012-0022 was superseded by AC-0012-0041. Does `<screen>.review.json` schema also drop the `critique: string` field entirely, or keep it as an optional global summary alongside the six `*Feel` fields? Options: (A) drop entirely (six `*Feel` fields cover all prose); (B) keep optional `summary` field (e.g. ≤ 100 words) for cycle-level synthesis.
- Recommendation: (A) — six `*Feel` fields already provide structured prose coverage.
- Resolves: blocks `evaluatorReview.ts` schema implementation.

### OQ-0012-0005: Capture role removal in steering / agent-routing

- Gate: implement
- Disposition: open
- Owner: solution-architect
- Due: 2026-06-15
- Severity: low
- Source: CHG-002 integration follow-up (requirements-analyst flagged 2026-05-18).
- Question: BR-0012-0004 / BR-0012-0023 / DR-0012-0017 reference a separate `devops-ci-engineer` capture role. CHG-002 removes capture entirely. Does `agent-routing.yml` / `agent-catalog.yml` also need a follow-up edit to remove the capture entry from prototyping routing, or is the role retained for other (non-prototyping) use?
- Recommendation: Retain the role in the catalog for non-prototyping use; remove only the prototyping-specific routing entry. Update via spec-0015 / `_policies/02_routing.md` in a follow-up.
- Resolves: blocks agent-catalog / agent-routing cleanup.

### OQ-0012-0006: Per-spec iter-dir migration wiring in `prototypingIterate.ts`

- Gate: implement
- Disposition: open
- Owner: backend-engineer
- Due: 2026-06-30
- Severity: low
- Source: CHG-002 PR #208 review (FYI thread r3264491197, raised 2026-05-19).
- Question: `iterationPaths.ts` ships the per-spec helpers (`iterationDirPerSpec(idx, specId)`, `iterationReviewPathPerSpec(idx, specId, screen)`, `findIterationReviewFiles`, `deleteStaleIterDirs`, `parseIterationReviewPath`) with full unit coverage, but `prototypingIterate.ts` still composes the legacy flat `iter-NN/index.html` layout via `core/prototyping/iteration.ts#iterationDir(cycle)`. Production wire-in must switch the iterate command from the single-lineage helpers to the per-`(idx, spec, screen)` helpers so the on-disk evidence layout matches the multi-spec contract before convergence/certify reads it.
- Recommendation: Land alongside the next wave that resolves OQ-0012-0002 (prototyping.json#iterations[] shape) — the iter-dir migration and the JSON-shape migration share the same per-spec namespace and must ship atomically to keep `certify` parsing consistent.
- Resolves: blocks legacy-to-per-spec layout cutover in `prototypingIterate.ts`. Couples with TDD-0384 deferral noted in the PR #208 description.

### OQ-0012-0007: Reviewer dispatch wiring in `prototypingIterate.ts`

- Gate: implement
- Disposition: open
- Owner: backend-engineer
- Due: 2026-06-30
- Severity: low
- Source: CHG-002 PR #208 review (FYI thread r3264491197, raised 2026-05-19).
- Question: `core/prototyping/reviewerDispatch.ts#dispatchReviewerToPair(specId, screen, options)` is the interface boundary for invoking the Reviewer sub-agent (Playwright runner is injected) but no production caller currently invokes it. The iterate command writes `iterate-plan.json` and hands control to the skill, which today still relies on out-of-process Reviewer invocation. Production wire-in must call `dispatchReviewerToPair` per per-`(spec, screen)` cycle with an injected runner and persist the resulting `<screen>.review.json` payload.
- Recommendation: Wire after OQ-0012-0006 (per-spec layout) lands so the dispatch result has a stable iter-dir target. Couples with TDD-0401 / TDD-0402 (live Playwright runner) — until the runner is shipped, the dispatch wire-in remains a no-op gated on `options.playwrightRunner`.
- Resolves: blocks Reviewer-orchestration cutover from skill-driven to command-driven dispatch in `prototypingIterate.ts`.

### OQ-0012-0008: `parseEvaluatorReview` runtime wire-in for per-cycle review.json validation

- Gate: implement
- Disposition: open
- Owner: backend-engineer
- Due: 2026-06-30
- Severity: low
- Source: CHG-002 PR #208 review (FYI thread r3264491197, raised 2026-05-19).
- Question: `core/prototyping/evaluatorReview.ts#parseEvaluatorReview` validates the v2.0 `*Feel`-schema reviewer payload (six bounded `*Feel` fields, four ordinal axes, closed-schema unknown-key rejection) with full unit coverage, but no per-cycle review-loader currently invokes it. The candidate read path lives in `core/prototyping/iteration.ts` (single-lineage loader) or `cli/commands/prototypingCertify.ts` (multi-spec aggregator). Wire-in must identify the read path and route every loaded `<screen>.review.json` through `parseEvaluatorReview` so schema drift fails fast at iterate/certify rather than at downstream consumers.
- Recommendation: Land in the same wave as OQ-0012-0006 / 0007 (per-spec layout + dispatch) so the validator sees the v2.0 file layout it was designed for. Resolves: blocks v2.0 `*Feel` schema runtime enforcement.

### OQ-0012-0009: `validateImageSources` runtime wire-in at certify gate

- Gate: implement
- Disposition: open
- Owner: backend-engineer
- Due: 2026-06-30
- Severity: low
- Source: CHG-002 PR #208 review (FYI thread r3264491197, raised 2026-05-19).
- Question: The handoff schema validator (`core/prototyping/handoff.ts#validateImageSources`) checks `prototype-handoff.yaml#imageSources[]` shape with full unit coverage, but `cli/commands/prototypingCertify.ts` does not yet gate on the handoff yaml read path. Today `licenseVerify` consumes `prototyping.json#imageSources` directly; the handoff-yaml population path is left to a later batch (see iterate.ts 4b inline note). Wire-in must either add the certify-gate read of `prototype-handoff.yaml` and route entries through `validateImageSources` before `licenseVerify`, or document the deferral if the handoff.yaml population path is not ready.
- Recommendation: Defer until the handoff-yaml population path (DESIGN.md pool + handoff extraction) lands; until then `validateImageSources` is correctly tested-only. Track the population deferral as a coupled item under the same wave.
- Resolves: blocks `prototype-handoff.yaml#imageSources[]` schema gate at certify.

### OQ-0012-0010: `DEFAULT_LICENSE_CATALOG` configurability — wire-in via `QfaiConfig.prototyping.licenseCatalog`

- Gate: implement
- Disposition: open
- Owner: backend-engineer
- Due: 2026-06-30
- Severity: low
- Source: CHG-002 PR #208 7th late-review wave (codex r3264977114, P3 nit, raised 2026-05-19).
- Question: `cli/commands/prototypingIterate.ts#DEFAULT_LICENSE_CATALOG` is the SSOT in-memory default frozen at cycle 0 of every loop (`allowedSources: ["unsplash", "pexels"]` + license tiers). Today consumers are bound to the baseline — registering an additional allowlisted source (e.g. `pixabay`) requires forking QFAI. The TODO comment above the constant captures the intended path but lacks a tracking ID, so the release-after orphan risk has accumulated. Production wire-in must (1) extend `QfaiConfig` with an optional `prototyping.licenseCatalog?: { allowedSources: string[]; licenseTiers: Record<string, string[]> }` field, (2) honour it in `writeSeedMetadata` (the cycle-0 frozen value) and in the cycle ≥1 read path, (3) preserve the in-memory default as the fallback when neither config nor on-disk frozen value is present.
- Recommendation: Land in a dedicated wave after CHG-002 stabilises — the wire-in is mechanical but touches the cycle-0 freeze path that `licenseVerify` reads. Until then, the in-memory baseline is the documented contract and consumers needing additional sources fork the constant.
- Resolves: blocks consumer-facing license-catalog extensibility without a fork; closes the untracked TODO at `prototypingIterate.ts#DEFAULT_LICENSE_CATALOG`.

### OQ-0012-0011: Cycle-9 idempotency — single `--cycle 9` invocation on a non-converged 10-iter loop

- Gate: implement
- Disposition: open
- Owner: prototyping-cli
- Couples: TDD-0436 / TC-0012-0416 / AC-0012-0038 (cycle-9 idempotency Then clause; landed on AC-0012-0044 in 14th-wave and moved to AC-0012-0038 in 19th-wave because terminator routing is a 10-cycle iteration-budget concern, not an autonomous-run concern)
- Due: 2026-06-30
- Severity: low
- Source: CHG-002 PR #208 10th late-review wave Fix J (codex r3265262715, MINOR — original deferred follow-up) + 14th-wave traceability stitch (codex r3269198118, MINOR).
- Question: When `qfai prototyping iterate --cycle 9` is invoked on a non-converged loop whose `prototyping.json#iterations.length === 10` (i.e. iter-09 already recorded), the current code routes the exit through the cycle-mismatch path — `expectedNextCycle` becomes 10 and is then capped at 9, eventually surfacing exit 65 but only after the mismatch diagnostic. The operator-facing contract (AC-0012-0038 — 10-cycle iteration budget; the cycle-9 idempotency Then-clause landed on AC-0012-0044 in 14th-wave and was moved to AC-0012-0038 in 19th-wave) requires exit 65 to be surfaced directly on a single `--cycle 9` invocation regardless of stateful continuation. SKILL.md was already updated in the 10th-wave Fix J to drop the stateful re-run workaround; the CLI side change is mechanical (detect `iter index === MAX_ITERATION_INDEX AND not converged` before the cycle-mismatch branch).
- Recommendation: Land in a dedicated follow-up PR after CHG-002 stabilises. The change touches a deterministic exit-code branch and is straightforward to test in isolation; deferring it to a focused PR keeps the CHG-002 cluster minimal.
- Mitigation while deferred: operators who hit this path see the cycle-mismatch diagnostic first followed by exit 65 — the eventual exit code is correct, only the early diagnostic is misleading. SKILL.md Cycle 9 budget exhaustion subsection points operators at the restart-from-cycle-0 recovery path, so the workaround is documented.
- Resolves: closes the OP-APPEND-079 pattern asymmetry flagged by codex r3269198118 (deferred-followup OQ + tdd/test-list / 16_Traceability-ledger / 06_Test-Cases triad now mirrored in 08_Open-questions). The 09_delta.md OP-APPEND register entry is added under the 14th-wave cluster in `09_delta.md`.

### OQ-0012-0012: Systematic audit + helper consolidation of `path.join(root, config.paths.*, ...)` call sites

- Gate: implement
- Disposition: open
- Owner: prototyping-core
- Couples: AC-0012-0037 / AC-0012-0047 / BR-0012-0030 (paths-related contracts); wave-45 / 47 / 48 fixes (`specDirExists` / `readPerSpecScreens` / `readUiContractScreenContracts`)
- Due: 2026-06-30
- Severity: low (architectural / consistency)
- Source: PR #208 47th-wave thread codex r3271787723 (P1 architecture-reviewer — `path.join` vs `path.resolve` bug class) — accepted with deferral; the wave-48 fix targets the two same-responsibility helpers (`readPerSpecScreens` and `readUiContractScreenContracts`) that directly partner with each other on the certify path, but ~11 other call sites carry the same pattern.
- Question: Should the project consolidate path resolution onto a `resolveContractsDir(root, config)` / `resolveSpecsDir(root, config)` helper family so call sites cannot independently choose `path.join` vs `path.resolve`? Deferred call sites flagged in r3271787723: `prototypingCertify.ts:670` (lockAbs), `prototypingIterate.ts:573` (lockAbs), `doctor.ts:563`, `validators/bpApDb.ts:48`, `validators/designAudit.ts:247/258`, `validators/designContractReadiness.ts:74/82/254/281/394`, `validators/designToken.ts:35`, `validators/uiDefinitionConsistency.ts:24/45`. Several of these run during validate-time gates, not during the prototyping loop, so the failure mode is narrower; but the underlying bug class is identical and consumers using absolute `paths.contractsDir` would observe silently incorrect behaviour across multiple commands.
- Recommendation: Land in a dedicated follow-up PR after CHG-002 stabilises. The mechanical fix is small (`path.join` → `path.resolve`) but the helper-consolidation refactor touches many files and benefits from a focused review window. Pair with a lint rule (`no-restricted-syntax` on `path.join(root, config.paths.*, ...)`) so the regression cannot reappear.
- Mitigation while deferred: workflows using absolute `paths.contractsDir` or `paths.specsDir` overrides observe correct behaviour on the prototyping loop (certify per-(spec × screen) gate + iterate primarySpecId pin, both fixed). Validate-time gates may emit misleading errors but do not corrupt artifacts.
- Resolves: the bug-class architectural concern; a future regression of the same pattern would have a single SSOT helper to anchor against.

### OQ-0012-0001: Airgapped run support (stock-photo fetch over restricted network)

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

### OQ-0012-0013: a per-spec-only review layout fails `validate`, and `certify` refuses it only when `validate` re-ran after the change

- Gate: implement
- Disposition: deferred (trigger = a RECORDED non-seed iteration carrying per-spec review artifacts without the flat `review.json`; a dual-write iteration carrying both satisfies each gate and is NOT the trigger, and unrecorded working directories are outside what either gate inspects, on a CANONICAL-INDEX iteration only)
  - **Why canonical-index.** `validateIterationReviewArtifacts` runs `if (mirror.index !== i) continue;` BEFORE `iterationReviewPath(i)` and the `readFile` (`prototypingEvidence.ts:472-485`), so an index-skewed record never has its flat path audited — it raises `QFAI-PROT-004` and not `prototypingEvidence.review.missing`. The guard specified in #1093 must not read that malformed input as this contradiction.
- Owner: solution-architect
- Due: 2026-10-31
- Severity: medium
- Source: issue #1078, raised from the review round on PR #1077 (hardening the reviewer-deliverable gate added in #1076).
  - `qfai prototyping certify` checks whether a per-spec subdirectory is present, and only then requires a file per declared `(spec, screen)` pair (`cli/commands/prototypingCertify.ts:633-666`, existence only — it does not parse the payload). A well-formed single-spec project with no per-spec subdir skips that gate and passes. `.qfai/contracts/cli/qfai-prototyping-iterate.md` nonetheless calls the per-spec file "the sole per-cycle Reviewer artifact" and marks it REQUIRED, with the `ReviewerPayload` shape.
  - Reachability: `certify` reaches its layout branch only after loading `validate.json` and validating `frozenSpecsCovered`, but a well-formed SINGLE-spec frozen set passes both and reaches it. So this is live for a single-spec set as much as a multi-spec one, and the single-spec freeze in `prototypingIterate.ts` is NOT a mitigation. The original framing limited it to multi-spec; that was wrong.
  - **`certify` seals on a STALE `validate.json`.** It checks three things about the stored result — that it exists, that `profile` is `prototyping`, and that `counts.error` is 0 (`prototypingCertify.ts:286-319`) — and establishes no correspondence with the evidence it is about to seal: no `generatedAt`, no digest, no mtime relation. The only freshness relation in that file is the upgrade-promotion mtime check at `:1216-1294`, comparing a gates signal against the certificate, and `:1244-1249` records the missing link as a known limitation. So flat present -> `validate` succeeds -> flat removed, per-spec written -> `certify` DOES seal, through the per-spec gate at `:633-705` and `:933-952`, without ever reading the flat file (`:663` names it only as the legacy fallback). "Neither command passes" is a claim about what the two commands DEMAND, not that the sequence is unreachable. Filed as **#1107**.
  - `validate --profile prototyping` reads the FLAT `.qfai/evidence/prototyping/iter-NN/review.json` (`validators/prototypingEvidence.ts` via `core/prototyping/iteration.ts#iterationReviewPath`) and validates the `EvaluatorReview` shape.
  - The two are not mutually exclusive in every configuration: a flat-only project passes `validate` and takes `certify`'s single-spec skip, and a dual-write iteration satisfies both gates. What fails is per-spec WITHOUT flat — `validate` reports `QFAI-PROT-002`, which `core/prototyping/mode.ts` lists as a hard error so exploration mode does not soften it, and `certify` refuses to seal while `validate.json#counts.error` is non-zero.
- Measured on `main` at `aa7bcd23` (2026-09-04), so the deferral rests on facts rather than on the issue's framing:
  - `iterationReviewPathPerSpec` and `dispatchReviewerToPair` have zero production callers today. This is NOT evidence the layout is unreachable: `cli/commands/prototypingCertify.ts` composes per-spec paths from a template string and imports neither helper, so the layout is reachable with the caller count at zero.
  - `prototypingIterate.ts` freezes `frozenSpecsCovered` **single-spec on purpose**, and its inline comment cites this contradiction as the reason. That freeze is NOT a mitigation for it: `certify` reads and validates the frozen set BEFORE it reaches the layout branch, and a well-formed single-spec set passes that check and reaches it.
  - Field correspondence between the two payloads: `scores` **is** `ordinalAxes` — the same four axes (`informationArchitecture`, `navigationFlow`, `usability`, `functionality`) on the same `{weak, acceptable, strong, exceptional}` scale — and `layoutAntiPatternsDetected` / `designMdViolations` are identical. `iterIndex` maps to `cycle`. (Issue #1078 originally claimed the axes were not the same information; that claim is corrected on the issue.)
  - Not derivable: `proseCritique` is one 200..500-word string, `impressions` is `Record<FeelField, string>` over six bounded fields; composing one from the other fabricates a critique.
  - **Absent from `ReviewerPayload` entirely**: `pivotDirective`, `evidenceRefs`, `reviewerId`. `pivotDirective` is the reviewer's verdict and `iterate` acts on it, so any option that keeps the flat gate's obligations while adopting the per-spec layout has to EXTEND the contract's closed schema, not map onto it.
- Options:
  - A) Per-spec canonical — the reviewer-deliverable gate reads the layout `certify`'s `hasPerSpecSubdir` does and validates `ReviewerPayload` (already parsed as a closed schema by `parseEvaluatorReview`); the flat `EvaluatorReview` sunsets. Requires adding `pivotDirective` to `ReviewerPayload` and deciding whether `impressions` replaces `proseCritique`. Cheapest of the three on the numbers above.
  - B) Flat canonical — retire the per-spec layout and its contract obligation and rewrite `certify`'s multi-spec branch. Contradicts a DR the contract states is preserved.
  - C) Both, explicitly — the gate accepts either. Needs the same contract extension as (A) for the three absent fields, so it is not the smaller step it appears to be.
- Recommendation: Option A, decided in the same wave as OQ-0012-0006 / 0007 / 0008 rather than before them — all four turn on the same per-spec namespace and a partial cutover leaves the contradiction reachable.
- Mitigation while deferred: none automated. The single-spec freeze in `prototypingIterate.ts` and `TC-0012-0388` do NOT cover this — see Reachability above. **#1093** carries the seven refuted guard drafts and the requirements a correct guard must satisfy, including the negative cases (dual-write, unrecorded working directories, cleanup-helper wire-ins); `CR-20260904-0002` records the decision and points there. The guard needs a fixture exercising the `(spec, screen)` dispatch path, which does not exist until the wire-in lands.
- Next decision point: the OQ-0012-0006 / 0007 wire-in, which is also when the guard specified in **#1093** becomes writable.
- Evidence: issue #1078 and its correction comment; `prototypingCertify.ts` multi-spec branch; `prototypingIterate.ts` freeze comment; `validators/prototypingEvidence.ts` flat read path; `prototypingCertify.ts:286-319` (the stale-`validate.json` path, filed as #1107); `prototypingEvidence.ts:472-485` (the index-skew `continue` that bounds the trigger).
