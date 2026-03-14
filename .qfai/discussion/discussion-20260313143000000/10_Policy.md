# 10_Policy

## Security Policy

- Authentication: N/A（ローカル CLI ツール）
- Authorization: N/A
- Data protection: evidence ファイルに機密情報を含めない（commit SHA、タイムスタンプ、ファイルパスのみ）
- Secret management: N/A

## Compliance Policy

- Applicable standards: N/A
- Audit requirements: evidence ファイルによるスキル実行の追跡可能性を維持
- Data retention: evidence ファイルは gitignore 対象（`.qfai/evidence/` はデフォルトで git 管理外）。追跡可能性は review-pack、report、delta 記録で担保する

## Development Policy

- Branching strategy: feature/v1.5.5 ブランチで開発
- Code review requirements: SKILL.md の変更は /qfai-discussion → /qfai-sdd のパイプラインを経由
- Testing requirements: 改修後の SKILL.md で /qfai-verify を実行し品質ゲートを通過すること

## Operational Policy

- Deployment strategy: `qfai init` による SKILL.md の配布（symlink 経由）
- Monitoring requirements: evidence ファイルの `execution_mode` フィールドでインクリメンタル/フル実行の追跡
- Incident response: `--full` フラグによるフルスキャンへの即座のフォールバック
