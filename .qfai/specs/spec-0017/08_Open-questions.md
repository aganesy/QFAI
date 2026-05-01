# 08 Open Questions

| OQ-ID   | Question | Owner | Due | Status | Resolution |
| ------- | -------- | ----- | --- | ------ | ---------- |
| OQ-0017-0001 | iter-00 は 1 案 seed か、3 案提示→1 選択か | yusuke_senaga | 2026-05-01 | Resolved | **1 案 seed** (Anthropic 記事準拠、シンプル). D-0017-0009 と整合 |
| OQ-0017-0002 | Generator/Evaluator は同一 Claude thread で role 切替か、別 sub-agent か | yusuke_senaga | 2026-05-01 | Resolved | **別 sub-agent** (D-0017-0009)、self-preference bias 排除 |
| OQ-0017-0003 | N=15 を constants 固定 vs config で可変 | yusuke_senaga | 2026-05-01 | Resolved | **constants 固定** (D-0017-0003)、mode 概念ごと削除 |
| OQ-0017-0004 | UI-bearing でない spec の扱い | yusuke_senaga | 2026-05-01 | Resolved | early abort + error。`prototypingIterate` が non-UI spec で起動拒否 (exit 2) |
| OQ-0017-0005 | 旧 v1.x run の取り扱い | yusuke_senaga | 2026-05-01 | Resolved | **再実行強要、auto migration なし** (D-0017-0014) |
| OQ-0017-0006 | reference-pool は残すか廃止か | yusuke_senaga | 2026-05-01 | Resolved | **残す**、ただし reviewer プロンプトで「逸脱対象」フレーミング (BR-0017-0008) |
| OQ-0017-0007 | global anti-slop list の更新ポリシー | yusuke_senaga | 2026-05-01 | Resolved | reviewer-prompt.md 直接編集 (PR で追加) |
| OQ-0017-0008 | design-system 抽出は LLM か deterministic か | yusuke_senaga | 2026-05-01 | Resolved | **deterministic 中心 + LLM 補助** (token 抽出は CSS 値の頻度ベース、命名は LLM) |
| OQ-0017-0009 | Surface (web/mobile/desktop/mixed) は残すか | yusuke_senaga | 2026-05-01 | Resolved | **残す** (capture profile に必要、AI 振る舞いには中立) |

## Empty State

- 0 open questions.
- All Q1..Q9 from the redesign plan are resolved with the user's plan-acceptance commit.
