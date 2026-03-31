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
