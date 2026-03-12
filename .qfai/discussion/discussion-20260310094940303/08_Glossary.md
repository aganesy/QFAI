# 08_Glossary

## Terms

| Term                      | Definition                                                                               | Context            |
| ------------------------- | ---------------------------------------------------------------------------------------- | ------------------ |
| GAP                       | 監査で特定された spec の不足箇所。GAP-01〜GAP-07 の7件                                   | 本 discussion 固有 |
| Validator                 | spec-0002 で定義される検証ルール。33+ 件が存在し、フェーズ別に実行される                 | CAP-0002           |
| Phase                     | バリデータの実行タイミング区分: full, atdd, tdd, refinement                              | spec-0002          |
| Guardrail Format          | spec-0005 のスキャナが検出対象とする Markdown 構造の仕様                                 | CAP-0005           |
| i18n                      | 国際化（Internationalization）。spec-0004 では NFR-0041 として日本語メッセージ対応を要求 | CAP-0004           |
| Schema Versioning         | validate.json の出力スキーマにバージョンフィールドを付与し、後方互換性を管理する方式     | CAP-0003           |
| Cross-reference           | spec 間の相互参照。依存関係の明示に使用                                                  | spec-0007/0008     |
| L-struct                  | フレームワーク設計 spec（CAP-0007〜0010）のテストレベル。構造的妥当性を検証する          | spec-0007〜0010    |
| Layered Spec Architecture | \_policies/ + spec-XXXX/ の2層構造。spec-0009 で定義                                     | 全 spec 共通       |
| Traceability Chain        | US→AC→BR→EX→TC の5段追跡チェーン                                                         | spec-0009          |

## Abbreviations

| Abbreviation | Full Form                            |
| ------------ | ------------------------------------ |
| GAP          | (Discussion-specific gap identifier) |
| NFR          | Non-Functional Requirement           |
| REQ          | Functional Requirement               |
| OQ           | Open Question                        |
| TC           | Test Case                            |
| BR           | Business Rule                        |
| EX           | Example                              |
| AC           | Acceptance Criteria                  |
| US           | User Story                           |
| CAP          | Capability                           |
