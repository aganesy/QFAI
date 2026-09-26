# 02 User Stories

## US Catalog

- US-0007-0001: ガードレール一覧 - guardrails list で全ガードレールを一覧表示
- US-0007-0002: ガードレール抽出 - guardrails extract でキーワードフィルタリング（--keyword, --max）
- US-0007-0003: ガードレール整合性チェック - guardrails check で成果物との整合性チェック
- US-0007-0004: ガードレール入力エラー - action 不在または明示パスの読み込み失敗を exit 2 で知らせる

## US-0007-0001: ガードレール一覧

- Parent: CAP-0007
- Goal: `qfai guardrails list` で policy と contract の明示的な `DG-NNNN` 項目を ID・種別・根拠・再検討条件・ソースファイル付きで一覧表示する
- Non-goals: ガードレールの編集・追加・削除
- Notes: 出力は `# Decision Guardrails (list)` ヘッダ付きの Markdown リスト形式。RFC 2119 の語から自動抽出しない

## US-0007-0002: ガードレール抽出

- Parent: CAP-0007
- Goal: `qfai guardrails extract --keyword <keyword>` でキーワードに合致するガードレールを抽出し、LLM 向けフォーマットで出力する。`--max` で出力上限を制御する（デフォルト 20）
- Non-goals: 正規表現やファジー検索
- Notes: キーワードは大文字小文字を区別しない部分一致。`--max` が非負整数でない場合はエラー

## US-0007-0003: ガードレール整合性チェック

- Parent: CAP-0007
- Goal: `qfai guardrails check` で検出されたガードレールの整合性を検証し、error/warning を Issue 形式で出力する。error > 0 で exit 1
- Non-goals: 自動修正
- Notes: Issue には code, message, file, line, id, severity が含まれる

## US-0007-0004: ガードレール入力エラー

- Parent: CAP-0007
- Goal: action 不在、または `--path` で明示した入力を読めない場合に、利用者が原因を特定できるエラーと exit 2 を受け取る
- Non-goals: 読み込み失敗を空のガードレール集合として扱うこと、入力の自動修復
