# 07 Decisions

## Decisions

1 item.

### DR-0005-0001: validate.json 不在時の exit code

- validate.json が存在しない場合は exit 2（バリデーション失敗の exit 1 と区別）
- Why: ユーザーが "validate を先に実行する必要がある" ことを明確に区別するため
