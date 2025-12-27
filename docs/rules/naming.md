# 命名規約（v0.2.5）

## 原則
- 参照の正は ID（SPEC/BR/SC/UI/API/DATA）であり、ファイル名ではない。
- ファイル名の slug は可読性の補助として扱う。
- 参照は必ず ID を用いる。
- ID は 4 桁ゼロ埋め（例: 0001）。
- slug は kebab-case（英小文字・数字・ハイフン）を推奨。

## Spec
- ファイル名: `spec-0001-<slug>.md`
- 本文先頭: `# SPEC-0001 <Title>`（ID + タイトルを含む）
- 既存互換: `spec.md` は legacy として許容（v0.2.5 では探索対象に含める）

## Contracts
- UI: `ui-0001-<slug>.yaml` または `.yml`
- API: `api-0001-<slug>.yaml` / `.yml` / `.json`
- DB: `db-0001-<slug>.sql`

> 補足: `.md` の契約説明書は置いてもよいが、v0.2.5 では自動認識しない。
