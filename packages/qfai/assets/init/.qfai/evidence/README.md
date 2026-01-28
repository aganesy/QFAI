# Evidence

## Purpose

Evidence files record what was executed and who approved completion for each prompt run.

## Naming

- Use `.qfai/evidence/<prompt>-<id>.md`
- `<id>` is the spec id if available (`spec-XXXX`); otherwise use a discuss id or short run id

## What to include

- scope or spec id
- commands executed
- key logs (summary)
- known gaps / exceptions
- completion approval (non-author)

## Rules

- Keep evidence concise and factual.
- Evidence files are gitignored by default via `.qfai/evidence/.gitignore`; do not commit them.
- Do not store secrets.
