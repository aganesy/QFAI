# A `review-fix` row comes back here for a new RED

`/qfai-implement` Phase Red step 3b sends a `review-fix` row back when the
blocking reviewer's REVISE asks for a change to the acceptance test itself: an
acceptance test is **this** skill's owned artifact and is never edited there
(that skill's Non-goals), whatever `agent-routing.yml` routes into any
`qfai-implement` phase — the rule is ownership, not who happens to be
available, so it survives a routing change. The three branches above define the
**first** handoff of a `todo` row, so this one needs its own contract.

- **Invocation.** Named by `TDD-ID`, with the reviewer's REVISE and its round
  number. The row stays at `review-fix` throughout — this stage writes no
  ledger cell, and `review-fix -> red` is not a transition.
- **What this stage does.** Correct the test the REVISE names, then **run it and
  let the result choose the path** — the same first-run check branch 1 makes,
  for the same reason.
  - **It fails.** Take that as the fresh RED, exactly as branch 1 does: record
    the pair, the `RED revision` and the `RED test hash`, and get
    `qa-gatekeeper` PASS on that run.
  - **It passes.** Many REVISEs ask for no new behaviour at all — splitting a
    selector, renaming a test, making an expectation explicit — so the corrected
    test passes on the first run and there is no RED to take. Demanding one
    stranded the row at `review-fix`. Record the run and its revision, and
    take the **no-new-behaviour path** of
    `../../qfai-implement/references/round-evidence.md`: no round is opened, and
    the row returns on that basis.

    **A changed test invalidates the proof — on either branch.** A row whose
    branch was `falsifiability` carries a proof taken against the _old_ test, and
    Phase Green step 2a skips the mutation on a RED-not-observable row as
    already taken, so a fresh RED on the corrected test would go to re-review
    without anyone checking that it still fails when the predicate breaks. Mark
    the recorded proof `stale — test replaced` whenever this stage changed the
    test, whichever branch follows, and `/qfai-implement` re-takes it under the
    corrected selector before the GREEN.

    **Name the new identity in the handback — on either branch.** A REVISE
    can ask for real behaviour _and_ a split selector at once, so the failing
    branch moves the row too; the rule below is not about whether a RED came
    out of it. Splitting a selector or
    renaming a test changes the row's `Selector` or `Test file`, and this stage
    does not write the ledger — so leaving them is a ledger that cannot run the
    corrected test, and letting `/qfai-implement` update the ledger alone leaves
    the evidence entry's identity copy disagreeing with it, which gate item 10
    fails by construction. Hand back the new values; `/qfai-implement` writes
    them to **both** the ledger and the entry's copy before the re-review, so
    the check compares two updated values rather than one.

    **Re-address the test.** The REVISE changed the test, so the `RED test hash`
    recorded at handoff still addresses the manifest before the edit, and the
    consumer checks it against the current one before the reviews
    (`../../qfai-implement/SKILL.md`, the field contract) — a mismatch is sent
    back here for a fresh RED, which is this same passing no-round path, for
    ever. Recompute the manifest and the hash over the corrected test and
    **replace** the recorded pair, marked `test-only replacement` with the
    reviewer verdict that asked for it. That is what the consumer accepts in
    place of a fresh RED: the reviewer judged that no new production behaviour
    is owed, so there is no RED to take, and the hash's job — telling "the test
    moved under the RED" from "only production changed" — is discharged by
    naming the verdict that moved it.

    **The transient revision moves with it.** `RED revision` on an
    `observed-red` row, and `Falsifiability revision` on a `falsifiability` one,
    address the tree the observation was taken against — which included the
    test as it was. `../../qfai-implement/references/evidence-revision.md` makes a later change to the test
    invalidate exactly that evidence, so leaving them alone either stalls the
    repair for ever or pairs an old observation with a new test hash. The revision of the tree that proof ran against is recorded **by the stage
    that runs it**, in a field of its own — `Replacement proof revision` — and
    **not over `RED revision`**. On an `observed-red` row that RED is the
    natural failure taken before the production code existed, and the round
    block still describes it; overwriting its revision with the tree a later
    mutation ran against made the RED subject hash a pair and a revision from
    two different trees as one observation, and the pre-edit RED then stood as
    evidence for the current test. Mark the field `test-only replacement` with
    the verdict that asked for it and hand it over empty; `/qfai-implement`
    writes the value when it re-takes the proof, exactly as step 3c does on a
    first pass — this stage owns no production mutation, so it cannot know it. Recording it here would
    have named the tree **before** the mutation, which is not what the
    gatekeeper judged. That is
    what ties the replacement to the observation a consumer can check: one
    verdict, one re-taken proof, one revision, one manifest.

    **Re-take the proof as well, on a row that has one.** A new hash over the
    old `Oracle proof` / falsifiability result says only that somebody edited
    the test; it does not say the _edited_ test still fails when the predicate
    `Satisfied-by` names is broken. Clarifying an expectation or splitting a
    selector can weaken an assertion by accident, and the pair would then pass
    the consumer's check with a proof taken against the assertion that is gone.
    So the recorded proof is **stale**, and this stage says so rather than
    re-taking it: the mutation rewrites a production predicate, which is the
    one thing this stage owns no agent for — the paragraph below says exactly
    that about the same operation. Mark the proof `stale — test replaced`
    beside the new manifest and hash, and name it in the handback. Re-running
    the same mutation under the corrected selector, and the GREEN after it,
    happen in `/qfai-implement`'s rework, where the production owners are
    routed and where the fix and the re-review already happen. Production
    behaviour is unchanged — that is what keeps this a no-round path — and this
    is the evidence that the corrected test still discriminates, which no hash
    can carry.

    **Not falsifiability.** That form needs a production mutation, which this
    stage owns no agent for and cannot hand over either: Phase Red step 3b
    excludes a `review-fix` row by name and step 3c is reachable only from a
    `todo` falsifiability entry, so there is nobody to produce the trio and the
    row would sit at `review-fix` again. A REVISE whose repair genuinely needs
    new production behaviour is not this case — that one's corrected test fails,
    and the branch above applies.

- **Where it goes.** A `#### Round N` block **nested inside the row's own
  `### TDD-NNNN` section** under `## Ledger rows advanced` in
  `.qfai/evidence/atdd-<spec-id>.md`, in the shape
  `../../qfai-implement/references/round-evidence.md` defines. One heading
  level below the row, because that nesting is the whole of the attribution:
  written at `###` the block is the row section's _sibling_ and terminates it,
  two rows reworked in one cycle then leave two `### Round 2` blocks with
  nothing tying either to a `### TDD-NNNN`, and the reviewer hashing a
  completion-review subject has to guess which row a block belongs to. Appended
  at the end of the file it is worse than ambiguous: it lands under
  `## Final status`, the one section every audit subject excludes, so the
  rework evidence a second reviewer most needs pinned is covered by no hash at
  all, silently. Not a second `### TDD-NNNN` entry for the same row: that entry
  is the record of a first handoff, and a duplicate of it would read as one.
  The row already has an entry; the round goes inside it.

  **A round this file already holds at `###`.** The contract above said `###`
  until this rule, and a row interrupted mid-rework comes back carrying blocks
  in that shape. Re-nest them under their rows **before** writing this round —
  otherwise the completion reviewer, extracting `#### Round N`, hashes a
  subject that silently omits every earlier round. Stop and report rather than
  guess when two rows could own one:
  `../../qfai-implement/references/round-evidence.md` defines both halves.

  **Which N.** The REVISE closed the round it was given on, so a fresh RED
  opens the **next** one — round `N+1` where `N` is the round the reviewer
  ruled on. Writing it into the reviewer's own round mixed the original
  cycle and the rework into one block, and then no reader could tell which
  RED/GREEN pair the next reviewer audited. The no-round path above opens
  none, so it leaves the numbering where it is. Name the number in the
  handback either way.

- **Handing back.** Return to `/qfai-implement` naming the round. The
  production fix and the re-review happen there, and the row leaves
  `review-fix` by that skill's own path. **A proof marked
  `stale — test replaced` is part of that handback**: the mutation is re-run
  under the corrected selector there, before the re-review.

A REVISE that does **not** touch the acceptance test never reaches this stage;
it is production rework and stays where it is.
