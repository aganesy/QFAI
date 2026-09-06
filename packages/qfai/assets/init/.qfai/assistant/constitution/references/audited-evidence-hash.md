# Audited Evidence Hash

The procedure `.qfai/assistant/constitution/shared-skill-delegation-baseline.md#reviewer-response-template`
cites for its `Audited evidence hash` field. The reviewer computes it and
`/qfai-implement` gate item 10 recomputes it, so it is stated once, here.

**How to compute it, exactly.** The subject is part of a file, so a
file-level manifest alone is ambiguous, and two readers hashing different
extents produce a verdict that is either always stale or never checked. One
procedure, in four steps:

1. **Extract — the fields this observation could read, named.** Not "the
   section minus what is written later": the entry keeps growing after every
   observation, so subtracting a list only moved the problem to the next
   field added. The RED gatekeeper hashes an entry that has no GREEN yet, the
   GREEN gatekeeper one that has no `Refactor verify`, and each was stale as
   soon as the phase wrote on. **Three subjects, from the row's
   `### <TDD-ID>` section** of the evidence file its `Layer` owns — the
   heading line through the line before the next `###` heading that names a
   `TDD-` id, or the next `##` / `#` heading, or end of file, **counting only
   headings outside a fenced block** (` ``` ` / `~~~`, closed at that length or
   longer; a body that would close its own fence gets a longer one). Every
   recorded output is fenced for this reason: a test asserting on Markdown
   prints `## ...` of its own, and a boundary that took it dropped the GREEN,
   the `Oracle proof` and the round evidence out of the subject. Each takes
   only its own fields, in the order the contract lists them:
   - **Row identity, in all three**: `TDD-ID`, `Layer`, `Test file` and
     `Selector` — copied from the ledger, which the revision excludes.
     Without them, changing `Selector` after a PASS to another valid test in
     the same file left every hash and revision unmoved, and a verdict that
     only ran the old selector stood as evidence for the new one. Mutable
     bookkeeping — `Status`, `Evidence` — stays out: it moves on its own.

     **The copy is checked against the ledger, not trusted** — the four
     identity fields **and the obligation reference**. Hashing a value the
     entry already holds proves only that the entry has not changed: edit
     `Selector` in `test-list.md` after the PASS and copy, hash and revision
     are all unmoved. Gate item 10 reads the four fields from
     `test-list.md` and requires them to equal the copy; a difference is the
     row moving under its own evidence, and the verdict is not fresh. The
     obligation is on that list for the same reason: change `TC-Refs` /
     `US-Refs` / `CON-API-Refs` alone after the PASS and the entry still holds
     the old copy, so a verdict about one requirement stands for another.

   - **RED observation**: the obligation reference the row's
     `Layer` selects (`TC-ref`, or `US-ref` on `E2E` and `CON-API-ref` on
     `API` — an ATDD-owned row has no `TC-ref`, so naming only that one left
     its obligation outside every hash), `RED test hash`, the row's own
     transient revision (`RED revision` or `Falsifiability revision`), and the
     RED pair or the falsifiability trio with `RED failure mode`. **Not
     `Revision`**: it names the tree the GREEN landed at and does not exist
     yet, so including it made every correct RED PASS stale at GREEN.
   - **GREEN observation**: the RED subject plus `Revision`, the GREEN pair,
     `Oracle proof` and, where the row has one, `Replacement proof revision` —
     it addresses the tree a re-taken proof ran against, which the revision
     does not reach, so a subject without it let that proof be attributed to a
     tree it never ran on.
   - **Stage review** (a `completion-reviewer` judging a stage rather than a
     row — a spec with no ATDD-owned rows is the ordinary case, and
     `../../skills/qfai-atdd/SKILL.md` treats zero as a legitimate count): the
     stage evidence file **whole**, under its repo-relative path, plus
     `.qfai/evidence/coverage-depth-<spec-id>.md` whole — **minus the
     `## Final status` section**, which the P8 reviewer's own answer fills in.
     Whole-file included it, so writing PASS and the confirmer's name straight
     after hashing made the verdict stale on being recorded. There is no
     `### <TDD-ID>` section to extract and no per-row boundary to draw, so the
     rest of the file is the subject; step 2 normalizes it, steps 3 and 4 are
     unchanged.
     Without this the final review of such a spec either omitted a required
     field or PASSed with nothing pinning the evidence it read.
   - **Branch 3** (`exception`): row identity, the obligation reference the
     row's `Layer` selects, the `DR-ID`, and the `DR-*` artifact it names. The
     obligation is what the DR says cannot be observed, so a subject without
     it let the reference be pointed at a different requirement after the PASS
     — the ledger is out of the revision, and item 10's identity check covers
     four fields, so nothing moved. Item 10 checks this one against the ledger
     as well. There is no RED and no GREEN on this branch — the
     claim is that neither could be had — so the DR **is** the evidence, and
     leaving it out of every subject let the pointer be swapped after the PASS
     for another existing `DR-*`, one already waived perhaps, with the
     revision and the hash both unmoved. Gate item 10 also requires the
     verdict to name the `DR-ID` the row currently carries.
   - **Completion review** (`completion-reviewer` / `implementation-reviewer` / `product-surface-reviewer` — the routed set is wider than two whenever the row is UI-affecting, and naming only two left the parity verdict's subject undefined, so the reviewer and gate item 10 each chose one and a correct UI row could not reach `done`):
     the GREEN subject plus `Refactor verify command` / `result` / `revision`, the
     `Shared-artifact re-verify` block when the row has one — omitting it let
     the earlier rows' re-runs and re-taken proofs it records be edited away
     without moving either hash — and, from every `#### Round N` block nested
     in the row's `### <TDD-ID>` section, that block's **phase-authored**
     fields only: `Round N: reviewer verdict` is theirs, so the whole block
     put their own line in what they hashed. A round heading left at `###` is
     unmigrated evidence, not an absent field: migrate or stop before hashing
     (`../../skills/qfai-implement/references/round-evidence.md`).
     **`product-surface-reviewer` takes that same subject and one record class more**: each surface artifact the row's phase-authored `Surface artifacts` manifest names under `.qfai/evidence/**` — a runtime screenshot, an HTML capture — whole, one record per artifact under its repo-relative path, in the step 3 order. `Reviewed revision` excludes that tree, so nothing else pins the rendered output this verdict is actually about, and a screenshot replaced after the PASS moved neither the revision nor a subject built from fields alone. Artifacts it reads from **inside** the revision — `.qfai/contracts/design/prototype-handoff.yaml`, `.qfai/prototypes/winner/index.html`, the UI contracts — contribute no record: `Reviewed revision` already pins them, and hashing them twice would stale this verdict on an unrelated prototype edit. **A row carrying this verdict has no "no such artifact" state**: `Surface artifacts` is a required phase-authored field on a UI-affecting row (`../../skills/qfai-implement/SKILL.md`), an empty one is refused at the completion gate rather than hashed, and this record class is empty only for rows that take no parity verdict at all. Reading it as optional is what made the class vacuous — the subject was then fields alone on every conforming entry, and the screenshots the verdict was taken on could be swapped with the revision excluding that tree and the hash unmoved.

   A field absent at that point contributes nothing — it is not a placeholder
   and not an error. Nothing written after an observation is in its subject,
   which is what makes a verdict re-checkable at all: gate item 10 recomputes
   each one against its own list. **When in doubt about a new field, ask which
   observation could have read it**; that is the whole rule, and it is why the
   subjects are named rather than derived by subtraction. **A field written
   after every reviewer is in no subject at all** — the checkpoint pair, which
   the revision and the pack seal both miss — so it carries a seal of its own,
   taken as it is written and recomputed by the gate that reads it.

2. **Normalize — a Markdown or HTML record only.** LF line endings; strip trailing whitespace from every line; drop leading and trailing blank lines; end with exactly one newline. **Every other record skips this step and hashes the artifact's raw bytes as they sit on disk.** A `product-surface-reviewer`'s runtime screenshot is a `.png` (`../../skills/qfai-prototyping/SKILL.md` names the path the capture writes) — an arbitrary byte string with no lines to re-end and no trailing whitespace to strip, where "LF line endings" rewrites whatever `0x0D 0x0A` fell inside the compressed stream and the strip eats the `0x20` / `0x09` before it. Normalizing it made the digest a property of whichever decoder each side reached for, so the reviewer and gate item 10 computed different values for one unchanged image and a correct UI row could not reach `done`; and it mapped two images differing only in those bytes onto one digest, which is the replacement this verdict exists to catch.

   **The class is the record's extension, never sniffed content**: `.md` and `.html` normalize — the extracted entry and `coverage-depth-<spec-id>.md` are recorded under their `.md` paths, a `DR-*` artifact is one too, and an HTML capture is text — every other extension is raw, so reviewer and gate cannot classify one artifact two ways.

3. **Serialize.** One record per artifact — the repo-relative path, a NUL
   byte, then the SHA-256 of that artifact's bytes as step 2 leaves them, normalized where that step applies and raw where it does not — sorted by
   path, joined with newlines. **This is the audit hash, not the working-tree
   revision**: that one has its own four steps, including the untracked
   record's `kind` and `mode`, in
   `../../skills/qfai-implement/references/evidence-revision.md`, and restating
   it here is how the two came to disagree. Two artifacts: the extracted
   section, recorded under the evidence file's path, and
   on a branch-3 row the `DR-*` artifact the row names, whole, under its
   repo-relative path — the subject says the DR is that branch's evidence, and
   a subject with no record for it is a hash that does not move when the DR
   text changes; and on a `product-surface-reviewer` verdict each surface artifact the entry's `Surface artifacts` manifest names under `.qfai/evidence/**`, whole, under its repo-relative path, for the same reason — the rendered output is that verdict's evidence, and a subject of fields alone does not move when the screenshot is replaced; and
   the part of `.qfai/evidence/coverage-depth-<spec-id>.md` that belongs to
   this row's obligation — not the file whole, and matched **exactly**. A
   row may legitimately carry several (`TC-Refs: TC-0001, TC-0002`), so split
   the copied column on commas first and take each id in the order the column
   lists them; comparing the whole column against a single-id matrix cell
   matched nothing, and a row with two obligations had no matrix rows in its
   subject at all. For each id: the table rows whose obligation cell equals it
   (`TC-0001` does not match `TC-00011`), plus each justification paragraph
   whose first line names it. A justification that names no obligation belongs to
   none of them and is left out; "everything after the table" was the other
   reading, and two readers taking one each computed different hashes from one
   file. The matrix is one document
   for the spec and a later `/qfai-atdd` run recomputes it, so hashing all of
   it made every existing verdict stale when an unrelated obligation's cell
   moved, and a `done` row has no re-review path to clear that. Take the table
   rows whose obligation column matches, with any justification lines under
   them, normalized by step 2 as well; a row whose obligation appears nowhere
   in the matrix contributes nothing.
4. **Hash.** SHA-256 of that record list; record the hex digest.

**A T1 coherent group is one pass and several rows**
(`../../skills/qfai-implement/references/volume-policy.md`).
One hash over a representative would leave the other members' evidence free to
change after the PASS, and a private concatenation of their sections has no
defined member order or record shape for gate item 10 to reproduce. Record
**one `Audited evidence hash` per `TDD-ID` in the group**, each by these four
steps over that row's own subject, listed in the verdict beside the id it
belongs to. Nothing about a group is special then; it is the single-row rule
applied as many times as the group has members.

Gate item 10 runs the same four steps. A row with no coverage-depth file, or
none whose matrix names its obligation, has one record rather than a
placeholder — an absent artifact contributes nothing, not a name with an empty
hash.
