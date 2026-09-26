# Change Request

- ID: `CR-20260818-0001`
- Title: `TDDLIST_STALE_STATUS inherits selectorResolves' last-token fallback, so it fires on rows whose test was never written — and its own docblock states the opposite`
- Raised by: `/qfai-implement orchestrator, spec-0017 step 1, measured on the first commit that created the ledger's declared test file`
- Raised at: `2026-08-18T00:00:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `user (interactive decision, /qfai-sdd session)`
- Approved at: `2026-08-23T00:00:00Z`
- Approved option: `A` — verbatim containment for the stale-status consumer only
- Applied at: `2026-08-23T00:00:00Z` — each :: segment is required verbatim rather than the joined string - a stated departure, because the joined form broke the pytest shape the suite already covers
- Superseded by: `-`
- Blocked set: `(none blocked — the defect inflates a warning count and degrades a signal; no row is prevented from landing)`

## The measurement

Creating `packages/qfai/tests/scripts/ownWorkflowTopology.test.ts` — the test file spec-0017's
ledger names for **all 82** of its rows — raised `validate --profile tdd` from `warning=352` to
`warning=369`. Every one of the 17 new warnings is `TDDLIST_STALE_STATUS`, and **12 of the 17 are
false**: the file contains no test for those rows at all.

| ledger row | full selector in file | last identifier token | token in file |
| ---------- | --------------------- | --------------------- | ------------- |
| 1–5        | **yes**               | `map` … `closed`      | yes           |
| 7          | no                    | `removed`             | yes           |
| 9          | no                    | `open`                | yes           |
| 10         | no                    | `only`                | yes           |
| 11         | no                    | `everything`          | yes           |
| 31         | no                    | `tree`                | yes           |
| 38         | no                    | `error`               | yes           |
| 40         | no                    | `fail`                | yes           |
| 41, 43     | no                    | `name`                | yes           |
| 71         | no                    | `request`             | yes           |
| 72         | no                    | `one`                 | yes           |
| 73         | no                    | `set`                 | yes           |

Rows 1–5 fire correctly: their tests exist and their `Status` had not yet been advanced. The other
twelve fire because an ordinary English word appears somewhere in a 250-line file.

## The mechanism, and why the rule's own warrant is the finding

`packages/qfai/src/core/validators/tddList.ts` `selectorResolves` accepts on either of two
conditions: verbatim containment of the selector, **or** containment of the selector's **last
identifier-shaped token** (`/[A-Za-z_][A-Za-z0-9_]{2,}/g`, last match). Every selector in this
repository's house style ends in prose, so that token is almost always a common English word.

The `TDDLIST_STALE_STATUS` rule sits directly above its own justification:

> The selector is what makes this trustworthy: a test file typically hosts many rows, so file
> existence alone would fire on any row whose neighbours have landed. Requiring the row's own
> selector to resolve inside that file means the named test is really there.

**That last sentence is false under the predicate the rule calls.** The rule was written to be
stronger than file-existence, and under the fallback it is barely stronger: it degrades to "the file
exists and contains one common word".

The failure is also **monotone in file size**. spec-0017 points 82 rows at one file, which is the
shape the rule's docblock explicitly anticipates ("a test file typically hosts many rows"). Every
row the file grows makes a further false positive more likely, so the signal gets worse exactly as
the spec makes progress.

## A second instance, measured independently, and it cuts the other way

`qa-gatekeeper` measured the same predicate against four spec-0006 rows whose tests **do** exist, and
found that **none** of the four `Selector` cells appears verbatim in its test file. Each is reported
as resolved on one common word:

> **Two cells of this table were wrong, in two different ways, and both are worth keeping visible.**
>
> `TDD-0034` read **38** — that is `grep -c`, a count of LINES, under a header that says
> _occurrences_. `grep -o | wc -l` gives **46**. Self-reported by the reviewer whose own round-2
> measurement it came from.
>
> `TDD-0037` then read **21**, and correcting the first cell is what exposed it: `1da38e12`'s own
> rewording of a docblock ("emits nothing" to "raises no drift finding") added an occurrence of
> `finding`, so the commit that fixed one cell staled its neighbour. The same arithmetic this CR is
> about, one table over.
>
> All four re-measured at `6be8de00`: 46 / 5 / 6 / 22. The conclusion is untouched — any count of one
> or more makes `selectorResolves` falsely true — and the other three coincide with their line counts
> only because those tokens happen to appear once per line.

| row        | resolves via  | occurrences of that token in the file |
| ---------- | ------------- | ------------------------------------- |
| `TDD-0034` | `warning`     | 46                                    |
| `TDD-0035` | `control`     | 5                                     |
| `TDD-0036` | `packagedDir` | 6                                     |
| `TDD-0037` | `finding`     | 22                                    |

The first instance in this CR is **noise** — twelve warnings about rows that have not started. This
one is the opposite failure and it is worse:

- `TDDLIST_SELECTOR_UNRESOLVED` does **not** fire on any of the four, so the validator reports four
  materially wrong selectors as correct.
- The drift-protocol carve-out authorises `/qfai-implement` to rewrite a `Selector` **only while**
  `selectorResolves` is false. Here it is falsely **true**, so the carve-out **withholds** the
  permission that would let the executing stage repair the cells. The leniency that
  `drift-protocol.md` defends as failing conservatively fails conservatively only when it is
  conservative _about the right thing_: it is designed to withhold permission from a **misdescribing**
  selector, and it also withholds it from a **wrong** one.
- This slice already repaired exactly this defect once, on `TDD-0031`, by writing the describe title
  verbatim into the cell under `CR-20260807-0002` Option A. Four rows later it recurred, because
  nothing detects it.

So the recommendation below is unchanged in direction but stronger in force: whichever option is
taken, the predicate's leniency is now measured to produce both a false accusation and a false
acquittal, from the same fallback.

## What this is not

Not a claim that `selectorResolves` is wrong everywhere. `constitution/drift-protocol.md` (lines
129–137) already records the leniency **and defends it** for its other consumer: the ledger
carve-out authorises `/qfai-implement` to rewrite a `Selector` only while `selectorResolves` is
false, so leniency there fails **conservatively** — a merely misdescribing selector stays an
upstream change instead of being rewritten downstream. That reasoning is sound and this CR does not
disturb it.

The finding is that **one predicate serves two consumers whose safe directions are opposite.** For
the carve-out, a false `resolves` withholds a permission — safe. For `TDDLIST_STALE_STATUS`, a false
`resolves` emits an accusation that the ledger is stale when it is accurate — unsafe, and it trains
readers to ignore the rule at the one moment it is most useful.

## Options (at least 3) and recommendation

### Option A — verbatim containment for this consumer only (recommended)

`TDDLIST_STALE_STATUS` calls a strict variant that requires verbatim containment of the selector
(after the same quote-stripping and `::` path-stripping). `selectorResolves` itself is untouched, so
the carve-out keeps the leniency `drift-protocol.md` chose on purpose.

Cost: a row whose test exists under a _slightly_ reworded title stops being reported as stale — a
false negative replacing a false positive. That is the right trade for a `warning` whose entire
purpose is to be trusted: the rule already has no error-level consequence, and a missed nudge is
cheaper than a rule readers learn to skip.

### Option B — tighten `selectorResolves` globally

Require the `TC-NNNN-NNNN` identifier to be present rather than the last prose token. Simpler, one
predicate, and it would also make the carve-out's condition mean what it reads. Cost: it changes the
carve-out's behaviour, which is governed by a shipped constitution document and by
`packages/qfai/tests/assets/ledgerWriteAuthorization.test.ts`; it is a wider blast radius than the
defect warrants and needs its own review of the conservative-direction argument.

### Option C — register the waiver the rule itself prescribes

The rule's own remediation text says: "A project that declares test paths and selectors before
implementing them registers a `.qfai/waivers.yml` waiver." spec-0017 declares all 82 up front, so it
is precisely that project. Cost: the waiver is per-rule and blunt — it silences the **five** true
positives along with the twelve false ones, which is the opposite of what an incremental
implementation needs, and it leaves the docblock's false warrant in place for every other adopter.

**Recommendation: A.** It repairs the consumer whose stated warrant is contradicted, leaves the
deliberate leniency where it was deliberately chosen, and does not touch a shipped constitution
document. C is available as an interim measure while A is unlanded — but if C is taken, the
docblock sentence quoted above still has to be corrected, because it is false independently of any
waiver.

## Impact scope

- Production: `packages/qfai/src/core/validators/tddList.ts` under A or B. None under C.
- Shipped surface: none under A or C. Under B, `constitution/drift-protocol.md`'s conditional-cell
  reasoning would need re-reading, and `ledgerWriteAuthorization.test.ts` pins it.
- Specs: none. Ledger rows: none reset.
- Adopter-visible: yes — the rule fires in every adopter tree that declares selectors ahead of
  tests, which is the workflow `/qfai-sdd` produces by design.

## Consequence for the spec-0017 baseline, recorded now

Until this is resolved, spec-0017's `validate --profile tdd` warning count is **not** a stable
baseline: it moves with the size of `ownWorkflowTopology.test.ts` for reasons unrelated to the rows
being implemented. Any step-4 measured-delta comparison in this spec must therefore quote the
`TDDLIST_STALE_STATUS` count separately rather than folding it into a single total.

## Decision needed from user

Choose A, B or C, and say whether C should be taken as an interim while A is unlanded.

## Approved actions (owner skill rerun plan)

1. Owner is **not** a spec-authoring skill: the defect is in `packages/qfai/src`, in the rule that
   inherits `selectorResolves`' trailing-token fallback. It is fixed under its own spec row with its
   own test, not by rerunning `/qfai-sdd` over an artifact. **No mode applies**: the invocation
   table in `drift-protocol.md` step 4 covers `spec-*/**`, `_policies/**` and
   `.qfai/contracts/**`, and this fix is in `packages/qfai/src`. Naming `confirm-only` or
   `re-derive` here would describe a rerun that cannot happen.
2. Downstream ledger sweep: **no rows are reset**, in any spec. The defect inflates a warning count
   and degrades a signal; it does not make a landed row's evidence wrong, and no row's status was
   derived from the inflated count.
3. Cross-check after applying: re-run `validate --profile tdd --root .` and confirm the
   `TDDLIST_STALE_STATUS` population shrinks by exactly the rows whose `Test file` cell is empty —
   the second instance measured in this CR cuts the other way and must NOT disappear with it.

## Resolution

Pending.
