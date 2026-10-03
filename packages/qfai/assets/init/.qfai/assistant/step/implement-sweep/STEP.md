---
name: implement-sweep
owner: qfai-implement
purpose: "Run a widened check over the whole tree and either fix each new finding or record it in the check's baseline with its reason."
requires:
  - common-steering-refresh
  - common-gate-run
  - common-evidence-record
roles:
  - devops-ci-engineer
  - frontend-engineer
  - backend-engineer
  - implementation-reviewer
  - qa-gatekeeper
routing-profile: implementation-heavy
---

# implement-sweep

A check missed cases, or a needed check was absent. `implement-tdd` has just
widened it or added it. This step runs it over everything it now covers and
deals with what it finds.

## Passes when

Read first: the diff of the implement stage. The step passes when that diff
adds or widens no check, such as a repair that only reconciles two declared
surfaces, or when the widened check's result over the whole tree reports no
new hit. The pass names which of the two holds, and the check command and its
result where there is one.

## Reads

- The widened check and the example it was built for.
- The check's baseline or allowlist, where it keeps one.
- The commands of `common-gate-run`.

## Procedure

1. Run the check over the whole tree and list every finding the old check
   did not report.
2. For each finding, decide one of:
   - **fix** — the fix stays inside the run's write areas and changes no
     behaviour a story or contract states;
   - **baseline** — record it in the check's baseline with the reason and the
     owner who will clear it.

   A check with no baseline takes no baseline entry: every finding is fixed.

3. Apply the fixes. Run the check again: it reports nothing outside the
   baseline.
4. Run the relevant suite and the project gates.

## At the decision point

The choice between fix and baseline is this step's decision point.

- Under `gate:user`, put the list of findings, each with the recommended
  choice, to the operator as one question, return `awaiting_input` and change
  nothing. The attempt that holds the answer carries it out.
- Otherwise take the decision and list it in the result's `adopted` as
  `{ step, decision, reason }`.

## What it writes

- The fixes and the baseline entries, listed in `changedFiles`.
- A record of each finding and what was done with it, written with
  `common-evidence-record`.

## Gate

The step is done when the check passes over the whole tree with every
remaining finding in its baseline with a reason, the project gates pass, and
the qa-gatekeeper observed them.
