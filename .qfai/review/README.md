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
└── review-YYYYMMDDhhmmssSSS/
    ├── review_request.md
    ├── R01_<reviewer>.md
    ├── R02_<reviewer>.md
    └── summary.json
```

Git ignore management: `review-*/` packs are ignored via the QFAI managed
block in the **repo-root `.gitignore`** (added/updated by `qfai init`).
`.qfai/review/` itself does **not** contain a nested `.gitignore`; the
single managed block in the repo root is the SSOT.

## summary.json (minimum schema; prefer v2.0 for new packs)

> **Accepted schema versions:** the active validator
> (`packages/qfai/src/core/validators/reviewArtifacts.ts`) accepts
> `version: "1.0"` and `version: "2.0"` as `ALLOWED_VERSIONS`. Both
> versions share the top-level envelope (`version`, `created_at`,
> `target: { kind, path }`, `overall_status`) but carry reviewer entries
> under different keys:
>
> - **v1.0** uses a `roster` array of reviewer entries.
> - **v2.0** uses a `reviewers` array plus required `routing_profile`
>   (string) and optional `conditional_reviewers` array. v2.0 is the
>   canonical choice for new packs.
>
> Reviewer entry fields validated in both versions:
> `{ reviewer: string, status: "PASS" | "FAIL" | "NA", feedback_count?: integer }`.
> No future-only keys are required. If `summary.json` drifts from this
> schema, `QFAI-REVIEW-007` fires with the failing field list.
>
> **Verdict vocabulary:** `summary.json` uses `PASS|FAIL` historically (the
> validator above enforces that set). The in-flight reviewer response
> template in `shared-skill-delegation-baseline.md` uses
> `Result: PASS | REVISE` — this is the same concept viewed from two
> angles (reviewer-side verdict vs. serialised summary). A reviewer
> `REVISE` maps to `status: "FAIL"` in summary.json until the validator
> schema is broadened in a future release.

### v1.0 example

```json
{
  "version": "1.0",
  "created_at": "2026-02-18T12:34:56+09:00",
  "target": { "kind": "spec|discussion", "path": "..." },
  "roster": [{ "reviewer": "name-or-id", "status": "PASS|FAIL|NA", "feedback_count": 0 }],
  "overall_status": "PASS|FAIL"
}
```

### v2.0 example (preferred)

```json
{
  "version": "2.0",
  "created_at": "2026-02-18T12:34:56+09:00",
  "target": { "kind": "spec|discussion", "path": "..." },
  "routing_profile": "default",
  "reviewers": [{ "reviewer": "name-or-id", "status": "PASS|FAIL|NA", "feedback_count": 0 }],
  "conditional_reviewers": [],
  "overall_status": "PASS|FAIL"
}
```

Rules:

- Execute only the reviewers routed for the current skill/phase.
- If any reviewer returns `FAIL` (equivalent to `REVISE` in the in-flight
  reviewer response template; see the vocabulary note above), return/fix
  and rerun only failed reviewers and reviewers **affected by the changed scope**.
  - "changed scope" is defined as the set of file paths affected by the latest fix and the scope tags (component, domain, layer, etc.) associated with those files.
  - An "affected reviewer" is any reviewer matching either of the following:
    - Its assigned scope (path prefix or scope tag) in `.qfai/assistant/steering/agent-routing.yml` or `review-profiles.yml` intersects the changed scope.
    - Its routing definition (scope, weight, enabled/disabled) was modified in the diff of the above two files.
  - Procedure for determining rerun targets:
    1. List all added/modified/deleted file paths from the latest change diff.
    2. Resolve the corresponding scope tags, components, and domains via `agent-routing.yml` / `review-profiles.yml` to enumerate the changed scope.
    3. For each reviewer, check whether its assigned scope intersects the changed scope or whether its routing definition was modified; mark matching reviewers as "affected".
    4. Rerun only "previously FAIL reviewers" + "affected reviewers"; carry forward previous results for all others.
- Both `.qfai/report` and `.qfai/review/review-*/` are git-ignored by default
  (managed by `qfai init`). Review packs are therefore local-only unless a
  project opts in by adding explicit negation rules to its `.gitignore` (e.g.
  `!.qfai/review/review-<timestamp>/`) or by archiving packs to an external
  store before cleanup.
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
