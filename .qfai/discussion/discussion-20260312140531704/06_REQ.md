# 06_REQ

## 機能要件

| REQ-ID | タイトル | 説明 | ソース | 優先度 |
| --- | --- | --- | --- | --- |
| REQ-0001 | AskUserQuestion Protocol セクション追加 | 全 9 SSOT スキルの SKILL.md に `## User Questions (AskUserQuestion Protocol)` セクションを追加する | SRC-0011 | 必須 |
| REQ-0002 | AskUserQuestion 優先使用ルール | セクション内に「AskUserQuestion が利用可能な場合は優先して使用する」旨を明記する | SRC-0001 | 必須 |
| REQ-0003 | 構造化選択肢の優先 | 「AskUserQuestion が構造化選択肢（ラジオ/マルチセレクト等）をサポートする場合、フリーテキストよりそれを優先する」旨を明記する | SRC-0001 | 必須 |
| REQ-0004 | フォールバック動作 | 「AskUserQuestion が利用不可の場合は、同じ質問を通常メッセージで選択肢を明記して確認する」旨を明記する | SRC-0001 | 必須 |
| REQ-0005 | スキル固有の質問例 | 各スキルのセクションに、そのスキル固有の質問場面（Simulation mode、OQ resolution等）を括弧内で例示する | SRC-0011 | 必須 |
| REQ-0006 | 統一配置場所 | セクションの配置場所を `[DRIFT-PROTOCOL:MANDATORY]` 直後、既存の FORMAT SSOT / Deprecation Notice の前に統一する | SRC-0012 | 必須 |
