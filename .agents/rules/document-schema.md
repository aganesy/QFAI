# Document Schema Discipline (全 AI 共通)

SDD ドキュメント (spec pack / `_policies`) の**構造**は
`packages/qfai/assets/mdschema/**` の宣言的スキーマが SSOT である。
「どの章が必要か」「その章はリストか、テーブルか、Gherkin か、Mermaid か」は
散在する暗黙知ではなく、レビュー可能な 1 ファイルに書かれている。

## なぜ markdownlint では足りないか

markdownlint が答えるのは「これは整形された Markdown か」であり、
フェンス内は不透明なテキストとして扱う。したがって次はすべて
markdownlint を通過する:

- Acceptance Criteria 節が存在しない spec
- `EX-Ref` 列が消えたテストケース表 (トレースが黙って空になる)
- GitHub 上でエラーボックスとして描画される Mermaid 図

これらは**文書の形**の問題であり、別のオラクルが要る。それが
`mdschema` (構造) と `mermaid.parse()` (図の文法) の 2 レーンである。

## レイヤ

| レーン          | 実装                                              | 何を見るか                                       |
| --------------- | ------------------------------------------------- | ------------------------------------------------ |
| `lint:md`       | markdownlint-cli2                                 | Markdown の構文                                  |
| `lint:mdschema` | `packages/qfai/assets/scripts/check-mdschema.mjs` | 文書の章構成・リスト・表の必須列・コードブロック |
| `lint:mermaid`  | `packages/qfai/assets/scripts/check-mermaid.mjs`  | Mermaid 図が Mermaid 自身の文法で解析できるか    |
| `format:check`  | prettier                                          | 整形                                             |

3 つとも `pnpm ci:lint` と `pnpm ci:gate` に入っており、PR で実行される。

## 実装は 1 つ、入口は 2 つ

両ガードの実装は `packages/qfai/assets/scripts/` にある。**配布されるから**である
— `qfai init` が adopter の `.github/workflows/qfai-docs.yml` に書くレーンは、
インストール済みパッケージの同じファイルを実行する。`scripts/` 側は委譲だけを行う
薄い入口で、`pnpm lint:*` とテストがリポジトリルート相対のパスで呼ぶために存在する。

**実装をコピーしないこと。** 1 つのルールに 2 つの実装があると、adopter が
このリポジトリなら出さない判定を受け取るまで黙って乖離する。

## スキーマを変更するときの規律

1. **スキーマはテンプレートの契約を述べる。** 現状ツリーの平均ではない。
   `qfai-sdd` テンプレート (`assets/init/.qfai/assistant/skills/qfai-sdd/templates/specs/**`)
   とスキーマは 1 組であり、`tests/assets/mdschemaSchemas.test.ts` が
   両方向で固定している — 参照されないスキーマ、ファイルの無い manifest 項目、
   重複パターン、テンプレート不適合はすべて落ちる。
2. **記法を強制するのは、記法が義務を運んでいるときだけ。**
   Gherkin ブロックが `gherkin` 型でなければならないのは、トレーサビリティ
   リーダが info string で選択するからで、無指定フェンスは不可視になる。
   一方「実装方針」は変更の形に応じてリスト・表・番号付き手順のどれもが正しく、
   1 つを要求すれば残り 2 つは lint を通すためにより悪い形へ書き換えられる。
3. **必須節は、埋められる内容があるものだけ。** 全 pack が「none」と答える
   ことになる節を必須にしてはいけない。それは測定ではなく儀式である。
4. **manifest に載せる。** `assets/mdschema/manifest.yml` に無いスキーマは
   誰も実行しない規則であり、ディレクトリ一覧の上では網羅に見える。

## Mermaid の除外

プレースホルダを含むテンプレート図は、開始フェンスの**直前行**に
`<!-- mermaid-lint:ignore -->` を置いて個別に除外する。ファイル単位の除外は
設けない — その下に後から足された図を黙って覆うからである。

## A document that cannot conform

One document opts out of its schema with `<!-- mdschema:ignore -->` in its
leading comment block.

The case it exists for is a pack that outlives what it specifies. A spec that
was deleted or superseded is kept as the record of why it went away, and that
record cannot carry a consumer view or an applicable NFR for something that no
longer exists. Writing one would be fiction, and admitting it into the schema
would weaken the contract for every live pack — which rule 1 above already
rules out.

Three things bound it.

| Bound                                             | Why                                                           |
| ------------------------------------------------- | ------------------------------------------------------------- |
| The marker is per document                        | One pack opting out does not excuse the next                  |
| It must precede the content                       | A marker further down covers a document that reads as checked |
| Every ignored file is counted in the run's output | An exclusion nobody sees is one nobody reviews                |

The unit differs from the mermaid lane's on purpose. There the subject is one
diagram, so a file-level exclusion would cover diagrams added later; here the
subject is the document, and it either conforms or does not.

## 関連

- 配布物の識別子 leak: `.agents/rules/distributed-surface.md`
- 配布ワークフローの構造契約: `.qfai/contracts/cli/shipped-workflows.md`
