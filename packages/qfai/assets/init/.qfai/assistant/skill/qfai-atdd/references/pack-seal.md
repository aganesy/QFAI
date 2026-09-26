# ATDD review seal

Before reporting completion, recompute the audited hash of the current
`.qfai/evidence/atdd-BF-NNNN.md` and
`.qfai/evidence/coverage-depth-BF-NNNN.md` subjects that the completion
reviewer read. Recompute the review pack's seal as
`rule/audited-evidence-hash.md` and the shared reviewer response template
define. Record both values outside the sealed pack in the ATDD evidence
file's final-status section.

A mismatch means evidence moved after the reviewer verdict. Request a fresh
review of the current subject. A passing validation command does not
replace this check.
