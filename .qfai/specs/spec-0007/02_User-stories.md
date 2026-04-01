# 02 User Stories

## US Catalog

- US-0007-0001: ガードレール一覧 - guardrails list で全ガードレールを一覧表示
- US-0007-0002: ガードレール抽出 - guardrails extract でキーワードフィルタリング（--keyword, --max）
- US-0007-0003: ガードレール整合性チェック - guardrails check で成果物との整合性チェック

## US-0007-0001: ガードレール一覧

- Parent: CAP-0007
- Goal: `qfai guardrails list` で全ガードレール（\_policies/ および spec 内の制約事項）を ID・タイプ・テキスト・ソースファイル付きで一覧表示する
- Non-goals: ガードレールの編集・追加・削除
- Notes: 出力は `# Decision Guardrails (list)` ヘッダ付きの Markdown リスト形式。検出は RFC 2119 キーワードベース

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
