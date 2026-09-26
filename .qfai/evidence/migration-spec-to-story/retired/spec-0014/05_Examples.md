# 05 Examples

## EX-0014-0001

- BR-Ref: BR-0014-0001
- Given verify runs on a UI-bearing repo
- When validate returns an error
- Then verify remains non-pass

## EX-0014-0035: Canonical validator import

- BR-Ref: BR-0014-0003
- Given the validate command is loaded
- When its public entrypoint is inspected
- Then Validate imports the canonical validator and exposes no removed compatibility namespace

## EX-0014-0036: Full-scan Verify

- BR-Ref: BR-0014-0001
- Given `/qfai-verify` is invoked
- When it selects validation scope
- Then it runs full-scan validation rather than a diff-only shortcut

## EX-0014-0002

- BR-Ref: BR-0014-0002
- Given a review artifact says `REVISE`
- Then verify blocks completion

## EX-0014-0025

- BR-Ref: BR-0014-0004
- Given a legacy design-system scoring artifact omits `designSystemCompliance`
- Then the relevant validator slice may still emit a finding according to its scoped semantics

## EX-0014-0026

- BR-Ref: BR-0014-0005
- Given a UI-bearing repo with prototyping evidence under `.qfai/evidence/prototyping/iter-03/{home.png, home.html, review.json}`
- When `/qfai-verify` inspects evidence
- Then the iter-03 layout is accepted as the active SSOT and any required-path lookup against legacy `screenshots/` / `html/` directories is not raised

## EX-0014-0027

- BR-Ref: BR-0014-0006
- Given a `prototyping.json` that carries a legacy `fullHarness: { ... }` block from a pre-1.8.9 run
- When `prototyping iterate` runs cycle 0 (the hard-reset cycle)
- Then the live `prototyping.json` no longer contains the `fullHarness` key after the cycle, so the post-1.8.9 evolution loop never re-reads stale runtime state

## EX-0014-0029

- BR-Ref: BR-0014-0025
- Given a SaaS-tenant project whose prototyping evidence is complete but whose ATDD / implement-class gates were skipped
- When `qfai prototyping certify --scope saas-package` is run
- Then the sealed `completion-certificate.json` contains `scope: "saas-package"` and `notes: "skipped: atdd-class gate; implement-class gate"`, does not assert full DONE, and a subsequent `--upgrade-scope full` before the gates land is rejected with a message naming the still-missing gates; after both gates PASS the same flag upgrades the certificate to full scope

## EX-0014-0030

- BR-Ref: BR-0014-0026
- Given a project on the story tree
- When `/qfai-verify` reads `references/articles.md`
- Then the file restates the constitution's Article V chain instead of spelling its own, with no TC hop and no `tdd/test-list.md`, and its Tests hop answers a BF from E2E tests, an AC from integration or API tests, and an EX from any selected test file

## EX-0014-0031

- BR-Ref: BR-0014-0027
- Given a project on the story tree whose `qfai.config.yaml` sets `paths.specsDir: docs/specs` and `paths.contractsDir: docs/contracts`
- When `/qfai-verify` loads context through `references/context-load.md`
- Then it reads the spec tree from `docs/specs`, the contracts, `tech.md` and `structure.md` from `docs/contracts`, and the product facts from the policy files under `docs/specs/01_policy/`; it reads nothing from `.qfai/specs/`, `.qfai/contracts/` or `.qfai/assistant/catalog/`

## EX-0014-0032

- BR-Ref: BR-0014-0028
- Given a project on the story tree whose `decisions.md` holds a row `DEC-NNNN` at Status DONE and a second row at Status REJECTED
- When `/qfai-verify` gathers the decision sources its `SKILL.md` names
- Then it cites the DONE row by its `DEC-NNNN` ID, reads the REJECTED row as a rejected option, and reads no `07_Decisions.md` or `_policies/08_Decisions.md`

## EX-0014-0033

- BR-Ref: BR-0014-0029
- Given a project with the `rule/ skill/ agent/ prompt/` assistant tree
- When `/qfai-verify` loads its constitution
- Then it reads the constitution from `.qfai/assistant/rule/`, and it cites no `.qfai/assistant/constitution/` path

## EX-0014-0034

- BR-Ref: BR-0014-0030
- Given a project with the `rule/ skill/ agent/ prompt/` assistant tree whose `qfai.config.yaml` overrides one routing entry and no review profile
- When `/qfai-verify` loads its routing, its review profiles and the acting agent's entry
- Then the routing is the built-in defaults with that one entry replaced by the override, the review profiles are the built-in defaults unchanged, and the agent's `kind`, `owned_artifacts`, `tool_profile`, `permission_profile` and `specialization_tags` come from its card frontmatter, not from `agent-catalog.yml`
