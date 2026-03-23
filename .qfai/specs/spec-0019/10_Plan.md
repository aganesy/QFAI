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
- **依存**: _policies DR-0031, DR-0032

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

## Dependencies

- spec-0013: UI/UX 定義・レビュー体系（DDP は Design Token / HTML Mock / Mermaid Flow に先行する上流成果物）
- _policies/08_Decisions.md: DR-0031（DDP 必須化）、DR-0032（汎用パターン禁止）
- discussion-20260324054332396: ソース discussion pack

## Risks

| Risk ID | Description                                  | Mitigation                                                                                                      | Severity |
| ------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------- |
| R-001   | 主観的美的要件の客観的検証が困難             | 構造的チェック（フィールド存在・非空）に限定し、内容の質的判断はレビュアーに委譲する                             | medium   |
| R-002   | 禁止パターンの自動検出が困難                 | v1.6.5 では DDP のアンチゴール明示をゲートとし、UI コードの自動検出は VRT/RUM（v1.6.6 DR-0035）に委譲する        | medium   |
| R-003   | DDP 記入負荷によるユーザー体験の低下         | テンプレートにガイダンスと具体例を提供し、記入のハードルを下げる                                                 | low      |
| R-004   | spec-0013 との整合性維持                     | DDP は spec-0013 の上流として定義し、Design Token / HTML Mock / Mermaid Flow は DDP の方向性に従う階層関係を維持 | low      |
