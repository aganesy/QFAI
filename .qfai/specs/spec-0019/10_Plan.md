# 10 Plan

## Purpose

- How-only: 実装戦略とテスト戦略を定義する。
- What は 01_Spec.md〜06_Test-Cases.md で定義済み。

## Implementation Strategy

### Phase 1: DDP テンプレート定義

- **成果物**: DDP テンプレートファイル（Markdown + YAML 形式）
- **内容**:
  - ビジュアルテーゼ記入欄（1 文形式のガイダンス付き）
  - コンテンツプラン記入欄（セクション名・役割・順序のテーブル形式）
  - インタラクションテーゼ記入欄（2-3 原則のリスト形式）
  - アンチゴール記入欄（禁止パターン明示のリスト形式）
  - CTA 階層記入欄（primary/secondary/tertiary の構造化フォーマット）
  - テーマフィールド 6 項目記入欄（theme, mood, taste, material, energy, visual_anchor）
- **配置先**: discussion-pack テンプレートおよび spec-pack テンプレートに統合
- **依存**: spec-0013（UI/UX 定義体系）の既存テンプレート構造

### Phase 2: バリデーションルール実装

- **成果物**: qfai validate 拡張ルール
- **内容**:
  - DDP 5 必須フィールドの存在・非空チェック（BR-0019-0001）
  - テーマフィールド 6 項目の存在・非空チェック（BR-0019-0003）
  - ビジュアルテーゼ形式チェック（1 文推奨、箇条書きのみ警告）（BR-0019-0002）
  - CTA 階層構造チェック（primary 1 件以上、3 段階構造）（BR-0019-0004）
  - アンチゴール禁止パターン最低 1 件チェック（BR-0019-0009）
  - UI-bearing artifact の DDP 存在チェック（BR-0019-0006）
  - インタラクションテーゼ原則数チェック（2-3 件推奨）（BR-0019-0008）
- **依存**: \_policies DR-0031, DR-0032

### Phase 3: 禁止パターンリスト定義

- **成果物**: 禁止ジェネリックパターンリストファイル
- **内容**:
  - 初期パターン 4 件: mass-produced card-grid, weak hero, meaningless gradients, excessive accents
  - リスト拡張のためのファイル構造（行追加のみで拡張可能）
  - レビューFAIL ルールとの連携
- **依存**: BR-0019-0010, BR-0019-0011

### Phase 4: SKILL.md 更新

- **成果物**: 下流 skill の SKILL.md 更新
- **内容**:
  - DDP 読み取り順序の反映（Design Direction Pack → Design Token → UI Contract → HTML Mock → Flow/Navigation）
  - prototyping / implement skill が DDP を最初に読み取るよう手順を更新
- **依存**: REQ-0007（下流読み取り順序更新）

### Phase 5: Research-to-Constraint 変換パイプライン (REQ-0013)

- **成果物**: discussion skill の SKILL.md 更新
- **内容**:
  - discussion skill の BP（Best Practice）/ AP（Anti-Pattern）セクションを `contracts/design/*.yaml` 変換ステップとして定式化
  - BP/AP → YAML 変換の必須手順を SKILL.md に明記
  - 変換出力フォーマット（constraint key、severity、source reference）の定義
- **依存**: REQ-0013（Research-to-Constraint 変換）

### Phase 6: 高忠実度テンプレート定義 (REQ-0014)

- **成果物**: List 画面テンプレートおよび Form 画面テンプレート
- **内容**:
  - **List 画面テンプレート必須フィールド**: screen_type: list、items_source、empty_state（action 付き）、sort_filter_controls、pagination_or_infinite_scroll、primary_cta（1 件のみ）
  - **Form 画面テンプレート必須フィールド**: screen_type: form、fields（required/optional 区分）、required_fields_count（≤7）、submit_cta（1 件のみ）、validation_feedback、cancel_or_back_action
  - テンプレートを discussion-pack および spec-pack テンプレートに統合
- **依存**: REQ-0014（高忠実度テンプレート）

### Phase 7: アンチパターン検出バリデーター (REQ-0018)

- **成果物**: `qfai validate` アンチパターン検出ルール拡張
- **内容**:
  - **dual_primary_cta**: プライマリ CTA が 2 件以上存在する場合エラー
  - **excess_required_fields**: 必須フィールド数が 7 を超える場合警告
  - **empty_state_without_action**: empty_state にアクション定義がない場合エラー
  - **error_without_recovery**: エラー状態にリカバリー手順がない場合エラー
  - **four_plus_click_flow**: プライマリフローのクリック数が 4 以上の場合警告
  - **placeholder_or_lorem**: placeholder / lorem ipsum テキストが残存する場合エラー
  - **button_variant_proliferation**: ボタンバリアント数が設計システム定義を超える場合警告
- **依存**: REQ-0018（アンチパターン検出）

### Phase 8: Config uiux policy セクション (REQ-0019)

- **成果物**: `qfai.config.yaml` スキーマ拡張およびバリデーター統合
- **内容**:
  - `uiux_policy` セクションをオプションフィールドとして `qfai.config.yaml` スキーマに追加
  - 設定可能項目: `anti_pattern_severity`（warning / error）、`required_fields_max`、`click_flow_max`、`competitive_refs_min`
  - バリデーターが `uiux_policy` 設定を読み取り、閾値・severity を動的適用
- **依存**: REQ-0019（Config uiux policy）

### Phase 9: 複数オプション比較 (REQ-0020)

- **成果物**: primary 画面に 2 件以上のオプション比較を要求するバリデーションルール
- **内容**:
  - `design/*.yaml` の primary 画面定義に `options` フィールドが 2 件以上存在することを検証
  - 1 件のみの場合は警告、0 件の場合はエラー
- **依存**: REQ-0020（複数オプション比較）

### Phase 10: 競合参照要件 (REQ-0021)

- **成果物**: 3 件以上の競合 UI 参照を要求するバリデーションルール
- **内容**:
  - DDP または `contracts/design/*.yaml` の `competitive_refs` フィールドに 3 件以上の参照が定義されていることを検証
  - 3 件未満の場合は警告（`uiux_policy.competitive_refs_min` で上書き可能）
- **依存**: REQ-0021（競合参照要件）

## Test Strategy

### Unit Tests (L3)

- **対象**: DDP バリデーションルール個別
- **範囲**: TC-0019-0001〜TC-0019-0013
- **内容**:
  - 5 必須フィールドの存在・非空チェック（正常パス・欠落パス）
  - テーマフィールド 6 項目チェック（完備・欠落）
  - ビジュアルテーゼ形式チェック（1 文・箇条書き）
  - CTA 階層構造チェック（3 段階・primary 空・boundary）
  - アンチゴール禁止パターンチェック（パターンあり・空）
  - インタラクションテーゼ原則数チェック（2-3 件・不足・超過）
  - UI-bearing artifact の DDP 存在チェック（UI-bearing・UI 非関連）
  - 禁止パターンリスト拡張性チェック（行追加でコア変更 0）
  - 外部デザインツール非依存チェック（テキストベース・ハード依存検出）
  - エージェント可搬性チェック（ツール固有 API 0 件）

### E2E Tests (L5)

- **対象**: DDP 定義から下流 skill 消費までの統合フロー
- **範囲**: TC-0019-0014〜TC-0019-0015
- **内容**:
  - 完全な DDP → qfai validate → 下流 skill 消費の完全フロー
  - DDP ガードレール統合検証（必須・禁止パターン・ツール非依存）

### New Validator and Template Tests (TC-0019-0016〜0023)

| TC ID        | Title                                   | Level | AC-Refs  | Key Assertions                                                                   |
| ------------ | --------------------------------------- | ----- | -------- | -------------------------------------------------------------------------------- |
| TC-0019-0016 | List 画面テンプレート必須フィールド検証 | L3    | REQ-0014 | 6 必須フィールドすべて存在する場合 PASS、欠落時 ERROR                            |
| TC-0019-0017 | Form 画面テンプレート必須フィールド検証 | L3    | REQ-0014 | 6 必須フィールドすべて存在する場合 PASS、required_fields_count > 7 で WARNING    |
| TC-0019-0018 | dual_primary_cta 検出                   | L3    | REQ-0018 | プライマリ CTA 2 件以上で ERROR、1 件で PASS                                     |
| TC-0019-0019 | empty_state_without_action 検出         | L3    | REQ-0018 | empty_state にアクションなしで ERROR、アクションありで PASS                      |
| TC-0019-0020 | error_without_recovery 検出             | L3    | REQ-0018 | リカバリー定義なしエラー状態で ERROR、リカバリーありで PASS                      |
| TC-0019-0021 | placeholder_or_lorem 検出               | L3    | REQ-0018 | lorem ipsum テキスト残存で ERROR、実コンテンツで PASS                            |
| TC-0019-0022 | competitive_refs バリデーション         | L3    | REQ-0021 | 参照 3 件以上で PASS、2 件以下で WARNING（config で min 変更可能）               |
| TC-0019-0023 | uiux_policy config 上書き               | L3    | REQ-0019 | `anti_pattern_severity: warning` 設定時に ERROR → WARNING にダウングレードされる |

## Dependencies

- spec-0013: UI/UX 定義・レビュー体系（DDP は Design Token / HTML Mock / Mermaid Flow に先行する上流成果物）
- \_policies/08_Decisions.md: DR-0031（DDP 必須化）、DR-0032（汎用パターン禁止）
- discussion-20260324054332396: ソース discussion pack

## Risks

| Risk ID | Description                             | Mitigation                                                                                                       | Severity |
| ------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------- |
| R-001   | 主観的美的要件の客観的検証が困難        | 構造的チェック（フィールド存在・非空）に限定し、内容の質的判断はレビュアーに委譲する                             | medium   |
| R-002   | 禁止パターンの自動検出が困難            | v1.6.5 では DDP のアンチゴール明示をゲートとし、UI コードの自動検出は VRT/RUM（v1.6.6 DR-0035）に委譲する        | medium   |
| R-003   | DDP 記入負荷によるユーザー体験の低下    | テンプレートにガイダンスと具体例を提供し、記入のハードルを下げる                                                 | low      |
| R-004   | spec-0013 との整合性維持                | DDP は spec-0013 の上流として定義し、Design Token / HTML Mock / Mermaid Flow は DDP の方向性に従う階層関係を維持 | low      |
| R-005   | テンプレート採用への抵抗                | List / Form テンプレートをオプション起点として提供し、強制移行を避ける（段階的採用）                             | low      |
| R-006   | アンチパターン誤検知（false positive）  | `uiux_policy.anti_pattern_severity` により severity 閾値を設定可能とし、プロジェクト固有の許容範囲を設定できる   | medium   |
| R-007   | Config 複雑化によるメンテナンス負荷増大 | `uiux_policy` セクションをオプションとし、未設定時はデフォルト値で動作するシンプルな設計を維持する               | low      |
