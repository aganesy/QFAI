# 13_Deferred

| OQ-ID | Title | Gate | Deferred-Reason | Deferred-Until | Owner | Due | Severity | Impact | Mitigation | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| OQ-0006 | instructions テンプレートのアップグレードパス | ops | 初回配布の安全性を優先し、更新メカニズムは後続バージョンで設計する | v1.7.0 以降 | agent | v1.7.0 | medium | operations — ユーザーが QFAI 更新版の instructions を手動で反映する必要がある | create-only 配置により既存ファイルは保護される。ユーザーは手動で削除→再 init で更新可能 | Devils-Advocate Review Challenge 1 |
