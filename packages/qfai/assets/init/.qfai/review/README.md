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
  "version": "1.0",
  "created_at": "2026-02-18T12:34:56+09:00",
  "target": { "kind": "spec|require|discussion", "path": "..." },
  "reviewers": [{ "reviewer": "name-or-id", "status": "PASS|FAIL", "feedback_count": 0 }],
  "conditional_reviewers": [],
  "overall_status": "PASS|FAIL"
}
```

Rules:

- Execute only the reviewers routed for the current skill/phase.
- If any reviewer returns `FAIL`, return/fix and rerun only failed reviewers and reviewers affected by the changed scope.
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
3. Verify `uiFidelity.screens[]` coverage and `mockPaths.status=pass`.
4. Confirm UI renders labels or has stable `data-qfai` markers before resolving the review thread.
