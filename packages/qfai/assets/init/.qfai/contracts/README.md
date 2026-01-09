# Contracts (UI / API / DB)

契約は「システム外部との約束」を明文化する場所です。Spec（spec.md）の `QFAI-CONTRACT-REF` による参照が必須で、これが Spec→Contract 対応の SSOT になります。Scenario は `# QFAI-CONTRACT-REF` で契約参照を宣言します（none 可）。

## 置くべきファイル

- UI: `ui/ui-0001-<slug>.yaml` または `.yml`
- THEMA: `ui/thema-001-<slug>.yml`（3桁）
- API: `api/api-0001-<slug>.yaml` / `.yml` / `.json`（OpenAPI）
- DB: `db/db-0001-<slug>.sql`（ID は `DB-xxxx`）
- assets: `ui/assets/<contract-id>/assets.yaml`（参照整合のみ検証）

## 契約ID宣言（必須）

- 1ファイル = 1ID
- 契約IDの正は契約ファイル側（`QFAI-CONTRACT-ID` が SSOT）
- ファイル内に `QFAI-CONTRACT-ID: <ID>` をコメント行で宣言する
- 例: `# QFAI-CONTRACT-ID: API-0001` / `// QFAI-CONTRACT-ID: UI-0001` / `-- QFAI-CONTRACT-ID: DB-0001`

## 最小例（UI）

```yaml
# QFAI-CONTRACT-ID: UI-0001
id: UI-0001
name: 受注登録画面
refs:
  - BR-0001
themaRef: THEMA-001
assets:
  pack: assets/ui-0001-sample
  use:
    - UI-0001.desktop.light.default
```

## 最小例（THEMA）

```yaml
# QFAI-CONTRACT-ID: THEMA-001
id: THEMA-001
name: facebook-like
tokens:
  color:
    background: "#FFFFFF"
    textPrimary: "#111111"
    accent: "#1877F2"
```

## 最小例（API）

```yaml
# QFAI-CONTRACT-ID: API-0001
openapi: 3.0.0
info:
  title: Sample API
  version: 0.1.0
paths:
  /health:
    get:
      operationId: API-0001
      responses:
        "200":
          description: OK
```

## 最小例（DB）

```sql
-- QFAI-CONTRACT-ID: DB-0001
CREATE TABLE sample_table (
  id INTEGER PRIMARY KEY
);
```

## CI でチェックされること（抜粋）

- 契約宣言: `QFAI-CONTRACT-ID` の未記載/複数宣言/重複IDは error
- 契約ID: 配置ディレクトリ（ui/api/db）と prefix（UI/API/DB）の不整合は error
- UI/API: パース失敗は error
- API: OpenAPI 定義があること（`openapi`）
- DB: 危険 SQL（DROP/TRUNCATE 等）の警告
- 共通: ID 形式（`PREFIX-0001`）、ID の重複検知

## 依存関係

- Spec → Contracts（spec.md に `QFAI-CONTRACT-REF` を必ず1行以上宣言、0件は `none`。この行が SSOT）
- Scenario → Contracts（scenario.feature に `# QFAI-CONTRACT-REF` を必ず1行以上宣言、0件は `none`）

## 良い例 / 悪い例

- 良い例: Spec で契約を参照し、必要に応じて Scenario でも参照している
- 悪い例: Spec が契約を参照しておらず orphan contract が発生する（allowOrphanContracts=false で error）
