# prompts.local

## Purpose

Allow minimal overrides of canonical prompts when project-specific constraints cannot be captured in steering.

## Rules

- Keep diffs minimal and focused.
- File name must match the canonical prompt name.
- Do not copy the full canonical prompt into this folder.

## Structure

```text
prompts.local/
  README.md
  <prompt>.md
```

## Override template (excerpt)

```md
# Override: <prompt>

## Delta

- <what changes>

## Rationale

- <why steering cannot cover this>
```

## Checklist

- [ ] Override is strictly necessary
- [ ] Steering cannot express the constraint
- [ ] The change does not conflict with validation/verification gates
