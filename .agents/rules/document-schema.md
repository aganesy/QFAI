# Document Schema Discipline (全 AI 共通)

SDD ドキュメント (spec pack / `_policies`) の構造は
`packages/qfai/assets/mdschema/**` の宣言的スキーマが SSOT。
「どの章が必要か」「その章はリストか、表か、Gherkin か、Mermaid か」は
暗黙知ではなく、レビューできる 1 ファイルに書く。

## markdownlint では足りない理由

markdownlint は「整形された Markdown か」だけを見る。フェンス内は不透明なテキストとして扱う。
したがって次はすべて markdownlint を通る。

- Acceptance Criteria 節が無い spec
- `EX-Ref` 列が消えたテストケース表 (トレースが黙って空になる)
- GitHub 上でエラーボックスとして描画される Mermaid 図

これらは文書の形の問題なので、別のチェックが要る。
`mdschema` (構造) と `mermaid.parse()` (図の文法) の 2 レーンがそれにあたる。

## レーン

| レーン          | 実装                                              | 何を見るか                                       |
| --------------- | ------------------------------------------------- | ------------------------------------------------ |
| `lint:md`       | markdownlint-cli2                                 | Markdown の構文                                  |
| `lint:mdschema` | `packages/qfai/assets/scripts/check-mdschema.mjs` | 文書の章構成・リスト・表の必須列・コードブロック |
| `lint:mermaid`  | `packages/qfai/assets/scripts/check-mermaid.mjs`  | Mermaid 図が Mermaid 自身の文法で解析できるか    |
| `format:check`  | prettier                                          | 整形                                             |

4 つとも `pnpm ci:lint` と `pnpm ci:gate` に含まれ、PR で実行される。

## 実装は 1 つ、入口は 2 つ

両ガードの実装は `packages/qfai/assets/scripts/` にある。配布されるためである。
`qfai init` が adopter の `.github/workflows/qfai-docs.yml` に書くレーンは、インストール済みパッケージの同じファイルを実行する。
リポジトリ直下の `scripts/` は委譲だけを行う薄い入口で、`pnpm lint:*` とテストがルート相対のパスで呼ぶために置いている。

実装をコピーしない。1 つのルールに 2 つの実装があると、adopter がこのリポジトリと違う判定を受け取るまで乖離に気づけない。

## スキーマを変更するときの規律

1. **スキーマはテンプレートの契約を述べる。** 現状ツリーの平均ではない。
   `qfai-sdd` テンプレート (`assets/init/.qfai/assistant/skills/qfai-sdd/templates/specs/**`) とスキーマは 1 組で、
   `tests/assets/mdschemaSchemas.test.ts` が双方向に固定する。
   参照されないスキーマ、ファイルの無い manifest 項目、重複パターン、テンプレート不適合はすべて落ちる。
2. **記法を強制するのは、記法が義務を運ぶときだけ。**
   Gherkin ブロックを `gherkin` 型にするのは、トレーサビリティリーダが info string で選ぶからで、無指定フェンスは読まれない。
   一方「実装方針」は変更の形によってリスト・表・番号付き手順のどれも正しい。
   1 つを要求すると、残り 2 つは lint を通すために悪い形へ書き換えられる。
3. **必須節は、埋める内容がある節だけ。** 全 pack が「none」と答える節を必須にしない。
4. **manifest に載せる。** `assets/mdschema/manifest.yml` に無いスキーマは誰も実行しない。

## Mermaid の除外

プレースホルダを含むテンプレート図は、開始フェンスの直前行に `<!-- mermaid-lint:ignore -->` を置いて個別に除外する。
ファイル単位の除外は設けない。後から足された図を黙って覆うためである。

## 関連

- 配布物の識別子 leak: `.agents/rules/distributed-surface.md`
- 配布ワークフローの構造契約: `.qfai/contracts/cli/shipped-workflows.md`
