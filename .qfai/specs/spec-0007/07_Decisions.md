# 07 Decisions

## Decisions

1 item.

### DR-0007-0001: RFC 2119 キーワードベース検出

- ガードレール検出は RFC 2119 キーワード（MUST, MUST NOT, SHALL, SHALL NOT, SHOULD, SHOULD NOT, MAY）を大文字小文字区別なしで検索して行う
- Why: H2 見出し限定では検出漏れリスクがあるため、キーワードベースの方が網羅的
- Source: 旧 spec-0005 DELTA-0002
