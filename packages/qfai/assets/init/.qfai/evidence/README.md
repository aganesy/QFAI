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

- `.qfai/evidence/<prompt>-<run-id>.md`
- `<run-id>`: prefer `spec-XXXX` when applicable.

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
