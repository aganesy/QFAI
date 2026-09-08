# review_archive

## Purpose

`.qfai/review_archive/` stores archived review packs that have been moved out of `.qfai/review/`.

## Version control policy

A pack archived here is **not tracked**. The `.gitignore` in this directory
ignores everything but itself and this file.

The packs already in the index are the exception, and they stay there as a
historical record. An ignore rule decides what git picks up next; it does not
remove a path the index already holds. So both states sit side by side:
`git ls-files` lists those packs, and a pack archived today is ignored.

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
