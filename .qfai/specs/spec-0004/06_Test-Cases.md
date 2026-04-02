# 06 Test Cases

## Test Case Table (required)

| TC-ID        | Level       | AC-Refs      | EX-Ref       | Title                                |
| ------------ | ----------- | ------------ | ------------ | ------------------------------------ |
| TC-0004-0001 | integration | AC-0004-0001 | EX-0004-0001 | 全バリデータ実行と Issue 集約        |
| TC-0004-0002 | integration | AC-0004-0002 | EX-0004-0002 | デフォルト full フェーズ             |
| TC-0004-0003 | unit        | AC-0004-0003 | EX-0004-0003 | --fail-on error で warning は pass   |
| TC-0004-0004 | unit        | AC-0004-0004 | EX-0004-0004 | --fail-on warning で warning は fail |
| TC-0004-0005 | integration | AC-0004-0005 | EX-0004-0005 | --format github アノテーション出力   |
| TC-0004-0006 | integration | AC-0004-0006 | EX-0004-0006 | validate.json 出力                   |
| TC-0004-0007 | integration | AC-0004-0007 | EX-0004-0007 | ランログ生成                         |
| TC-0004-0008 | integration | AC-0004-0008 | EX-0004-0008 | ウェイバー suppress 適用             |
| TC-0004-0009 | integration | AC-0004-0009 | EX-0004-0009 | 必須ファイル欠落検出                 |
| TC-0004-0010 | integration | AC-0004-0010 | EX-0004-0010 | ID フォーマット不正検出              |
| TC-0004-0011 | integration | AC-0004-0011 | EX-0004-0011 | トレーサビリティエッジ欠落           |
| TC-0004-0012 | integration | AC-0004-0012 |              | ATDD アノテーション検証              |
| TC-0004-0013 | integration | AC-0004-0013 |              | blocking OQ 検出                     |
| TC-0004-0014 | integration | AC-0004-0014 |              | 冪等性 - 2回実行で同一結果           |
| TC-0004-0015 | integration | AC-0004-0015 | EX-0004-0012 | phase guard refinement ブロック      |
| TC-0004-0017 | integration | AC-0004-0016 | EX-0004-0014 | Canonical UIX aggregator 動作確認    |
| TC-0004-0018 | integration | AC-0004-0017 | EX-0004-0014 | 新 3-layer ファイル名期待の検証      |
| TC-0004-0019 | integration | AC-0004-0018 | EX-0004-0015 | 旧 4-axis ファイル migration warning |
| TC-0004-0020 | integration | AC-0004-0019 | EX-0004-0016 | Non-UI パック UIX スキップ           |
| TC-0004-0021 | unit        | AC-0004-0020 | EX-0004-0017 | render-evidence truthful state       |
| TC-0004-0022 | unit        | AC-0004-0021 | EX-0004-0018 | Browser QA minimal runner truthful   |

## TC-0004-0001: 全バリデータ実行と Issue 集約

**Level:** integration
**AC Refs:** AC-0004-0001

Setup: テストプロジェクトに正常なスペック構造を配置する。
Action: `runValidate({ root, strict: false })` を実行する。
Verify:

- ValidationResult に issues, counts, traceability が含まれる
- validate.json が出力される

## TC-0004-0005: --format github アノテーション出力

**Level:** integration
**AC Refs:** AC-0004-0005

Setup: 複数の Issue が検出されるスペック構造を配置する。
Action: `runValidate({ root, format: 'github' })` を実行する。
Verify:

- stdout に `::error` または `::warning` 形式の出力がある
- 重複排除されている
- summary 行に counts が含まれる

## TC-0004-0016: Coverage Placeholder for EX-0004-0013

- EX-Ref: EX-0004-0013
- AC-Refs: AC-0004-0001
- Verify that migrated example EX-0004-0013 is covered by at least one test case.

## TC-0004-0017: Canonical UIX aggregator 動作確認

**Level:** integration
**AC Refs:** AC-0004-0016
**EX Ref:** EX-0004-0014

Setup: UI-bearing なスペック構造に新 3-layer テンプレートファミリー全ファイルを配置する。
Action: `runAllUixValidators(root, config)` を実行する。
Verify:

- レガシー互換パスを経由せず canonical aggregator として Issue[] が返される
- validate.ts からの呼び出しが直接 canonical パスにルーティングされている
- 返却された Issue[] にレガシー集約由来のアーティファクトが含まれない

## TC-0004-0018: 新 3-layer ファイル名期待の検証

**Level:** integration
**AC Refs:** AC-0004-0017
**EX Ref:** EX-0004-0014

Setup: uiux/ に 11_design_taste_interview.md, 20_design_eval_invariant.md, 21_design_eval_trend_derived.md, 22_design_eval_product_specific.md, 23_design_eval_aggregate.md, 24_design_eval_dynamic_overrides.md を配置する。
Action: UIX バリデータを実行する。
Verify:

- 6 ファイル全てが検証対象として認識される
- 各ファイルに対応するバリデータが実行される
- ファイル欠落時に適切なエラーコードが報告される

## TC-0004-0019: 旧 4-axis ファイル migration warning

**Level:** integration
**AC Refs:** AC-0004-0018
**EX Ref:** EX-0004-0015

Setup: uiux/ に旧 4-axis ファイル（20_eval_axis_usability.md 等）を配置し、新 3-layer ファイルは配置しない。
Action: UIX バリデータを実行する。
Verify:

- UIX-VAL-3LAYER-LEGACY-FORMAT warning が発行される
- warning メッセージに新 3-layer ファイルへの移行ガイダンスが含まれる
- 旧ファイルに対するバリデーションは実行されない（D-004 準拠）

## TC-0004-0020: Non-UI パック UIX スキップ

**Level:** integration
**AC Refs:** AC-0004-0019
**EX Ref:** EX-0004-0016

Setup: UI コントラクト（uiux/ ディレクトリ）を含まないスペック構造を配置する。
Action: `qfai validate` を実行する。
Verify:

- UIX バリデータがスキップされる
- UIX 関連の error/warning が生成されない
- 他のバリデータは正常に実行される

## TC-0004-0021: render-evidence truthful state

**Level:** unit
**AC Refs:** AC-0004-0020
**EX Ref:** EX-0004-0017

Setup: render-evidence 対象があるが、キャプチャ環境（ブラウザ等）が未構成の状態を作る。
Action: render-evidence バリデータを実行する。
Verify:

- 返却 status が `skipped` である（`captured` や placeholder ではない）
- skip 理由が明示されている
- プレースホルダー pass が返されない

## TC-0004-0022: Browser QA minimal runner truthful

**Level:** unit
**AC Refs:** AC-0004-0021
**EX Ref:** EX-0004-0018

Setup: Browser QA テスト対象が定義されているが、テストが未実行の状態を作る。
Action: Browser QA バリデータを実行する。
Verify:

- 未実行テストが `not-run` として報告される
- pass count に未実行テストが含まれない
- minimal runner のスコープ（実行可能な検証のみ）が明確に区別される
