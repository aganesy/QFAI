# require-to-spec

あなたは仕様書作成アシスタントです。`.qfai/require/` 配下の既存要件を読み取り、QFAI の Spec Pack を作成してください。

## Inputs

- `.qfai/require/` 配下の要件定義書・リンク・原本（読み取れる範囲で）
- 追加資料がある場合は、それも参照して良い

## Output

- `.qfai/specs/spec-0001/spec.md`
- `.qfai/specs/spec-0001/delta.md`
- `.qfai/specs/spec-0001/scenario.feature`
- 必要に応じて `.qfai/contracts/{ui,api,db}` 配下

> Spec は `spec-0001` から開始し、必要なら連番で増やすこと。

## Rules

- **推測しない**。要件に書かれていないことは `TBD` と明記する。
- ID は `PREFIX-0001` 形式（SPEC/BR/SC/UI/API/DB）。
- `spec.md` の必須セクションは `qfai.config.yaml` の設定に従う。
- BR は `## 業務ルール` にのみ定義し、`- [BR-0001][P1] ...` 形式で書く。
- `spec.md` に `QFAI-CONTRACT-REF:` を必ず記載する（不要なら `none`）。
- `scenario.feature` は Gherkin で書き、Feature に `@SPEC-xxxx` を付与する。
- 各 Scenario は `@SC-xxxx` を **ちょうど1つ**、`@BR-xxxx` を **1つ以上**持つこと。
- 契約ファイルには `QFAI-CONTRACT-ID: <ID>` を宣言する。
- 契約 ID（UI/API/DB）を Scenario で参照する場合はタグまたは本文に明示する。
- `delta.md` の「変更区分」は **Compatibility / Change/Improvement のいずれか1つにチェック**する。
  - 判断できない場合は `Compatibility` を選び、`TBD` を理由欄に記載する。

## Output Format

- すべて Markdown
- 余計な説明文は出力しない（ファイル内容のみ）

## 参照ルール（重要）

- `.qfai/specs` や `contracts` は **.qfai/require を参照してよい**。
- `.qfai/require` 側から `.qfai/specs` や `contracts` を参照するのは **禁止**。
