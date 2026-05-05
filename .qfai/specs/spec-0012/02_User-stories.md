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

## Legacy Coverage Continuity

- The legacy baseline user-story identifier space is retained as historical traceability for existing tests and historical slices.
- The mid-range legacy v1.x narratives (mode budgets / fullHarness / scoringTrace / allReviewerAxesPerfect100 / round-based candidate funnel) were purged 2026-05-06 in the v2.0 / UX-loop adoption (see `09_delta.md` CHG-001 OP-PURGE-001..007); they are no longer part of the active spec surface.
- The pre-v1.8.1 weighted-total narratives are superseded by the current v2.0 / UX-loop posture in [01_Spec.md](./01_Spec.md).
