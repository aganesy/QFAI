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
   information about the assertions. Criteria 1-3 are properties of the failure
   the row already recorded; this one is a counterfactual about a run that has
   not happened, so it is discharged by a second run and recorded as
   `RED assertion-stripped result` (see **Recording it**).

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

The per-item evidence contract carries `Round N: RED failure mode` — a round
field, because a round-2 RED can have a different mode from round 1's
(`round-evidence.md`) — whose value is one of:

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

### `RED assertion-stripped result` — criterion 4's evidence

Criteria 1-3 are readable off the recorded `RED command` / `RED result` pair: a
load error shows in the output, the failing assertion's location shows whether
it is inside the row's `Selector`, and the message shows whether it names the
row's predicate. Criterion 4 leaves no such trace — `RED failure mode: assertion`
is written with the same three characters whether the assertion-deletion run
happened or not, so with no field of its own the criterion is unenforceable by
construction and silently degrades to advisory while reading as mandatory. It
gets one, on the same footing as `Oracle proof` on the GREEN side:

1. **Neutralize every assertion** the row's `Selector` executes — the whole
   assertion expression, including the call an expected-exception check wraps —
   so that no assertion in it can fail, **while the run still builds and still
   executes everything before the assertion**. See **A neutralization that
   still compiles** below: deleting the expression is only the simplest form of
   this, not the rule.
2. Re-run the `RED command` unchanged, and record — in this field, in this
   order — the **strip diff**, then the command and its **passing** output.
3. **Restore immediately.** The stripped test is evidence, not a deliverable; it
   must never appear in the commit.

**Take the diff before the restore.** After it the stripped tree is gone, and a
success line alone is reproducible by a run that skipped the selector, deleted
the test body, moved the expectation to what the code returns, or patched
production code to make the original assertions pass — every one of which
prints the same passing output, and the gatekeeper adjudicates after the
restore. So record it while it exists: the diff of the stripped tree against the
tree the `RED result` was taken on, limited to the row's `Test file` and the
test-owned artifacts it reads. A diff that reaches anything else — production
source, an expected-value fixture, the `Selector` name — is not a strip.
**Nor is one that removes more than the assertions' verdicts.** Emptying the
selector's body takes the call under test out along with them, yet reaches
nothing outside the `Test file`, leaves the `Selector` named and prints the
same passing line — so the diff must leave the call under test, its arguments
and the control flow preceding the assertions standing, exactly as
**A neutralization that still compiles** requires. The
recorded output must also show the row's `Selector` **executing and passing**:
a run that collected nothing, filtered to zero tests or reports the selector
skipped proves nothing about assertions that never ran, exactly as a load error
does.

**Not necessarily by name.** Several runners name the tests they ran only when
they fail: `go test ./pkg -run '^TestFoo$'` prints `--- FAIL: TestFoo` on the
RED and a bare `ok <package>` on the strip, and `-v` is what would add the name.
Adding it is not open — this field requires the `RED command` **unchanged**, and
a differing command is a reject condition of its own — so demanding the name
would REVISE every ordinary Go RED. Where the runner names no test on success,
the command and the output show it together: the `RED command`'s own selector
filter pins which tests could run, and the success line carries no
zero-selected or skipped marker (Go prints `ok <package> [no tests to run]`
when the filter matched nothing). The strip diff closes the rest — a strip that
skipped the selector instead of neutralizing its assertions is visible in it.

One stripped run per RED, so a round that takes a fresh RED takes a fresh one
(`round-evidence.md`) — where a round whose RED was observed before this field
existed is also grandfathered, since its stripped run is no longer takeable. A
`falsifiability` row has no RED pair to strip: its mutation run already answers
the same question, and satisfies this field exactly as it satisfies
`Oracle proof`.

Reject it when the stripped run still **fails** — the failure the row recorded
was then not its assertions, which is the case criterion 4 exists to catch — or
when the recorded command differs from the `RED command`, since a different
command says nothing about this observation, or when the diff or the executed
selector is missing per the paragraph above.

### A neutralization that still compiles

"Delete the assertion" is the correct reading only in a language that tolerates
a local, parameter or import left unused — Python, JavaScript/TypeScript, Ruby.
Where it is a **build** error, deleting `assert.Equal(t, want, got)` leaves
`want`, `got` and the assertion library unused, and Go, Rust under
`deny(warnings)`, or a linted Java build then fails to compile. That failure
is not criterion 4's answer, but the reject condition above reads it as one,
so a perfectly ordinary Go row could never obtain the field at all.

The transformation is defined by what it must preserve, and each language picks
the smallest edit that satisfies it:

- the `RED command` is unchanged and the row's `Selector` still executes;
- everything the assertion's operands do is still evaluated — the call under
  test, its arguments, the fixtures it needs;
- every symbol and import the original test used is still used;
- no assertion in the selector can fail.

So keep the expression and discard the verdict rather than removing the line:
bind the operands to the language's blank or void form, or pass them to the
framework's non-failing observation call (`t.Log`, `console.log`, a bare
expression statement).

**The assertion library is one of those symbols.** In Go,
`assert.Equal(t, want, got)` becomes `_ = want; _ = got; _ = assert.Equal`, and
the last term is not decoration: without it `github.com/stretchr/testify/assert`
is an unused import, which Go rejects at build time, so the strip would be
botched by the very rule below and the row could still not obtain the field.
Any non-failing reference discharges it — `_ = assert.Equal`, or
`t.Log(assert.ObjectsAreEqual(want, got))` where the operands are wanted in the
output — provided nothing in it can fail. The same applies to every other
import the deleted line was the only user of.

For an expected-exception check, keep the wrapped call and drop only the
expectation about what it raises — catching and discarding, where the language
needs the throw handled to keep compiling.

A stripped run that fails to build, collect or resolve is a **botched strip**,
not a criterion-4 failure. Redo it in this form and re-run; do not record the
build error as the stripped result, and do not treat the language as an
exemption from the field.

## When an assertion-level RED is genuinely unobservable

One case is legitimate: the obligation is already satisfied by a sibling row, so
the correct test passes on first run. That is **not** a licence to accept a load
error instead — it is a different path with its own evidence, and it is
specified in `red-not-observable.md`. Record
`Round N: RED failure mode: falsifiability` and follow that procedure.

Never weaken a correct test until it fails in order to manufacture a RED.
