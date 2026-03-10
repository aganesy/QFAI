# 04 Business Rules

## Purpose

- Decompose AC into explicit business rules.
- Every BR must reference one or more AC IDs.

## Rule Table (required)

| BR-ID        | Title                        | AC-Refs                   | Rule                                                                                                                                                              | Notes                    | NFR-Refs          |
| ------------ | ---------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ----------------- |
| BR-0007-0001 | Skill 必須属性               | AC-0007-0001              | 各 Skill カタログエントリは name, purpose, argument-hint, roles, mandatory-outputs の 5 属性を持つこと                                                            | REQ-0001 準拠            | NFR-0101          |
| BR-0007-0002 | Skill 総数                   | AC-0007-0001              | カタログは正確に 9 つの Skill を定義すること（discussion, sdd, atdd, configure, prototyping, verify, tdd-red, tdd-green, tdd-refactor）                           | REQ-0001 準拠            |                   |
| BR-0007-0003 | SSOT 参照原則                | AC-0007-0001              | spec はフレームワーク設計契約を記述し、ランタイム詳細は各 SKILL.md を SSOT とする。spec と SKILL.md の間で矛盾があってはならない                                  | 設計意図の文書化         | NFR-0101,NFR-0102 |
| BR-0007-0004 | メインパイプライン順序       | AC-0007-0002              | Skill 実行順序は configure -.-> discussion → sdd → prototyping(optional) → atdd → verify とする。矢印は依存関係を表す                                             | REQ-0002 準拠            |                   |
| BR-0007-0005 | configure の位置づけ         | AC-0007-0002              | configure は他の Skill の前提条件（soft dependency）であり、初回実行時に暗黙的に呼び出される                                                                      | -.-> は soft dependency  |                   |
| BR-0007-0006 | prototyping のオプショナル性 | AC-0007-0002              | prototyping は sdd と atdd の間に位置するが、スキップ可能（optional）とする                                                                                       | プロジェクト判断で省略可 |                   |
| BR-0007-0007 | 循環依存禁止                 | AC-0007-0002              | Skill 間の依存関係グラフに循環が存在してはならない                                                                                                                | DAG 制約                 |                   |
| BR-0007-0008 | 非推奨 Skill ステータス      | AC-0007-0005              | tdd-red, tdd-green, tdd-refactor は deprecated とし、カタログに deprecation ステータスを明記すること                                                              | REQ-0001 準拠            |                   |
| BR-0007-0009 | 非推奨 Skill 移行先          | AC-0007-0005              | tdd-red/green/refactor の移行先は qfai-atdd とし、移行先を明記すること                                                                                            | AC-0007-0005 準拠        |                   |
| BR-0007-0010 | 完了契約の必須構成要素       | AC-0007-0003              | 各 Skill の Completion Contract は mandatory-artifacts（必須成果物）、oq-exit-condition（OQ exit 条件）、gate-pass-condition（Gate pass 条件）の 3 要素を含むこと | REQ-0003 準拠            |                   |
| BR-0007-0011 | 必須成果物の具体性           | AC-0007-0003              | mandatory-artifacts はファイルパスまたはパスパターンで指定すること                                                                                                | 検証可能性の確保         | NFR-0105          |
| BR-0007-0012 | OQ exit 条件の定義           | AC-0007-0003              | oq-exit-condition は「未解決の Open Question が 0 件」等、定量的に検証可能な条件とすること                                                                        | Gate 通過の前提          |                   |
| BR-0007-0013 | Evidence パス命名規則        | AC-0007-0004              | Evidence ファイルは `.qfai/evidence/<skill>-<id>.md` の命名規則に従うこと                                                                                         | REQ-0004 準拠            | NFR-0105          |
| BR-0007-0014 | Evidence 必須セクション      | AC-0007-0004              | Evidence ファイルは最低限 Summary, Result, Timestamp セクションを含むこと                                                                                         | 構造的一貫性             | NFR-0106          |
| BR-0007-0015 | Evidence gitignore ポリシー  | AC-0007-0004              | `.qfai/evidence/` は .gitignore に含めず、Evidence をバージョン管理対象とすること。ただしプロジェクト判断で除外可能とする                                         | デフォルトは追跡対象     |                   |
| BR-0007-0016 | トレーサビリティ完全性       | AC-0007-0001,AC-0007-0003 | 各 Skill の必須出力は後続 Skill の入力と対応し、パイプライン全体でトレーサビリティが維持されること                                                                | NFR-0106 準拠            | NFR-0106          |
