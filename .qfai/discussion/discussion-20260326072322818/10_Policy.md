# 10 Policy

## Security Policy

- Authentication: N/A（CLI ツール）
- Authorization: N/A
- Data protection: バリデータはローカルファイルのみ読み取り。外部通信なし
- Secret management: N/A

## Compliance Policy

- Applicable standards: MIT License 準拠
- Audit requirements: CI (format/lint/型/テスト) 通過が merge 条件
- Data retention: N/A

## Development Policy

- Branching strategy: feature branch → PR → main
- Code review requirements: 全変更に PR レビュー必須
- Testing requirements: 新規バリデータに unit test 必須、既存テスト全パス

## Operational Policy

- Deployment strategy: npm publish (pnpm workspace)
- Monitoring requirements: N/A（CLI ツール）
- Incident response: GitHub Issues
