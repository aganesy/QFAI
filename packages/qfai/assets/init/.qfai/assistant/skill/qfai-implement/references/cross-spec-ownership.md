# Cross Flow Ownership

## When to check

Before changing a shared production module, test helper, fixture, contract, or package asset, search the story tree for other flows that cite or consume it. Include transitive readers where the changed output is a public or persisted contract. Record the exact paths and flow IDs in the current example evidence.

Do not use filename similarity as the only ownership signal. Follow imports, contract references, test fixtures, and call sites. A flow that merely happens to contain the same word is not a dependent flow.

## Finding the dependents

Search from the changed files outward, not from the flows inward:

1. List the changed files against the base branch.
2. For each one, find the test files that reach it: static imports and
   re-exports, followed importer by importer until a test file is reached, and
   literal paths a test or fixture loader reads.
3. Read the `QFAI:BF-`, `QFAI:AC-` and `QFAI:EX-` annotations in those test
   files. Their IDs name the dependent flows.

Record each changed file, the test files that reach it and the flows they name.

## When the search cannot finish

Some edges cannot be followed by reading: an import whose path is computed, fixtures loaded by a glob, an asset read
by a path built at run time. Where one is left, the dependent set is unknown, not empty.

Record each such edge with its file and the reason it could not be followed. Then run the full test suite once on the
integrated tree and record its command and result, in place of the per-flow reruns that edge would have needed. Do not
report the search as complete while an edge is unresolved.

## Revalidation

Run the changed example selector and the relevant tests of each dependent flow against the integrated tree. Run the scoped validation gate for each affected BF ID. Ask implementation-reviewer to judge any changed obligation and shared-code risk. A flow whose assertions or contract moved needs its own new evidence and review.

Where the edit changes an upstream rule or contract, use the drift protocol before implementation. This check authorizes inspection and revalidation; it does not authorize a downstream stage to rewrite the story tree.
