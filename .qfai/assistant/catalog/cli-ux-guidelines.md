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
- `<message>` は改行を含むことがある（例: `QFAI-BPAP-002` は YAML パーサーの複数行 error message をそのまま保持する）。emitText は改行を正規化しないため、issue 1 件の出力が複数の物理行になり、`(<file>)` 以降の任意スロットは最終物理行に付く。継続行と構造行の区別は後述の「行の判定順序」に従うこと

例:

- `[error] QFAI-DT-002 Circular reference detected: semantic.color.primary (.qfai/contracts/design/design-tokens.yaml) refs=semantic.color.primary`
- `[error] QFAI-MOCK-002 External URL reference in HTML Mock: https://cdn.example.com/style.css (.qfai/specs/spec-0001/01_Spec.md)`

一部の issue には、上記の行に続けてインデント付きの詳細行が出力される。付くかどうかは severity と `--fail-on` の組で決まり、**その実行が失敗するかどうかとは独立している**:

- `error` — `--fail-on` の値にかかわらず **常に** 付く。`--fail-on never` (`validation.failOn: never`) でも同じで、その実行はどの severity でも失敗しないが詳細ブロックは出力される
- `warning` — `--fail-on warning` (`--strict` を含む) のときだけ付く
- `info` — 付かない

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

テストファイル走査が上限に達した実行では、issue 行より **前** に警告行が 1 行出力される（打ち切られなかった実行では出力されない）:

```text
[warn] <command>: test-file scan stopped at the <n>-file cap; traceability/ATDD coverage in this run is computed over a partial file set
```

- `<command>` は `validate` / `report`
- この行は issue 行の文法に一致しない。`[warn] ` で始まる行を issue として解釈しないこと

全 issue の出力後に集計行が 1 行出力される。`counts` は `suppressed=true` の issue を含まない:

```text
counts: info=<n> warning=<n> error=<n>
```

集計行の直後に、この実行の実効 `--fail-on` しきい値が 1 行出力される。終了コードの根拠は
`--format github` の summary 行にしか現れておらず、既定の text 出力を読むレビュアーからは
見えなかった:

```text
fail-on: <threshold>
```

実効しきい値行の直後に、予算を超えた validator グループがある場合 **のみ** 1 行出力される。
超過が 1 件もなければこの行は出力されない。実行にかかった時間はツリーではなくマシンを表すため
finding にはせず、`counts` を動かさない位置に置く（同じコミットがラップトップと負荷のかかった
CI ランナーとで異なる総数を報告してしまうため）:

```text
timings: over budget <group>=<ms>ms (budget <ms>ms) [<group>=... ...]
```

その直後に、この実行の run log 出力先が 1 行出力される（text 形式の最終行）:

```text
run-log: <path>
```

### 行の判定順序

text 出力の 1 行は、上から順に **最初に一致した規則** で解釈する。構造行を先に判定するため、`counts:` / `timings:` / `run-log:` / 詳細行がメッセージ継続行に取り込まれることはない:

1. `[warn] ` で始まる行 — 走査打ち切り警告。最初の issue 行より前にのみ現れ、直前 issue を持たないので継続行にはならない
2. `[info] ` / `[warning] ` / `[error] ` で始まる行 — 新しい issue のヘッダー行
3. `counts: ` で始まる行 — 集計行。issue 出力の終端
4. `fail-on: ` で始まる行 — 実効しきい値行。集計行の直後にのみ現れる
5. `timings: ` で始まる行 — 予算超過行。実効しきい値行の直後にのみ現れ、超過がなければ出力されない
6. `run-log: ` で始まる行 — run log 行。text 出力の最終行
7. 直前 issue の severity がその実行の `--fail-on` しきい値に達している場合 (既定では `error`、`--fail-on warning` では `warning` も) で、まだ詳細ブロックに入っていない場合、2 スペースインデントの `error_code:` 行が詳細ブロックの開始。詳細ブロック内では 2 スペースインデント + `<label>:` の行が新しい詳細フィールド、それ以外の行は直前フィールド値の継続行
8. 上記のいずれにも一致しない行 — 直前 issue のメッセージ継続行

メッセージ継続の終了条件は 2 / 3 / 7 のいずれか。しきい値に達しない severity では詳細ブロックが出力されないため 2 または 3 で終わる。

> **Known limitation:** message や詳細フィールドの値が、上の構造行と同じ接頭辞（`[error] ` / `counts: ` / インデント付き `error_code:` など）で始まる物理行を含む場合、この文法では区別できない。厳密な機械解析が必要なら text 出力ではなく `output.validateJsonPath` が指す JSON レポートを読むこと。

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

> **Known gap:** `src/core/**` には英語化が済んでいない finding message が
> 残っている。大半は `validators/**` だが、`config.ts` の
> `QFAI_CONFIG_INVALID` や `waivers.ts` / `report.ts` のように validator 外の
> `Issue` producer も含む。既存メッセージの移行は段階的に行うが、新規追加は
> 上記の規定に従う。移行途中のメッセージは `src/**` 全体を走査する meta-test の
> allowlist に**文言単位**で登録されており、allowlist に無い日本語メッセージは
> CI で落ちる。既存メッセージを英語化したら該当項目も同じ変更で削除する
> (行数の空き枠として再利用できない)。

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
- 参照する profile: `prototyping` / `verify` / `full` / `saas-package` のみ。
  `discussion` / `sdd` / `atdd` / `tdd` は platform を読まないため、これらに
  `--platform` を渡すと未使用である旨の warning のみを発行する（未知値チェックは走らない）

## Known Limitations

- jsdom v26+ は CSS レイアウトをサポートしないため、タッチターゲットサイズチェックはインライン `style` 属性のみ対象
- クラスベースまたはスタイルシートベースのサイズ指定は、現実装では未検証としてスキップ（追加 info は未出力）
