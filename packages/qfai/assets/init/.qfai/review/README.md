# review

## Purpose

`.qfai/review/` stores review artifacts as append-only `review-<timestamp>` packs.

Each review pack must include:

- `review_request.md`
- `Rxx_<reviewer>.md` (1 file or more)
- `summary.json`

Routing SSOT:

- `.qfai/assistant/steering/agent-routing.yml`
- `.qfai/assistant/steering/review-profiles.yml`

## Path format

```text
.qfai/review/
├── README.md
└── review-YYYYMMDDhhmmssSSS/
    ├── review_request.md
    ├── R01_<reviewer>.md
    ├── R02_<reviewer>.md
    └── summary.json
```

## summary.json (minimum schema)

```json
{
  "version": "2.0",
  "created_at": "2026-02-18T12:34:56+09:00",
  "target": { "kind": "spec|require|discussion", "path": "..." },
  "routing_profile": "default",
  "reviewers": [{ "reviewer": "name-or-id", "status": "PASS|FAIL", "feedback_count": 0 }],
  "conditional_reviewers": [],
  "overall_status": "PASS|FAIL"
}
```

Rules:

- Execute only the reviewers routed for the current skill/phase.
- If any reviewer returns `FAIL`, return/fix and rerun only failed reviewers and reviewers **affected by the changed scope**.
  - "changed scope" is defined as the set of file paths affected by the latest fix and the scope tags (component, domain, layer, etc.) associated with those files.
  - An "affected reviewer" is any reviewer matching either of the following:
    - Its assigned scope (path prefix or scope tag) in `.qfai/assistant/steering/agent-routing.yml` or `review-profiles.yml` intersects the changed scope.
    - Its routing definition (scope, weight, enabled/disabled) was modified in the diff of the above two files.
  - Procedure for determining rerun targets:
    1. List all added/modified/deleted file paths from the latest change diff.
    2. Resolve the corresponding scope tags, components, and domains via `agent-routing.yml` / `review-profiles.yml` to enumerate the changed scope.
    3. For each reviewer, check whether its assigned scope intersects the changed scope or whether its routing definition was modified; mark matching reviewers as "affected".
    4. Rerun only "previously FAIL reviewers" + "affected reviewers"; carry forward previous results for all others.
- Validation evidence for each review pack must archive the latest
  `.qfai/report/validate.log` and ATDD traceability report
  (`.qfai/report/atdd-traceability/summary.{json,md}`) by copying them from
  `.qfai/report` into the corresponding `review-*/evidence/` directory
  (since `.qfai/report` may be git-ignored).
- Reviewers must confirm no unresolved ATDD hard gates (`QFAI-ATDD-101/102/103/111/112/113/121/122`).

## Prototyping review quick checklist

When prototyping-related findings exist (`QFAI-PROT-*`), inspect in this order:

1. `.qfai/contracts/ui/*.yaml`
2. `.qfai/evidence/prototyping.json`
3. Implementation files for the route/component

Diagnosis flow:

1. Read validator `code/rule/refs` and capture `contract_id` + `route`.
2. Check required `elements[].label` and `actions[]` in the contract.
3. Verify `uiFidelity.screens[]` coverage and that `mockPaths` contains only negative findings (`fail|finding`).
4. Confirm UI renders labels or has stable `data-qfai` markers before resolving the review thread.
