# CLI UX Guidelines

spec-0013 (CAP-0013) で定義された、`qfai validate` の UI/UX 関連出力ガイドライン。

## Output Format

- Issue メッセージにタイムスタンプやランダム値を含めない（冪等性確保）
- `## Auto Check Results` — `qfai validate` による自動チェック結果セクション
- `## Manual Review Results` — ui-ux-reviewer による手動レビュー結果セクション

## Error Message Format

```text
<CODE>: <message> [at <file>:<line>]
```

例:

- `QFAI-DT-002: Circular reference detected: semantic.color.primary [at .qfai/contracts/design/design-tokens.yaml]`
- `QFAI-MOCK-002: External URL reference in HTML Mock: https://cdn.example.com/style.css [at .qfai/specs/spec-0001/01_Spec.md]`

## Severity Decision Matrix

| Category                      | Error                                                   | Warning                                                                  |
| ----------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| Design Token schema violation | `$value` empty, circular ref, YAML parse error          | Unknown `$type`, unknown platform                                        |
| HTML Mock structure           | External URL, script tag, CSS fallback missing          | Missing state variant, contrast ratio below AA, token comment missing    |
| Mermaid screen flow           | —                                                       | v1 migration, unlabeled transition, flowchart declaration, outside fence |
| BP/AP DB                      | Invalid ID format, duplicate ID, missing required field | Invalid platform                                                         |
| Platform detection            | —                                                       | Unknown platform, cross-platform detected                                |
| Consistency                   | —                                                       | Fallback mismatch, screen alignment missing                              |
| Research summary              | No sources, no apply, missing required sections         | Freshness below threshold                                                |
| Agent definition              | Missing file, missing section, insufficient items       | Missing collaboration statement                                          |

## `--platform` Option

- 許容値: `web`, `windows`, `mobile-ios`, `mobile-android`, `cross-platform`
- 未指定時: 自動検出（config → project files → fallback to `web`）
- 未知の値: warning 発行。platform 値は保持しつつ、実質的に common ルールのみ適用

## Known Limitations

- jsdom v26+ は CSS レイアウトをサポートしないため、タッチターゲットサイズチェックはインライン `style` 属性のみ対象
- クラスベースまたはスタイルシートベースのサイズ指定は、現実装では未検証としてスキップ（追加 info は未出力）
