# 10_Policy

## Security Policy

- Authentication: N/A（ローカルファイルシステム操作のみ）
- Authorization: Windows では symlink 作成に Developer Mode が必要。これはセキュリティ上の制約であり、意図的に回避しない。
- Data protection: N/A
- Secret management: N/A

## Compliance Policy

- Applicable standards: N/A
- Audit requirements: N/A
- Data retention: N/A

## Development Policy

- Branching strategy: `feature/v1.5.4` ブランチで開発
- Code review requirements: PR レビュー必須
- Testing requirements:
  - `init.ts` の symlink 生成ロジックに対するユニットテスト
  - macOS と Windows でのクロスプラットフォームテスト
  - `--force` による migration テスト
  - 冪等性テスト（2回連続 init）

## Operational Policy

- Deployment strategy: npm パッケージとしてリリース
- Monitoring requirements: N/A
- Incident response: symlink 作成失敗時のエラーメッセージで対処法を案内
