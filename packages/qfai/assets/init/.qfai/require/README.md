# .qfai/require/

既存の要件定義書や外部資料を集約するためのディレクトリです。
QFAI は `.qfai/require/` を **入力（上流）** として扱い、ここに置かれた内容を根拠に Spec を作成します。

## 置き方（例）

- `.qfai/require/req-0001-<slug>.md`
- `.qfai/require/links.md`（外部ドキュメントへのリンク集）
- `.qfai/require/raw/`（PDFや画像などの原本）

> 形式は限定しません。内容が参照可能であることを優先してください。

## 参照ルール（重要）

- `.qfai/require/` は **上流のSSOT** です。
- `.qfai/specs` や `contracts` は **.qfai/require を参照してよい**。
- `.qfai/require` 側から `.qfai/specs` や `contracts` を参照するのは **禁止**（循環参照防止）。

## AI プロンプトの利用

- `.qfai/prompts/require-to-spec.md` を使用し、要件から Spec を作成します。
- 生成後は必ず人間がレビューし、Spec/Scenario/Contracts の整合を確認してください。

## 注意

- `.qfai/require/` の内容は QFAI の validate 対象外です。
- 機密情報の取り扱いは各プロジェクトのルールに従ってください。
