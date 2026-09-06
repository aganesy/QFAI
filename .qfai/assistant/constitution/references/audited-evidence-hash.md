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
   - **Completion review** (`completion-reviewer` / `implementation-reviewer`):
     the GREEN subject plus `Refactor verify command` / `result` / `revision`, the
     `Shared-artifact re-verify` block when the row has one — it records the
     earlier rows' re-runs and re-taken proofs, which these reviewers are the
     ones who audit, so leaving it out let it be edited or deleted without
     moving either hash — and, from every `### Round N` block the row
     carries, that block's **phase-authored** fields only. `Round N: reviewer verdict` is written by these reviewers
     after they have read the block, so taking the whole block put their own
     line inside what they hashed.

   A field absent at that point contributes nothing — it is not a placeholder
   and not an error. Nothing written after an observation is in its subject,
   which is what makes a verdict re-checkable at all: gate item 10 recomputes
   each one against its own list. **When in doubt about a new field, ask which
   observation could have read it**; that is the whole rule, and it is why the
   subjects are named rather than derived by subtraction. **A field written
   after every reviewer is in no subject at all** — the checkpoint pair, which
   the revision and the pack seal both miss — so it carries a seal of its own,
   taken as it is written and recomputed by the gate that reads it.

2. **Normalize.** LF line endings; strip trailing whitespace from every line;
   drop leading and trailing blank lines; end with exactly one newline.
3. **Serialize.** One record per artifact — the repo-relative path, a NUL
   byte, then the SHA-256 of that artifact's normalized bytes — sorted by
   path, joined with newlines. **This is the audit hash, not the working-tree
   revision**: that one has its own four steps, including the untracked
   record's `kind` and `mode`, in
   `../../skills/qfai-implement/references/evidence-revision.md`, and restating
   it here is how the two came to disagree. Two artifacts: the extracted
   section, recorded under the evidence file's path, and
   on a branch-3 row the `DR-*` artifact the row names, whole, under its
   repo-relative path — the subject says the DR is that branch's evidence, and
   a subject with no record for it is a hash that does not move when the DR
   text changes; and
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
