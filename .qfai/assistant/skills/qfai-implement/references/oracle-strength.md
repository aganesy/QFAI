# Oracle Strength

Whether a passing test's pass **depends on the behaviour the item owns**.

Nothing in qfai asked this until completion item 5. Before it, the gate and the
per-item evidence contract recorded a command that failed and a command that
passed, and GREEN was measured as `exit code == 0`. Downstream, ATDD coverage was
annotation presence, the strongest content check on a `done` row was that the
test file exists, and the Coverage Depth Matrix counted **case categories**,
never oracle strength — so a test that cannot fail cleared RED, GREEN, refactor,
all completion points, `QFAI-ATDD-111/112/113` and `npx qfai validate`. Item 5
and the `Oracle proof` field below are what close that hole.

## `Oracle proof` — the evidence field

Per item, alongside the RED/GREEN pair:

1. Name the **smallest production change** that makes this item's test fail
   again — one line, in the code the item owns.
2. Apply it, run the row's `Selector`, and record the command and its **failing**
   output.
3. **Revert immediately.** The mutation is evidence, not a deliverable; it must
   never appear in the commit.

One mutation per item. It is the only evidence that separates a discriminating
test from a vacuous one, and it costs one run.

A row on the _RED not observable_ path already carries
`Falsifiability command` / `Falsifiability result`, which is the same proof by
the same method. That satisfies `Oracle proof`; do not do it twice.

## Reject an `Oracle proof` when

- the mutation is outside the code the item owns — breaking a shared helper
  proves the helper is used, not that this test discriminates. **On a _RED not
  observable_ row the predicate `Satisfied-by` names is the owned code for this
  check**: that row's mutation is a sibling's predicate by construction, so read
  literally this criterion rejected every correctly executed trio — on any
  `Layer` — and `red-not-observable.md` forbids sending that case to
  `exception`. Anything else is still out of bounds;
- the mutation is a syntax error, a thrown "not implemented", or a deleted
  export — that is a load failure, the same non-observation
  `red-admissibility.md` rejects for RED;
- the failing output names a different selector than the row's;
- the recorded command differs from the `GREEN command`. Proving a different
  test discriminates says nothing about this one.

## Weak-oracle shapes to look for

These are the failure modes seen in the wild. Each clears an exit-code-only
GREEN, which is what `Oracle proof` is checked against.

- **Truthiness where the value is available.** `expect(result).toBeTruthy()` when
  the boundary's own value is in hand. Assert the value.
- **Round-tripping the fixture's own helper.** Comparing a stored value against
  the same function that wrote it: the assertion holds for every implementation
  of the function, including a wrong one.
- **Loops over a collection that is empty by construction.** A `for` over a
  filtered set that no fixture can populate asserts nothing, and reports as a
  pass.
- **Observations the transport discards.** Asserting on a field the client
  strips, or a log the harness swallows, is an assertion against nothing.
- **Assertions on the mock.** Verifying that a stub was called with what the
  test just passed it re-states the test's own input.

## The equivalent-mutant case

Sometimes no mutation can be found because the **upstream contract is weaker
than the obligation** — every implementation the contract permits passes the
test, so the test cannot discriminate without asserting something upstream never
promised.

That is not an implementer defect and must not be worked around by strengthening
the assertion past the contract: doing so encodes a reviewer-originated
obligation in a hard assertion, which
`.qfai/assistant/constitution/drift-protocol.md#reviewer-originated-obligations` forbids in
exactly those terms.

The route:

1. Record `Oracle proof: equivalent-mutant`, naming the contract clause that is
   weaker than the obligation.
2. Raise it as an advisory / Change Request per
   `.qfai/assistant/constitution/drift-protocol.md#when-drift-is-detected`. `/qfai-sdd` owns closing it, by
   tightening the contract.
3. The row may reach `done` against its existing obligation with the advisory
   recorded — the gap is upstream, and blocking the implementer on a finding
   they are forbidden to act on would be a deadlock, not a gate.
