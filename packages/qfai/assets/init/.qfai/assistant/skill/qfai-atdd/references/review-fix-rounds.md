# Review-fix rounds

A blocking reviewer finding opens a new round for the affected BF or AC
test. Keep the earlier RED or falsifiability observation and the response
that rejected it; append the changed test, revision, command, result and
review response. Do not rewrite a sealed pack or relabel the old result as
current.

After changing an acceptance test or its fixture, verify its oracle again
before requesting review. If the behavior already passes, use the controlled
falsifiability path in `red-provenance.md`. If a production change alone
addressed the finding, rerun the selected test and full relevant suite;
keep the original RED subject and record the new result. Route the
reviewers according to `rule/review-convergence.md` and recompute the
current evidence hash and review-pack seal.
