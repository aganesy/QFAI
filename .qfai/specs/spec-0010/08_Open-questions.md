# 08 Open Questions

## Open Questions

### OQ-0010-0001: evaluator calibration refresh cadence (tdd)

- Context: `34_evaluator_calibration.md` は blandness fail / originality fail / good critique 例を保持するが、どの差分量や artifact 変化があれば例を更新すべきかの閾値は未固定。
- Carry-forward source: exploration-first rebuild follow-up
- Resolution phase: tdd
- Impact if unresolved: calibration が stale でも flow 自体は動くが、evaluator の厳しさが drift して originality 判定の一貫性が落ちる可能性がある。
- Decision point needed: refresh trigger を commit diff / validator drift / review false-positive 率のどれに寄せるか。

## Resolved (v1.9.2 Second-Wave)

- OQ-0156 (`QFAI-MOCK-010` direction): RESOLVED by \_policies DR-0265 → option b (anchor-form template default + strict validator). See DR-0010-0005 / REQ-0154.
- OQ-0157 (active discussion session pointer surface): RESOLVED by \_policies DR-0266 → option B (`state.json#discussion.currentId` SSOT, `discussion list --active` read view). See DR-0010-0006 / REQ-0155.
