# 10 Policy

## Security Policy

- Authentication: N/A（CLIツール、認証なし）
- Authorization: N/A
- Data protection: Evidence（.qfai/evidence/）はgitignored by default
- Secret management: N/A

## Compliance Policy

- Applicable standards: MIT License
- Audit requirements: Review Roster（10 reviewers）によるレビュー必須
- Data retention: Review packはappend-only（削除禁止）

## Development Policy

- Branching strategy: feature/qfai-sdd-specs（本discussion起点のブランチ）
- Code review requirements: 全Skill出力はReview Roster（10 reviewers）で review; FAIL即修正、roster先頭から再実行
- Testing requirements: qfai validate --fail-on error でエラー0; 新規specは既存layered spec validatorで検証

## Operational Policy

- Deployment strategy: specs変更はPR経由でmainにmerge
- Monitoring requirements: CI/CDでqfai validateを自動実行
- Incident response: Drift Protocol発動 → Change Request → ユーザー承認 → owner skill rerun

## Spec Management Policy（本discussionで追加）

- SSOT階層: SKILL.md/agent定義 > specs > discussion pack
- 変更フロー: SKILL.md/agent定義が変更 → 対応するspec-XXXXを更新（drift-protocol遵守）
- 参照方向: specs → SKILL.md/agent定義（specs側にSSOT参照先を明記）
- 新規CAPのカテゴリ: 「フレームワーク設計仕様」（CLIコマンドとは別カテゴリ）
