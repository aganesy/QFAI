# 05 Examples

## Example Table (required)

| EX-ID        | BR-Ref       | Input                                              | Expected                                                  |
| ------------ | ------------ | -------------------------------------------------- | --------------------------------------------------------- |
| EX-0006-0001 | BR-0006-0001 | `qfai doctor`（正常な設定）                        | テキスト形式で root, config, checks, summary が出力される |
| EX-0006-0002 | BR-0006-0001 | `qfai doctor --format json`                        | JSON 形式で同等の情報が出力される                         |
| EX-0006-0003 | BR-0006-0003 | `qfai doctor`（--root 未指定、cwd に config あり） | root が自動検出される                                     |
| EX-0006-0004 | BR-0006-0004 | `qfai doctor --fail-on error`、warning のみ        | 終了コード 0                                              |
| EX-0006-0005 | BR-0006-0004 | `qfai doctor --fail-on warning`、warning あり      | 終了コード 1                                              |
| EX-0006-0006 | BR-0006-0005 | `qfai doctor --out /tmp/doctor.json --format json` | /tmp/doctor.json に出力、stdout は info メッセージのみ    |
| EX-0006-0007 | BR-0006-0002 | `qfai doctor`（config 不在）                       | config.found = false、warning チェック出力                |
| EX-0006-0008 | BR-0006-0002 | `qfai doctor`（specs/ 欠落）                       | ディレクトリ欠落が warning として報告                     |
| EX-0006-0010 | BR-0006-0007 | `qfai doctor --profile prototyping` (node_modules/.bin/playwright が存在) | primary probe で playwright が検出される; 順序ログに primary→fallback の段が表示される |
| EX-0006-0011 | BR-0006-0008 | `qfai doctor --profile prototyping` (playwright-cli のみが node_modules に存在) | playwright-cli が accepted; `D-DEPRECATED-PROBE` warning が fire; sunset 文字列 `1.10.0` が message body に含まれる |
| EX-0006-0012 | BR-0006-0009 | `qfai doctor --profile prototyping` (playwright も playwright-cli も無い) | error text に `npm i -D playwright` が含まれる; severity error |
| EX-0006-0013 | BR-0006-0010 | `qfai doctor` (skills.integrity drift あり、`--fail-on error`) | exit 0; skills.integrity finding が severity warning として出力される |
| EX-0006-0014 | BR-0006-0011 | `qfai doctor --format text` (skills.integrity warning + ディレクトリ欠落 warning + config 不在 error が混在) | summary に "errors blocking the active profile" group が config 不在 error を含み、"warnings advisory of drift" group が skills.integrity + specs/ 欠落を含む |

## EX-0006-0009: Coverage Placeholder for BR-0006-0006

- BR-Ref: BR-0006-0006
- Given the consolidated rule BR-0006-0006
- When layer coverage is evaluated
- Then at least one example exists for BR-0006-0006
