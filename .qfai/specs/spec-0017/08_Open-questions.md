# 08 Open Questions

| OQ-ID        | Question                                                                 | Owner         | Due        | Status   | Resolution                                                                      |
| ------------ | ------------------------------------------------------------------------ | ------------- | ---------- | -------- | ------------------------------------------------------------------------------- |
| OQ-0017-0001 | iter-00 は 1 案 seed か、3 案提示→1 選択か                               | yusuke_senaga | 2026-05-01 | Resolved | **1 案 seed** (Anthropic 記事準拠、シンプル). D-0017-0009 と整合                |
| OQ-0017-0002 | Generator/Evaluator は同一 Claude thread で role 切替か、別 sub-agent か | yusuke_senaga | 2026-05-01 | Resolved | **別 sub-agent** (D-0017-0009)、self-preference bias 排除                       |
| OQ-0017-0003 | N=15 を constants 固定 vs config で可変                                  | yusuke_senaga | 2026-05-01 | Resolved | **constants 固定** (D-0017-0003)、mode 概念ごと削除                             |
| OQ-0017-0004 | UI-bearing でない spec の扱い                                            | yusuke_senaga | 2026-05-01 | Resolved | early abort + error。`prototypingIterate` が non-UI spec で起動拒否 (exit 2)    |
| OQ-0017-0005 | 旧 v1.x run の取り扱い                                                   | yusuke_senaga | 2026-05-01 | Resolved | **再実行強要、auto migration なし** (D-0017-0014)                               |
| OQ-0017-0006 | reference-pool は残すか廃止か                                            | yusuke_senaga | 2026-05-01 | Resolved | **残す**、ただし reviewer プロンプトで「逸脱対象」フレーミング (BR-0017-0008)   |
| OQ-0017-0007 | global anti-slop list の更新ポリシー                                     | yusuke_senaga | 2026-05-01 | Resolved | reviewer-prompt.md 直接編集 (PR で追加)                                         |
| OQ-0017-0008 | design-system 抽出は LLM か deterministic か                             | yusuke_senaga | 2026-05-01 | Resolved | **deterministic 中心 + LLM 補助** (token 抽出は CSS 値の頻度ベース、命名は LLM) |
| OQ-0017-0009 | Surface (web/mobile/desktop/mixed) は残すか                              | yusuke_senaga | 2026-05-01 | Resolved | **残す** (capture profile に必要、AI 振る舞いには中立)                          |
| OQ-0017-0006 (superseded) | reference-pool は残すか廃止か (UX-loop redesign で再決定) | yusuke_senaga | 2026-05-05 | Superseded | **Superseded by UX-loop redesign**: reference-pool.yaml は廃止、DESIGN.md SSOT に置換。「逸脱対象」フレーミングも撤回し、DESIGN.md による positive brand compliance に切替。See D-0017-0016, D-0017-0021, 09_delta.md OP-0007 / OP-0011b. Historical row preserved above per OC-04. |
| OQ-0017-0007 (superseded) | global anti-slop list の更新ポリシー (UX-loop redesign で再決定) | yusuke_senaga | 2026-05-05 | Superseded | **Superseded by UX-loop redesign**: slop-* (visual-aesthetic) は lap-* (structural layout) に置換され、anti-slop list 自体が廃止。lap-001..008 catalog が `qfai-prototyping/references/reviewer-prompt.md` に常駐。See D-0017-0018, 09_delta.md OP-0008b / OP-0002. Historical row preserved above per OC-04. |
| OQ-0017-0008 (superseded) | design-system 抽出は LLM か deterministic か (UX-loop redesign で再決定) | yusuke_senaga | 2026-05-05 | Superseded | **Superseded by UX-loop redesign**: design-system.yaml は HTML 抽出ではなく DESIGN.md token の **pure deterministic mirror** として生成。LLM 補助は廃止 (token 抽出は不要、命名は DESIGN.md が SSOT)。See D-0017-0020, 09_delta.md OP-0004. Historical row preserved above per OC-04. |

## Empty State

- 0 open questions (active).
- 3 superseded entries (OQ-0017-0006/0007/0008) annotated by UX-loop redesign; historical rows preserved per OC-04.
- All Q1..Q9 from the redesign plan are resolved with the user's plan-acceptance commit.
