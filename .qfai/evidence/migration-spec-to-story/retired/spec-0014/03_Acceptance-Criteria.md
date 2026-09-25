# 03 Acceptance Criteria

## AC-0014-0001

```gherkin
Scenario: AC-0014-0001
  Given /qfai-verify is invoked
  When validation scope is selected
  Then `/qfai-verify` runs full-scan validation rather than a diff-only shortcut.
```

## AC-0014-0002

```gherkin
Scenario: AC-0014-0002
  Given reviewer artifacts exist
  When /qfai-verify evaluates completion
  Then Verify inspects reviewer artifacts and blocks on `REVISE`.
```

## AC-0014-0027: Verify does not pass when validation reports an error

- US-Refs: US-0014-0013

```gherkin
Scenario: Verify remains blocked by a validation error
  Given `/qfai-verify` runs full-scan validation through the canonical validator
  When validation reports an error
  Then Verify remains non-pass and surfaces the validation error.
```

## AC-0014-0003

```gherkin
Scenario: AC-0014-0003
  Given the validate command is loaded
  When its public entrypoint is inspected
  Then Validate imports and uses the canonical validator entrypoint.
  And Removed compatibility surfaces are not present in the package surface.
```

## AC-0014-0004

```gherkin
Scenario: AC-0014-0004
  Given design-system prerequisites exist
  When their validators are selected
  Then Design-system related validators continue to run when their prerequisite files/artifacts exist.
  And Legacy `full-harness` wording inside validator slices is treated as artifact vocabulary, not as a public command contract.
```

## AC-0014-0005: Prototyping Evidence Path Layout

```gherkin
Scenario: Prototyping Evidence Path Layout
  Given a `/qfai-verify` run on a UI-bearing repo,
  When prototyping evidence is inspected,
  Then the active layout is `.qfai/evidence/prototyping/iter-NN/{<screen>.png, <screen>.html, review.json}` per iter; the legacy `screenshots/` / `html/` directory layout is no longer accepted as the active SSOT.
```

## AC-0014-0006: Full-Harness Block Drop on Cycle 0

```gherkin
Scenario: Full-Harness Block Drop on Cycle 0
  Given a `prototyping.json` that carries a legacy `fullHarness` block from a prior pre-1.8.9 run,
  When `prototyping iterate` runs cycle 0,
  Then the cycle-0 hard reset removes the `fullHarness` block from the live `prototyping.json` so the post-1.8.9 evolution loop never re-reads stale `full-harness` / `perfect-100` / `weighted-total` runtime state.
```

## AC-0014-0022: SaaS-Package Certify Scope Seal

```gherkin
Scenario: SaaS-Package Certify Scope Seal
  Given a UI-bearing SaaS-tenant project whose prototyping evidence is complete but whose ATDD / implement-class gates were intentionally skipped,
  When `qfai prototyping certify --scope saas-package` is run,
  Then the sealed `completion-certificate.json` MUST carry `scope: "saas-package"` and a non-empty `notes:` field that names each skipped gate, MUST NOT claim full DONE, and `--upgrade-scope full` MUST be rejected until the missing gates land — at which point it may upgrade the existing certificate to full scope.
```

## AC-0014-0023: Verify Articles Restate Article V Without TC

```gherkin
Scenario: Verify Articles Restate Article V Without TC
  Given a project on the story tree,
  When `/qfai-verify` reads `references/articles.md`,
  Then the file restates the constitution's Article V chain with no TC hop and no `tdd/test-list.md`, and its Tests hop answers a BF from E2E tests, an AC from integration or API tests, and an EX from any test.
```

## AC-0014-0024: Verify Loads the Story-Tree Directories

```gherkin
Scenario: Verify Loads the Story-Tree Directories
  Given a project on the story tree,
  When `/qfai-verify` loads context through `references/context-load.md`,
  Then it reads the spec tree from `<paths.specsDir>`, contracts from `<paths.contractsDir>`, `tech.md` and `structure.md` from `<paths.contractsDir>`, and the product facts from the policy files `objective.md`, `initiative.md` and `principle.md` under `<paths.specsDir>/01_policy/`.
```

## AC-0014-0025: Verify Reads Decisions From decisions.md

```gherkin
Scenario: Verify Reads Decisions From decisions.md
  Given a project on the story tree,
  When `/qfai-verify` gathers its decision sources,
  Then it reads the rows of `decisions.md`, cites them by `DEC-NNNN`, and treats a row with Status REJECTED as a rejected option.
```

## AC-0014-0026: Verify Loads Constitution and Settings From the Recut Assistant Tree

```gherkin
Scenario: Verify Loads Constitution and Settings From the Recut Assistant Tree
  Given a project with the `rule/ skill/ agent/ prompt/` assistant tree,
  When `/qfai-verify` loads its constitution, routing and review profiles,
  Then it reads the constitution from `.qfai/assistant/rule/`, takes routing and review profiles from the built-in defaults with the `qfai.config.yaml` overrides applied, and reads an agent's entry from its card frontmatter.
```
