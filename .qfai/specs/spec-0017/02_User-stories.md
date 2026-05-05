# 02 User Stories

## US-0017-0001: 単一 prototype の serial 進化

As a designer, I want `/qfai-prototyping` to evolve a single prototype across up to 15 cycles so that creative breakthrough emerges from accumulated critique rather than from upfront candidate diversification.

## US-0017-0002: AI が pivot を自発的に選択

As an AI agent (generator), I receive an explicit `pivotDirective: continue | refine | pivot` from the reviewer each cycle so I can choose to scrap the prior visual language and reimagine the artifact when the structural ceiling is recognized.

## US-0017-0003: pivot を罰しない採用ロジック

As a maintainer, I want the harness to accept the latest iteration regardless of whether it scores higher than prior iterations, so that AI is rewarded — not penalized — for radical reinvention attempts.

## US-0017-0004: AI default を罰する originality

As a reviewer (evaluator), I match the current iter against a global anti-slop pattern list so that AI default patterns (shadcn defaults, dashboard templates, generic SaaS layouts) are explicitly capped at `originality: acceptable` and cannot reach `exceptional`.

(UX-loop redesign: deprecated; the `originality` axis is removed and the global anti-slop list is replaced by the layout-anti-pattern catalog `lap-001..008`. See US-0017-0014 and 09_delta.md OP-0001 / OP-0002 / OP-0021.)

## US-0017-0005: 決定論的停止

As a maintainer, I want stop conditions evaluated by `qfai prototyping iterate --cycle <n>` exit code (0/64/65/2) so that AI cannot subjectively declare DONE before the deterministic gate succeeds.

## US-0017-0006: 評価軸の global 固定

As a maintainer, I want 4 evaluation axes (Design quality / Originality / Craft / Functionality) fixed in code constants so per-project axis research is no longer required and `/qfai-discussion` stays focused on project intent rather than axis curation.

(UX-loop redesign: deprecated axis set; the active axes are now `informationArchitecture / navigationFlow / usability / functionality` per US-0017-0013 / D-0017-0017 / 09_delta.md OP-0001 / OP-0021. The "fixed in code constants" intent is preserved by the new axes.)

## US-0017-0007: design-system を出力契約として受け取る

As a `/qfai-implement` consumer, I receive `design-system.yaml` and `prototype-handoff.yaml` as **outputs** of the prototyping run (not inputs), with extracted color tokens, typography scale, spacing scale, radii, and shadows derived deterministically from the final iter HTML.

## US-0017-0008: simplified handoff schema

As a `/qfai-implement` consumer, I no longer parse `mustPreserve / mayAdapt / mustNotCopy` triplets from prototype-handoff. The artifact itself is the SSOT; handoff yaml carries only `finalIterIndex`, `finalArtifact`, `extractedDesignSystem`, and `implementationNotes` (free-form prose).

## US-0017-0009: cross-skill cleanup

As a QFAI maintainer, I want `/qfai-discussion` upstream sidecars (33_exploration_rubric, 34_evaluator_calibration) and `/qfai-sdd` design contracts (evaluation-rubric, evaluator-calibration, absorption-policy, selected-direction) physically removed so that no legacy concept can leak into v2.0 runs.

## US-0017-0010: legacy concept 残存検出

As a CI maintainer, I want `packages/qfai/scripts/check-no-legacy-concepts.sh` to fail-fast on any commit that reintroduces `mode/full-harness/funnel/round-*/harvestBuilder/absorptionBuilder/plateauDetector/conceptFit/100-perfect` strings in `packages/qfai/`.

## US-0017-0011: DESIGN.md を brand SSOT として固定 (UX-loop redesign)

As a designer running the UX loop, I want root `DESIGN.md` to be the single source of truth for brand vision and visual identity so that prototyping iterations cannot drift away from the agreed brand direction. `/qfai-discussion` emits the draft and `/qfai-sdd` Phase 0 freezes its sha256 hash into `.qfai/contracts/design/DESIGN.md.lock.yaml`.

## US-0017-0012: cycle 0 で DESIGN.md hash を記録、cycle ≥1 で hash 凍結ガード

As an AI generator (product-experience-architect), I want `qfai prototyping iterate --cycle 0` to record the `DESIGN.md` sha256 into `prototyping.json` and `--cycle ≥1` to fail with exit 2 when the live hash mismatches the recorded one, so that mid-run brand edits force a clean restart from cycle 0 instead of producing iterations against a moving target.

## US-0017-0013: UX 中心 4 軸への置換

As a reviewer (product-surface-reviewer), I score iters on UX-centered axes — informationArchitecture / navigationFlow / usability / functionality — instead of the prior visual-aesthetic axes (originality / designQuality / craft / functionality). The new axes capture how the artifact teaches the user where they are, where they can go, and how to do the primary task.

## US-0017-0014: layout-anti-pattern (lap-*) detection caps informationArchitecture

As a reviewer, I match the iter against a global layout-anti-pattern list (`lap-001..008`) covering structural failure modes such as orphan pages, broken back affordances, hidden state, and missing wayfinding. When any `lap-*` is detected, `informationArchitecture` is capped at `acceptable`. `lap-007` (state-not-represented) and `lap-008` (no-back-affordance) are reviewer-judged semantic patterns rather than mechanical token matches.

## US-0017-0015: DESIGN.md token 逸脱検出と handoff design-system mirror

As a `/qfai-implement` consumer, I rely on a pure deterministic function `findDesignMdViolations(html, designMd)` that checks color, font, radius, and shadow tokens in the iter HTML against `DESIGN.md`. A non-empty violation list blocks convergence (exit 64). The downstream `design-system.yaml` is a deterministic mirror of `DESIGN.md` tokens, not an extraction from the final iter HTML, so brand drift cannot leak into implementation.
