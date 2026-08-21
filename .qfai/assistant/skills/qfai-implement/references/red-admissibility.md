# RED Admissibility

What makes a failure count as the RED observation for a ledger row.

`Phase: Red` step 4 says "confirm the test actually fails for the expected
reason". That phrase used to be the whole standard qfai shipped — it appeared
three times across the assistant tree, always as an obligation and never as a
definition, and no validator adjudicated it. This file is the definition.

## The criterion

A failure is an **admissible RED** when all four hold:

1. The test module **imports and loads successfully**. Nothing under test is
   missing at the module level.
2. The failure is raised by an **assertion** — or an expected-exception check —
   **executing inside the row's own `Selector`**. Not in a fixture, not in a
   sibling test, not at collection time.
3. The failure message **names the predicate the row owns**: the value, state or
   error the obligation is about. "expected 3, received undefined" names it;
   "cannot find module" does not.
4. Deleting every assertion in the test would make the run **pass**. If the run
   would fail identically with no assertions at all, the observation carries no
   information about the assertions.

## What is not a RED

A **missing seam**, not a RED:

- collection / import / module-resolution error
- syntax error
- missing symbol or missing export
- fixture, factory or test-harness setup error
- a failure raised outside the row's `Selector`

Each of these proves the seam is absent. None of them says anything about
whether the assertions discriminate — which is the property RED exists to
establish.

For a `Layer = E2E` or `Layer = API` row the absent seam is frequently the
**program itself**: a system with no entrypoint cannot answer a request, so
every such row collects rather than asserts and none of them is startable. That
is not a defect in this criterion — it is what `Phase: Skeleton` exists to
remove before the first row is selected (`walking-skeleton.md`).

This matters most exactly where discriminating power matters most. Under the
skill's own ordering, Phase Red writes the test and Phase Green writes the
production code, so for any row that introduces a new module or symbol the first
failure is a load error **by construction**. Without step 3a below, the gate
would be met vacuously for every such row.

## Step 3a: create the seam first

Before running the test, create the **minimal seam** the test imports: the
module, export, class or function signature, with **no behaviour** — a no-op
body, or one returning a placeholder value.

Do **not** make the seam throw. An unasserted exception fails the run before any
assertion executes, which is the same non-observation as a load error: it shows
the seam is unfinished, not that the assertions discriminate. The one exception
is a test whose oracle _is_ an expected-exception check — there the throw is what
the assertion inspects, and the row records `expected-error`.

This is not production code and does not satisfy Phase Green's step 1: it
implements no predicate. Its only job is to make the module load, so that the
failure the row records is an assertion failure rather than a resolution
failure.

## Recording it

The per-item evidence contract carries `RED failure mode`, whose value is one
of:

| Value            | Meaning                                                      |
| ---------------- | ------------------------------------------------------------ |
| `assertion`      | admissible — an assertion inside the row's `Selector` failed |
| `expected-error` | admissible — an expected-exception check failed              |
| `falsifiability` | the _RED not observable_ path; see `red-not-observable.md`   |

There is no admissible value for a load error, and that is deliberate: a row
whose only failure was a load error has not observed RED yet. Create the seam
and re-run.

`RED result` truncation: the general "truncated output is acceptable" allowance
does **not** extend to the part of the output that demonstrates admissibility.
The recorded result must retain the assertion message and its location. Truncate
the stack tail, never the assertion line.

## When an assertion-level RED is genuinely unobservable

One case is legitimate: the obligation is already satisfied by a sibling row, so
the correct test passes on first run. That is **not** a licence to accept a load
error instead — it is a different path with its own evidence, and it is
specified in `red-not-observable.md`. Record `RED failure mode: falsifiability`
and follow that procedure.

Never weaken a correct test until it fails in order to manufacture a RED.
