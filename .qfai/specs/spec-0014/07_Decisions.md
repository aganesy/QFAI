# 07 Decisions

### DR-0014-0001: Compatibility Removal Is Enforced by Canonical Surface Checks

- Decision: compatibility semantics are enforced by inspecting the canonical package surface (`validate.ts`, `validators/index.ts`, `types.ts`) and by letting canonical validators reject stale sidecar artifacts with explicit migration errors.
- Context: the previous spec text still assumed rollout ratchets, `validators/legacy/`, and docs/runtime drift hooks, but the current source has already removed those paths.
- Rationale: a semantics audit should follow the executable surface. Verifying the active exports and canonical migration errors gives stable, implementation-backed compatibility guarantees without reintroducing dead compatibility layers.

### DR-0014-v1716-01: v1.7.16 Severity Mapping (T01/T02/DS01/DS02 = ERROR, T03/T04 = WARNING, PROT-DS01 Conditional)

- Decision: Assign severity `error` to UIX-VAL-T01, UIX-VAL-T02, UIX-VAL-DS01, UIX-VAL-DS02. Assign severity `warning` to UIX-VAL-T03 and UIX-VAL-T04. PROT-DS01 is conditional: `error` when pack is UI-bearing AND `uiux/12_design_system.md` exists AND mode is `full-harness`; otherwise `warning` (and zero on non-UI).
- Context: REQ-0008 and REQ-0018 (discussion-20260418093755100) add seven new validators covering Trend->Axis traceability and design-system presence/scoring evidence. Severity must reflect whether each rule guards a hard traceability invariant (breakpoint) or a quality hint that should progressively ratchet.
- Rationale: T01 and T02 guard the Trend Scan -> TRD axis chain — a broken chain invalidates downstream scoring, so it must block. DS01 and DS02 guard design system SSOT presence and minimum usability — prototyping cannot compute designSystemCompliance without these, so they must block. T03 and T04 identify stale references and incomplete axis coverage that are actionable quality hints, not correctness defects, so WARNING lets authors iterate without blocking. PROT-DS01 is a scoring-evidence rule that is only meaningful when the upstream inputs (UI-bearing surface, 12_design_system.md, full-harness mode) are all present; relaxing to WARNING elsewhere avoids false positives during non-full-harness runs while still surfacing the missing evidence.
- Rejected: uniform WARNING for all seven rules.
  - DO NOT introduce all v1.7.16 rules as WARNING to "ease rollout."
  - Temptation: avoid breaking CI for users who have not yet migrated their packs.
  - Reason: T01/T02 reference a field (`evaluation_connection`) that only exists in v1.7.16-generated packs; legacy packs will not contain it and therefore are not retro-validated — there is no rollout cost to introducing T01/T02 as ERROR directly, and doing so preserves the traceability invariant from day one (see DR-0014-v1716-02).
- Source: discussion-20260418093755100 (REQ-0008, REQ-0018, NFR-0001)

### DR-0014-v1716-02: Backward-Compatible Staged Introduction

- Decision: New v1.7.16 validator rules adopt "WARNING-first, ERROR-next-version" as the default staged introduction policy, EXCEPT UIX-VAL-T01 and UIX-VAL-T02 which introduce at ERROR in v1.7.16 because they validate a field (`evaluation_connection`) that exists only in v1.7.16-generated templates — legacy (pre-v1.7.16) packs do not contain the field and therefore are never retro-evaluated for T01/T02.
- Context: NFR-0001 (discussion-20260418093755100) requires that `qfai validate` does not produce new ERRORs on legacy discussion packs. UIX-VAL-T03, T04, DS01, DS02, PROT-DS01 all reference artifacts that may or may not exist in legacy packs.
- Rationale: Staged introduction honors backward compatibility for users with in-flight packs while still introducing the strict rules on day one for cases where the rule is structurally inert on legacy inputs. T01/T02 have this property: their trigger predicate requires a field that did not exist before v1.7.16, so emitting ERROR affects only newly generated packs — no existing pack can regress. DS01, DS02, PROT-DS01 reference files (`uiux/12_design_system.md`, `prototyping.json.scoringTrace.designSystemCompliance`) that legacy packs may lack, so their ERROR severity is scoped to UI-bearing packs and to PROT-DS01's full-harness condition — still permissible because those conditions only trigger on v1.7.16-compliant workflows. T03 and T04 remain WARNING because they inspect artifacts legacy packs generate differently (source_refs on TRD axes, visual-category Trend Scan entries) and WARNING avoids retro-breaking.
- Rejected: lower all v1.7.16 ERRORs to WARNING to placate legacy packs.
  - DO NOT introduce all rules as WARNING.
  - Temptation: silence any risk of CI red on legacy packs.
  - Reason: would defer traceability enforcement indefinitely with no clear ratchet point; T01/T02 can land as ERROR safely because they cannot match legacy inputs. Uniform WARNING also weakens the severity map (DR-0014-v1716-01).
- Source: discussion-20260418093755100 (REQ-0008, REQ-0018, NFR-0001)
