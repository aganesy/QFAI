# 05 Scope

<!-- UX-INTENT: If UI-bearing, see uiux/00_index.md for sidecar scope inventory -->

"Design" below means the design package SRC-0001 and its chapter numbers. "D1" to "D16" are the session's decisions, and "D17" and "D18" the user's answers during review, all recorded in `99_delta.md` `## Change History`.

## In Scope

The whole design ships in qfai 1.13.0 (D1), as amended by D2 to D18. The design's staged enablement (design 07 §5) is the implementation order inside the
release, not a sequence of releases.

- Capability 1 — free-text entry: the `qfai-run` skill, request-kind intake, the five change routes with a cross-cutting risk and authorization axis,
  the route proposal and the scope envelope (REQ-0001 to REQ-0013).
- Capability 2 — workflow control core: `npx qfai workflow` with seven operations, run state on disk, journal, compare-and-set transitions, lock,
  idempotency, dependency invalidation and resume (D2, D9, D11; REQ-0014 to REQ-0033).
- Capability 3 — stage contracts: work orders, the split between stage outcome and test observation, skip and reuse rules, `accepted_with_debt`, the
  ATDD seam-only round trip, repair routing and review independence (REQ-0034 to REQ-0040).
- Capability 4 — authorization: three authorization kinds, one routing-time CREATE approval bound to `/qfai-sdd`, and a validator that resolves it
  (D5; REQ-0041 to REQ-0044). The validator also drops the duplicate approval set in `specPack.ts`, on the basis of SRC-0005 and design WP-04.
- Capability 5 — bugfix without reopening a `done` row: a diagnose-only operation, a missing-test row appended by `/qfai-sdd` without a Change Request
  (stage `sdd_append`), a test-defect fix that leaves ledger status alone (stage `test_fix`), and a production fix by implement against a `done` row
  whose existing, correct test caught a regression (stage `regression_fix`) (D6, D13, D14, D18; REQ-0045 to REQ-0048).
- Capability 6 — the `direct` route and the `qfai-maintain` skill (D1; REQ-0049).
- Capability 7 — skill integration: trigger-condition descriptions, entry checks that hand over to `qfai-run`, one `references/orchestrated-mode.md` per
  affected skill, standalone invocation kept, shared preflight reuse, constitution and manifest updates (D12, D15; REQ-0050 to REQ-0057).
- Capability 8 — hosts: Claude Code and Codex declared "quality-gated automation supported", each with an adapter test. A host with no recorded
  release-gate eval result is not declared supported in 1.13.0 (D3, D17; REQ-0058).
- Capability 9 — mode: `active` by default, `off` and `shadow` available, fail-closed on invariant violation, unsupported capability or policy drift,
  with the three drift triggers REQ-0059 lists (D7; REQ-0059).
- Capability 10 — completion: `finish` runs the same package's validate itself, with no shell, repository gates accepted from `verify.json` plus an independent qa-gatekeeper
  review, and two completion targets (D10; REQ-0060 to REQ-0063).
- Capability 11 — distribution and migration: `qfai init` and upgrade deliver the new skills, wrappers and manifests, with a migration check for
  user-modified manifests (REQ-0064 to REQ-0065).
- Capability 12 — evaluation: 24 fault seeds as deterministic tests on every pull request, 64 routing seeds as a manual real-model release gate planned on both
  hosts, with the seeds rewritten to D6, D13, D14 and D18 (D3, D8, D17; REQ-0066).
- Capability 13 — documentation: the README rewrite in both copies, which is part of the release's done condition (D16; REQ-0067).
- Capability 14 — backward compatibility: manual invocation, `--auto` and legacy `verify.json` unchanged (REQ-0068).
- Spec placement (D4): a new capability and spec for the entry and the control core, with Change Requests to spec-0001, spec-0003, spec-0004,
  spec-0011, spec-0013, spec-0014 and spec-0015 for their parts. `/qfai-sdd` triage approves the CREATE again, as it does today. Whether spec-0008,
  spec-0010 and spec-0012 also receive Change Requests is OQ-0020, decided by the user at `/qfai-sdd` triage.

## Out of Scope

- An `exec` operation and a command-ID registry, with the Windows launcher adapters they need (D2; design 04 §8). The harness runs commands and submits results.
- The `intent_scoped_additive` policy that let an additive CREATE proceed with no question (D5; design 03 §7).
- A `defect-reopen` ledger transition, the `Repair-Ref` column, `repair-reopen.schema.json`, the `defect_reopen` authorization action and the
  `repair_prepare` stage (D6; design 05 §7).
- A separate `sdd_reconcile` operation. Row appends reuse the existing Phase 2b seeding procedure (D13).
- Generating Codex `agents/openai.yaml` to hide stage skills (D15).
- `disable-model-invocation` on any stage skill (D15; AP-0005).
- A "supported" claim for GitHub Copilot. Copilot keeps receiving the skills and manual use keeps working (D3).
- A generic workflow language with shell or JavaScript steps. `process/workflows/` holds allowed stages, predicate names and dependencies only (design 04 §1).
- A self-built multi-agent runtime, a vector database for routing, and namespace routers or skill nesting (design 02 AD-09; SRC-0027).
- Claude Code dynamic workflows as the control core (AP-0006).
- Automatic start of a new host session after a context limit or exit (design 05 §6).
- Release edits: setting `packages/qfai/package.json#version` to 1.13.0, the `CHANGELOG.md` release heading and the `chore(release): qfai 1.13.0` commit.
  They are made on a `feature/v1.13.0` branch, and tag, publish and merge each need an explicit instruction (F2; `.agents/rules/version-discipline.local.md`).
- Whether a 1.12.3 ships first with the entries already under `## [Unreleased]` (F3). The request did not ask it.
- Changing what `--auto` means (design 02 AD-08).
- Adding values to `verify.json`'s `status` or `scope` enums (design 04 §5).

## Constraints

- Technical constraints:
  - asset ceiling of 800 lines and 400 characters per line (`packages/qfai/src/core/doctor/assetLineBudget.ts:43,66`);
  - no private version marker, `schemaVersion` or internal ID in any shipped file (`.agents/rules/distributed-surface.local.md` `## The shapes that must not appear`);
  - shipped text writes `npx qfai workflow …`, never a bare `qfai` (`packages/qfai/tests/assets/canonicalQfaiLauncher.test.ts`);
  - a new skill needs a routing profile, roles, a routing block and a `## Default Autopilot Policy` section in the same change
    (`packages/qfai/src/core/validators/autopilotPolicy.ts`; `packages/qfai/src/core/validators/skillRoles.ts`);
  - asset edits are made under `packages/qfai/assets/init/` and regenerated into `.qfai/` by `pnpm sync:ssot` (`CLAUDE.md` `### packages/qfai/ and .qfai/`).
- Operational constraints:
  - `qfai init` refuses to write into this repository's own assistant tree, so a fresh-install check runs on a scratch adopter (design 07 §7);
  - a CI change says what the shipped workflow templates do with it (`.agents/rules/shipped-ci-parity.md`);
  - paid real-model evaluation does not run on every pull request (D8).
- Legal / compliance constraints: none specific. Tracked run evidence carries no conversation text or secrets (REQ-0024).

## Success Criteria

> IDs use the `DSC-` prefix. Bare `SC-NNNN-NNNN` is reserved for the traceability
> scenario tag (`QFAI:SC-...`) and must not be used for a success criterion.

| Criterion | Measurement                                                                                                                     | Target                                                                                                                                                                      | Priority |
| --------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| DSC-001   | Manual stage selections after the first prompt, for a clear routine change on a supported host                                  | 0                                                                                                                                                                           | must     |
| DSC-002   | Deterministic fault-seed tests in the pull-request CI                                                                           | All 24 fault seeds present as tests and passing on every pull request                                                                                                       | must     |
| DSC-003   | Safety cases: every fault seed, and the safety-relevant routing seeds NFR-0005 defines                                          | 100% pass; one high-risk false pass blocks the release whatever the average accuracy                                                                                        | must     |
| DSC-004   | Real-model routing eval over the 64 routing seeds                                                                               | Planned on Claude Code and on Codex; run and recorded before 1.13.0 ships for every host declared supported. A host with no recorded result is not declared supported (D17) | must     |
| DSC-005   | Route-level acceptance criteria from design 08 §4, as amended in `99_delta.md`                                                  | Every criterion has a passing test or recorded evidence                                                                                                                     | must     |
| DSC-006   | Existing manual invocation, `--auto` and legacy `verify.json` behaviour                                                         | Existing tests for them pass unchanged in meaning                                                                                                                           | must     |
| DSC-007   | Root `README.md` and `packages/qfai/README.md`                                                                                  | Free-text entry is the primary usage; `scripts/check-readme-alignment.mjs` passes                                                                                           | must     |
| DSC-008   | Fresh install, upgrade of an unmodified install and upgrade of a user-modified install, on Linux and Windows                    | Each verified; a user-modified manifest is never overwritten or silently activated                                                                                          | must     |
| DSC-009   | Median total tokens (all sub-agents, cached tokens included) on the routine workload, entry-driven against today's manual chain | 30% lower is the adoption candidate target, not a promise                                                                                                                   | should   |
| DSC-010   | Questions put to the operator on the routine workload                                                                           | Fewer than today's manual chain, with review outcomes at least as good                                                                                                      | should   |

## Assumptions

- Assumption 1: both supported hosts can run shell commands and relay a question to the operator during a run. The adapter test confirms it per host
  (REQ-0058); a host that cannot fails closed.
- Assumption 2: the design's work packages WP-01 to WP-12 remain the implementation units, with WP-03, WP-04 and WP-05 reduced as `99_delta.md`
  `## Consequences for the Design Package` states.
- Assumption 3: the new spec's capability number is assigned by `/qfai-sdd` triage, not by this pack.
