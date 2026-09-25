# Change Request

- ID: `CR-20260818-0007`
- Title: `"the minimal-scope default" is undefined at exactly the point TC-0017-0016 measures, and the own tree already carries a third elevation the rule does not name`
- Raised by: `/qfai-implement orchestrator, spec-0017 change 2, measured against the own workflows tree before writing the row`
- Raised at: `2026-08-18T00:00:00Z`
- Class: `intent`
- Status: `approved`
- Approved by: `user (interactive decision, /qfai-atdd session)`
- Approved at: `2026-08-23T00:00:00Z`
- Approved option: `A` — define the minimal-scope default as a literal and enumerate three
- Applied at: `2026-08-23T00:00:00Z` — TC-0017-0016 oracle rewritten to option A, falsified, annotated
- Superseded by: `-`
- Blocked set: `spec-0017 TDD-0016 (TC-0017-0016)`

## The measurement

`BR-0017-0016` and `EX-0017-0016` both assert two departures:

> Exactly two permission blocks depart from the minimal-scope default and both MUST be preserved as
> declared exceptions: the aggregate verdict's empty permission map, accepted as explicit rather than
> missing, and the publishing job's identity-token write. … Any third elevation is a new exception and
> must be justified individually.

Measured on `.github/workflows/**` at `08214aeb`, the permission blocks that exist today are:

| where                              | block                                | is it `contents: read`? |
| ---------------------------------- | ------------------------------------ | ----------------------- |
| `release.yml` workflow level       | `contents: read`                     | yes                     |
| `release.yml` job `github-release` | `contents: write`                    | **no**                  |
| `release.yml` job `publish`        | `contents: read` + `id-token: write` | **no**                  |

And the block `change 2` adds to the aggregate verdict is `permissions: {}` — also not `contents: read`.

So on the reading "a departure is a block that is not `contents: read`", the own tree will hold
**three** departures after change 2, not two: the verdict's empty map, `github-release`'s
`contents: write`, and `publish`'s `id-token: write`. `github-release` is not named anywhere in the
rule, the example or the test case.

## Why this is an ambiguity rather than a defect in the tree

`contents: write` is the **minimum** `github-release` can run on — it creates a GitHub Release. So the
phrase "the minimal-scope default" carries two readings and the pack does not choose:

- **(a) a fixed literal.** The default is `contents: read`, and any block differing from it is a
  departure. Then the count is three and the rule is wrong as written.
- **(b) per-job minimum.** The default is "the least this job can run on", so `contents: write` is
  `github-release` at minimal scope and not a departure. Then the count is two and the rule is right —
  but "minimal-scope default" is doing work no sentence in the pack defines, and the test case's
  oracle ("the SET of non-minimal permission blocks") becomes a judgement about each job's needs
  rather than a comparison against a literal.

Two further signals that the wording was not settled:

- **"both preserved as declared exceptions."** The publishing job's `id-token: write` exists today and
  can be preserved. The verdict's empty map does **not** exist — change 2 creates it. One of the two
  things the rule says to preserve is not yet there.
- **"Any third elevation."** `contents: write` **is** an elevation over `contents: read`, and it is
  already in the tree. Under reading (a) the tree arrives at change 2 already carrying the third the
  rule forbids, which no work in this spec introduced.

`TC-0017-0016` is a `boundary` row, and `06_Test-Cases.md` says a boundary row exists to "fix where the
rule stops". This one is ambiguous at precisely that point, so writing it now would encode my reading
of an undefined term as a hard assertion — which `constitution/drift-protocol.md` forbids in those
terms.

## Options (at least 3) and recommendation

### Option A — define the default as a literal and enumerate three (recommended)

State in `BR-0017-0016` that the minimal-scope default is `permissions: { contents: read }`, and
enumerate **three** declared exceptions: the verdict's empty map (explicit rather than missing),
`github-release`'s `contents: write` (the minimum for creating a release), and `publish`'s
`id-token: write` (npm provenance). `TC-0017-0016`'s oracle becomes a set equality against those
three.

Cost: the rule's headline number changes from two to three, and `EX-0017-0016` co-changes. That is the
honest direction — the third was always there, and naming it means a fourth is still detected.

### Option B — define the default per job and keep the count at two

State that a block departs when it grants more than the job needs, name `contents: write` as
`github-release`'s minimum, and keep the enumeration at two. Cost: "what the job needs" is not
mechanically checkable, so the test's oracle becomes a review judgement — which is what a `boundary`
row is least able to carry. It also means a future job could quietly acquire `contents: write` and
satisfy the rule by asserting it needs it.

### Option C — scope the rule to the blocks this spec adds

The two departures are read as "of the blocks change 2 introduces", leaving pre-existing blocks out of
scope. Cost: it makes the rule silent about the release workflow's elevations, which are the highest-
privilege blocks in the repository and the ones an enumeration is most worth having for.

**Recommendation: A.** It replaces an undefined term with a literal, makes the count match the tree,
and keeps the oracle mechanical. B trades a checkable assertion for a judgement in the one row type
that cannot hold one; C narrows the rule away from the blocks that matter most.

## Impact scope

- Specs: `spec-0017` `04_Business-Rules.md` (BR-0017-0016), `05_Examples.md` (EX-0017-0016),
  `06_Test-Cases.md` (TC-0017-0016). Upstream — a `/qfai-sdd` change, not this stage's.
- Production: none. `.github/workflows/**` is unaffected by any option; only what the row asserts
  about it changes.
- Ledger rows: `TDD-0016` blocked until this resolves. The other change-2 rows — `TDD-0014`,
  `TDD-0019`, `TDD-0021`, `TDD-0022`, `TDD-0024` — are unaffected and proceed.
- Adopter-visible: no. Nothing here is distributed.

## Decision needed from user

Choose A, B or C. `TDD-0016` stays `todo` until then; change 2's other five rows are not blocked.

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd` rerun scope: define "the minimal-scope default" at the point `TC-0017-0016` measures
   it, in `spec-0017`'s business rules, and reconcile the third elevation the own tree already
   carries — either by admitting it in the rule or by removing it from the tree. Mode:
   **`re-derive`**. The rule text does not yet define the term, so the artifact cannot be
   confirmed to already satisfy the change; it has to be written.
2. Downstream ledger sweep: reset the row this CR blocks, recording `CR-20260818-0007` in its
   `DR-ID` column:
   - `TDD-0016`
     It is the only row whose assertion depends on the undefined term. It is `todo` today, so the
     reset is a no-op on status and the `DR-ID` record is the operative part.
3. Cross-check after applying: `TC-0017-0016` must be expressible as a literal comparison against
   the defined default, with no reader judgement left in the assertion.

## Resolution

Pending.
