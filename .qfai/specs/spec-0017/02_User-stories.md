# 02 User Stories

## US-0017-0001: 単一 prototype の serial 進化

As a designer, I want `/qfai-prototyping` to evolve a single prototype across up to 15 cycles so that creative breakthrough emerges from accumulated critique rather than from upfront candidate diversification.

## US-0017-0002: AI が pivot を自発的に選択

As an AI agent (generator), I receive an explicit `pivotDirective: continue | refine | pivot` from the reviewer each cycle so I can choose to scrap the prior visual language and reimagine the artifact when the structural ceiling is recognized.

## US-0017-0003: pivot を罰しない採用ロジック

As a maintainer, I want the harness to accept the latest iteration regardless of whether it scores higher than prior iterations, so that AI is rewarded — not penalized — for radical reinvention attempts.

## US-0017-0004: AI default を罰する originality

As a reviewer (evaluator), I match the current iter against a global anti-slop pattern list so that AI default patterns (shadcn defaults, dashboard templates, generic SaaS layouts) are explicitly capped at `originality: acceptable` and cannot reach `exceptional`.

## US-0017-0005: 決定論的停止

As a maintainer, I want stop conditions evaluated by `qfai prototyping iterate --cycle <n>` exit code (0/64/65/2) so that AI cannot subjectively declare DONE before the deterministic gate succeeds.

## US-0017-0006: 評価軸の global 固定

As a maintainer, I want 4 evaluation axes (Design quality / Originality / Craft / Functionality) fixed in code constants so per-project axis research is no longer required and `/qfai-discussion` stays focused on project intent rather than axis curation.

## US-0017-0007: design-system を出力契約として受け取る

As a `/qfai-implement` consumer, I receive `design-system.yaml` and `prototype-handoff.yaml` as **outputs** of the prototyping run (not inputs), with extracted color tokens, typography scale, spacing scale, radii, and shadows derived deterministically from the final iter HTML.

## US-0017-0008: simplified handoff schema

As a `/qfai-implement` consumer, I no longer parse `mustPreserve / mayAdapt / mustNotCopy` triplets from prototype-handoff. The artifact itself is the SSOT; handoff yaml carries only `finalIterIndex`, `finalArtifact`, `extractedDesignSystem`, and `implementationNotes` (free-form prose).

## US-0017-0009: cross-skill cleanup

As a QFAI maintainer, I want `/qfai-discussion` upstream sidecars (33_exploration_rubric, 34_evaluator_calibration) and `/qfai-sdd` design contracts (evaluation-rubric, evaluator-calibration, absorption-policy, selected-direction) physically removed so that no legacy concept can leak into v2.0 runs.

## US-0017-0010: legacy concept 残存検出

As a CI maintainer, I want `packages/qfai/scripts/check-no-legacy-concepts.sh` to fail-fast on any commit that reintroduces `mode/full-harness/funnel/round-*/harvestBuilder/absorptionBuilder/plateauDetector/conceptFit/100-perfect` strings in `packages/qfai/`.
