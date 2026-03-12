# 10_Policy

## Security Policy

該当なし（本 discussion は spec ドキュメントの補完であり、実装やランタイムに影響しない）

## Compliance Policy

| ID    | Policy                                                               | Notes                                |
| ----- | -------------------------------------------------------------------- | ------------------------------------ |
| CP-01 | Layered Spec Architecture の Reference Direction Rule を遵守する     | spec-0009 AC-0009-0007, AC-0009-0008 |
| CP-02 | \_policies 層に spec レベルの詳細（US/AC/BR/EX/TC ID）を持ち込まない | spec-0009 AC-0009-0006               |
| CP-03 | Discussion outputs は spec SSOT と重複しない                         | .qfai/discussion/README.md ルール    |

## Quality Policy

| ID    | Policy                                                  | Notes                |
| ----- | ------------------------------------------------------- | -------------------- |
| QP-01 | 全 REQ は SRC（04_Sources.md）にトレース可能であること  | トレーサビリティ要件 |
| QP-02 | Review Gate は review-roster.yml の全10名を実行すること | RCP Footer ルール    |
| QP-03 | 変更は最小限とし、既存の品質を劣化させない              | NFR-0003             |
