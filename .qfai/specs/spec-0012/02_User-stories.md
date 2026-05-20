# 02 User Stories

## Active User Stories

### US-0012-0084

As a QFAI maintainer, I want `/qfai-prototyping` to define a Delegation Scope Table, so that role ownership is explicit before implementation and evaluation begin.

### US-0012-0085

As a reviewer, I want the iteration gate to use explicit convergence and budget rules, so that shallow success narratives are not mistaken for completed prototyping.

### US-0012-0086

As a prototyping agent, I want Step 0 execution planning to be documented before iteration begins, so that the evaluation axes and delegation map are explicit.

### US-0012-0087

As a maintainer, I want screenshot capture guidance to remain documented as a shared utility contract, so that evidence generation stays consistent without a dedicated runtime entrypoint.

### US-0012-0088

As an evaluator, I want the iteration cycle to be described in natural language, so that capture, evaluation, fix, and re-evaluation happen in a repeatable order.

### US-0012-0089

As an evaluator, I want screenshots, HTML snapshots, axis definitions, prior reviewer-score context, and design-system inputs gathered before scoring, so that visual judgment is grounded in stable inputs.

### US-0012-0090

As a design reviewer, I want a fixed structural checklist for color, typography, spacing, border radius, shadow, and do's/don'ts, so that visual quality is reviewed against declared criteria.

### US-0012-0098

As a designer, I want `/qfai-prototyping` to evolve a single prototype across up to 15 cycles so that creative breakthrough emerges from accumulated critique rather than from upfront candidate diversification.

### US-0012-0099

As an AI agent (generator), I receive an explicit `pivotDirective: continue | refine | pivot` from the reviewer each cycle so I can choose to scrap the prior visual language and reimagine the artifact when the structural ceiling is recognized.

### US-0012-0100

As a maintainer, I want the harness to accept the latest iteration regardless of whether it scores higher than prior iterations, so AI is rewarded — not penalized — for radical reinvention attempts.

### US-0012-0101

As a reviewer (product-surface-reviewer), I score iters on UX-centered axes — informationArchitecture / navigationFlow / usability / functionality — instead of subjective visual-aesthetic axes.

### US-0012-0102

As a reviewer, I match the iter against `lap-001..008` covering structural failure modes (orphan pages, broken back affordances, hidden state, missing wayfinding). Detection caps `informationArchitecture` at `acceptable`.

### US-0012-0103

As a maintainer, I want stop conditions evaluated by `qfai prototyping iterate --cycle <n>` exit code (0/64/65/2) so AI cannot subjectively declare DONE before the deterministic gate succeeds.

### US-0012-0104

As a maintainer, I want per-iter evidence to be `<screen>.png` + `<screen>.html` + `review.json` only, so iter cost stays low and scrap-and-redo is cheap.

### US-0012-0105

As an AI generator, I want `qfai prototyping iterate --cycle 0` to record `sha256(DESIGN.md)` into `prototyping.json#designMdSha256` and verify it matches `.qfai/contracts/design/DESIGN.md.lock.yaml#sha256`.

### US-0012-0106

As an AI generator, I want `qfai prototyping iterate --cycle <n>` (n ≥ 1) to fail with exit 2 when on-disk `DESIGN.md` sha256 does not match `prototyping.json#designMdSha256`, forcing a clean restart from cycle 0.

### US-0012-0107

As a reviewer, I rely on a pure deterministic function `findDesignMdViolations(html, designMd)` that checks color / font / radius / shadow tokens. A non-empty violation list blocks convergence (exit 64).

### US-0012-0108

As a `/qfai-implement` consumer, I receive `design-system.yaml` as a deterministic byte-equivalent mirror of `DESIGN.md` tokens (not extracted from final iter HTML).

### US-0012-0109

As an AI 開発者 (skill operator), I want one `/qfai-prototyping` invocation to resolve every UI-bearing spec in the consumer project so that the project-wide prototype set evolves in a single run without per-invocation primary-spec selection. (REQ-0001, CHG-002)

### US-0012-0110

As a reviewer (product-surface-reviewer), I want to launch Playwright myself and operate the prototype (click / type / navigate / scroll) per spec × screen so that my qualitative impressions reflect actual operability instead of a pre-generated script transcript. (REQ-0003, CHG-002)

### US-0012-0111

As a reviewer, I want to write short-prose impressions of `operability`, `transitionFeel`, `crossScreenContinuity`, `userStoryFeel`, `acceptanceCriteriaFeel`, and `menuReachabilityFeel` per spec × screen so that design and operability evaluation is qualitative-only (not reduced to AC-pass / transition-pass percentages). (REQ-0004, REQ-0005, CHG-002)

### US-0012-0112

As a downstream `/qfai-implement` consumer, I want every image slot to be filled from an allowlisted free stock-photo source and recorded with `{url, license, attribution, source}` in `prototype-handoff.yaml#imageSources[]` so that legal/compliance review can verify provenance without re-reading prototype HTML. (REQ-0006, CHG-002)

### US-0012-0113

As a CI operator, I want `/qfai-prototyping` to run autonomously from cycle 0 through cycle 9 with no per-cycle user prompts and to exit non-zero with a deterministic code on lock drift / Reviewer Playwright-session failure / license-verify failure (exit 66) / mid-run spec-set change so that pipelines never block on stdin. (REQ-0007, CHG-002)

### US-0012-0114

As a maintainer, I want per-cycle evidence laid out under `iter-NN/spec-NNNN/<screen>.review.json` only (no `.png`, no `.html`, no `.interaction.json`) so that stale-dir cleanup, certify presence checks, and reviewer payload writes share one namespace and iter cost stays low. (REQ-0008, CHG-002)

### US-0012-0115

As a maintainer, I want `qfai prototyping certify` to aggregate per-spec review-payload presence across the cycle-0 frozen spec set so that a missing `<screen>.review.json` for any spec at the accepted iter rejects certify. (REQ-0009, CHG-002)

### US-0012-0116

As a maintainer, I want the resolved spec set frozen at cycle 0 and recorded in cycle-0 evidence so that mid-run additions of new UI-bearing specs do not restart cycle 0 — they are deferred to the next invocation. (REQ-0011, CHG-002)

### US-0012-0117

As a legal/compliance reviewer, I want the stock-photo license catalog (allowed sources + license tiers + attribution format) frozen at cycle 0 and used as the SSOT for every `imageSources[]` row in the run so that license-verify is reproducible. (REQ-0013, CHG-002)

### US-0012-0118

As a CI operator, I want the run hard-capped at 10 cycles (cycle 0 plus cycles 1..9, terminator `index === 9`) so that runaway loops are deterministic and validators reject any evidence pack with cycle index > 9. (REQ-0002, CHG-002)

## Legacy Coverage Continuity

- The legacy baseline user-story identifier space is retained as historical traceability for existing tests and historical slices.
- The mid-range legacy v1.x narratives (mode budgets / fullHarness / scoringTrace / allReviewerAxesPerfect100 / round-based candidate funnel) were purged 2026-05-06 in the v2.0 / UX-loop adoption (see `09_delta.md` CHG-001 OP-PURGE-001..007); they are no longer part of the active spec surface.
- The pre-v1.8.1 weighted-total narratives are superseded by the current v2.0 / UX-loop posture in [01_Spec.md](./01_Spec.md).
