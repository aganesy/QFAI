# R03 Architecture Review

| Field         | Value                        |
| ------------- | ---------------------------- |
| reviewer_id   | R03                          |
| reviewer_role | architecture-reviewer        |
| review_pack   | review-20260416023323603     |
| target        | discussion-20260416023323603 |
| verdict       | PASS                         |

## Checked List

- [x] **New `pathUtils.ts` module: is it a clean leaf module? Are circular import risks addressed in constraints?**
      Evidence:
  - 02_Inception-Deck.md §4 Neighbors: "`pathUtils.ts` (new) — new leaf module; no imports from execution.ts"
  - 09_Constraints.md TC-2: "`pathUtils.ts` must not import from `execution.ts` or from any module that transitively imports `execution.ts`. `pathUtils.ts` is a leaf module."
  - 08_Glossary.md (`pathUtils.ts` entry): "Acts as a leaf module (no imports from `execution.ts` or other prototyping modules that import `execution.ts`)"
  - 10_Policy.md: "`pathUtils.ts` must be a leaf module: it must not import from `execution.ts` or any module that transitively imports `execution.ts`."
  - 02_Inception-Deck.md §6 Risks: Circular import risk is explicitly listed with "OQ-0002 resolved" mitigation note (resolved correctly as OQ-0001 in 11_OQ-Register.md — see note below).

  The constraint is correctly one-directional: `execution.ts` → `pathUtils.ts` is allowed (and required); `pathUtils.ts` → `execution.ts` is forbidden. This prevents the circular import scenario. ✅

  > **Note**: §6 of 02_Inception-Deck.md references "OQ-0002 resolved" for the circular import risk, but OQ-0001 in 11_OQ-Register.md is the one that covers the new file vs inline decision (which implies the leaf module design). OQ-0002 covers `measurement.ts` scope. This is a minor cross-reference inaccuracy in the prose of §6, but TC-2 and the glossary entry for `pathUtils.ts` fully and correctly document the leaf module constraint independent of any OQ reference. This does not affect architectural correctness.

- [x] **`runtimeGate.evidenceRefs` schema extension: type change in REQ-0005/REQ-0006 is consistent with existing `PrototypingEvidence` type structure**
  - REQ-0005: "`PrototypingEvidence["runtimeGate"]` type includes `evidenceRefs: string[]` as a formal, required field."
  - REQ-0006: "`parseEvidence()` reads `runtimeGate.evidenceRefs`; a non-array value is a parse error."
  - The `string[]` type for `evidenceRefs` is the same type used for `iterations[].evidenceRefs.runtimeGate` and `iterations[].evidenceRefs.specCoverage` (referenced in REQ-0012 and US-002 example seeds). This is architecturally consistent: the validator contract is being extended by adding the same kind of field (`evidenceRefs: string[]`) to the top-level `runtimeGate` object that already exists at the iteration level.
  - REQ-0007 further specifies the same `isConcreteArtifactRef()` check function is applied, ensuring behavioral consistency between the top-level and iteration-level fields.
    ✅ Type extension is structurally and behaviorally consistent with the existing validator architecture.

- [x] **Dependency graph: TC-2 (pathUtils.ts must not import from execution.ts) is captured as a constraint**
      09_Constraints.md TC-2 states explicitly: "`pathUtils.ts` must not import from `execution.ts` or from any module that transitively imports `execution.ts`." Rationale covers the TypeScript undefined-value circular import failure mode. Impact section specifies the mitigation strategy (types defined in a neutral location). ✅

- [x] **WS-3 unification: REQ-0011/REQ-0012 adequately cover the shared helper requirement**
  - REQ-0011: Mandates exclusivity — helpers must be the _single_ implementation; no parallel implementations allowed. This is enforced by NFR-0003 (grep-verifiable: "0 parallel implementations").
  - REQ-0012: Names all 5 traceability ref sites explicitly (`runtimeGate.evidenceRefs`, `iterations[].evidenceRefs.runtimeGate`, `iterations[].evidenceRefs.specCoverage`, `specCoverage.evidenceRefs`, `specs[].coverageRefs[].declaredRef`) and mandates shared helpers for all.
    Together these two requirements close the WS-3 unification requirement completely and without ambiguity. ✅

- [x] **Rejected architecture options are in 99_delta.md (REJ-001 for inline vs. new file)**
      99_delta.md `## Rejected Directions`:
  - REJ-001: "OQ-0001 Option B: inline helpers in `specCoverage.ts`" — rejected because inline helpers cannot be shared without coupling; recurrence prevention stated. ✅
  - REJ-002: "OQ-0003 Option B: allow empty `runtimeGate.evidenceRefs` array" — also present. ✅

- [x] **No specification gap: all 5 traceability ref sites covered (REQ-0012)**
      REQ-0012 enumerates all 5 ref sites:
  1. `runtimeGate.evidenceRefs` ✅
  2. `iterations[].evidenceRefs.runtimeGate` ✅
  3. `iterations[].evidenceRefs.specCoverage` ✅
  4. `specCoverage.evidenceRefs` ✅
  5. `specs[].coverageRefs[].declaredRef` ✅
     Cross-referenced against 03_Story-Workshop.md US-003 AC-003-2 (which also names all 5 sites) and the WS-3 diagram in the flowchart. No gap. ✅

- [x] **Production path test design: REQ-0015 correctly scopes the closure test**
      REQ-0015: New file `prototypingExecution.productionPath.test.ts` must contain:
      (a) At least one positive closure test: `runPrototypingExecution()` output passes `validatePrototypingEvidence()` with zero errors.
      (b) At least one negative injection test: absolute path in `specCoverage` or `runtimeGate` causes validation failure.
      This scope is sufficient to prevent the specific regression class identified in WS-4 (builder/validator contract mismatch). The positive case proves end-to-end coherence; the negative injection case proves the validator catches malformed builder output. NFR-0004 reinforces this with a measurable floor (1+1). ✅

## Feedback

**Minor cross-reference note (non-blocking)**:
02_Inception-Deck.md §6 "What Keeps Us Up at Night?" cites "(OQ-0002 resolved)" for the circular import risk mitigation. The correct OQ for the new file decision (which encodes the leaf module design) is OQ-0001. TC-2 and the glossary independently and correctly document the leaf-module constraint, so this prose error does not create a specification gap and does not affect architectural soundness. Recommended fix: change the §6 annotation from "(OQ-0002 resolved)" to "(OQ-0001 resolved, TC-2)" on future pack revisions.

This finding is non-blocking for the current discussion cycle. TC-2 in 09_Constraints.md fully covers the constraint.

**Verdict: PASS** — Architecture design is sound. Leaf module pattern, dependency direction, schema extension approach, and ref-site coverage are all architecturally consistent. Proceed to implementation.
