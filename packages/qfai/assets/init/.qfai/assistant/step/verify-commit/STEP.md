---
name: verify-commit
owner: qfai-verify
purpose: "Commit the authorized tracked changes after verification is recorded, keeping pending CI visible."
requires: []
roles: [orchestrator]
routing-profile: default
---

# verify-commit

The last step of a change route. It records the run's work as a local commit.

## Reads

- The verify results in the stage report.
- The paths the run wrote, as its stage reports name them.
- The project's commit message convention, where it states one.
- `.agents/rules/action-reversibility.md`, before an action that deletes, pushes, publishes or
  is visible to others.

## Writes

- One commit on the current branch holding the run's changes.
- In the final report: the commit, and the files it holds.

A local commit records work; it does not establish formal verification. Push,
pull request creation and merge each need a user instruction or project policy
covering that action, target and scope. Commit authority alone covers none of them.

## Procedure

1. Stop at an ordinary FAIL or UNRUN, and say which gate. A gate that
   fails the same way on the base commit is still a failed gate: the final
   report names its baseline, and the commit waits for the user's instruction.
   The existing pending-CI allowance applies only when the project declares
   the gate `CI only: <check name>` and a user instruction or project policy
   covers the verification commit and its paths. Record it `DELEGATED`, name
   the actual check, and retain its pending state. A gate
   recorded `DELEGATED` does not stop the commit while its named CI check
   is pending under that authority. This permits that commit, not a
   verification-complete claim.
   Every nondelegated gate must pass.
   A delegated red check stops transport of the same unchanged candidate.
   Under explicit CI-only delegation covering the transport commit, the
   existing planned fix may produce actual changes addressing that failure.
   Commit those changes to obtain the new candidate's CI result even while
   HEAD still names the failed commit. Preserve the prior head, check, run and
   observed result as FAIL; never relabel that evidence pending. Report the
   actual fix and, after the commit, its new head and resume condition. No run
   yet means no result, and the new candidate remains unverified until its own
   CI results are observed. This exception covers neither an ordinary FAIL or
   UNRUN nor a locally runnable gate delegated merely to avoid running it.
2. Stage exactly the authorized tracked deliverables the run wrote, with
   `git add <those paths>`. Never `git add -A`, `git add .` or `git add -f`,
   and never a file git ignores, such as `.qfai/report/*`. A file that was
   already modified before the run and then written by it is committed whole;
   the final report names it. In the `resolve-conflicts` route, first confirm
   that the combined diff in the stage report passed the added-line check, then
   stage the resolved paths and conclude the merge in progress with
   `git commit` and a message that names the base and each renumber as
   old → new. The commit then also holds the base's changes. Record
   `git show --remerge-diff` of that commit in the stage report. A check that
   fails after the commit undoes it with `git reset --merge ORIG_HEAD`, which is
   allowed before a push, and the run stops.
3. Commit with a message in the project's convention that says what changed
   and why.
4. Where a commit hook refuses the commit, fix the cause and commit again.
   Never skip the hook. When the fix changes code or tests, rerun the verify
   gates first, and the code review too when behaviour changed.

## Completion after CI

Before formal verification completion or merge, every required check must have
actual passing evidence for the current target and head. Pending, missing,
mismatched or red evidence stops completion; repair needs its own covered authority.
The verification commit and pending report satisfy this step's gate while CI waits.

## Gate

- The commit exists and holds exactly the tracked deliverables the run wrote,
  or, in the `resolve-conflicts` route, the merge the run concluded.
- Pending CI is named in the report with the target, current head, run ID or URL
  when available, check, observed outcome and counts, blocker and resume condition.
  If no run exists, say so; invent no run ID or result.
- Nothing was pushed, and no pull request or merge was made by this step,
  except concluding the merge in progress of the `resolve-conflicts` route.
