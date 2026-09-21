---
name: "pr-merge"
description: "Final check and merge of a pull request into main after the `pr-fix` handoff, in a repo with the GitHub CLI and PowerShell. It never creates or pushes a tag."
---

# pr-merge

This skill takes a pull request from the `pr-fix` handoff to a merge into
`main`. It does not tag. `tag-release.yml` pushes `vX.Y.Z` when a release commit
reaches `main`, so no merge here needs a tag and none is offered.

## Read first

- `tmp/pr-fix/pr-<PR number>-handoff.json`, if present

## First run

Always start with a dry run.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .agents/skills/pr-merge/scripts/run-pr-merge.ps1 -PrNumber <PR number> -DryRun
```

The dry run writes `tmp/pr-merge/pr-<PR number>-merge-plan.json`.

## Merge

1. When the dry run reports no blocker, run the merge.

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .agents/skills/pr-merge/scripts/run-pr-merge.ps1 -PrNumber <PR number>
   ```

2. Add `-MergeMethod merge|squash|rebase` only when a method was named. The
   default is `merge`.
3. On success, read `tmp/pr-merge/pr-<PR number>-merge-result.json` and report
   the result.

## Stop conditions

- `gh auth status` fails
- The working tree is dirty
- The pull request's base is not `main`
- The pull request is a draft, closed or merged
- An unresolved review thread remains
- A CI check is not green
- The live PR body lacks an authored removal-list answer. Check it again
  immediately before merging, even when a handoff exists.

## Notes

- The script runs from the live pull request state without a handoff, but reads
  the handoff JSON when one exists.
- Unresolved review threads are counted across every page, following the
  GraphQL `after` cursor, rather than from the first 100.
