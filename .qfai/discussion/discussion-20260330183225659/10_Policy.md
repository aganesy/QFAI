# 10 Policy

## Security Policy

- Authentication: N/A（CLIツール、認証不要）
- Authorization: N/A
- Data protection: git操作で取得する情報はローカルリポジトリのみ。外部API呼び出しなし
- Secret management: N/A

## Compliance Policy

- Applicable standards: なし
- Audit requirements: なし
- Data retention: evidenceファイルは `.gitignore` でバージョン管理対象外（既存ポリシー準拠）

## Development Policy

- Branching strategy: feature branch → PR → main マージ
- Code review requirements: REVIEW.md に準拠。全reviewフィンディングをインラインPRコメントとして記録
- Testing requirements: 振る舞い変更・バグ修正は再現テストを先に書く。TypeScript変更時は `pnpm format:check && pnpm lint && pnpm check-types` 必須

## Operational Policy

- Deployment strategy: npmパッケージとして配布（既存パイプライン）
- Monitoring requirements: N/A（CLIツール）
- Incident response: N/A
