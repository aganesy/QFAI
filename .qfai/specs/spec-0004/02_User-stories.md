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

## US-0004-0001

As a maintainer, I want `qfai validate` to remain the deterministic machine gate, so that schema and evidence integrity can be checked without human judgment.

## US-0004-0016

As a prototyping maintainer, I want declared screen evidence gaps to fail validation, so that missing screenshot or HTML artifacts never pass silently.

## US-0004-0020

As a CI operator, I want canonical validators only in the production validate path, so that removed compatibility surfaces do not reappear.

## US-0004-0027

As a maintainer, I want validate to enforce current `/qfai-prototyping` skill contracts and UI evidence paths, so that skill-first prototyping stays mechanically auditable.

## US-0004-0028

As a release manager validating a v1.9.0 project, I want `qfai validate` to enforce that `.qfai/assistant/` only contains the 4 canonical layers (`constitution/`, `manifest/`, `catalog/`, `process/`), so that drift back to the legacy single-layer `steering/` is mechanically caught (REQ-0034).

## US-0004-0029

As an AI agent reading/writing work-log entries under `.qfai/steering/`, I want `qfai validate` to verify the YAML frontmatter schema and check that `links: [...]` resolve to real specs/discussions/entries, so that broken-link rot and ad-hoc schema drift are caught at gate time (REQ-0035, REQ-0039).

## US-0004-0030

As a Reviewer-Gate consumer, I want `qfai validate` to require non-empty `justification:` on every `R-WORKLOG-DRIFT` / `R-REJECTED-READOPT` finding and to flag `kind: handoff` entries missing any of the 5 required body sections via `R-HANDOFF-INCOMPLETE`, so that reviewer findings are auditable and handoffs are operationally complete (REQ-0036, REQ-0042).

## US-0004-0031

As an engineer closing decision loops, I want `qfai validate` to surface `W-PENDING-PROMOTION` until a work-log decision is fully promoted (`07_Decisions.md` row + archive + `promoted-to` back-ref) AND to surface `W-WORKLOG-STALE` for `status: active` entries with `updated` older than 90 days, so that stale or unfinished decisions don't silently linger (REQ-0037, REQ-0038).

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

As a delivery lead shipping a SaaS-tenant project, I want `qfai validate --profile saas-package` to PASS when the prototyping-profile validate PASSes, a DCON-005 design-system attestation is present at `.qfai/contracts/design/design-system.yaml`, and the CLI-HANDOFF cross-skill handoff schema PASSes — while skipping ATDD / implement-class gates and naming each skip via `D-SAAS-PACKAGE-VERIFY-SKIPPED` (info), so that SaaS-tenant deliveries get a lightweight-but-honest gate that never silently claims work it did not check (REQ-0166).

## US-0004-0038

As a UI-contract author, I want `auditProfile.ts` to accept both the legacy string-only `primary_tasks` form and the structured `{id, label, acceptance}` form, and `QFAI-AUD-020` to name the recommended count band in its warning, so that I can migrate to the testable structured shape at my own pace during the deprecation window while string-only items continue to PASS (REQ-0164).

## US-0004-0039

As a contributor opening a PR, I want a `check-pack-locations.mjs` CI lane wired into `pnpm ci:lint` to reject `review-*/` or `discussion-*/` directories introduced outside the allowed roots (`tmp/`, `.qfai/review/<ts>/`, `.qfai/discussion/<ts>/`), emitting `R-PACK-LOCATION-DRIFT` that references `.agents/rules/root-additions-policy.md` and proposes the correct path, so that the textual root-additions rule becomes structural enforcement (REQ-0167).
