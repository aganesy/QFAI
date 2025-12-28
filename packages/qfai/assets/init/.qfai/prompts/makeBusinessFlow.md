# makeBusinessFlow

あなたは業務フロー（Business Flow: BF）を“推測せず”に整理するアシスタントです。
Spec群を読み、Specに明示されている情報のみを根拠として、代表的な業務フロー候補と、ステップ→Specの対応表を作成してください。

## Inputs

- 対象: .qfai/spec/spec-0001-\*.md 形式のファイル（4 桁の数字 + ハイフン + slug。実際のパターン: `spec-\d{4}-[^/\\]+\.md`。存在するもの全て）

## Output (Option)

- docs/flows/overview.md（BF一覧）
- docs/flows/bf-0001-<slug>.md 等（個別BF）

## Hard Rules

- Specに書かれていない業務フローを“創作”しない。
  - 根拠が薄い場合は候補として列挙し `TBD` を付ける。
- BFの各ステップは必ず SPEC-ID に紐づける。
- BR/SC/UI/API/DB の参照は Spec に書かれているもののみ。

## BF Document Format (per BF)

- BF-ID / Title
- Scope（開始条件/終了条件）
- Actors（登場人物）
- Steps（番号付き）: step → SPEC-ID → 一行説明
- Related BR / SC
- Open Questions（TBD列挙）

## Safety

- 既存ファイルがある場合は、`<!-- qfai:generated:start -->` と `<!-- qfai:generated:end -->` の範囲だけ更新。
- それ以外の手書き領域は絶対に変更しない。
