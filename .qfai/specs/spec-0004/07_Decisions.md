# 07 Decisions

## Decisions

2 items.

### DR-0001: GitHub annotation 重複排除

- 重複する Issue は issueKey (code|severity|message|file|line|column|suppressed) で排除する
- Why: GitHub Actions のアノテーション上限（100件）を有効活用するため

### DR-0002: Phase guard による refinement ブロック

- CI 環境で `--phase refinement` を指定した場合、バリデーションをスキップし blocking issue を生成する
- Why: refinement フェーズは開発者のローカル検証用であり、CI では full フェーズを使用すべきため
