# Change Request

- ID: `CR-20260811-0001`
- Title: `No test observes the true direction of shouldFailDoctor's --fail-on error branch: inverting it to return false passes the entire 20-file doctor closure`
- Raised by: `/qfai-implement, TDD-0031 — found by measuring an equivalent-mutant prediction rather than accepting it`
- Raised at: `2026-08-11T00:00:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `user (interactive decision, /qfai-sdd session)`
- Approved at: `2026-08-23T00:00:00Z`
- Approved option: `A` — add a coverage-target TC for the failing direction
- Applied at: `2026-08-23T00:00:00Z` — TC-0006-0036 / EX-0006-0029 added, TDD-0041 seeded, and the exact return-false mutant now reddens
- Superseded by: `-`
- Blocked set: `(none — no in-flight row depends on this)`

## The measurement

`shouldFailDoctor` (`packages/qfai/src/cli/commands/doctor.ts:219`) contains:

```ts
if (failOn === "error") {
  return summary.error > 0;
}
```

Mutating that `return` to `return false;` — base blob `a2a92ca0`, mutant `0d5bb2c3`, needle unique at one site
— leaves the **entire doctor closure green**: 20 file selectors, `Test Files 18 passed | 2 skipped (20)` /
`Tests 87 passed | 14 skipped (101)`, exit 0, **identical to the clean run**.

So **no test in that closure observes the branch returning `true`.** Every suite exercising
`--fail-on error` does so on a tree that is expected to pass, which the mutant also satisfies.

## Why it is a defect and not a coverage preference

`--fail-on error` is the **default** failure mode of `qfai doctor`, and the branch under it is the one that
turns a real error into a non-zero exit. Inverting it silently converts every erroring tree into exit 0 —
the failure mode a CI gate exists to prevent — and the test suite would not notice. A production branch whose
true direction has no oracle is the shape `references/oracle-strength.md` exists to catch; that it is the
default path makes it the highest-value instance of it in this module.

## What does NOT cover it, checked rather than assumed

- **`TC-0006-0033`** is the nearest control, but it sits on the **`--fail-on warning`** branch — a different
  `return` statement in the same function, so it cannot reach this one.
- **`TC-0006-0029` / `TDD-0031`** asserts the branch returning **`false`** (an advisory keeps exit 0). That is
  the direction the mutant preserves, which is why this row found the gap and cannot close it.
- **`TC-0006-0007`** (`--fail-on error pass`, currently `exception`, 2026-04-14) is the row the branch
  originally belongs to, and it too asserts the passing direction.

## Options

**Option A — add a coverage-target TC for the failing direction (recommended).** One new `TC` under
`AC-0006-0022`'s neighbourhood: a tree carrying at least one `error`-severity finding, asserted to exit
non-zero under `--fail-on error`. Cost: one `/qfai-sdd` Phase 2b pass and one new TDD row. This closes the
mutant directly and is the smallest change that gives the branch an oracle.

**Option B — extend an existing TC's Verify list** with the failing direction rather than minting a new TC.
Cheaper in ID surface, but it widens an already-`exception` row (`TC-0006-0007`) and mixes two directions into
one obligation, which is what made `TC-0006-0029` need splitting across `TDD-0031` and `TDD-0040`.

**Option C — accept the gap and record it.** Not recommended, but stated for completeness: the branch is two
lines and visibly correct on inspection. The argument against is that "visibly correct" is precisely the
standard this slice has been demonstrating is insufficient — nine rounds of one row were spent on claims that
were visibly correct and measurably false.

## Ownership note

Deliberately raised with **no owner assigned and an empty blocked set**. The implementer that found it
declined to attach it to any existing row, because every candidate row asserts the direction the mutant
preserves — assigning it would have created the appearance of coverage without the substance, which is the
defect class this CR is about.
