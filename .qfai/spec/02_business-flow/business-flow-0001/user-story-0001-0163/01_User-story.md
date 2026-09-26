# US-0001-0163: Truthful verification evidence

## User Story

As a reviewer, I want truthful evidence and placeholder rejection to remain enforced, so that evidence summaries are trustworthy.

## Legacy Source Scope

- In:
  - `/qfai-verify` quality gates
  - `qfai validate --fail-on error`
  - review artifact presence and PASS/REVISE semantics
  - contract-first design/UI validators
  - prototyping design-system and evidence-related validators that still exist in code
  - direct discussion-pack validation path の coexistence
  - prototyping evidence path is `.qfai/evidence/prototyping/iter-NN/{<screen>.png, <screen>.html, review.json}` per iter; legacy `screenshots/` / `html/` directory layout is no longer the active SSOT
  - `/qfai-verify` no longer references "full-harness profile" / "perfect-100 completion gate" / "weighted-total scoring"; review-profiles.yml drops the full-harness profile entirely
  - SaaS-package certify scope (REQ-0166 certify side): `qfai prototyping certify --scope saas-package` seals `completion-certificate.json` with `scope: "saas-package"` + a `notes:` field naming what was skipped; MUST NOT claim full DONE; `--upgrade-scope full` upgrades only after the skipped gates land
  - `/qfai-verify` references on the story tree: the Article V chain without TC or a ledger (`references/articles.md`), the spec, contract and policy files it loads (`references/context-load.md`), and `decisions.md` as the decision source (`SKILL.md`)
  - `/qfai-verify` with the `rule/ skill/ agent/ prompt/` assistant tree: the constitution read from `rule/`, and routing and review profiles read from the built-in defaults plus `qfai.config.yaml` overrides
- Out:
  - diff-only verification
  - resurrecting a removed prototyping runtime

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0014/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0014/02_User-stories.md#us-0014-0014`
