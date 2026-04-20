# 13_Deferred

| OQ-ID | Title | Gate | Deferred-Reason | Deferred-Until | Owner | Due | Severity | Impact | Mitigation | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OQ-0003 | 初期 severity を warning に固定するか | sdd | 既存 discussion pack への影響棚卸しが未完 | SDD で migration plan 作成時 | team | 2026-04-25 | medium | validator rollout の速度と CI 安定性に影響 | discussion では staged rollout を policy として先に固定した | SRC-0001 §3 Fix D |
| OQ-0004 | validator rule の配置先をどの module にするか | sdd | module 分割は現行 codebase 調査が必要 | SDD で implementation slice 決定時 | team | 2026-04-25 | medium | 実装責務とテスト配置に影響 | requirement は split 可能な形に留め、配置は後段で決める | SRC-0001 §5 |
