# QFAI: テストファイル glob 生成（プロジェクト分析→qfai.config.yaml 更新）

あなたはリポジトリを解析し、QFAI の SC→Test 判定に使用する「テストファイル glob」を作成します。

## 目的

- SC→Test の根拠は **テストファイル内の `QFAI:SC-xxxx`** アノテーションです。
- その抽出対象（テストファイル集合）を、プロジェクト実態に合わせて **過不足なく**指定してください。

## 手順

1. どのテストフレームワーク/ランナーが使われているかを特定してください。
   - 例: `package.json` の dependencies/devDependencies、設定ファイル（`vitest.config.*`, `jest.config.*`, `playwright.config.*` 等）、CI 設定など
2. テストファイルが存在するディレクトリと命名規則を列挙してください。
   - `tests/` 配下だけでなく、**`src/` 同居**（`*.test.*`）も考慮すること
   - e2e / integration / unit が分かれている場合はそれも考慮すること
3. 「テストファイル glob（含める）」を 3-10 個程度で提案してください。
   - 過剰に広い `**/*` は禁止（性能・誤検知の観点）
4. 「除外 glob」を提案してください（既定除外に加えて必要なら）。
5. `qfai.config.yaml` を更新してください。
   - `validation.traceability.testFileGlobs` に glob 配列を設定
   - 必要なら `validation.traceability.testFileExcludeGlobs` も設定
6. 更新後、実在するテストファイルを 5-15 件サンプリングし、各ファイルが提案 glob にマッチすることを示してください。
7. 最後に、提案 glob を 1 行ずつコメント付きでまとめてください（採用理由を短く）。

## 制約

- `.qfai/` 配下、`node_modules/`、ビルド成果物（`dist/`, `build/` 等）は対象外
- 変更は **glob 設定に限定**（テストやソースの内容改変はしない）
