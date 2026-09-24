# Step 4 and step 7 manual resolution

## Final steering scope

The archived document-lane blocker originally used `scope: spec-0003`.
Its six historical rows span BF-0001, BF-0002, and BF-0004, so no single
flow can replace that scope. The archived entry now uses `scope: global` and
keeps all three BF links. Its closure rationale names the approved change
record and the returned work state. Step 4 no longer has an unresolved
steering scope to report.

## Observed migration results

The real step 4 completed with exit 3. Its report lists 129 items for a person:
76 old EX sections, 35 retired or superseded BR sections, 15 TC-only items,
two business-flow diagrams and one steering scope item. All 241 active US and
447 active AC were mapped. The 36th retired BR, BR-0011-0007, was archived and
removed with its approved retirement chain before step 4.

The 76 EX sections consist of 39 active obligations and 37 retired or
superseded obligations. `step04-ex-provenance.csv` records each old ID, the
step 4 report line, its preserved source and SHA-256, old BR/TC/AC references,
the reviewed target criterion and the new EX/contract references once placed.
EX-0003-0023 remains active: its old warning outcome must be rewritten to the
current error outcome before placement. A proposal to retire it has no approved
SDD decision.

The real step 7 completed with exit 3. Its report retains 26 active BR without
a mapped EX and the 35 retired BR above. `step07-br-ex-readiness.csv` lists
the active BRs. Their old text remains in the archive and source until a new
authoritative contract row cites a meaningful new example. No active BR is
disposed as retired solely because automatic placement failed.

## Work boundaries and removal gate

| Owner | Old EX scope | Old active BR scope | Completion check |
| --- | --- | --- | --- |
| A | spec-0003, spec-0004, spec-0008, spec-0009 (12 EX) | 10 BR | New story EX and AC, contract BR references, old archive hash |
| B | spec-0012 (23 EX) | 14 BR | Split/rewritten EX, new AC where required, contract refs, old archive hash |
| C | spec-0015, spec-0016 (4 EX) | 2 BR | New story EX and AC, contract BR references, old archive hash |

An owner may remove an old active section only after its archived line and hash,
the new EX to live AC, and the new contract BR to EX link are recorded in
`step04-ex-provenance.csv`. A split lists every new EX. Retired sections require
an explicit decision and successor or approved absence. The immutable
`id-map.json` and `plan.yaml` are not revised after step 4.

The A and C scopes were verified and their old EX/BR sections removed. The A
12 old EX IDs map to 14 new EX rows; the C four old EX IDs map to five new EX
rows. B's 23 old EX IDs and 14 residual BR sections have passed archive,
new-AC, and contract-reference checks; their old source sections remain. The
three A and three B contract placement corrections are recorded in
`manual-contract-rehome.md` without changing the fixed plan or ID map.

The 37 retired EX sections have approved rule or decision dispositions and
matching archived lines and SHA-256. They remain in old source pending the
final layout cutover. The 36 retired BR rows have explicit step 7 report lines,
except pre-archived BR-0011-0007, in `retired-rule-disposition.md`.

## Step 8 annotation follow-up

`tmp/p7-tc-disposition.csv` has 18 TC-only or ambiguous TC decisions and their
step 8 real `no usable ID mapping` annotation locations. Three of the 18 IDs
appear in four such annotations. `tmp/p7-step8-unmapped-tc-other.csv` records
82 additional distinct old TC IDs in 111 reported annotations. Test and fixture
occurrences must be classified before changing any annotation; an old TC ID or
AC-Ref alone does not prove the new acceptance criterion.

Two automatically moved EX rows were self-referential placeholders: old
EX-0008-0006 and EX-0008-0007 became EX-0001-0069-01 and EX-0001-0069-02.
DEC-0719 records their missing behavioral proof and their successor examples,
EX-0001-0073-04 and EX-0001-0073-05. BR-0214 and BR-0215 cite the successors;
the two new-tree placeholder rows were removed. Their old source remains in
the migration archive and immutable ID map.

The first full-profile validation stops at `QFAI-LAYOUT-001` while old
`spec-*` entries exist under `.qfai/spec`. `cutover-old-pack-audit.csv` verifies
the archived source and exact residual sections for nine non-B packs. An
automatic approval review rejected both a checked recursive removal and a
single exact-file removal with `blocked by policy`; these entries remain, so
full validation cannot yet assess the new tree.
The four residual files in spec-0001 and spec-0003 were formatted after the
initial audit; the audit CSV records their current source hashes. Archived
source hashes and residual clause identifiers are unchanged.

## Cutover verification

On 2026-09-25, the operator removed the 11 remaining old pack directories
under `.qfai/spec/` after checking their archived copies. A fresh count of
`.qfai/spec/spec-*` directories is zero. The removal block above records the
earlier automation limit; it is no longer the current state.

On the tracked tree after removal, `node scripts/check-dogfood-backlog.mjs --profile full`
reports 615 inherited missing-test-annotation errors and no
`QFAI-LAYOUT-001`. The full-profile debt remains visible in
`scripts/dogfood-backlog.json`; the layout cutover is complete.
