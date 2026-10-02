# conflict-resolve reference

## Intent analysis matrix

| file path         | ours intent                | theirs intent                          | Spec that must not break          | Integration approach                                    | Verification                         |
| ----------------- | -------------------------- | -------------------------------------- | --------------------------------- | ------------------------------------------------------- | ------------------------------------ |
| `path/to/file.ts` | e.g. adds a new validation | e.g. keeps the existing API compatible | e.g. the existing response format | e.g. merge into a branch that satisfies both conditions | e.g. `npm test -- path/to/file.test` |

## Guide by conflict pattern

### API signature conflicts

- Prefer input and output compatibility of the public API, and let both coexist through overloads or optional arguments where needed.
- If one side needs a breaking change, first list its impact on callers.

### Logic conflicts

- Compare the differences in preconditions, side effects and exception handling, and design merged logic that satisfies both success conditions.
- Removing a conditional branch added by only one side is prohibited. If you judge it unnecessary, record the reason.

### Import conflicts

- Add missing imports, and tidy unused imports with the project's lint/format tools.
- Let the project's formatter sort the import order automatically.

### Rename/delete conflicts

- When a rename and a delete conflict, check how the target is actually used before deciding the migration approach.
- Even when adopting the delete, first verify whether the logic added on the rename side is still needed.

### Generated file conflicts (no hand edits)

- Do not hand-edit generated files. Merge the source, then rerun the code generation tool to resolve the diff.
- Do not adopt `ours` or `theirs` wholesale based only on a generated diff.

## Commit message convention

- Commit: `merge: resolve conflicts with <base-branch>`

## Work report template

```markdown
## Conflicted files

- [path]: [status]

## Intent analysis results

- [path]
  - ours intent:
  - theirs intent:
  - integration approach:
  - why nothing was broken:

## Verification results

- lint/format:
- type check:
- tests:

## Commit and push results

- commit:
- push:
```
