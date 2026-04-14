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

### DR-0004-0006: PROT-295..306, 308..309 Taxonomy Allocation (v1.7.15)

- Decision: fullHarness validator taxonomy range を 281-294 から 281-321 に拡張。PROT-295..306 に 12 の新規 error-level validator rules を割り当て、PROT-308..309 に追加の converged/reviewer checks を割り当て
- Context: v1.7.14 で PROT-290..294 を warning/info として導入したが、v1.7.15 でこれらを error に昇格し追加 rules を配置
- Rationale: 連番を維持し taxonomy 衝突を回避。PROT-307 はスキップ（将来予約）

### DR-0004-0007: All PROT-290..309 Rules Are Error Severity — Breaking Change (v1.7.15)

- Decision: PROT-290..306, PROT-308..309 の severity をすべて error とする（PROT-302, PROT-303 は warning に据え置き）。v1.7.14 の PROT-290..292 は warning→error に昇格
- Context: v1.7.14 では soft introduction のため warning で導入。v1.7.15 は破壊的変更リリースであり、evidence truthfulness を enforcement レベルで強制
- Rationale: warning では CI を通過するため enforcement として機能しない。v1.7.15 は後方互換を考慮しない設計判断（discussion 05_Scope.md §Constraints）に基づき、全 critical rules を error に統一

### DR-0004-0008: No Waiver Allowed for PROT-295..309 Error Rules (v1.7.15)

- Decision: PROT-295..309 の error-level rules に対する waiver を認めない
- Context: waivers.yml で warning/info を suppress/downgrade する仕組みが存在するが、error-level findings は waiver 対象外（spec-0014 BR-0014-0003 と一貫）
- Rationale: これらの rules は evidence truthfulness の根幹であり、waiver による回避は evidence 品質の保証を無効にする

### DR-0004-0009: Rev2 Validator Rules Use New Rule IDs for Semantic Changes (v1.7.15 rev2)

- Decision: rev2 で追加される validator rules のうち、既存 rule の severity upgrade は rule ID を維持し、semantic 変更（新しい検出対象）は新 rule ID に分離する
- Rationale: rule ID の安定性を保ちつつ、新検出対象を明確に区別。既存の waiver や CI 設定が意図せず新ルールを抑制するリスクを回避
- Status: Adopted
