# 04 Business Rules

## Rule Table (required)

| BR-ID        | Title                     | AC-Refs                                  | Rule                                                                                                |
| ------------ | ------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------- |
| BR-0006-0001 | デフォルト format は text | AC-0006-0001                             | --format 未指定時はデフォルト text としてテキスト形式で診断結果を出力する                           |
| BR-0006-0002 | createDoctorData 委譲     | AC-0006-0001, AC-0006-0003, AC-0006-0004 | CLI コマンドは createDoctorData() に診断ロジックを委譲し、結果をフォーマットする                    |
| BR-0006-0003 | root 自動探索             | AC-0006-0001, AC-0006-0002               | --root が明示指定されない場合は startDir から qfai.config.yaml を探索して root を決定する           |
| BR-0006-0004 | failOn 判定               | AC-0006-0007, AC-0006-0008               | --fail-on 未指定時は常に exit 0。error: error > 0 で exit 1。warning: warning + error > 0 で exit 1 |
| BR-0006-0005 | --out 出力                | AC-0006-0009                             | --out 指定時はファイルに出力し、stdout には書き出さない。ディレクトリは自動作成する                 |
| BR-0006-0006 | summary 集計              | AC-0006-0006                             | summary は ok, info, warning, error のカウントを含む                                                |
| BR-0006-0007 | playwright primary probe order | AC-0006-0010 | `qfai doctor --profile prototyping` の probe 順序は (1) `node_modules/.bin/playwright` (Windows では `playwright.cmd` / `playwright.bat` / `playwright.ps1` variants) → (2) `npx --no-install playwright --version` fallback。順序は Flow C 相当の doctor reference (`03_Story-Workshop.md` 系) に記載する |
| BR-0006-0008 | playwright-cli deprecation window | AC-0006-0011 | `playwright-cli` (`.cmd` / `.bat` variants 含む) は deprecation window 中 accepted。検出時は `D-DEPRECATED-PROBE` を severity warning (during window) で fire。本 BR の sunset SSOT は `1.10.0`。sunset 到達時に同 finding は error にエスカレートする |
| BR-0006-0009 | probe failure error text | AC-0006-0011 | playwright も playwright-cli も検出されず npx fallback も失敗した場合、error text は install hint `npm i -D playwright` を必ず含む。曖昧表現 (例: "install playwright manually") は禁止 |
| BR-0006-0010 | skills.integrity defaults to warning | AC-0006-0013 | `qfai doctor` の `skills.integrity` check は finding severity を既定で `warning` とする (`error` ではない)。`--fail-on error` でも skills.integrity 単独では exit 0 を維持する (advisory)。`--fail-on warning` では従来通り exit 1 になる |
| BR-0006-0011 | doctor summary 2-group split | AC-0006-0014 | doctor summary 出力は findings を "errors blocking the active profile" / "warnings advisory of drift" の 2 group に明示的に分割する。`skills.integrity` は finding message wording にかかわらず必ず後者の group に属する。group ヘッダ文字列はテキスト/JSON 両 format で安定識別子として扱う |
