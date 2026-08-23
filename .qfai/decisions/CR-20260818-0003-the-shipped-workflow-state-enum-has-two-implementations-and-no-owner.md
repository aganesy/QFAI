# Change Request

- ID: `CR-20260818-0003`
- Title: `The shipped-workflow state enum has two implementations that disagree on the retired-name case, and the one with no production consumer is the one tests are pointed at as the authority`
- Raised by: `implementation-reviewer (advisory A-2) during the spec-0006 TDD-0036 / TDD-0037 review`
- Raised at: `2026-08-18T00:00:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `user (interactive decision, /qfai-sdd session)`
- Approved at: `2026-08-23T00:00:00Z`
- Approved option: `A` — one implementation and one owner for the state enum
- Applied at: `2026-08-23T00:00:00Z` — hasDrifted now asks resolveWorkflowFileState; no sixth state added
- Superseded by: `-`
- Blocked set: `(none — latent today, because the divergent branch has no production consumer)`

## The measurement

Two functions answer "what state is this shipped-workflow name in", and on one input they disagree.

`src/shared/provenance.ts` `resolveWorkflowFileState` — entry present, file present on disk, **no
packaged digest available** (the running package no longer ships the name) resolves to `modified`,
documented as "the conservative direction, since equality with the packaged template cannot be
shown".

`src/core/doctor/workflowsIntegrity.ts` `hasDrifted` — the same input answers `false` (not drift),
documented as "the running package no longer ships the name, which is the `extra` bucket and excluded
from drift".

Both arguments are defensible in isolation. They are opposite.

**Which one runs**: `hasDrifted`. `resolveWorkflowFileState` has **no production consumer** — measured
by grep across `packages/qfai/src`, its only references are its own definition and two test files.

**Why that is worse than harmless**: the test docblock added by `TDD-0036` points readers at
`resolveWorkflowFileState` as the authority for the state vocabulary — "gives the state its meaning".
That sentence is true for `declined`, which is the state the row is about, and misleading one row
along, because on the retired-name case the named authority disagrees with the reader `doctor`
actually runs.

## Why it is latent rather than live

Reaching the divergence needs a name that has a provenance entry, a file on disk, and no packaged
counterpart — i.e. an adopter who installed a workflow that a later QFAI release stopped shipping.
That is reachable in principle (a shipped name is retired) and unreachable in this repository today,
because the shipped set has not shrunk. So nothing observable is wrong now; what is wrong is that the
enum has two answers and no owner, and the divergence is discovered only by someone doing exactly
what this review did.

## Options (at least 3) and recommendation

### Option A — give the enum one implementation and one owner (recommended)

`resolveWorkflowFileState` becomes the single definition, `hasDrifted` is expressed in terms of it,
and the retired-name case is decided once — in the contract, not in two comments. Cost: it changes
the reader `doctor` runs, so it needs its own row and its own oracle; `TDD-0038`'s recorded mutation
needles anchor on `hasDrifted`'s early `return false;` and would have to be re-derived.

### Option B — delete `resolveWorkflowFileState`

It has no production consumer, so removing it removes the second answer and the misleading pointer at
once. Cost: `shippedWorkflowOwnership.test.ts` covers it directly and would go with it, and the §3
enum then has no executable expression at all — only prose in the contract and the branches of
`hasDrifted`, which is what let the divergence appear in the first place.

### Option C — record the divergence and decide the retired-name case in the contract only

`.qfai/contracts/cli/shipped-workflows.md` §3 states which answer is correct for the retired-name
case; both implementations gain a comment naming the other and the decision. No behaviour change.
Cost: two implementations remain, so the next divergence is a comment away.

**Recommendation: A**, but **not now**. Nothing is observably wrong, and A changes a reader six rows'
suites depend on. The right sequencing is C immediately — decide the case in the contract so the two
comments stop arguing — and A as its own spec row when the shipped set next changes. What should not
happen is the current state: two answers, no decision, and a test docblock naming the unused one as
the authority. **That last part is worth fixing regardless of the option chosen**, and is one
sentence.

## Impact scope

- Production: `shared/provenance.ts` and `core/doctor/workflowsIntegrity.ts` under A or B; none under C.
- Specs / contracts: `.qfai/contracts/cli/shipped-workflows.md` §3 under every option.
- Ledger rows: none reset. `TDD-0038`'s oracle needles re-derive under A.
- Adopter-visible: only when a shipped name is retired.

## Decision needed from user

Choose A, B or C, and confirm whether the test-docblock pointer should be corrected immediately
regardless.

## Approved actions (owner skill rerun plan)

1. Owner is `packages/qfai/src`: two implementations of one state enum, of which the tested one has
   no production consumer. Consolidation is a code change with its own spec row. **No mode applies** — `packages/qfai/src`, outside the step-4 invocation table.
2. Downstream ledger sweep: **no rows are reset.** The divergence is latent — the branch that
   disagrees has no production consumer, so no landed row's evidence depends on which
   implementation answered.
3. Cross-check after applying: assert the retired-name case through the surviving implementation
   from a test that reaches it via a production caller, so the consolidated enum cannot regain an
   untested second branch.

## Resolution

Pending.
