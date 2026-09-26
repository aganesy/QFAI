# 02 User Stories

## US Catalog

- US-0004-0001: `qfai validate` to remain the deterministic machine gate
- US-0004-0016: declared screen evidence gaps to fail validation
- US-0004-0020: canonical validators only in the production validate path
- US-0004-0027: validate to enforce current `/qfai-prototyping` skill contracts and UI evidence paths
- US-0004-0028: `qfai validate` to enforce that `.qfai/assistant/` only contains the 4 canonical layers (`constitution/`, `man…
- US-0004-0029: `qfai validate` to verify the YAML frontmatter schema and check that `links: [...]` resolve to real specs/disc…
- US-0004-0030: `qfai validate` to require non-empty `justification:` on every `R-WORKLOG-DRIFT` / `R-REJECTED-READOPT` findin…
- US-0004-0031: `qfai validate` to surface `W-PENDING-PROMOTION` until a work-log decision is fully promoted (`07_Decisions.md…
- US-0004-0032: `qfai validate` to emit `D-DEPRECATED-PATH` (with the sunset minor version named in-text) when legacy `.qfai/a…
- US-0004-0033: `qfai validate` to surface `W-SKILL-DOC-BROKEN-REF` for SKILL.md references that don't resolve in the new layo…
- US-0004-0034: each run to write to a profile-suffixed output path (`.qfai/report/validate-<profile>.json`) alongside an alwa…
- US-0004-0035: CI to refuse merge when only one half of the SSOT-sync pair changed
- US-0004-0036: `qfai validate` to reject any such finding whose `justification:` is empty (mirroring the existing `R-WORKLOG-…
- US-0004-0037: `qfai validate --profile saas-package` to PASS when the prototyping-profile validate PASSes, a DCON-005 design…
- US-0004-0038: `auditProfile.ts` to accept both the legacy string-only `primary_tasks` form and the structured `{id, label, a…
- US-0004-0039: a `check-pack-locations.mjs` CI lane wired into `pnpm ci:lint` to reject `review-*/` or `discussion-*/` direct…
- US-0004-0040: story-tree layout and ID findings
- US-0004-0041: the contract index and the contract-layer reads on the story tree
- US-0004-0042: the two tables and the rows a validator reads
- US-0004-0043: append-only tables and change-request authorisation in the `drift` gate
- US-0004-0044: the EX-to-AC and BR-to-EX links on the story tree
- US-0004-0045: test obligations per layer, with a recorded exception
- US-0004-0046: one error for a project still on the spec-pack layout
- US-0004-0047: no story-tree internal ID in shipped source comments
- US-0004-0048: `qfai validate --flow` scopes a run to one business flow

## US-0004-0001

As a maintainer, I want `qfai validate` to remain the deterministic machine gate, so that schema and evidence integrity can be checked without human judgment.

## US-0004-0016

As a prototyping maintainer, I want declared screen evidence gaps to fail validation, so that missing screenshot or HTML artifacts never pass silently.

## US-0004-0020

As a CI operator, I want canonical validators only in the production validate path, so that removed compatibility surfaces do not reappear.

## US-0004-0027

As a maintainer, I want validate to enforce current `/qfai-prototyping` skill contracts and UI evidence paths, so that skill-first prototyping stays mechanically auditable.

## US-0004-0028

As a release manager validating a v1.9.0 project, I want `qfai validate` to enforce that `.qfai/assistant/` only contains the 4 canonical layers (`constitution/`, `manifest/`, `catalog/`, `process/`), so that drift back to the legacy single-layer `steering/` is mechanically caught (REQ-0034). With the `rule/ skill/ agent/ prompt/` assistant tree, the canonical layers are `rule/`, `skill/`, `agent/` and `prompt/`, and the project's own `skill.local/` is allowed beside them.

## US-0004-0029

As an AI agent reading/writing work-log entries under `.qfai/steering/`, I want `qfai validate` to verify the YAML frontmatter schema and check that `links: [...]` resolve to real specs/discussions/entries, so that broken-link rot and ad-hoc schema drift are caught at gate time (REQ-0035, REQ-0039). On the story tree, a link resolves to a business flow or a `decisions.md` row in place of a spec.

## US-0004-0030

As a Reviewer-Gate consumer, I want `qfai validate` to require non-empty `justification:` on every `R-WORKLOG-DRIFT` / `R-REJECTED-READOPT` finding and to flag `kind: handoff` entries missing any of the 5 required body sections via `R-HANDOFF-INCOMPLETE`, so that reviewer findings are auditable and handoffs are operationally complete (REQ-0036, REQ-0042).

## US-0004-0031

As an engineer closing decision loops, I want `qfai validate` to surface `W-PENDING-PROMOTION` until a work-log decision is fully promoted (`07_Decisions.md` row + archive + `promoted-to` back-ref) AND to surface `W-WORKLOG-STALE` for `status: active` entries with `updated` older than 90 days, so that stale or unfinished decisions don't silently linger (REQ-0037, REQ-0038). On the story tree, a decision is promoted to a `decisions.md` row, and the back-ref holds that row's DEC ID.

## US-0004-0032

As a v1.9.0 migration adopter, I want `qfai validate` to emit `D-DEPRECATED-PATH` (with the sunset minor version named in-text) when legacy `.qfai/assistant/steering/` is detected AND to enforce that every `qfai-*` SKILL.md declares a `project_memory:` YAML block, so that read paths are explicit and the deprecation timeline is unambiguous (REQ-0040, REQ-0041).

## US-0004-0033

As a SKILL.md author and `qfai init --upgrade-assistant-tree` user, I want `qfai validate` to surface `W-SKILL-DOC-BROKEN-REF` for SKILL.md references that don't resolve in the new layout AND to recognize the `W-USER-EDIT-PRESERVED` informational note from the migration helper as a pass-through note (not an error), so that documentation drift is caught while migration progress is non-blocking (REQ-0043, REQ-0044).

## US-0004-0034

As a release operator running `qfai validate` across multiple profiles in sequence, I want each run to write to a profile-suffixed output path (`.qfai/report/validate-<profile>.json`) alongside an always-latest `validate.json` that names its `profile`, and I want the legacy `.qfai/output/validate.json` path to keep working with a `D-DEPRECATED-PATH` warning until sunset, so that profile outputs cannot silently overwrite each other and downstream certify reads the intended profile (REQ-0120).

## US-0004-0035

As a contributor changing either `findDesignMdViolations.ts` (scanner) or `generator-prompt.md` (LLM contract), I want CI to refuse merge when only one half of the SSOT-sync pair changed, so that the Tailwind contract embedded in the prompt and the contract enforced by the scanner cannot drift out of step (REQ-0102).

## US-0004-0036

As a Reviewer-Gate consumer ingesting `R-PROMPT-SCANNER-DRIFT` findings, I want `qfai validate` to reject any such finding whose `justification:` is empty (mirroring the existing `R-WORKLOG-DRIFT` justification contract), so that drift findings always name the modified file, the missing-counterpart file, and the unmatched contract clause (REQ-0125).

## US-0004-0037

As a delivery lead shipping a SaaS-tenant project, I want `qfai validate --profile saas-package` to PASS when the prototyping-profile validate PASSes, a DCON-005 design-system attestation is present at `<paths.contractsDir>/design/design-system.yaml`, and the CLI-HANDOFF cross-skill handoff schema PASSes — while skipping ATDD / implement-class gates and naming each skip via `D-SAAS-PACKAGE-VERIFY-SKIPPED` (info), so that SaaS-tenant deliveries get a lightweight-but-honest gate that never silently claims work it did not check (REQ-0166).

## US-0004-0038

As a UI-contract author, I want `auditProfile.ts` to accept both the legacy string-only `primary_tasks` form and the structured `{id, label, acceptance}` form, and `QFAI-AUD-020` to name the recommended count band in its warning, so that I can migrate to the testable structured shape at my own pace during the deprecation window while string-only items continue to PASS (REQ-0164).

## US-0004-0039

As a contributor opening a PR, I want a `check-pack-locations.mjs` CI lane wired into `pnpm ci:lint` to reject `review-*/` or `discussion-*/` directories introduced outside the allowed roots (`tmp/`, `.qfai/review/<ts>/`, `.qfai/discussion/<ts>/`), emitting `R-PACK-LOCATION-DRIFT` that references `.agents/rules/root-additions-policy.md` and proposes the correct path, so that the textual root-additions rule becomes structural enforcement (REQ-0167).

## US-0004-0040

As a maintainer of a project on the story tree, I want `qfai validate` to report a story directory that does not hold exactly its three files, and any ID that is malformed, defined twice or out of place, so that every reader that walks the tree can trust its structure and its IDs.

## US-0004-0041

As a maintainer of a project on the story tree, I want `qfai validate` to report a contract file that `contracts.md` does not list, and to read the project's steering files from the contract layer, so that the contract index is complete and the quality-gate commands have one home.

## US-0004-0042

As a maintainer of a project on the story tree, I want `qfai validate` to hold `decisions.md` and `open-questions.md` to their four columns and their status vocabularies, and to decide whether a keyword row holds from its Status alone, so that both tables stay machine-readable and an unanswered question cannot pass as decided.

## US-0004-0043

As a reviewer of a change on the story tree, I want the `drift` gate to report a table row that was removed or rewritten, and a protected file changed with no change-request row in force, so that recorded decisions and upstream specifications change only through a recorded change request.

## US-0004-0044

As a maintainer of a project on the story tree, I want `qfai validate` to report a broken link between examples, acceptance criteria and business rules, so that every acceptance criterion is illustrated and every rule rests on examples that exist.

## US-0004-0045

As a QA engineer on the story tree, I want `qfai validate` to report each business flow, acceptance criterion and example that has no test at its layer, with a recorded exception as the only way out, so that test coverage follows the layer each obligation belongs to.

## US-0004-0046

As a maintainer of a project still on the spec-pack layout, I want `qfai validate` to state in one error which path holds the old layout and which skill migrates it, so that I get the one step to take instead of findings about a tree the project does not have.

## US-0004-0047

As a maintainer of the QFAI package, I want `pnpm ci:lint` to fail on a source comment that carries a story-tree internal ID outside the sample band, so that the new ID shapes cannot leak into the published type declarations.

## US-0004-0048

As an agent running a scoped gate on the story tree, I want `qfai validate --flow BF-NNNN` to check one business flow and write its result to a file of its own, so that parallel workers each gate their own flow without overwriting one another's result.
