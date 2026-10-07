# Gate Failure Autorepair

Read when a gate fails.

## Gate Failure Autorepair Protocol

Follow this protocol when any of the validate, doctor, test, lint, typecheck, build, capture, or report gates fail. A reviewer's `REVISE` is not a gate failure and is not rerun: the author fixes or answers each finding once, as `.qfai/assistant/rule/review-convergence.md` sets out.

- inspect exit code, logs, `validate.json`, and cited files before reporting — in `validate.json`, read `counts` for the verdict and `issues[].code` for each finding; the array is `issues`, not `findings` (keys: `.qfai/assistant/skill/qfai-verify/references/validate-json-schema.md`);
- classify each finding as skill-owned artifact, upstream spec/contract, code/test defect, environment/tooling, or user decision;
- fix skill-owned artifacts and code/test defects autonomously when the fix is local and non-destructive;
- **upstream spec/contract findings: never repair.** STOP and follow `.qfai/assistant/rule/drift-protocol.md` (Change Request + owner-skill rerun) — **even when the fix looks local and non-destructive, and even when it is one token and obviously correct**. "Local and non-destructive" is a permission for the two classes above it; it is not a test that upstream artifacts can pass.
  Ownership, not size, decides;
- environment/tooling findings: repair the environment when it is yours to repair (install a missing dev dependency, regenerate a lockfile, create a scratch directory). Stop for anything needing credentials, network access you do not have, or a change to CI configuration or the host machine;
- user decision findings: never decide by default. Record the question, state the option you would take and why, and stop — a decision taken silently to keep a gate green is the same failure as repairing upstream, one layer up;
- rerun the same failing gate after each fix batch, **and once with no intervening change** when the failure looks nondeterministic — see `#nondeterministic-gates` below. The confirmation rerun is bounded at one: after it the finding is classified, not re-rolled;
- do not weaken profiles, lower `--fail-on`, waive errors, invent evidence, or skip required reviewers;
- stop for destructive changes, **any upstream spec/contract finding**, ambiguous product/spec decisions, missing permissions/tools, or repeated no-progress failures — the stop list is closed over the classification above, so every class the agent is told to use has a defined next action;

When stopping, report: cause, attempted fixes, remaining blocker, user action, retry gate, and **the work counts — how many items are complete, how many are blocked, and by which finding**.

The counts are not decoration. Restating the ownership rule does not change the incentive that breaks it: an agent facing "repair five upstream defects or report most of the batch as blocked" reaches for the repair because the alternative reads as failure. `26 items: 21 complete, 5 blocked on DB-0007` is a report of work done, and it is what makes STOP a credible answer rather than a
surrender. Blocked is a status, not a verdict on the run.

### Nondeterministic gates

A gate whose answer varies on identical inputs is a finding in its own right, not a run to discard. The protocol classifies it as `environment/tooling`; what follows is what that class obliges.

**When a gate fails and a rerun with no intervening change passes**, all of the following are REQUIRED. A clean rerun on its own is not evidence for that gate.

- **Record it as an `environment/tooling` finding.** Not as a pass, and not as a code/test defect — nothing was fixed between the two runs.
- **Disclose every run.** Report the results of all runs of that gate, in order, with their commands. Reporting only the run that passed is [selective reporting](#selective-reporting-is-invented-evidence) and is forbidden: the evidence rules are satisfied by a clean run's command and output, so nothing else stops it.
- **Re-run the failing selectors in isolation** and report that result too. A selector that passes alone and fails in the suite is the signature of shared state, not of a defect in that test.
- **Name the suspected cause**, concretely: a contended port, a shared database or schema, an `os.tmpdir()` path, an un-namespaced cache or queue, ordering between workers. "Flaky" is not a cause.

Do not fix the flake by rerunning until green, and do not fix it by weakening the test. Either the shared resource is isolated per worker or the run is serialised — both are real changes with a real cost, which is the point.

A gate reported this way has **not passed**. It is a blocker with a named cause, and it goes in the stop report like any other.

#### Selective reporting is invented evidence

Reporting the clean run and omitting the red ones satisfies every existing evidence rule — a real command, a real result, freshly obtained — and still misrepresents what happened. Which of N runs is reported is itself part of the evidence, so omitting runs of the same gate is on the same footing as inventing one.
