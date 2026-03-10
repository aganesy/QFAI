# 07_NFR - Non-Functional Requirements

## NFR Register

| NFR-ID | Title | Category | Target | Measurable Criteria | Notes |
|--------|-------|----------|--------|---------------------|-------|
| NFR-0001 | 既存トレーサビリティ保全 | Integrity | 全対象 spec | GAP 修正後も US→AC→BR→EX→TC チェーンに破損がないこと。qfai validate --fail-on error が 0 error で通過する。 | 最重要制約 |
| NFR-0002 | 実装計画の具体性 | Usability | 10_Plan.md | 実装者（AI Agent）が 10_Plan.md を読むだけで追加調査なしに実装開始できること。 | GAP-01, GAP-03, GAP-04 の対処基準 |
| NFR-0003 | 最小変更原則 | Maintainability | 全対象 spec | 変更ファイル数を最小化する。10_Plan.md と 04_Business-Rules.md の Notes 列のみを対象とし、構造変更は行わない。 | Over-engineering 防止 |
| NFR-0004 | Layered Spec Architecture 準拠 | Consistency | 全対象 spec | _policies 層に spec レベルの詳細を持ち込まない。Reference Direction Rule を遵守する。 | spec-0009 のルール |
