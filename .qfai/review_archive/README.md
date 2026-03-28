# review_archive

## Purpose

`.qfai/review_archive/` stores archived review packs that have been moved out of `.qfai/review/`.

## Version control policy

Review archive artifacts are **not versioned by default**.
The `.gitignore` in this directory excludes all archived review packs.
Only `.gitignore` and `README.md` are tracked.

## Path format

```text
.qfai/review_archive/
├── .gitignore
├── README.md
└── review-YYYYMMDDhhmmssSSS/
    ├── review_request.md
    ├── R01_<reviewer>.md
    ├── R02_<reviewer>.md
    └── summary.json
```

## Rules

- Archived packs follow the same structure as `.qfai/review/` packs.
- Moving a review pack here removes it from active validation scope.
- Archived packs are retained for audit and traceability.
