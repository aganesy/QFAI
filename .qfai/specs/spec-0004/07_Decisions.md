# 07 Decisions

## Decisions

### DR-0004-0001: GitHub annotation 重複排除

- 重複する Issue は issueKey (code|severity|message|file|line|column|suppressed) で排除する
- Why: GitHub Actions のアノテーション上限（100件）を有効活用するため

### DR-0004-0002: Phase guard による refinement ブロック

- CI 環境で `--phase refinement` を指定した場合、バリデーションをスキップし blocking issue を生成する
- Why: refinement フェーズは開発者のローカル検証用であり、CI では full フェーズを使用すべきため

### DR-0004-0003: Legacy Validator 完全削除 (v1.7.14, DR-0115)

- Decision: legacy/ ディレクトリ、legacyStatusDir.ts、migration/formatDetection.ts、uix/rollout.ts を production ソースツリーから完全削除
- Context: v1.7.13 で canonical/legacy 分離を導入したが、legacy validator コードは migration tooling として残存していた
- Rationale: v1.7.14 は current-only SSOT リリース。migration tooling の存在自体が migration 期間の延長を示唆し、convergence を遅延させる。ソースツリーからの完全削除により、構造的に legacy path への依存を排除

### DR-0004-0004: IssueCategory "compatibility" 削除 (v1.7.14, DR-0108)

- Decision: IssueCategory union type から "compatibility" を削除し、"canonical" | "change" のみとする
- Context: v1.7.13 で canonical/legacy 分離後も "compatibility" カテゴリがレポート出力に残り、ユーザーに migration 文脈を想起させていた
- Rationale: current-only SSOT では全 issue が仕様準拠性（canonical）または変更追跡（change）に分類される。compatibility の概念は不要

### DR-0004-0005: Strict Classification & Strategy Semantic Validation (v1.7.14, DR-0111, DR-0114)

- Decision: classification.ts に意味的矛盾検出、strategy.ts に canonical enum 強制と状態機械検証を追加
- Context: v1.7.13 の classification.ts は構造チェックのみ（フィールド存在確認）。strategy.ts は 8 フィールドの型チェックのみで decision 値は任意文字列
- Rationale: 構造的に正しいが意味的に矛盾するデータ（ui_bearing=true + primary_surface=non-ui 等）を検出し、downstream の execution/report エラーを validator レイヤーで事前に防止
