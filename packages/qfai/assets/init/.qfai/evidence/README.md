# evidence

## Purpose

Evidence files record **what was actually executed** for each custom prompt run:

- commands executed
- relevant logs (summary)
- gaps / exceptions
- reviewer approval

## Version control policy

Evidence is **not versioned by default**.
Recommended approach:

- Add `.qfai/evidence/` to `.gitignore` (project-level), OR
- Add it to `.git/info/exclude` (local only), OR
- Store evidence outside the repository (artifact store, issue attachments).

## Naming

- Summary file: `.qfai/evidence/<prompt>-<run-id>.md`
- Optional artifacts: `.qfai/evidence/<prompt>/<YYYY-MM-DD>/<run-id>/...`
- `<run-id>`: prefer `spec-XXXX` when applicable.

### Prototyping stage required evidence

`/qfai-prototyping` requires fixed filenames:

- `.qfai/evidence/prototyping.md`
- `.qfai/evidence/prototyping.json`

## Minimal content template

```md
# Evidence: <prompt> (<run-id>)

## Scope

- Spec: <SPEC-XXXX or none>
- Branch: <name>
- Commit: <hash>

## Commands executed

- <cmd1>
- <cmd2>

## Results summary

- <what passed / what failed>

## Exceptions / gaps

- <explicit gaps>

## Reviewer approval

- Reviewer: <name/role>
- Approved at: <YYYY-MM-DD>
```

## Checklist

- [ ] Contains executed commands and outcomes.
- [ ] Notes any intentional gaps.
- [ ] Has non-author approval (when required by prompt).
- [ ] Prototyping stage includes both markdown and json evidence files.
