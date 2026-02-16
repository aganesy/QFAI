# review

## Purpose

`review/` stores review gate artifacts per scope/layer attempt.

Artifacts are used to enforce the Review Cycle Protocol (RCP):

- `review_request.md`
- `Rxx_<reviewer>.md`
- `summary.json`

## Path format

```text
review/
└── <scope>/
    └── <layer>/
        └── attempt-<NN>/
            ├── review_request.md
            ├── R01_<reviewer>.md
            ├── R02_<reviewer>.md
            └── summary.json
```

## Rules

- If any feedback exists, the attempt is returned (`changes_requested`).
- Fixes must be recorded in a new attempt (`attempt+1`).
- `fixed` is valid only when all reviewers passed and feedback count is zero.
- Required/optional gates and default reviewers are defined in `.qfai/assistant/steering/review-gate.rules.yml`.
