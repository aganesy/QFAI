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

### US-0012-0091

As a web reviewer, I want Lighthouse evidence to remain a documented requirement when the legacy validation slice is used on web surfaces, so that older checks stay actionable without reviving runtime mode contracts.

### US-0012-0092

As a product-surface reviewer, I want design-system compliance to be recorded when `design-system.yaml` exists, so that visual drift is called out explicitly.

### US-0012-0093

As a project maintainer, I want calibration overrides to remain documented as validator/reference inputs, so that existing validation helpers continue to behave predictably.

### US-0012-0094

As a maintainer, I want full-harness iterations to store `reviewerScores[]` and `allItemsPass95`, so that evidence history reflects the current reviewer-score model.

### US-0012-0095

As a maintainer, I want `scoringTrace[]` to be derived from reviewer-score snapshots, so that convergence analysis no longer depends on weighted totals.

### US-0012-0096

As a consumer of full-harness results, I want the output to include `iterationBudget`, so that I can see both the configured max and the remaining budget.

### US-0012-0097

As a validator, I want termination to be derived from `allItemsPass95` or max-iteration reach, so that completion semantics match the current implementation.

## Legacy Coverage Continuity

- `US-0012-0001..US-0012-0083` are retained as legacy traceability identifiers for existing tests and historical slices.
- Their pre-v1.8.1 weighted-total narratives are superseded by the current reviewer-score-centered posture in [01_Spec.md](./01_Spec.md).
