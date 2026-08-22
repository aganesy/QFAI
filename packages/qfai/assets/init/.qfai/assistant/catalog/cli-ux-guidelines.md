# CLI UX Guidelines

QFAI が定義する、`npx qfai validate` の UI/UX 関連出力ガイドライン。

## Output Format

- Issue メッセージにタイムスタンプやランダム値を含めない（冪等性確保）
- `## Auto Check Results` — `npx qfai validate` による自動チェック結果セクション
- `## Manual Review Results` — product-surface-reviewer による手動レビュー結果セクション

## Error Message Format

`npx qfai validate --format text`（既定形式）が issue 1 件につき出力する 1 行の形式:

```text
[<severity>] <CODE> <message>[ (<file>)][ refs=<refs>][ suppressed=true]
```

- `severity` は `info` / `warning` / `error` のいずれか
- `(<file>)` は issue に path がある場合のみ付与される
- `refs=<refs>` は issue に refs がある場合のみ付与される（カンマ区切り）
- `suppressed=true` は issue が waiver で抑止されている場合のみ付与される

例:

- `[error] QFAI-DT-002 Circular reference detected: semantic.color.primary (.qfai/contracts/design/design-tokens.yaml) refs=semantic.color.primary`
- `[error] QFAI-MOCK-002 External URL reference in HTML Mock: https://cdn.example.com/style.css (.qfai/specs/spec-0001/01_Spec.md)`

`severity` が `error` の issue には、上記の行に続けてインデント付きの詳細行が出力される:

```text
  error_code: <CODE>
  target: <target>
  expected: <expected>
  current: <message>
  fix: <suggested action>
```

- 各行は 2 スペースのインデント + `<label>: ` + 値
- 値が複数行の場合、2 行目以降は値の開始位置（`2 + <label> の文字数 + 2` スペース）に揃えた継続行として出力される。詳細ブロックは常に 5 行とは限らない

継続行の例（`fix` の値が 2 行の場合）:

```text
  fix: 1 行目のテキスト
       2 行目以降は値の開始位置に揃う
```

全 issue の出力後に集計行が 1 行出力される。`counts` は `suppressed=true` の issue を含まない:

```text
counts: info=<n> warning=<n> error=<n>
```

集計行の直後に、この実行の run log 出力先が 1 行出力される（text 形式の最終行）:

```text
run-log: <path>
```

> **Note:** `.qfai/contracts/design/design-tokens*.yaml` は **optional supporting artifact** である。init 直後にファイルが存在しなくても異常ではなく、token validator は token file が作成された場合にのみ実行される。

## Severity Decision Matrix

| Category                                              | Error                                                   | Warning                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| Design Token schema violation (if token file present) | `$value` empty, circular ref, YAML parse error          | Unknown `$type`, unknown platform                                        |
| HTML Mock structure                                   | External URL, script tag, CSS fallback missing          | Missing state variant, contrast ratio below AA, token comment missing    |
| Mermaid screen flow                                   | —                                                       | v1 migration, unlabeled transition, flowchart declaration, outside fence |
| BP/AP DB                                              | Invalid ID format, duplicate ID, missing required field | Invalid platform                                                         |
| Platform detection                                    | —                                                       | Unknown platform, cross-platform detected                                |
| Consistency                                           | —                                                       | Fallback mismatch, screen alignment missing                              |
| Research summary                                      | No sources, no apply, missing required sections         | Freshness below threshold                                                |
| Agent definition                                      | Missing file, missing section, insufficient items       | Missing collaboration statement                                          |

## `--platform` Option

- 許容値: `web`, `windows`, `mobile-ios`, `mobile-android`, `cross-platform`
- 未指定時: 自動検出（config → project files → fallback to `web`）
- 未知の値: warning 発行。platform 値は保持しつつ、実質的に common ルールのみ適用

## Known Limitations

- jsdom v26+ は CSS レイアウトをサポートしないため、タッチターゲットサイズチェックはインライン `style` 属性のみ対象
- クラスベースまたはスタイルシートベースのサイズ指定は、現実装では未検証としてスキップ（追加 info は未出力）
