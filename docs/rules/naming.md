# 命名規約（v0.2.6）

## 原則

- 参照の正は ID（SPEC/BR/SC/UI/API/DATA）であり、ファイル名ではない。
- ファイル名の slug は可読性の補助として扱う。
- 参照は必ず ID を用いる。
- ID は 4 桁ゼロ埋め（例: 0001）。
- ファイル名の大文字・小文字は区別しない（例: `spec-0001-sample.md` と `SPEC-0001-SAMPLE.md` は同等に扱う）。
- slug は 1 文字以上を必須とする。
- slug はパス区切り文字（`/` `\\`）以外であれば技術的に許容される。先頭文字などの厳密な文字種制約は設けず、kebab-case（英小文字・数字・ハイフン）を推奨。

## Spec

- 配置: `.qfai/spec/`
- ファイル名: `spec-0001-<slug>.md`
- 本文先頭: `# SPEC-0001 <Title>`（ID + タイトルを含む）

## Scenario

- 配置: `.qfai/spec/scenarios/`
- 拡張子: `.feature`
- ファイル名は任意だが、`sc-0001-<slug>.feature` を推奨

## Contracts

- UI: `ui-0001-<slug>.yaml` または `.yml`
- API: `api-0001-<slug>.yaml` / `.yml` / `.json`
- DB（ID は `DATA-xxxx`）: `db-0001-<slug>.sql`

> 補足: `.md` の契約説明書は置いてもよいが、v0.2.6 では自動認識しない。
