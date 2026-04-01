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
  - 「changed scope」は、直近の修正によって影響を受けたファイルパスおよびそのファイルに紐づくスコープタグ（コンポーネント名、ドメイン、レイヤー等）の集合と定義する。
  - 「affected reviewer」は、次のいずれかに該当する reviewer：
    - `.qfai/assistant/steering/agent-routing.yml` または `review-profiles.yml` 上で、担当スコープ（パスプレフィックスやスコープタグ）が changed scope と交差している reviewer
    - 上記 2 ファイルの diff において、担当スコープ・重み・有効/無効設定など routing 定義が変更された reviewer
  - 再実行対象の決め方：
    1. 直近の変更差分から追加/変更/削除されたファイルパスの一覧を取得する。
    2. そのファイルパスに対応するスコープタグを `agent-routing.yml` / `review-profiles.yml` から洗い出し changed scope を列挙する。
    3. 各 reviewer について担当スコープと changed scope の交差有無および routing 定義の差分有無を確認し、該当する reviewer を affected reviewer としてマークする。
    4. 再実行時は「前回 FAIL だった reviewer」＋「affected reviewer」のみを rerun 対象とし、それ以外は前回結果を引き継ぐ。
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
