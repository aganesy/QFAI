# R06: QA Reviewer レビュー

## レビュアー情報

- ID: qa-reviewer
- 名前: QA Reviewer
- スコープ: sdd

## チェック項目

### 1. テスト可能性・エッジケース・失敗パスカバレッジの検証

- **Gherkin AC のテスト可能性**: 全スペックの AC が Gherkin 形式（Given/When/Then）で記述されており、ATDD テストへの直接変換が可能。
- **正常系・異常系のバランス**:
  - spec-0001 (init): 正常系 AC-0001-0001/0002、異常系 AC-0001-0003（書き込み権限なし）。冪等性テスト AC-0001-0004/0005。--force / --dry-run の各シナリオ。
  - spec-0002 (validate): 28 AC で正常系・異常系を網羅。--fail-on の 3パターン（error/warning/never）、--format github の 100件超切り詰め、ウェイバー suppress/downgrade。
  - spec-0004 (doctor): パストラバーサル検出（AC-0004-0008）というセキュリティ関連のエッジケースが含まれている。
  - spec-0005 (guardrails): 空結果パターン（AC-0005-0002/0004）が明示的に定義されている。
- **境界値の明確性**: AC-0002-0009 で「120件入力→100件出力」という具体的な境界値テストが定義されている。NFR-0001/0002 の性能境界値（10秒/60秒）も検証可能。
- **冪等性テスト**: NFR-0012 に基づき、spec-0001（AC-0001-0004/0005）と spec-0002（AC-0002-0028）で冪等性テストが定義されている。

### 2. オープン/延期項目の明示性と実行可能性

- **Open Questions**: 全スペックの `08_Open-questions.md` で Open=0。全 OQ は discussion pack レベルで解決済み。
- **Deferred 項目**:
  - OQ-0003: validate.json の外部 API 安定性 → v2.0 で対応
  - OQ-0004: spec-pack 非推奨スケジュール → v2.0 で決定
  - いずれもバージョン目標が明示されており、追跡可能。
- **Gaps の管理**: 各エビデンスファイルの "Gaps / Open Risks" セクションに DENSITY warnings と COV-201 バリデータバグが記録されている。DENSITY warnings は ATDD フェーズで充填予定と明記。

## 所見

- AC の Priority 付与（P1/P2）により、テスト実装の優先順位が明確。
- spec-0002 の AC 数（28件）は全スペック中最多であり、中核機能のテスト深度として適切。

## 判定

**PASS**
