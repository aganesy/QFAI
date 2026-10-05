# Cross Flow Ownership

## When to check

Before changing a shared production module, test helper, fixture, contract, or package asset, search the story tree for other flows that cite or consume it. Include transitive readers where the changed output is a public or persisted contract. Record the exact paths and flow IDs in the current example evidence.

Do not use filename similarity as the only ownership signal. Follow imports, contract references, test fixtures, and call sites. A flow that merely happens to contain the same word is not a dependent flow.

## Finding the dependents

Search from the changed files outward, not from the flows inward:

1. Start from the files the step plans to edit. After the edit, reconcile that
   list with the files changed since the branch diverged from the configured
   base branch (the three-dot comparison, so a file changed only on the base
   branch is not counted). List a renamed file under both its old and new path.
   If the comparison cannot be computed (a shallow clone, a missing base ref,
   an exported tree), the changed set is unknown: say so and treat the search
   as unresolved. Never read that failure as an empty list.
2. For a changed contract, read the `Examples` citations of its rules. Each
   cited EX ID names a flow.
3. For every other changed file, find its readers: static imports and
   re-exports, followed importer by importer, and literal paths that a
   production module, test or fixture loader reads. Continue through a runtime
   entrypoint (a command line, an HTTP route, a spawned process) that a test
   invokes by a literal name. Follow each chain until a test file is reached.
4. Read the `QFAI:BF-`, `QFAI:AC-` and `QFAI:EX-` annotations in those test
   files. A BF annotation names the flow. An AC or EX annotation names it
   through its first four-digit segment: `AC-0007-0002-01` and
   `EX-0007-0002-03` both give `BF-0007`. Deduplicate the flows.

Record each changed file, the readers or tests that reach it and the flows they
name.

## When the search cannot finish

Some edges cannot be followed by reading: an import whose path is computed,
fixtures loaded by a glob, an asset read by a path built at run time, an
entrypoint reached by a computed name. Where one is left:
the dependent set is unknown, not empty.

Record each such edge with its file and the reason it could not be followed, as
an unresolved cross-flow obligation. The flows it may touch keep their evidence
until the consumers are identified and each one is revalidated below. Run the
full test suite once on the integrated tree as an additional check, and record
its command and result. A passing suite does not replace the per-flow
revalidation and does not make a stale proof current. Do not report the search
as complete while an edge is unresolved.

## Revalidation

Run the changed example selector and the relevant tests of each dependent flow against the integrated tree. Run the scoped validation gate for each affected BF ID. Ask implementation-reviewer to judge any changed obligation and shared-code risk. A flow whose assertions or contract moved needs its own new evidence and review.

Where the edit changes an upstream rule or contract, use the drift protocol before implementation. This check authorizes inspection and revalidation; it does not authorize a downstream stage to rewrite the story tree.
