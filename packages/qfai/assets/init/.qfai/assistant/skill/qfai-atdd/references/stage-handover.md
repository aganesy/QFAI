# ATDD handoff to implementation

`/qfai-atdd` owns BF and AC tests. `/qfai-implement` owns EX tests and
production behavior. A handoff is made per flow after each acceptance test's
RED or falsifiability proof is captured, so implementation can make it pass
without discarding the proof. Do not leave several deliberate failing tests
open across a full-suite checkpoint.

## Handoff entry

Write the entry in `.qfai/evidence/atdd-BF-NNNN.md`. Name the flow, the BF or
AC obligation, test file and selector, its annotation, the exact command and
observed result, test and fixture hashes, and the evidence file path. State whether the branch is observed RED, an already
implemented surface with a falsifiability check, or an unresolved gap. Name
the next production change and any shared artifact another flow reads.

A missing or malformed proof is not repaired by inventing a lifecycle status:
keep the obligation open, record the reason, and return it to the ATDD owner.
