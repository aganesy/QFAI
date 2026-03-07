# 02 User Stories

## US Catalog

- US-0005-0001: ガードレール一覧 - guardrails list で全ガードレールを一覧表示
- US-0005-0002: ガードレール抽出 - guardrails extract でキーワードフィルタリング
- US-0005-0003: ガードレール整合性チェック - guardrails check で成果物との整合性チェック

## US-0005-0001: ガードレール一覧

- Parent: CAP-0005
- Goal: AI エージェントとして、`qfai guardrails list` で全ガードレールを一覧表示し、スペック作成時に参照可能なルール全体を把握できること
- Non-goals: ガードレールの編集・追加・削除
- Notes: _policies/ および spec 内の制約事項からガードレールを検出する

## US-0005-0002: ガードレール抽出

- Parent: CAP-0005
- Goal: AI エージェントとして、`qfai guardrails extract --keyword <keyword>` でキーワードに合致するガードレールを抽出し、関連する制約のみを効率的に参照できること
- Non-goals: 正規表現やファジー検索
- Notes: キーワードは大文字小文字を区別しない部分一致とする

## US-0005-0003: ガードレール整合性チェック

- Parent: CAP-0005
- Goal: AI エージェントとして、`qfai guardrails check` で現在の成果物がガードレールに適合しているかを検証し、ドリフトを早期に検出できること
- Non-goals: 自動修正
- Notes: check 結果は Issue 形式（code, message, suggested_action）で出力する
