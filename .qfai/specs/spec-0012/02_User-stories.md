# 02 User Stories

## US Catalog

- US-0012-0084: `/qfai-prototyping` to define a Delegation Scope Table
- US-0012-0085: the iteration gate to use explicit convergence and budget rules
- US-0012-0086: Step 0 execution planning to be documented before iteration begins
- US-0012-0087: screenshot capture guidance to remain documented as a shared utility contract
- US-0012-0088: the iteration cycle to be described in natural language
- US-0012-0089: screenshots, HTML snapshots, axis definitions, prior reviewer-score context, and design-system inputs gathered…
- US-0012-0090: a fixed structural checklist for color, typography, spacing, border radius, shadow, and do's/don'ts
- US-0012-0098: `/qfai-prototyping` to evolve a single prototype across up to 15 cycles
- US-0012-0099: As an AI agent (generator), I receive an explicit `pivotDirective: continue | refine | pivot` from the reviewe…
- US-0012-0100: the harness to accept the latest iteration regardless of whether it scores higher than prior iterations, so AI…
- US-0012-0101: As a reviewer (product-surface-reviewer), I score iters on UX-centered axes — informationArchitecture / naviga…
- US-0012-0102: As a reviewer, I match the iter against `lap-001..008` covering structural failure modes (orphan pages, broken…
- US-0012-0103: stop conditions evaluated by `qfai prototyping iterate --cycle <n>` exit code (0/64/65/2) so AI cannot subject…
- US-0012-0104: per-iter evidence to be `<screen>.png` + `<screen>.html` + `review.json` only, so iter cost stays low and scra…
- US-0012-0105: `qfai prototyping iterate --cycle 0` to record `sha256(DESIGN.md)` into `prototyping.json#designMdSha256` and…
- US-0012-0106: `qfai prototyping iterate --cycle <n>` (n ≥ 1) to fail with exit 2 when on-disk `DESIGN.md` sha256 does not ma…
- US-0012-0107: As a reviewer, I rely on a pure deterministic function `findDesignMdViolations(html, designMd)` that checks co…
- US-0012-0108: As a `/qfai-implement` consumer, I receive `design-system.yaml` as a deterministic byte-equivalent mirror of `…
- US-0012-0109: one `/qfai-prototyping` invocation to resolve every UI-bearing spec in the consumer project
- US-0012-0110: to launch Playwright myself and operate the prototype (click / type / navigate / scroll) per spec × screen
- US-0012-0111: to write short-prose impressions of `operability`, `transitionFeel`, `crossScreenContinuity`, `userStoryFeel`,…
- US-0012-0112: every image slot to be filled from an allowlisted free stock-photo source and recorded with `{url, license, at…
- US-0012-0113: `/qfai-prototyping` to run autonomously from cycle 0 through cycle 9 with no per-cycle user prompts and to exi…
- US-0012-0114: per-cycle evidence laid out under `iter-NN/spec-NNNN/<screen>.review.json` only (no `.png`, no `.html`, no `.i…
- US-0012-0115: `qfai prototyping certify` to aggregate per-spec review-payload presence across the cycle-0 frozen spec set
- US-0012-0116: the resolved spec set frozen at cycle 0 and recorded in cycle-0 evidence
- US-0012-0117: the stock-photo license catalog (allowed sources + license tiers + attribution format) frozen at cycle 0 and u…
- US-0012-0118: the run hard-capped at 10 cycles (cycle 0 plus cycles 1..9, terminator `index === 9`)
- US-0012-0119: the shipped `generator-prompt.md` and `findDesignMdViolations` to be Tailwind-aware (preflight literal allowli…
- US-0012-0120: `scanFonts` / `scanRadius` / `scanShadow` to resolve `var(--token)` references against `:root` before judging…
- US-0012-0121: `inherit` / `initial` / `unset` / `revert` / `currentColor` to be treated as safe across every scanner
- US-0012-0122: `--*-shadow*:` custom-property declarations carrying `rgba()` literals to be stripped before color scanning
- US-0012-0123: `countWords` to accept a Japanese-only `proseCritique` of 800–1500 characters and a parallel English critique…
- US-0012-0124: `prototyping.execution.browserTool` to accept both `"playwright"` (primary) and `"playwright-cli"` (deprecatio…
- US-0012-0125: an opt-in `qfai prototyping iterate --capture` flag (default OFF)
- US-0012-0126: an opt-in `qfai prototyping iterate --auto-serve` flag (default OFF)
- US-0012-0127: `iterate` to emit a `prototyping.json` that passes `qfai validate --profile prototyping --fail-on error` witho…
- US-0012-0128: `qfai prototyping certify --check` to recognise a `verify.json#scope: "prototyping"` artifact as satisfying th…
- US-0012-0129: the public `/qfai-prototyping` skill surface aligned to single-spec language with `resolveSurfaceUnion()` remo…
- US-0012-0130: accepted-iter content mirrored to `.qfai/evidence/prototyping/screenshots/<screen-id>.png` and `.qfai/evidence…
- US-0012-0131: `qfai prototyping iterate --cycle 0` to refuse a destructive re-run unless `--force` is passed AND to move exi…
- US-0012-0132: a one-screen `[BLOCKED]` summary naming the top-3 exit-64 blockers with concrete offenders
- US-0012-0133: `primarySpecId` to surface a single deterministic error message naming the canonical 4-digit shape AND (SHOULD…
- US-0012-0134: md5-based duplicate capture detection (`lap-009`) and missing-route detection (`lap-010`) surfaced as advisory…
- US-0012-0135: `qfai prototyping iterate --license-patch <file>` to accept an add-only diff to the frozen license catalog and…
- US-0012-0136: `iter-NN/iterate-context.json` summarising the prior cycle
- US-0012-0137: `iterate --cycle N` with N outside `0..9` to surface a deterministic error naming the supported range AND reco…
- US-0012-0138: `qfai prototyping iterate --cycle 0 --emit-skeletons` (opt-in during the deprecation window) to emit one DESIG…
- US-0012-0139: DESIGN.md to declare a front-matter `patch_zone:` block
- US-0012-0140: a `prototyping.mode` discriminator (`convergence` | `exploration`) settable via `qfai.config.yaml#prototyping.…
- US-0012-0141: `QFAI-CRIT-009` error text to name every required keyword (`cta_visibility`, `four_state_check`, and any other…
- US-0012-0142: `iterate` and `certify` to append a `.qfai/evidence/prototyping/mutation-log.jsonl` JSON-Lines entry shaped `{…

## Active User Stories

## US-0012-0084

As a QFAI maintainer, I want `/qfai-prototyping` to define a Delegation Scope Table, so that role ownership is explicit before implementation and evaluation begin.

## US-0012-0085

As a reviewer, I want the iteration gate to use explicit convergence and budget rules, so that shallow success narratives are not mistaken for completed prototyping.

## US-0012-0086

As a prototyping agent, I want Step 0 execution planning to be documented before iteration begins, so that the evaluation axes and delegation map are explicit.

## US-0012-0087

As a maintainer, I want screenshot capture guidance to remain documented as a shared utility contract, so that evidence generation stays consistent without a dedicated runtime entrypoint.

## US-0012-0088

As an evaluator, I want the iteration cycle to be described in natural language, so that capture, evaluation, fix, and re-evaluation happen in a repeatable order.

## US-0012-0089

As an evaluator, I want screenshots, HTML snapshots, axis definitions, prior reviewer-score context, and design-system inputs gathered before scoring, so that visual judgment is grounded in stable inputs.

## US-0012-0090

As a design reviewer, I want a fixed structural checklist for color, typography, spacing, border radius, shadow, and do's/don'ts, so that visual quality is reviewed against declared criteria.

## US-0012-0098

As a designer, I want `/qfai-prototyping` to evolve a single prototype across up to 15 cycles so that creative breakthrough emerges from accumulated critique rather than from upfront candidate diversification.

## US-0012-0099

As an AI agent (generator), I receive an explicit `pivotDirective: continue | refine | pivot` from the reviewer each cycle so I can choose to scrap the prior visual language and reimagine the artifact when the structural ceiling is recognized.

## US-0012-0100

As a maintainer, I want the harness to accept the latest iteration regardless of whether it scores higher than prior iterations, so AI is rewarded — not penalized — for radical reinvention attempts.

## US-0012-0101

As a reviewer (product-surface-reviewer), I score iters on UX-centered axes — informationArchitecture / navigationFlow / usability / functionality — instead of subjective visual-aesthetic axes.

## US-0012-0102

As a reviewer, I match the iter against `lap-001..008` covering structural failure modes (orphan pages, broken back affordances, hidden state, missing wayfinding). Detection caps `informationArchitecture` at `acceptable`.

## US-0012-0103

As a maintainer, I want stop conditions evaluated by `qfai prototyping iterate --cycle <n>` exit code (0/64/65/2) so AI cannot subjectively declare DONE before the deterministic gate succeeds.

## US-0012-0104

As a maintainer, I want per-iter evidence to be `<screen>.png` + `<screen>.html` + `review.json` only, so iter cost stays low and scrap-and-redo is cheap.

## US-0012-0105

As an AI generator, I want `qfai prototyping iterate --cycle 0` to record `sha256(DESIGN.md)` into `prototyping.json#designMdSha256` and verify it matches `.qfai/contracts/design/DESIGN.md.lock.yaml#sha256`.

## US-0012-0106

As an AI generator, I want `qfai prototyping iterate --cycle <n>` (n ≥ 1) to fail with exit 2 when on-disk `DESIGN.md` sha256 does not match `prototyping.json#designMdSha256`, forcing a clean restart from cycle 0.

## US-0012-0107

As a reviewer, I rely on a pure deterministic function `findDesignMdViolations(html, designMd)` that checks color / font / radius / shadow tokens. A non-empty violation list blocks convergence (exit 64).

## US-0012-0108

As a `/qfai-implement` consumer, I receive `design-system.yaml` as a deterministic byte-equivalent mirror of `DESIGN.md` tokens (not extracted from final iter HTML).

## US-0012-0109

As an AI 開発者 (skill operator), I want one `/qfai-prototyping` invocation to resolve every UI-bearing spec in the consumer project so that the project-wide prototype set evolves in a single run without per-invocation primary-spec selection. (REQ-0001, CHG-002)

## US-0012-0110

As a reviewer (product-surface-reviewer), I want to launch Playwright myself and operate the prototype (click / type / navigate / scroll) per spec × screen so that my qualitative impressions reflect actual operability instead of a pre-generated script transcript. (REQ-0003, CHG-002)

## US-0012-0111

As a reviewer, I want to write short-prose impressions of `operability`, `transitionFeel`, `crossScreenContinuity`, `userStoryFeel`, `acceptanceCriteriaFeel`, and `menuReachabilityFeel` per spec × screen so that design and operability evaluation is qualitative-only (not reduced to AC-pass / transition-pass percentages). (REQ-0004, REQ-0005, CHG-002)

## US-0012-0112

As a downstream `/qfai-implement` consumer, I want every image slot to be filled from an allowlisted free stock-photo source and recorded with `{url, license, attribution, source}` in `prototype-handoff.yaml#imageSources[]` so that legal/compliance review can verify provenance without re-reading prototype HTML. (REQ-0006, CHG-002)

## US-0012-0113

As a CI operator, I want `/qfai-prototyping` to run autonomously from cycle 0 through cycle 9 with no per-cycle user prompts and to exit non-zero with a deterministic code on lock drift / Reviewer Playwright-session failure / license-verify failure (exit 66) / mid-run spec-set change so that pipelines never block on stdin. (REQ-0007, CHG-002)

## US-0012-0114

As a maintainer, I want per-cycle evidence laid out under `iter-NN/spec-NNNN/<screen>.review.json` only (no `.png`, no `.html`, no `.interaction.json`) so that stale-dir cleanup, certify presence checks, and reviewer payload writes share one namespace and iter cost stays low. (REQ-0008, CHG-002)

## US-0012-0115

As a maintainer, I want `qfai prototyping certify` to aggregate per-spec review-payload presence across the cycle-0 frozen spec set so that a missing `<screen>.review.json` for any spec at the accepted iter rejects certify. (REQ-0009, CHG-002)

## US-0012-0116

As a maintainer, I want the resolved spec set frozen at cycle 0 and recorded in cycle-0 evidence so that mid-run additions of new UI-bearing specs do not restart cycle 0 — they are deferred to the next invocation. (REQ-0011, CHG-002)

## US-0012-0117

As a legal/compliance reviewer, I want the stock-photo license catalog (allowed sources + license tiers + attribution format) frozen at cycle 0 and used as the SSOT for every `imageSources[]` row in the run so that license-verify is reproducible. (REQ-0013, CHG-002)

## US-0012-0118

As a CI operator, I want the run hard-capped at 10 cycles (cycle 0 plus cycles 1..9, terminator `index === 9`) so that runaway loops are deterministic and validators reject any evidence pack with cycle index > 9. (REQ-0002, CHG-002)

## v1.9.1 Defect Remediation User Stories (CHG-005)

## US-0012-0119

As a `/qfai-prototyping` operator, I want the shipped `generator-prompt.md` and `findDesignMdViolations` to be Tailwind-aware (preflight literal allowlist plus body-scope narrowing) so that a faithfully generated iter does not surface `designMdViolations[]` for CDN preflight literals, internal `--tw-*` properties, alpha-modifier `rgba()`, or standard utility shorthand. (REQ-0012-0055)

## US-0012-0120

As a designer, I want `scanFonts` / `scanRadius` / `scanShadow` to resolve `var(--token)` references against `:root` before judging safety, so that token-driven CSS does not produce false-positive `designMdViolations[]`. (REQ-0012-0056)

## US-0012-0121

As an iter author, I want `inherit` / `initial` / `unset` / `revert` / `currentColor` to be treated as safe across every scanner, so that idiomatic CSS-wide keywords do not block convergence. (REQ-0012-0057)

## US-0012-0122

As a designer, I want `--*-shadow*:` custom-property declarations carrying `rgba()` literals to be stripped before color scanning, so that shadow-token CSS does not produce false `designMdViolations[]`. (REQ-0012-0058)

## US-0012-0123

As a Japanese-language reviewer, I want `countWords` to accept a Japanese-only `proseCritique` of 800–1500 characters and a parallel English critique of 200–500 words within the same QFAI-PROT-002 band, so that bilingual review payloads converge without artificial length errors. (REQ-0012-0059)

## US-0012-0124

As a downstream project, I want `prototyping.execution.browserTool` to accept both `"playwright"` (primary) and `"playwright-cli"` (deprecation window) so that pre-existing CI scripts continue to work during the one-minor-release migration. (REQ-0012-0060)

## US-0012-0125

As an `/qfai-prototyping` operator, I want an opt-in `qfai prototyping iterate --capture` flag (default OFF) so that I can opt into PNG / HTML capture per the Capture contract without breaking the default no-capture posture. (REQ-0012-0061)

## US-0012-0126

As an `/qfai-prototyping` operator, I want an opt-in `qfai prototyping iterate --auto-serve` flag (default OFF) so that iterate can spawn / teardown a local HTTP server with safe foreign-process detection. (REQ-0012-0062)

## US-0012-0127

As a CI gatekeeper, I want `iterate` to emit a `prototyping.json` that passes `qfai validate --profile prototyping --fail-on error` without orchestrator post-processing, so that downstream automation can rely on the iterate output directly. (REQ-0012-0063)

## US-0012-0128

As a prototyping-only operator, I want `qfai prototyping certify --check` to recognise a `verify.json#scope: "prototyping"` artifact as satisfying the prototyping-phase gate, so that DONE for the prototyping slice does not block on ATDD / implement artifacts that cannot exist at this phase. (REQ-0012-0064)

## US-0012-0129

As a downstream consumer, I want the public `/qfai-prototyping` skill surface aligned to single-spec language with `resolveSurfaceUnion()` removed from the public surface, so that the doc-vs-impl drift identified across SKILL.md and the contracts collapses. (REQ-0012-0065)

## US-0012-0130

As a maintainer, I want accepted-iter content mirrored to `.qfai/evidence/prototyping/screenshots/<screen-id>.png` and `.qfai/evidence/prototyping/html/<screen-id>.html` on convergence with screen-ids normalised to underscore casing end-to-end, so that the aggregate-dir and per-spec dir use the same form. (REQ-0012-0066)

## US-0012-0131

As an operator, I want `qfai prototyping iterate --cycle 0` to refuse a destructive re-run unless `--force` is passed AND to move existing `iter-00/` to `iter-00.backup-<ISO>/` before clearing, so that mistaken re-seeds remain recoverable. (REQ-0012-0067)

## US-0012-0132

As an operator on a non-converged cycle, I want a one-screen `[BLOCKED]` summary naming the top-3 exit-64 blockers with concrete offenders, so that I can act on the next iter without scrolling through evidence diffs. (REQ-0012-0068)

## US-0012-0133

As an operator, I want `primarySpecId` to surface a single deterministic error message naming the canonical 4-digit shape AND (SHOULD) to accept `1` / `"1"` / `"01"` / `"0001"` with internal normalisation, so that the input-validation surface is unambiguous. (REQ-0012-0069)

## US-0012-0134

As a reviewer, I want md5-based duplicate capture detection (`lap-009`) and missing-route detection (`lap-010`) surfaced as advisory-failing layout anti-patterns with mandatory justification, so that silent screen collisions and unreachable routes block convergence by default. (REQ-0012-0070)

## US-0012-0135

As a license-compliance operator, I want `qfai prototyping iterate --license-patch <file>` to accept an add-only diff to the frozen license catalog and persist an audit row, so that I can broaden the catalog mid-program without a cycle-0 restart. (REQ-0012-0071, SHOULD)

## US-0012-0136

As a subagent author, I want `iter-NN/iterate-context.json` summarising the prior cycle so that the next subagent invocation has structured context without re-reading `prototyping.json`. (REQ-0012-0072, SHOULD)

## US-0012-0137

As an operator, I want `iterate --cycle N` with N outside `0..9` to surface a deterministic error naming the supported range AND recommending the peek-mode equivalent, so that off-by-one CLI mistakes are self-diagnosable. (REQ-0012-0073, SHOULD)

## US-0012-0138

As an operator running cycle 0 across a multi-spec frozen surface union, I want `qfai prototyping iterate --cycle 0 --emit-skeletons` (opt-in during the deprecation window) to emit one DESIGN.md-token-styled placeholder HTML per `screens[].id` in `frozenSurfaceUnion`, so that after convergence every `frozenSurfaceUnion` screen carries at least one `evidenceRefs[]` entry per kind (`screenshot` AND `html`) regardless of which spec it belongs to, while `--emit-skeletons` absence preserves v1.9.1 behavior with no regression. (REQ-0150)

## US-0012-0139

As a brand-SSOT maintainer, I want DESIGN.md to declare a front-matter `patch_zone:` block so that minor in-zone edits update only a `patchHash` field while `frozenDesignMdHash#majorHash` and prototyping evidence remain valid, and out-of-zone edits continue to invalidate evidence with a `R-DESIGN-MD-PATCH-OUT-OF-ZONE` warning, so that small token tweaks do not force a full cycle-0 re-run. (REQ-0151)

## US-0012-0140

As an operator, I want a `prototyping.mode` discriminator (`convergence` | `exploration`) settable via `qfai.config.yaml#prototyping.mode` and overridable per-run by `qfai prototyping iterate --mode <mode>` (default `convergence`), so that exploration iterations can use the relaxed gate table while `qfai prototyping certify` rejects sealing any exploration-mode iteration (`R-EXPLORATION-CERTIFY-ATTEMPT`) and `acceptedIterationIndex` references a convergence-mode iteration only. (REQ-0152)

## US-0012-0141

As a reviewer authoring `taskFidelity` evidence, I want `QFAI-CRIT-009` error text to name every required keyword (`cta_visibility`, `four_state_check`, and any others surfaced by the implementation), `references/evidence-requirements.md` to enumerate them with example markdown structure, and `qfai prototyping iterate --capture` to emit an evidence template skeleton with the keywords as placeholders, so that the keyword set cannot be silently forgotten. (REQ-0162)

## US-0012-0142

As a maintainer auditing evidence churn, I want `iterate` and `certify` to append a `.qfai/evidence/prototyping/mutation-log.jsonl` JSON-Lines entry shaped `{ ts, caller, path, action, priorSize, newSize }` for every destructive mutation (delete / overwrite) under `iter-NN/*` (including each file moved by `--cycle 0 --force`), git-ignored by default, so that iter-NN evidence disappearance becomes forensically reproducible; a code path mutating iter-NN without a mutation-log call surfaces `R-EVIDENCE-MUTATION-UNLOGGED` (error). (REQ-0165)

## Legacy Coverage Continuity

- The legacy baseline user-story identifier space is retained as historical traceability for existing tests and historical slices.
- The mid-range legacy v1.x narratives (mode budgets / fullHarness / scoringTrace / allReviewerAxesPerfect100 / round-based candidate funnel) were purged 2026-05-06 in the v2.0 / UX-loop adoption (see `09_delta.md` CHG-001 OP-PURGE-001..007); they are no longer part of the active spec surface.
- The pre-v1.8.1 weighted-total narratives are superseded by the current v2.0 / UX-loop posture in [01_Spec.md](./01_Spec.md).
