# 09_Constraints

## Technical Constraints

| ID    | Constraint                                                            | Rationale                                                         | Impact                                           |
| ----- | --------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------ |
| TC-01 | Windows で symlink 作成に Developer Mode または管理者権限が必要       | NTFS の symlink はセキュリティ制限により一般ユーザーでは作成不可   | Windows ユーザーの初期セットアップに追加手順が必要 |
| TC-02 | `fs.symlink()` の第3引数 `type` が Windows でのみ必要                | Node.js は Windows で symlink 種別（file/dir/junction）を要求     | プラットフォーム分岐ロジックが必要               |
| TC-03 | Git symlink は相対パスで保存される                                    | 絶対パスは異なるマシンで壊れる                                     | ターゲットは相対パスで指定する必要がある          |
| TC-04 | `.github/agents/` のファイル名規約は `.agent.md` サフィックス         | GitHub Copilot がエージェントとして認識するために必要              | symlink 名とターゲット名が異なる                  |

## Operational Constraints

| ID    | Constraint                                                   | Rationale                                            | Impact                              |
| ----- | ------------------------------------------------------------ | ---------------------------------------------------- | ----------------------------------- |
| OC-01 | `qfai init` は既存プロジェクトでの migration をサポートする  | 既存の QFAI 利用者が新方式に移行する必要がある       | `--force` による旧ファイル prune   |
| OC-02 | `qfai init` は冪等（idempotent）でなければならない           | 複数回実行でもシステム状態が一貫していること          | 既存 symlink の検出と skip ロジック |

## Legal / Compliance Constraints

| ID    | Constraint | Regulation / Standard | Impact |
| ----- | ---------- | --------------------- | ------ |
| LC-01 | なし       | N/A                   | N/A    |

## Budget Constraints

- Budget range: N/A（内部開発）
- Cost drivers: なし

## Timeline Constraints

- Hard deadlines: v1.5.4 リリースに含める
- Milestones: SDD → ATDD → TDD → v1.5.4 リリース
