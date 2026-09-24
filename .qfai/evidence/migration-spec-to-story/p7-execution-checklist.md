# P7 self-migration execution checklist

## Before the first write

1. Close every active AC/EX disposition in `criterion-disposition.md` and
   `example-disposition.md`. Record new story or criterion obligations through
   SDD, not by guessing a numeric parent. Resolve the spec-0013 design-sidecar
   conflict. Verify the source delta and decisions name each retirement and
   successor. Preserve the exact old source of every retired story and
   criterion before removing its approved REMOVE section from the active
   02_US or 03_AC file. Step 4 keeps either source file when any parsed
   section is not mapped; leaving retired sections in place prevents that
   file's archive and a clean old-layout cutover.
2. Freeze `plan.yaml`: four approved flows; each active old US, AC requiring a
   parent, and BR exactly once; no retired/superseded ID. Reconcile against
   the audit CSVs and the current old files. Validate every contract path and
   the one-row-per-CLI-contract index. Confirm the four old catalog seeds
   contribute once to the five story-tree policy/contract files. The current
   static inventory is US 241, AC 447 and BR 549, of which BR 514 are placed
   and 35 retired/superseded definitions remain in active old source. The
   36th, BR-0011-0007, is already archived with its approved REMOVE chain.
   The 514 BR placements name 21 distinct contract paths; step 3 must create `tech.md` and
   `structure.md` before step 7 checks all 21 destinations.
3. Obtain fixture evidence: DSC-003 has no layout or chain errors and reports
   every TC-only and untested BF/AC/EX; DSC-004 second pass changes zero files.
   The P5 independent reviewer records GO. Use the package's own built
   `runMigrationStep` export for this repository; it must not install `qfai`
   as its own dependency.
   The fixture must include both heading and table forms of old BR/EX/TC,
   mixed packs (including spec-0003's heading and marker ACs), and the exact
   old slice-policy headings. Step 4, 5, 6 and 7
   must account for all of them before this repository's dry run starts.

## Ordered work

| Phase | Steps and owner | Exit check |
| --- | --- | --- |
| Preserve and merge | Migration owner runs 1–3, each dry-run then real | Retain full report and exit code of both invocations. Inspect objective, initiative, principle, tech and structure for duplicate facts. |
| Create story tree | Migration owner runs 4, dry-run then real | Keep immutable `id-map.json`; place each reviewed `business-flow-drafts/BF-NNNN/business-flow.md` body into generated `02_business-flow/business-flow-NNNN/business-flow.md`; resolve source-less flow diagrams and re-keyed steering entries. |
| Reconcile obligations | Migration owner with SDD/contract owners runs 5–7, dry-run then real | Every TC-only case is a new EX or explicitly unresolved; every active EX has one valid AC-Ref; every active BR is in one authoritative contract and its examples use new IDs. Report every retired ID and old source archive path. |
| Repoint and verify | Migration owner runs 8–10, dry-run then real; QA reviews | Annotations, host links and managed gitignore point at the new tree. Resolve every `For a person` item. Run story-tree validation and check BF, AC and EX test obligations. |

At step 3, compare `_policies/11_Slice-Policy.md` with
`retired/legacy-slice-policy-disposition.md`: archive the whole source and do
not copy its obsolete CAP/spec and token-overlap rules into `principle.md`.
The current SDD triage reference already owns the operative story-tree rules.

At steps 4 and 7, keep every retired or superseded EX/BR in `## For a person`
with its old ID and source path. Before cutting over, match each such line to
an approved REMOVE or supersession decision, a successor or explicit absence
of one, and the archived original text. The migration archives the complete
source and removes only sections that it moved into the new tree; the remaining
retired sections are removed from the active old source only after this
reconciliation. An unplaced active EX/BR blocks cutover. Do not copy a retired
rule or example into a current contract or criterion to clear an exit 3.

## Acceptance coverage after the ID map

- Step 8 rewrites resolvable old test annotations to their new IDs. It does
  not turn an old TC/EX test into proof of an AC. Inspect the resulting
  annotations against the fixed ID map and the test's actual assertion.
- The ATDD test owner inventories integration and API tests for every active
  criterion in the final ID map (447 in the current plan), adds
  `QFAI:AC-NNNN-NNNN-NN` only where a real assertion proves
  that criterion, and writes missing tests or records a permitted decision
  exception. An old TC `AC-Refs` link is a candidate, not proof by itself.
  The pre-migration dogfood audit found at most 192 of its 444 criteria with an
  old-TC-to-integration/API annotation candidate, without checking the oracle.
  The other 252 include 186 with no old-TC candidate and 66 whose candidate
  test is outside the accepted layer. Three new criteria landed after that
  audit, so refresh the count before execution. Budget explicit test authoring and
  layer repair for these, not merely annotation replacement.
- The ATDD test owner covers each of BF-0001 through BF-0004 with an E2E test
  carrying its `QFAI:BF-NNNN` annotation. The annotation must be in the E2E
  layer and the test must assert the flow's observable outcome, including its
  relevant failure branch.
  Existing candidate files are `spec0011ImplementCycleRules` (BF-0001;
  verify its scope covers the whole development flow),
  `spec0003ShippedWorkflowSet` (BF-0002), `spec0006DoctorRemediation`
  (BF-0003) and `spec0018MigrationJourney` (BF-0004). Treat each as a
  candidate until the assertions and failure path match its BF.
- For each BF, author and track
  `.qfai/evidence/coverage-depth-BF-NNNN.md` and
  `.qfai/evidence/atdd-BF-NNNN.md`. Each matrix has the BF/E2E link, a row for
  every scoped US/AC/EX, six coverage cells per row and explicit gaps. The
  ATDD evidence links its matrix and gives matching numeric ✅/⚠️/❌ totals,
  test commands and observed results. These eight files must be tracked even
  when the evidence ignore rule would hide them.
- Run `qfai validate --profile atdd --flow BF-NNNN --fail-on error` for each
  flow, then the repository-wide ATDD/TDD and full CI dogfood gates. The full
  gate accepts no newly missing test obligation. A flow-scoped PASS does not
  prove the other flows. The test owner and QA gatekeeper review the observed
  RED/GREEN or falsifiability evidence; this migration plan does not edit tests.

## Rerun policy

- A dry run must write no file. Exit 2 stops that step before its first write;
  repair its prerequisite before retrying. Exit 3 is a completed step with
  listed human work, and its old source remains available.
- After step 4 writes the ID map, do not revise the plan to move a mapped
  item. Use SDD on the new tree for remaining content and retain provenance.
- Repeat each completed step after its first real run and confirm zero file
  changes. A partial run resumes under the same plan. Keep reports with their
  exit codes under this evidence directory.
- Final DoD: zero unplaced active US/BR/AC/EX, zero unexplained TC-only rows,
  no old-layout reader in the active package, story-tree validation and
  repository gates PASS, and no change on the second migration pass.
