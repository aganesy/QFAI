# 01 Spec — Prototyping v2.0 Single-Thread Design Evolution Loop

- Spec: spec-0017
- Parent: CAP-0017
- Status: active

## Consumer View

- Primary SSOT for execution: `spec-0017/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default
- Implementation plan reference: `~/.claude/plans/anthropic-ai-qfai-delegated-church.md` (working copy outside repo)

## Goal

`/qfai-prototyping` 実行時、Anthropic の "Harness design for long-running application development" 記事 (Dutch art museum 事例) のような **AI が自発的に iter-N で前 iter を全捨てして再構築する creative leap** が **デフォルトで** 発生する skill にする。

中核: 5–15 cycle にわたる single-thread serial iteration で、累積散文 critique が「現アプローチは generic」と告げた時点で AI 自身の判断で全捨て・再構築できる環境を harness が permission と reward として与える。

## Scope

### In

- `/qfai-prototyping` 全面再設計（funnel/mode/polish-branch/concept-anchor/best-of-history を全廃、single-thread 15-iter loop に置換）
- 評価軸を 4 軸固定（Design quality / Originality / Craft / Functionality）、ordinal scale (weak/acceptable/strong/exceptional) に統一
- Global anti-slop pattern list を `qfai-prototyping/references/reviewer-prompt.md` に常駐（per-project curation は不要）
- 完了条件の決定論化: `qfai prototyping iterate --cycle <n>` の exit code (0/64/65/2) のみが完了判定
- evidence layout 簡素化: per-iter は `screenshot.png` + `index.html` の 2 種のみ
- 新 CLI 3 コマンド: `iterate` / `certify` / `show-spec`
- skill 横断改修:
  - `/qfai-discussion`: 33_exploration_rubric / 34_evaluator_calibration sidecar 削除
  - `/qfai-sdd`: evaluation-rubric / evaluator-calibration / absorption-policy / selected-direction contract 削除
  - `/qfai-implement`: prototype-handoff schema 整合（mustPreserve/mayAdapt/mustNotCopy 三分類廃止）、design-system を入力扱いに昇格
  - `/qfai-verify`: prototyping evidence path 更新、full-harness 言及削除
  - steering: agent-routing.yml の prototyping routing 再構築、review-profiles.yml から full-harness profile 削除

### Out

- 旧 v1.x との後方互換維持（destructive change、再実行強要）
- 旧 v1.x run の自動 migration
- per-project 評価軸定義（軸は code constants として固定）
- per-project anti-slop curation（global list を PR で更新）

## Applicable NFR

- NFR-0001: routing policy remains centralized
- NFR-0002: specialist responsibilities stay explicit
- NFR-0003: first delegation failure hard-stops the stage

## Applicable Policy

- 完了は `qfai prototyping certify --check` の exit code でのみ判定。LLM 主観 DONE 禁止。
- 最新 iter が常に accepted。一時退行を許す（leap regression は creative breakthrough の正規パス）。
- reference-pool は **deviate from** 入力。imitate しない。

## Evidence Summary

- Code: `packages/qfai/src/core/prototyping/{iteration,evaluatorReview,certificate}.ts`、`packages/qfai/src/cli/commands/prototypingIterate.ts`
- Skill: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/{SKILL.md,references/{iteration-loop,generator-prompt,reviewer-prompt,handoff}.md}`
- Validators: `packages/qfai/src/core/validators/prototypingEvidenceV3.ts`、`prototyping/{refIntegrity,specIdLinkage,stateGate,completionCertificate}.ts`
- Cert: `.qfai/evidence/prototyping/completion-certificate.json` (schema v2.0)
- Sanity: `packages/qfai/scripts/check-no-legacy-concepts.sh`

## Relevant Requirements

- REQ-0017-0001: AI が iter-N で前 iter を全捨てして再構築できる pivot directive プロンプトを generator が受け取る
- REQ-0017-0002: 4 軸 ordinal score (weak/acceptable/strong/exceptional) と 200–500 語の散文 critique を reviewer が出力する
- REQ-0017-0003: 完了は (4 軸全 exceptional かつ slop=0) または (iter index === 14) の決定論判定で行う
- REQ-0017-0004: best-of-history を持たず最新 iter が常に accepted となる
- REQ-0017-0005: anti-slop 検出時 originality は acceptable cap、exceptional 不可
- REQ-0017-0006: per-iter evidence は `screenshot.png` + `index.html` の 2 種のみ
- REQ-0017-0007: mode/funnel/polish-branch/concept-anchor/100-perfect の概念が QFAI 全 codebase から物理削除される (sanity grep zero)
- REQ-0017-0008: cross-skill (discussion/sdd/implement/verify/steering) は削除のみで新規追加ゼロ
- REQ-0017-0009: SKILL.md ≤ 130 行、references 4 ファイル合計 ≤ 290 行を維持

## Entry points

- US range: US-0017-0001..US-0017-0010
- AC range: AC-0017-0001..AC-0017-0014
- TC range: TC-0017-0001..TC-0017-0020 (+ E2E TC-0017-E2E-0001)
- Primary actors: orchestrator, product-experience-architect (generator), product-surface-reviewer (evaluator), devops-ci-engineer (capture)
