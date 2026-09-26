# 04 Business Rules

## BR-0014-0001

- AC-Refs: AC-0014-0001, AC-0014-0027
- Verify is always full-scan.
- A validation error prevents Verify from passing.

## BR-0014-0002

- AC-Refs: AC-0014-0002
- Reviewer PASS/REVISE is part of the completion gate.

## BR-0014-0003

- AC-Refs: AC-0014-0003
- Validate remains the source of deterministic schema/evidence findings.

## BR-0014-0004

- AC-Refs: AC-0014-0004
- Legacy validator slices may still refer to `full-harness` artifact semantics if corresponding code remains.
- Such wording must not be interpreted as restoring a removed runtime or CLI entrypoint.

## BR-0014-0005

- AC-Refs: AC-0014-0005
- Verify treats `.qfai/evidence/prototyping/iter-NN/{<screen>.png, <screen>.html, review.json}` as the active evidence layout; legacy `screenshots/` / `html/` paths MUST not be required.

## BR-0014-0006

- AC-Refs: AC-0014-0006
- `prototyping iterate` cycle 0 MUST delete any legacy `fullHarness` block from the live `prototyping.json` as part of the hard reset, so the post-1.8.9 evolution loop never re-reads stale `full-harness` / `perfect-100` / `weighted-total` runtime state from a prior pre-1.8.9 session.

## BR-0014-0025

- AC-Refs: AC-0014-0022
- `qfai prototyping certify --scope saas-package` MUST seal `completion-certificate.json` with `scope: "saas-package"` and a non-empty `notes:` field naming every skipped gate (the ATDD / implement-class gates skipped by the SaaS-package validate profile, REQ-0166 validate side in spec-0004).
- The SaaS-package certificate MUST NOT claim full DONE; any field that would assert full completion MUST be withheld or set to the `saas-package` scope value.
- `--upgrade-scope full` MUST be rejected while any gate named in `notes:` is still missing, and MUST be permitted to upgrade the sealed certificate to full scope only after every previously-skipped gate PASSes.
- This `--scope saas-package` delivery mode MUST be documented in `/qfai-prototyping` SKILL.md as a SaaS-tenant delivery mode (DCON-005 design-system attestation reference; one-minor deprecation window per OC-63).

## BR-0014-0026

- AC-Refs: AC-0014-0023
- On the story tree, `references/articles.md` MUST restate the constitution's Article V chain rather than spell one of its own, with no TC hop and no `tdd/test-list.md`.
- Its Tests hop MUST split by layer as `.qfai/contracts/cli/qfai-validate.md#what-counts-as-a-test` states: a BF from E2E tests, an AC from integration or API tests, an EX from any selected test file.

## BR-0014-0027

- AC-Refs: AC-0014-0024
- On the story tree, `references/context-load.md` MUST read the spec tree from `<paths.specsDir>` and contracts from `<paths.contractsDir>`, never from a literal `.qfai/specs/` or `.qfai/contracts/` path.
- `tech.md` and `structure.md` MUST be read from `<paths.contractsDir>`, and the product facts from the policy files `objective.md`, `initiative.md` and `principle.md` under `<paths.specsDir>/01_policy/`, in place of `.qfai/assistant/catalog/` (`.qfai/contracts/cli/qfai-init.md#the-spec-tree`).

## BR-0014-0028

- AC-Refs: AC-0014-0025
- On the story tree, the decision sources `SKILL.md` names MUST be the rows of `decisions.md`, cited by `DEC-NNNN`, in place of a spec's `07_Decisions.md` and `_policies/08_Decisions.md` (`DR-*`).
- A row with Status REJECTED MUST be read as a rejected option (`.qfai/contracts/cli/qfai-validate.md#work-log-and-reviewer-gate`).

## BR-0014-0029

- AC-Refs: AC-0014-0026
- With the `rule/ skill/ agent/ prompt/` assistant tree, `/qfai-verify` MUST read the constitution from `.qfai/assistant/rule/` (`.qfai/contracts/cli/qfai-init.md#the-assistant-tree`).

## BR-0014-0030

- AC-Refs: AC-0014-0026
- With the `rule/ skill/ agent/ prompt/` assistant tree, `/qfai-verify` MUST take routing and review profiles from the built-in defaults, with each matching `qfai.config.yaml` override replacing its default entry (`.qfai/contracts/cli/qfai-init.md#configuration`).
- An agent's entry (`kind`, `owned_artifacts`, `tool_profile`, `permission_profile`, `specialization_tags`) MUST be read from its card frontmatter, not from `agent-catalog.yml`.
