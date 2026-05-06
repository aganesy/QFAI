# 01 Spec

- Spec: spec-0012
- Parent: CAP-0012
- Status: active
- Absorbed: former spec-0017 (CAP-0017 v2.0 single-thread evolution loop / UX-loop redesign) and former spec-0018 (round-based candidate funnel) — both subjects fully decomposed into this pack as of 2026-05-06.

## Consumer View

- Primary SSOT for execution: `spec-0012/01_Spec.md`
- Public interface: `/qfai-prototyping`
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In:
  - `/qfai-prototyping` skill orchestration with single-thread serial iteration (cycles 0..14, max 15)
  - 4 UX evaluation axes (`informationArchitecture`, `navigationFlow`, `usability`, `functionality`), ordinal scale `{weak, acceptable, strong, exceptional}` fixed in code constants
  - layout-anti-pattern catalog (`lap-001-orphan-page`..`lap-008-no-back-affordance`); detection caps `informationArchitecture` at `acceptable`
  - root `DESIGN.md` as brand SSOT, sha256 frozen at the SDD Phase 0 step in `.qfai/contracts/design/DESIGN.md.lock.yaml`
  - cycle 0 records `prototyping.json#designMdSha256`; cycle ≥1 fail-closed on hash drift (exit 2)
  - `findDesignMdViolations(html, designMd)` pure deterministic function for color / font / radius / shadow token compliance; non-empty list blocks convergence
  - `pivotDirective: continue | refine | pivot` rules: `pivot` ⇔ 3 consecutive low-IA + latest has `lap-*`; `continue` ⇔ ≥2 of 4 axes strictly improved by `ordinalIndex` (weak=0, acceptable=1, strong=2, exceptional=3); `refine` otherwise
  - latest iter always accepted (`acceptedIterationIndex === iterations.length - 1`); no best-of-history
  - per-iter evidence layout: `iter-NN/{<screen>.png, <screen>.html, review.json}`
  - completion is deterministic via `qfai prototyping iterate --cycle <n>` exit code (0 / 64 / 65 / 2)
  - `qfai prototyping certify --check` (exit 0) is the sole DONE signal
  - `MAX_ITERATIONS = 15` is a code constant (`packages/qfai/src/core/prototyping/iteration.ts`); not configurable
  - `design-system.yaml` is generated post-loop as a deterministic byte-equivalent mirror of `DESIGN.md` token tables (NOT extracted from final iter HTML)
  - `prototype-handoff.yaml` carries `{finalIterIndex, finalArtifact, extractedDesignSystem, implementationNotes}` only
  - mandatory screenshot evidence: `.qfai/evidence/prototyping/iter-NN/<screen>.png`
  - mandatory HTML evidence: `.qfai/evidence/prototyping/iter-NN/<screen>.html`
  - `qfai validate --fail-on error` is the machine gate before completion
  - `/qfai-verify` PASS / REVISE is the final review gate
  - SKILL.md size budget: `qfai-prototyping/SKILL.md ≤ 130` lines; `references/iteration-loop.md ≤ 80`, `generator-prompt.md ≤ 60`, `reviewer-prompt.md ≤ 100`, `handoff.md ≤ 50`, `design-md-spec.md ≤ 120`
  - generator (product-experience-architect) and evaluator (product-surface-reviewer) MUST be different sub-agents (self-preference bias prevention)
- Out:
  - `mode` concept (`low-cost` / `standard` / `full-harness`) — purged
  - `maxCycles` / `maxIterationsByMode` configuration — purged
  - round-based candidate funnel (`r5 → r3 → r2 → r1`) — purged
  - polish/branch cycles, concept-anchor pre-declaration, plateau detector — purged
  - best-of-history winner retention — purged (`bestOfHistory` field absent in v3.0 schema)
  - `allReviewerAxesPerfect100` / weighted-total scoring — purged
  - hard-floor evaluation-rubric enforcement (`evaluation-rubric.yaml hard_floors[]`) — purged
  - active surface for `evaluation-rubric.yaml` / `evaluator-calibration.yaml` / `absorption-policy.yaml` / `selected-direction.yaml` / `brand-design.yaml` / `exploration-brief.yaml` / `reference-pool.yaml` — purged (history-only)
  - `qfai prototyping` as a public orchestration command surface — only `iterate` / `certify` / `show-spec` are public sub-commands
  - visual-aesthetic anti-slop tokens (`slop-001-shadcn-zinc`, `slop-003-linear-stripe`, `slop-008-glass-card`, `slop-009-mono-emoji`, `slop-010-rounded-2xl-shadow-lg`) as active anti-pattern set — purged

## Applicable NFR

- NFR-0001: routing policy remains centralized (orchestrator owns delegation)
- NFR-0002: specialist responsibilities stay explicit (generator ≠ evaluator)
- NFR-0003: first delegation failure hard-stops the stage

## Applicable Policy

- Completion is judged exclusively by `qfai prototyping certify --check` exit code; LLM subjective DONE is forbidden.
- Latest iter is always accepted; one-step regression is permitted (leap regression is the canonical creative-breakthrough path).
- root `DESIGN.md` is brand SSOT; sha256 frozen at the SDD Phase 0 step; cycle ≥1 hash mismatch halts at exit 2.
- Non-empty `designMdViolations` blocks convergence (DESIGN.md compliance gate).
- Cross-skill changes must be deletion-only or in-place schema simplification (no new sidecar / no new contract).

## Evidence Summary

- Code: `packages/qfai/src/core/prototyping/{iteration, evaluatorReview, certificate, designMdViolations}.ts`, `packages/qfai/src/cli/commands/prototypingIterate.ts`, `packages/qfai/src/cli/commands/prototypingCertify.ts`
- Validators: `packages/qfai/src/core/validators/{prototypingEvidence, designContractReadiness}.ts`, `packages/qfai/src/core/validators/prototyping/{refIntegrity, specIdLinkage, stateGate, completionCertificate}.ts`
- Skill: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/{SKILL.md, references/{iteration-loop, generator-prompt, reviewer-prompt, handoff, design-md-spec}.md, templates/{DESIGN.md.sample, prototype-handoff.sample.yaml, design-md-lock.sample.yaml}}`
- Cert: `.qfai/evidence/prototyping/completion-certificate.json` (schema v2.0)

## Relevant Requirements

- REQ-0012-0001..0010 (legacy carry-over, retained as historical traceability identifier space)
- REQ-0012-0030: AI が iter-N で前 iter を全捨てして再構築できる pivot directive プロンプトを generator が受け取る
- REQ-0012-0031: 4 UX 軸 ordinal score と 200–500 語の散文 critique を reviewer が出力する
- REQ-0012-0032: 完了は (4 軸全 exceptional かつ lap = 0 かつ designMdViolations = 0) または (iter index === 14) の決定論判定
- REQ-0012-0033: best-of-history を持たず最新 iter が常に accepted
- REQ-0012-0034: lap-\* 検出時 informationArchitecture は acceptable cap
- REQ-0012-0035: per-iter evidence は `<screen>.png` + `<screen>.html` + `review.json` のみ
- REQ-0012-0036: 旧 mode/funnel/polish-branch/concept-anchor/100-perfect の概念が QFAI 全 codebase から物理削除されている
- REQ-0012-0037: SKILL.md ≤ 130 行、references 5 ファイル合計 ≤ 410 行
- REQ-0012-0038: root `DESIGN.md` を brand SSOT として SDD Phase 0 で sha256 凍結し、`/qfai-prototyping` cycle ≥1 で hash 不一致を exit 2 で検出
- REQ-0012-0039: 評価軸を informationArchitecture / navigationFlow / usability / functionality に固定
- REQ-0012-0040: pure-fn `findDesignMdViolations` で color / font / radius / shadow token 逸脱を検出
- REQ-0012-0041: handoff `design-system.yaml` は `DESIGN.md` token の deterministic mirror

## Entry points

- US range: US-0012-0001..0108 retained as the legacy traceability identifier space; v2.0 / UX-loop active narratives occupy the upper end (US-0012-0098..0108). Legacy v1.x mid-range narratives were purged — see `09_delta.md` CHG-001 OP-PURGE-001..007.
- AC range: AC-0012-0001..0036; baseline AC retained, the v2.0 / UX-loop active block lives at AC-0012-0020..0036, and the intermediate legacy v1.x block was purged — see `09_delta.md` CHG-001 OP-PURGE-001..009.
- BR range: BR-0012-0001..0027; baseline BR retained, the v2.0 / UX-loop active block lives at BR-0012-0017..0027, and the intermediate legacy v1.x block was purged — see `09_delta.md` CHG-001 OP-PURGE-010..015.
- EX range: EX-0012-0001..0121; baseline EX retained, the v2.0 active block lives at EX-0012-0110..0121, and the intermediate legacy v1.x examples were purged — see `09_delta.md` CHG-001.
- TC range: TC-0012-0001..0353; baseline TC retained, the v2.0 active block lives at TC-0012-0319..0353, and legacy v1.x test cases (executionPlan / Lighthouse / designSystemCompliance / calibration overrides / fullHarness / scoringTrace / iterationBudget / perfect-100 / hard-floor) were purged — see `09_delta.md` CHG-001 OP-PURGE-040..042.
- TDD range: TDD-0001..0370; the v2.0 active block lives at TDD-0336..0370. Legacy ledger rows that referenced purged TCs were removed in the same 2026-05-06 cleanup.
- Primary actors: orchestrator, product-experience-architect (generator), product-surface-reviewer (evaluator), devops-ci-engineer (capture)
