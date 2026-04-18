# 10_Policy

## P-01

- Statement: design quality の課題は downstream ローカル mitigation ではなく package SSOT で解決を目指す
- Rationale: 恒久性と再利用性を確保するため

## P-02

- Statement: UI-bearing でのみ design guideline research requirement を有効化する
- Rationale: non-ui pack への誤検知を避けるため

## P-03

- Statement: validator rule は actionable diagnostic を返す
- Rationale: AI agent が修正可能なフィードバックにするため

## P-04

- Statement: fixed rulebook を package 標準として強制しない
- Rationale: project context と採用ライブラリの違いを許容するため

## P-05

- Statement: 新ルールは staged rollout を基本とする
- Rationale: compatibility risk を制御するため
