# 99_delta

## Adopted Decisions

| DR-ID | Decision | Why |
| --- | --- | --- |
| DR-001 | UI-bearing discussion に design guideline research を mandatory step として追加する | root cause を discussion 側で閉じるため |
| DR-002 | `04_Sources.md` に `design_guideline_research` category を canonical 追加対象とする | guideline research を traceable に保持するため |
| DR-003 | TRD `score_anchors` は quantitative proxy を必須化する | 抽象 anchor のみを禁止するため |
| DR-004 | validator で coverage と concreteness を検査対象にする | regression を自動検知するため |
| DR-005 | package 固定ルール集の強制採用はしない | project context を守るため |

## Rejected Options

| DR-ID | Rejected option | Why rejected |
| --- | --- | --- |
| DR-R001 | prototyping skill だけで後追い補正する | upstream root cause を解消できない |
| DR-R002 | static cross-reference を package 標準にする | project adaptation を阻害する |
| DR-R003 | docs のみ更新して validator は追加しない | enforcement が不足する |

## Drift Log

0 items

## Recurrence Prevention

- discussion -> template -> validator の三層で requirement を同期させる
- future discussion feedback でも `.qfai/` ローカル mitigation を package SSOT と混同しない
