# 07 Decisions

10 items.

## Decisions

### DR-0015-0001: TDD Ledger Backfill from Migrated Coverage (v1.7.15)

- Decision: TDD-0001..0010 のテストは既存実装 (v1.7.x) に対する backfill として Exception パターンで確定する
- Context: test-list.md は 06_Test-Cases.md から auto-generate された skeleton ledger で、Test file=TBD/Selector=migrated のまま放置されていた
- Rationale: agent delegation framework は agent-catalog.yml, agent-routing.yml, review-profiles.yml, review-gate.rules.yml, agentDefinition validator, reviewGate validator で実装済み。one-shot GREEN で exception に確定する

### DR-0015-0002: TC-0015-0011 / TC-0015-0012 Concrete Delegation Coverage (2026-04-19)

- Decision: TDD-0011 / TDD-0012 は Exception / placeholder 扱いから外し、shared delegation baseline と `qfai-implement` skill の canonical delegation contract を読む integration coverage に更新したうえで、fresh reviewer PASS と checkpoint pass が揃うまで `refactor` に据え置く
- Context: completion/review 差し戻しで、TC-0015-0011 の human-readable trace 不一致、TC-0015-0012 の stale evidence、completed items に必要な fresh reviewer PASS / checkpoint pass 欠落が指摘された
- Rationale: spec が要求するのは failed first delegation の hard-stop reporting と first real delegation capability probe contract であり、canonical files に対する直接検証へ差し替えることで、stage stop / no simulation-self-execution / remediation details / attempted role-task / retry condition / probe ordering を観測できる。一方、completion contract 上は独立 reviewer rerun と checkpoint が未取得のため `done` 主張はしない

### DR-0015-0003 → DR-0269 (reference): Default Autopilot Policy 3-bucket template (2026-05-27)

- Reference: `_policies/08_Decisions.md` DR-0269 (OQ-0160 resolved). The `## Default Autopilot Policy` SKILL.md section uses three named buckets (auto-decide / ask-user / hard-required); `R-AUTOPILOT-POLICY-MISSING` (error) enforces presence. Realized here as AC-0015-0015 / BR-0015-0010.
- Source REQ: REQ-0160.

### DR-0015-0004 → DR-0270 (reference): Envelope-deviation audit trigger taxonomy (2026-05-27)

- Reference: `_policies/08_Decisions.md` DR-0270 (OQ-0162 resolved). Fixed four-context declared taxonomy (skill-envelope / architectural-decision / rejected-option re-adoption / scope-expansion); writes `.qfai/evidence/decisions/<ISO8601-ts>.json` `{question, answer, scope, operatorIdentity, timestamp, envelopeContractClause}`; tracked in version control (governance record; negated in the managed `.gitignore` block). Realized here as AC-0015-0016 / BR-0015-0011.
- Source REQ: REQ-0158.

### DR-0015-0005 → DR-0271 (reference): `qfai audit log` CLI shape (2026-05-27)

- Reference: `_policies/08_Decisions.md` DR-0271 (OQ-0163 resolved). Filtered query (`--scope` / `--operator` / `--clause`) + `--format table|json` defaulting to `table` (CLI-AUDIT, SHOULD). Realized here as AC-0015-0019 / BR-0015-0014.
- Source REQ: REQ-0171.

### DR-0015-0006: Catalog membership is severity class; the two hygiene-lane codes are deferred, not exempt (2026-08-05)

- Decision: `R-WORKFLOW-HYGIENE-DRIFT` and `R-SHIPPED-WORKFLOW-SHAPE-DRIFT` are recorded as **belonging in** `JUSTIFICATION_CATALOG` by the catalog's own membership test. Their registration is deferred to a single lockstep change tracked as OQ-0015-0001. Until it lands, the Reviewer Gate ingests both without demanding a `justification:`, and that handling is recorded as a temporary divergence (AC-0015-0022 / BR-0015-0017), explicitly not as a principle.
- Context: the CHG-007 round-1 remediation wrote the exemption as a rule — "both are produced by a deterministic repository script, so the catalog's reviewer-authored-rationale contract cannot be met by construction". Round-2 architecture review falsified the premise directly. `R-PACK-LOCATION-DRIFT` is severity error, is a catalog member, and is emitted **only** by `packages/qfai/scripts/check-pack-locations.mjs` — a deterministic repository lint script of exactly the class claimed to be ineligible. `R-SKILL-MANIFEST-DRIFT` is a second script/probe-driven error-class member. And `R-AUTOPILOT-POLICY-MISSING`, the cited precedent's own sibling sharing its emitter (`autopilotPolicy.ts`), is a member while `R-AUTOPILOT-POLICY-WIDENED` is not. Emitter identity therefore predicts nothing.
- Rationale: the discriminator the catalog header actually states (`packages/qfai/src/core/validators/justificationCatalog.ts`) is severity class — the catalog is the closed error-class mandatory-justification set, and what sits outside it is warning-class advisory-only auxiliary signal. `CLI-WFSET` declares both new codes as lint **failure** codes for a `pnpm ci:lint` lane, i.e. error class, so the `R-PACK-LOCATION-DRIFT` precedent puts them inside the catalog. The same header states that adding a ninth code extends a closed REQ contract and must move in lockstep with the owning spec and the reviewer SSOTs; that lockstep spans `justificationCatalog.ts`, `reviewerJustification.ts` and this spec's closed-set criterion, which is a different atomic slice than the ingestion cascade this pack performs. Deferring with a named owner, trigger and SSOT list keeps the honest answer on the record; writing a false discriminator would have retired the question instead.
- Rejected — keep the emitter-identity rationale: falsified by two catalog members, and worse than merely wrong. It would license exempting any future script-emitted error-class code by construction, which is how a convenient exemption becomes permanent. DO NOT reintroduce "a deterministic script cannot author a justification" in **any artifact of any spec, policy file or contract** — the round-3 and round-4 reviews both found it surviving in consumers after the owning artifact was corrected, so a spec-scoped DO NOT is demonstrably too narrow. Temptation: it reads as a clean principle and needs no follow-up item.
- Rejected — register the two codes in the catalog inside this pack: correct in substance but inflates the pack past its atomic slice, editing two reviewer SSOTs and a closed-set acceptance criterion that this cascade does not own. Temptation: it is only two array entries. It is not — it is a closed-set extension with a count assertion, a contract file and four spec-local records behind it.
- Rejected — leave the divergence unrecorded and simply ingest the codes: keeps the gate green while erasing the reason, so the next reader re-derives an emitter-based rule from the observed behaviour. Temptation: no new open question to carry.

### DR-0015-0007: Cite the justification rule by its contract section (2026-09-23)

- Status: accepted
- Context: AC-0015-0014, BR-0015-0009, BR-0015-0013 and TC-0015-0027 name "the R-WORKLOG-DRIFT family pattern" as the rule they follow. `R-WORKLOG-DRIFT` leaves the reviewer justification set, so the name no longer points at a live rule.
- Decision: Cite the rule's home, the Reviewer-Gate justification contract in `.qfai/contracts/cli/qfai-validate.md#reviewer-gate-input-bundle`.
- Consequences: The four items point at the section that states the rule. Citing `BR-0004-0017` instead would be a foreign-namespace reference, which raises `QFAI-SPACK-101` and `TRACE_DOWNSTREAM_REF`. Naming `R-REJECTED-READOPT` instead would replace one code with another as the pattern's name.
- Related: AC-0015-0014, BR-0015-0009, BR-0015-0013, TC-0015-0027

### DR-0015-0008: Replace only the citation in the four items (2026-09-23)

- Status: accepted
- Context: The four items keep their obligation. Only the name of the rule they follow changes.
- Decision: Replace the "R-WORKLOG-DRIFT family pattern" phrase in each item with the Reviewer-Gate justification contract citation, and leave the rest of each text unchanged.
- Consequences: The obligation is the same, so TDD-0029, which holds TC-0015-0027 at `done`, is not reset and no ledger row changes.
- Related: AC-0015-0014, BR-0015-0009, BR-0015-0013, TC-0015-0027, TDD-0029

### DR-0015-0009: The justification citation resolves to the rejection sentence (2026-09-23)

- Status: accepted
- Context: AC-0015-0014, BR-0015-0009, BR-0015-0013 and TC-0015-0027 cite `.qfai/contracts/cli/qfai-validate.md#reviewer-gate-input-bundle`. The anchor resolves. That section's content clause asks for a Decisions row ID, which neither `R-PROMPT-SCANNER-DRIFT` nor the eight catalog codes have.
- Decision: Record the citation as pointing at the section's rejection sentence: "`qfai validate` rejects Reviewer reports in which such a finding lacks `justification:` content", where such a finding is one in `R-REJECTED-READOPT`, another code the contract declares with a required `justification:`, or a code the justification catalog registers. The contract was narrowed to that sentence under the user's decision of 2026-09-23, recorded in spec-0004 DR-0004-0038 and DR-0004-0039. BR-0015-0009's three-part content resolves to the `R-PROMPT-SCANNER-DRIFT` row of the contract's prototyping finding-code table. No item is re-pointed, and the section's content clause is not widened.
- Consequences: The four items keep their text. Widening the contract's content clause would contradict a recorded contract decision, which is the user's decision.
- Related: AC-0015-0014, BR-0015-0009, BR-0015-0013, TC-0015-0027, CLI-VAL

### DR-0015-0010: An upgraded project gains the new routing entries through `qfai init --force`

- Status: accepted
- Date: 2026-09-24
- Decided by: the user, on 2026-09-24, relayed by the batch coordinator.
- Context: a plain `qfai init` upgrade copies manifests create-only, so it leaves
  an existing `agent-routing.yml` untouched. Only `--force` runs the add-only
  routing merge. An upgraded project's manifest therefore lacks the
  `qfai-maintain` routing entry, and a run's `start` refuses as fail-closed
  because a reviewer the shipped manifest requires is missing. The user decision
  that `active` is the default mode applies on install and on upgrade.
- Evidence: `.qfai/contracts/cli/qfai-init.md` (CLI-INIT) `#### --force (asset
regeneration)` and `### Upgrade conflicts`; `.qfai/contracts/cli/qfai-workflow.md`
  (CLI-WF) `## Fail-closed`; `discussion-20260923171450572#REQ-0059` and
  `#REQ-0065`.
- Decision:
  - `qfai init` keeps its released behaviour: only `--force` merges routing
    entries.
  - The upgrade report names each shipped routing entry missing from the
    project's manifest, with `qfai init --force` as the fix.
  - The `start` refusal for a missing reviewer names the same command.
  - Until the adopter runs it, a plain upgrade does not chain stages
    automatically.
- Rejected: merge routing entries on every `qfai init`
  - DO NOT: run the add-only merge without `--force`. Temptation: it only adds,
    but it changes the released `--force` behaviour CLI-INIT states.
- Rejected: make `manifest/` a provenance-governed layer
  - DO NOT: put the manifests under the provenance lock. Temptation: the lock
    already refreshes unmodified copies, but the layer is `qfai-configure`'s.
- Consequences: this falls short of the `active`-by-default decision for a plain
  upgrade, which the user accepted. The fix is named where the run stops. A
  plain upgrade also skips each shipped stage skill whose project copy differs
  from the shipped one; the upgrade report counts those skills and names
  `qfai init --force`, which replaces them with the shipped versions and so
  overwrites local edits. This
  spec's test cases do not change; the tests that do are the upgrade-report test
  under spec-0003 and the refusal-message test under spec-0018.
- Related: BR-0015-0018; DL-0002 in `09_delta.md`.
