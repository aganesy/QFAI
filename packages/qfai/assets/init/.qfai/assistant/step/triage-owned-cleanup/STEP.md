---
name: triage-owned-cleanup
owner: qfai-triage
purpose: "Remove explicitly authorized, current-task temporary directories inside this repository, then verify their absence without changing tracked files or the index."
requires: []
roles: [devops-ci-engineer]
routing-profile: default
---

# triage-owned-cleanup

This step carries out an authorized cleanup of specific temporary directories
the current task owns. It is not a general filesystem executor. The planner
only names this step; it never deletes anything.

## Reads

- The user's current request or standing instruction authorizing these exact
  cleanup targets, and evidence that the current task created and owns them.
- The repository's temporary-files and action-reversibility rules, the
  allowed repository-local temporary root and the actual directory contents.
- The tracked-file contents and index state before any deletion.

## Procedure

1. Record the exact targets and the authority that covers deleting them.
   Empty artifacts, ignored paths and an available tool are not authority.
   No tracked deliverable may still need files in a target. Host-managed
   scratch directories and external paths are outside this step.
2. Complete the entire preflight for every target before deleting any:
   - Resolve its absolute path and the allowed repository-local temporary
     root. Confirm the target is a specific directory beneath that root,
     never the temporary root itself, the workspace root or Git metadata.
   - Verify that Git ignores the target and its contents, and no tracked file
     or tracked directory entry sits inside it. Do not change ignore rules.
   - Verify the required host deletion permissions for every target, its
     descendants and their containing directories before the first deletion.
     Use only host-allowed read-only permission inspection. User authority,
     read access and available tools are not proof of deletion permission.
     Missing or unknown permission stops the entire cleanup without deleting
     any target. Do not change permissions or elevate privileges to proceed.
   - Inspect every descendant and every path component. Allow only ordinary
     directories and regular files. Reject symbolic links, junctions,
     reparse points, nested repositories and special entries; stop if the host
     cannot establish these facts.
   - Verify current-task ownership of every entry and that no process, other
     task or pending operation uses it. Unknown ownership or use stops the
     cleanup; do not terminate processes to make a target removable.
   - Capture enough native filesystem identity and contents information to
     detect replacement, additions or other changes before each deletion.
     Snapshot tracked contents and the index separately, without exposing
     their contents in the receipt.
3. Recheck each target against that preflight immediately before deleting it.
   Stop if its path, identity, contents or permissions changed, or any fact is unknown.
   Use the host's allowed native operation with literal absolute paths in one
   shell. Never pass enumerated paths to another shell, follow links, disable
   a guard, elevate privileges or use another tool to bypass a host denial.
4. Delete only the approved targets. A denial before deletion leaves every
   target untouched. A failure after deletion began stops further work and
   records what was removed, what remains and what could not be confirmed.
   Do not claim rollback or completed cleanup after a partial failure.
5. Verify the exact targets are absent and that tracked contents and the index
   still match their starting state. If any check fails or cannot run, report
   cleanup unfinished with the evidence and remaining targets. Do not record
   `cleaned` or start the closing step as if cleanup succeeded.

This step runs no SDD, repository-wide gate, commit, push or other operation.
A broader cleanup or a tracked change needs its own request. An unavailable
tool or permission does not turn this step into a hand-off operation.

## What it writes

- No tracked file or index entry. Only the authorized ignored temporary
  directories are removed.
- A receipt in the stage report: authority, ownership evidence, exact
  targets, preflight observations, deletion results, absence checks and
  tracked-content and index comparison results. Keep secrets out of it.
- Any ignored receipt file stays outside the deletion targets and is named
  in `artifactRefs`, not `changedFiles`.

## Gate

Every exact target is confirmed absent, tracked contents and the index are
unchanged, and the receipt records the evidence. Missing authority, uncertain
ownership, unsafe paths, host denial or partial failure leaves cleanup
unfinished. Only a completed gate permits the `cleaned` closure.
