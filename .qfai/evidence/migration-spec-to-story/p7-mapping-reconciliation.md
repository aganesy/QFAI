# P7 mapping reconciliation

## Source and authority

- The destination map is `discussion-20260923063306456/05_Scope.md#in-scope`,
  accepted by that pack's OQ-0020. The P7 cutover is OQ-0170 in
  `.qfai/specs/_policies/09_Open-questions.md`.
- The migration plan's syntax and report behavior are
  `.qfai/contracts/cli/qfai-migration-spec-to-story.md#invocation` and
  `spec-0018/04_Business-Rules.md`, BR-0018-0031 through BR-0018-0034 and
  BR-0018-0047.
- The old business-flow document has two usable source sections: its unnamed
  opening flow, selected by `_policies/04_Business-Flow.md`, and the H2
  `CHG-007 — Layered CI Lane Topology (CAP-0017 / CAP-0003)`.
- The four project-owned catalog seeds have one destination each:
  `catalog/product.md` contributes to `01_policy/objective.md` and
  `01_policy/initiative.md`; `catalog/manifest.md` contributes to
  `01_policy/principle.md`; `catalog/tech.md` and
  `catalog/structure.md` become `03_contract/tech.md` and
  `03_contract/structure.md`. Step 3 merges identical content once and
  archives the old source. The new init seed set contains the three policy
  files and two contract files, with no second catalog copy.
- `_policies/05_Contracts.md` has its CLI index in two tables. The P7
  `03_contract/contracts.md` merge must produce one index with one row for
  every CLI contract file, including newly authored subject contracts and the
  previously unindexed doctor, audit and prototyping-iterate contracts.
- `_policies/11_Slice-Policy.md` is archived whole. Its CAP/spec positional,
  size and token-overlap rules are legacy direction and do not become active
  story-tree principles. The current SDD triage reference owns the eight
  operations, approval, impact, ID allocation and decision-row behavior.
  `rule/change-classification.md` governs PR change categories only.

## Old ID inventory

The initial inventory below uses unique IDs in each dedicated spec file,
anchored at its catalog, heading or first table cell. It excludes the
`spec-XXXX` template. Parallel P3/P6 work can change the files before P7;
refresh this inventory against the cutover commit before running migration.

| Pack | US | AC | BR | EX | TC |
| --- | ---: | ---: | ---: | ---: | ---: |
| spec-0001 | 17 | 31 | 51 | 97 | 97 |
| spec-0002 | 7 | 4 | 4 | 5 | 5 |
| spec-0003 | 30 | 46 | 59 | 69 | 78 |
| spec-0004 | 25 | 73 | 71 | 82 | 93 |
| spec-0005 | 9 | 13 | 8 | 9 | 14 |
| spec-0006 | 11 | 26 | 22 | 29 | 36 |
| spec-0007 | 3 | 8 | 10 | 12 | 12 |
| spec-0008 | 8 | 16 | 14 | 18 | 23 |
| spec-0009 | 5 | 8 | 8 | 8 | 15 |
| spec-0010 | 12 | 9 | 9 | 10 | 10 |
| spec-0011 | 8 | 15 | 14 | 16 | 19 |
| spec-0012 | 52 | 73 | 59 | 87 | 180 |
| spec-0013 | 14 | 36 | 34 | 34 | 58 |
| spec-0014 | 5 | 11 | 12 | 11 | 14 |
| spec-0015 | 16 | 24 | 21 | 22 | 43 |
| spec-0016 | 8 | 20 | 20 | 26 | 28 |
| spec-0017 | 11 | 38 | 72 | 73 | 95 |
| spec-0018 | 10 | 27 | 60 | 82 | 82 |
| **Total** | **251** | **478** | **548** | **690** | **902** |

The P7 REMOVE rows retire twelve US: US-0001-0001, US-0001-0002,
US-0001-0003, US-0001-0005, US-0001-0006, US-0003-0018,
US-0011-0002, US-0011-0004, US-0013-0002, US-0013-0004,
US-0013-0007 and US-0013-0013. Their source and retirement authority are
`spec-0001/09_delta.md#what-the-remove-row-retires-at-landing`,
`spec-0003/09_delta.md#what-the-remove-rows-retire` and the equivalent
sections of `spec-0011/09_delta.md` and `spec-0013/09_delta.md`. Thus the
plan must place **241 active US**: the 239 surviving old stories plus the
SDD-added US-0006-0012 and US-0007-0004 for diagnostic input and threshold
errors.

The current plan must place **514 active BR**: the 512 surviving original rules
plus new BR-0011-0015 and BR-0011-0016. The other 36 are individually accounted
for in `retired-rule-disposition.md`, with their archived source and the
expected step-7 report disposition. A superseded rule is not rewritten into an
active contract.

The pre-migration source check after the approved US/AC removals finds 241
distinct US definitions and 447 distinct AC definitions, exactly matching the
plan with no missing or extra ID. The current BR sources contain 549 distinct
definitions: 514 in the plan and 35 remaining old retired rules. The 36th,
BR-0011-0007, was archived and removed before step 4. The 36 old IDs together
match `retired-rule-disposition.md`. Each plan BR exists in source. This static
comparison reads catalog entries, heading IDs and first-column table IDs;
the migration parser and its reports still require fixture proof.

The additional P7 REMOVE rows for the fixed skill inventory and former capture
chain also retire AC-0001-0010, EX-0001-0016, EX-0001-0018,
TC-0001-0016, TC-0001-0018, AC-0012-0003, EX-0012-0002,
EX-0012-0003 and TC-0012-0291. Their old source files remain in the archive.
The current obligations are the package skill inventory documented by
`cli/assistant-routing.md` and BR-0012-0060 with AC-0012-0072/0073.
The same P7 retirement closes the old spec-pack reference-direction and
Triage-table chains: AC-0013-0006/0012, EX-0013-0002/0009 and
TC-0013-0006/0018/0019. BR-0013-0031/0032 and the `decisions.md` row parser
carry their current obligations.

Criterion mapping and retirement are recorded in `criterion-disposition.md`.
The current plan lists 447 criterion IDs, including the two split successors,
three criteria that close example-to-criterion gaps, and AC-0011-0016 for the
current prototype-handoff consumer.
Seven superseded spec-0012 criteria are excluded under OP-PURGE-070 through
OP-PURGE-076. DR-0010-0007 assigns AC-0010-0001 to its screen-contract
facet; the other facets use existing criteria. The two legacy design
sidecar criteria are retired under DR-0013-0006. AC-0011-0009 is retired with
the old four-field handoff under DR-0011-0002, and AC-0011-0016 takes its
consumer obligation. The 480-section pre-split audit plus six new criteria
reconciles as 447 mapped and 39 retired.
`example-disposition.md` records the twelve active old examples whose test
cases cited more than one criterion. Their single targets, rewrites and splits
are now in source SDD; step 4 and step 6 must prove the resulting ID map and
AC references. These registers are cutover inputs, not migration output.

## Mapping status

| Item | Required outcome | Status |
| --- | --- | --- |
| Flow order and titles | Four-flow selection and the exact `from` selectors approved for this repository | User confirmed four flows; development 190, CI 23, diagnostic/repair 16, migration 12 |
| Active user stories | Every one of 241 active IDs appears once in `plan.yaml#flows[].stories` | All 241 assigned once, including two new diagnostic stories |
| Ambiguous acceptance criteria | `criteria` lists where old AC-to-US references do not identify one story | Pre-split audit plus six new criteria has 486 sections: 447 mapped and 39 retired |
| Active business rules | Every one of 514 active IDs appears once in `plan.yaml#rules`, naming a real contract under `<paths.contractsDir>` | All 514 assigned once; destination review remains open |
| Retired US, AC, EX and BR | No active destination generated; old source retained in evidence archive | US/AC approved source removals archived; EX/BR report reconciliation pending |
| Test cases and examples | Every TC-only case converted or reported, and every EX derives one AC or is reported | Migration steps 4–6 pending |

The user confirmed four flows. The plan uses the two existing sections as sources for
the development and CI flows. Diagnostic/repair and legacy migration are new
flows with no `from`. Step 4 will emit a template diagram and list both under
`## For a person` with exit 3; their diagrams require authored replacements
before the cutover is accepted. Authored diagrams and exception paths for all
four flows are in `business-flow-drafts/BF-0001..0004/business-flow.md` and
must replace the generated flow bodies after step 4.

The current `plan.yaml` is a cutover input pending parser, fixture and reviewer
gates. Step 4 writes an immutable ID map. All 514 active BR destinations are
listed, including the ten guardrails rules after the OQ-0180 decision.
Criterion ownership and the example splits have source SDD dispositions;
steps 4 and 6 must verify their conversion. The conflicting old inventory and
capture rules have approved P7 REMOVE rows and must not reappear in contracts.

## Launch criteria

1. The confirmed four-flow `plan.yaml` is complete, with no
   duplicate, absent or retired US/BR ID and no contract path that escapes
   `<paths.contractsDir>`.
2. The new contract files and their rule destinations are reviewed. Every
   active rule has a destination that exists before step 7.
   The four old catalog seeds have been reconciled against the five new seed
   files; no duplicated generic catalog content remains. The contract index
   names every CLI contract once.
   Rules targeting `tech.md` or `structure.md` require those files to exist
   before step 7. OQ-0180 places the ten spec-0007 rules in
   `cli/qfai-guardrails.md`; the shipped third-party action rule belongs in
   `cli/shipped-workflows.md`.
3. The migration fixture passes DSC-003 (zero layout and chain errors, with
   every TC-only and untested BF/AC/EX reported) and DSC-004 (second run changes
   zero files). The P5 independent reviewer gives GO.
4. The repository's P7 cutover commits follow `spec-0004/10_Plan.md`: migrate
   and re-key steering entries, change readers and remove old validators,
   then wire the old-layout error last.
5. Each step's dry run and actual report is captured. Exit 3 is reconciled
   item by item: all 36 retired/superseded BRs and each retired EX have an
   accepted disposition; no active US, AC, EX or BR remains unplaced. Steps 4
   and 7 archive the complete old source before removing only moved sections.
   They leave retired sections in the old source for human resolution. The
   resolution register links every remaining old ID to its report line,
   retirement authority and archived source, then closes the old source
   without carrying its former rule into the new tree.
6. After step 10, `qfai validate` reports no layout or chain errors and all
   test obligations. The full repository CI gate passes on the cutover commit.

No migration step had been run for this repository when this record was
written. All ten steps have since run on it, each as a dry run, a real run and
a rerun. `reports/initial-run/` keeps the first cutover. `reports/final-rerun/`
holds the rerun on the final tree, in which every invocation reports no
operations. Steps 5 and 8 exit 3 because they list items for a person; the
rest exit 0 (`reports/final-rerun/exit-codes.csv`).
