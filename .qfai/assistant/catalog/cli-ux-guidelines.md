# CLI UX Guidelines

QFAI が定義する、`npx qfai validate` の UI/UX 関連出力ガイドライン。

## Output Format

- Issue メッセージにタイムスタンプやランダム値を含めない（冪等性確保）
- `## Auto Check Results` — `npx qfai validate` による自動チェック結果セクション
- `## Manual Review Results` — product-surface-reviewer による手動レビュー結果セクション

## Error Message Format

```text
<CODE>: <message> [at <file>[:<line>[:<col>]]]
```

- `file` は issue に path がある場合のみ付与される
- `line` / `col` は issue に loc がある場合のみ付与される

例:

- `QFAI-DT-002: Circular reference detected: semantic.color.primary [at .qfai/contracts/design/design-tokens.yaml]`
- `QFAI-MOCK-002: External URL reference in HTML Mock: https://cdn.example.com/style.css [at .qfai/specs/spec-0001/01_Spec.md]`

> **Note:** `.qfai/contracts/design/design-tokens*.yaml` は **optional supporting artifact** である。init 直後にファイルが存在しなくても異常ではなく、token validator は token file が作成された場合にのみ実行される。

## Message Language

operator 向けに CLI が出力する文字列は **英語** で書く。`<CODE>` と
`[at <file>]` の形だけでなく、`<message>` の言語もこの規定に従う。

対象 (operator-facing surface):

- `usage()` を含む `qfai --help` の全文
- `error()` / `warn()` / `info()` および stdout/stderr へ直接書く文字列
- `npx qfai doctor` の check `title` / `message` / `details.nextActions`
- `Issue.message` — 新規に追加する finding message は英語で書く

対象外:

- ソースコード中のコメント / JSDoc（配布物ではなく、実装者向け）
- ユーザが自分のリポジトリに置く成果物（spec / contract / discussion pack）の
  本文。これらはプロジェクトの言語に従う

理由: rule code、`.qfai/contracts/cli/` 配下の CLI contract、および
`error()` / `info()` 呼び出しの大多数が既に英語であり、単一言語に揃えることで
log grep / alert rule / runbook が言語を場合分けせずに済む。

> **Known gap:** `src/core/validators/**` には英語化が済んでいない
> finding message が残っている。既存メッセージの移行は段階的に行うが、
> 新規追加は上記の規定に従う。移行途中のファイルは meta-test の
> baseline で ratchet されており、baseline を超える追加は CI で落ちる。

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
