/**
 * `qfai validate --spec` exists, is repeatable, writes a per-spec report file
 * and fails closed on an unknown spec — and exactly one shipped skill used it.
 *
 * `/qfai-atdd` and `/qfai-implement` both process one spec per invocation, yet
 * every gate command they published was the unscoped run. A stage that had
 * discharged everything its spec owns still failed its own gate on sibling
 * specs' obligations, and two per-spec stages raced on one `validate.json`.
 *
 * These tests pin the flag into every per-spec gate statement, and pin the
 * honest limit alongside it: the contract-owned rules cannot be spec-scoped.
 *
 * They also pin the state that limit leaves a run in. Naming the limit without
 * naming a terminal state made the compliant path — record the residue, report
 * honestly — not-done by the skill's own DoD, and the four moves the skill
 * forbids were the only exits left from the gate.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const ATDD = "assistant/skills/qfai-atdd/SKILL.md";
const OBLIGATIONS = "assistant/skills/qfai-atdd/references/cross-spec-obligations.md";
const IMPLEMENT = "assistant/skills/qfai-implement/SKILL.md";
const CHECKPOINT = "assistant/skills/qfai-implement/references/checkpoint-verification.md";
const FINAL = "assistant/skills/qfai-implement/references/final-checklist.md";

const read = async (tree: string, rel: string): Promise<string> =>
  await readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s+/g, " ");

/** Gate invocations that must carry `--spec`, per file. */
const SCOPED_GATES: Array<{ file: string; profile: string }> = [
  { file: ATDD, profile: "atdd" },
  // The skill body too, not only its references: its Completion Message names
  // the command an operator runs straight after a per-spec run, so leaving it
  // unscoped pointed them back at the repo-wide gate the flag exists to avoid.
  { file: IMPLEMENT, profile: "tdd" },
  { file: CHECKPOINT, profile: "tdd" },
  { file: FINAL, profile: "tdd" },
];

describe.each(TREES)("%s", (tree) => {
  it.each(SCOPED_GATES)("$file leaves no unscoped gate invocation", async ({ file, profile }) => {
    const text = await read(tree, file);
    const unscoped = new RegExp(
      `npx qfai validate --profile ${profile} --fail-on error(?! --spec)`,
      "g",
    );
    expect(text.match(unscoped)).toBeNull();
    expect(text).toContain(`npx qfai validate --profile ${profile} --fail-on error --spec`);
  });

  it("says why the scope flag is load-bearing, not cosmetic", async () => {
    const atdd = await read(tree, ATDD);
    expect(atdd).toContain("The scope flag is not optional bookkeeping.");
    expect(atdd).toContain("validate.spec-<id>.json");
    expect(atdd).toContain("QFAI-SCOPE-001");
  });

  it("states which rules `--spec` cannot scope, and that they still fail the gate", async () => {
    // The contract rules are filed against `.qfai/contracts/**`, which has no
    // spec owner, so a scoped run still exits 1 on a sibling's. Saying the flag
    // makes the gate this spec's own would be false, and the failure mode of
    // believing it is an operator weakening the profile to get green.
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("and the gate still fails on the rest");
    expect(atdd).toContain("`QFAI-ATDD-113`");
    expect(atdd).toContain("`QFAI-ATDD-115`");
    expect(atdd).toContain("do **not** claim the gate passed, weaken the profile");
  });

  it("says the tdd gate still fails on a sibling's todo stub", async () => {
    // `--profile tdd` *does* run `validateTestTodoStubs`, and
    // `QFAI-TEST-001` names a test file, which no spec owns — so a sibling's
    // `it.todo` exits 1 on this gate. The checklist read as though `--spec`
    // made the gate this spec's own, which is the reading that ends in an
    // operator lowering `--fail-on` to get green.
    const checklist = flat(await read(tree, FINAL));
    expect(checklist).toContain("`QFAI-TEST-001` is **not** one of them");
    expect(checklist).toContain("a sibling spec's `it.todo` exits 1 here");
    expect(checklist).toContain("do **not** claim the gate passed");
  });

  it("names the contract family as still-blocking too", async () => {
    // `runTddValidators` runs `validateContracts` regardless of `specScope`,
    // and `QFAI-CONTRACT-*` / `QFAI-DB-002` are filed against
    // `.qfai/contracts/**`, which no spec owns — so they survive the scope
    // filter and exit 1 like the other two. Listing only `QFAI-TEST-001` and
    // `QFAI-TRACE-*` made a contract error read as an unexplained checkpoint
    // failure, which is the reading that ends in a lowered `--fail-on`.
    const checkpoint = flat(
      await read(tree, "assistant/skills/qfai-implement/references/checkpoint-verification.md"),
    );
    expect(checkpoint).toContain("the contract validators run regardless of scope");
    expect(checkpoint).toContain("`QFAI-CONTRACT-*` and `QFAI-DB-002`");
    expect(checkpoint).toContain("None of the three has a spec owner");
  });

  it("does not name a rule the atdd profile never runs", async () => {
    // `runAtddValidators` runs `validateAtddCodeTraceability` and
    // `validateScaffoldPlaceholder` only — `validateTestTodoStubs` is wired
    // into the tdd profile. Listing `QFAI-TEST-001` among the rules that fail
    // this skill's gate told a completion reviewer that
    // `--profile atdd` catches an `it.todo` acceptance test. It does not, so
    // the reviewer would trust a green gate over an unimplemented test.
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).not.toContain("QFAI-TEST-001");
  });

  it("does not call a nonexistent-spec reference repo-wide wherever it sits", async () => {
    // A file under the canonical `tests/<layer>/spec-NNNN/**` layout is owned
    // by that spec whatever its annotation says, so the same broken reference
    // is scoped to that spec's run and dropped from every other. Reading it as
    // a repo-wide blocker made a sibling run report something it cannot see.
    // The enumeration lives in the topic file, under the skill's line ceiling.
    const obligations = flat(await read(tree, OBLIGATIONS));
    expect(obligations).toContain("**and sitting where no spec owns it either**");
    expect(obligations).not.toContain(
      "naming a spec number no spec pack has: no spec owns it, and `--spec` on that number is itself rejected, so it belongs to every run",
    );
    expect(flat(await read(tree, ATDD))).toContain(
      "`references/cross-spec-obligations.md#what-the-scope-flag-cannot-narrow` enumerates all of them",
    );
  });

  it("names the terminal state a run that records the residue ends in", async () => {
    // The constraint forbids all four ways out of a sibling's
    // `QFAI-ATDD-113`, so unless the compliant path has a name, the run is in
    // no state the skill defines — and the state a skill does not name is the
    // one an agent invents, out of the four forbidden moves.
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("**That record is a terminal state, not a deferral of one**");
    expect(atdd).toContain("**`PASS with cross-spec obligations`**");
    expect(atdd).toContain("`#success-criteria-definition-of-done`");
    // …and it is not a free pass: unattributable residue is still this spec's.
    expect(atdd).toContain(
      "a finding you cannot attribute to a named sibling spec is **this** spec's",
    );
  });

  it("states the DoD as spec-owned clean plus attributed residue, not flat exit 0", async () => {
    // A flat "validation passes" made the compliant run not-done by its own
    // DoD, and the remedy it offers — the owning spec's next run — hits the
    // identical block from the other side, so no spec could ever complete.
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).not.toContain(
      "- Validation passes for this spec: `npx qfai validate --profile atdd --fail-on error --spec <spec-id>`.",
    );
    expect(atdd).toContain("**no finding this spec owns remains**");
    expect(atdd).toContain("**every residual finding is attributed and recorded**");
    expect(atdd).toContain("Both parts met is **`PASS with cross-spec obligations`**");
  });

  it("carves the attributed residue out of the failing-validation not-done rule", async () => {
    // Left inside it, the recorded obligation was simultaneously the mandated
    // action and a not-done criterion.
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).not.toContain("- Validation evidence is missing or failing.");
    expect(atdd).toContain(
      "**A residual `QFAI-ATDD-113` / `-115` attributed to a named sibling spec and recorded under `## Cross-spec obligations` is not this criterion**",
    );
    expect(atdd).toContain("it blocks _that_ spec's completion, not this one");
    // The escape hatch has a floor: an entry naming no owner is still a FAIL.
    expect(atdd).toContain("names **this** spec as the owner");
  });

  it("gives the mandated record a home in the stage's own evidence template", async () => {
    // The constraint told the run to record a cross-spec obligation "in this
    // stage's evidence", but every `Cross-spec obligations` definition lived
    // in `/qfai-implement` — so the compliant path wrote into a section this
    // stage's template did not define and no reviewer knew to read.
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("under `## Cross-spec obligations`");
    expect(atdd).toContain("Three of them carry a contract the heading cannot");
    // The template block itself, not only the prose describing it.
    expect(await read(tree, ATDD)).toContain("\n## Cross-spec obligations\n");

    const obligations = flat(await read(tree, OBLIGATIONS));
    for (const field of [
      "`Finding`",
      "`Contract ID`",
      "`Owning spec`",
      "`Why not this stage's work`",
      "`Closed by`",
    ]) {
      expect(obligations).toContain(field);
    }
    // `None` and the absent-section case, so an empty run is recordable and a
    // silent one is not.
    expect(obligations).toContain("Write `None` when the scoped run exited 0");
    expect(obligations).toContain(
      "an absent section after a run that exited 1 is unrecorded residue, not a clean run",
    );
  });

  it("says which run settles the residue the stage completes with", async () => {
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("the repo-wide `/qfai-verify` run settles the residue");
    expect(atdd).toContain("`/qfai-verify` settles the repo-wide residue at the end of the stage");
    const obligations = flat(await read(tree, OBLIGATIONS));
    expect(obligations).toContain("belongs to `/qfai-verify` at the end of the stage");
    // The recorded obligation still blocks someone — its owner.
    expect(obligations).toContain(
      "It blocks the **owning** spec's completion until that spec's next `/qfai-atdd` run covers the contract",
    );
  });

  it("keeps this residue distinct from cross-spec code ownership, which does block", async () => {
    // Both kinds land in the same evidence heading, and only one of them is a
    // completion prohibition. Collapsing them would either block every run that
    // reports a sibling's contract, or unblock a run that left another spec's
    // assertion unverified.
    const obligations = flat(await read(tree, OBLIGATIONS));
    // Resolved from `qfai-atdd/references/`, so the sibling skill is two levels
    // up. `../qfai-implement/...` named `qfai-atdd/qfai-implement/...`, which
    // does not exist, and the reader cannot tell the two kinds apart without it.
    expect(obligations).toContain("../../qfai-implement/references/cross-spec-ownership.md");
    expect(obligations).not.toContain("`../qfai-implement/");
    expect(obligations).toContain("That kind **blocks** completion while it is open");
  });

  it("carries the terminal state into the reviewer gate, failure handling and final status", async () => {
    // The DoD alone left `PASS with cross-spec obligations` unreachable: the
    // independent reviewer still required the same command to "pass", and
    // failure handling still forbade completing on a FAIL gate, so the
    // reviewer returned `REVISE` on every run that took the compliant path.
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("reached one of its **two** passing states");
    expect(atdd).toContain("Exit 1 alone is not `REVISE` here");
    expect(atdd).not.toContain(
      "- validation evidence exists and `npx qfai validate --profile atdd --fail-on error --spec <spec-id>` passes;",
    );
    expect(atdd).toContain(
      "is not a FAIL gate — it is `PASS with cross-spec obligations`, and iterating on it is waiting for a sibling spec that is waiting for this one",
    );
    // The status the run reports has to be able to say it, too.
    expect(await read(tree, ATDD)).toContain(
      "\n## Final status (PASS / PASS with cross-spec obligations / FAIL) + who confirmed\n",
    );
    expect(atdd).toContain("Gate results (`PASS` / `PASS with cross-spec obligations` / `FAIL`)");
  });

  it("gives the run a way to resolve the owning spec it must name", async () => {
    // `Owning spec` is mandatory and unblankable, but a plain `CON-API-NNNN`
    // carries no spec number and the contract file names no owner — so without
    // a read path the mandatory field could not be filled, and the entry
    // failed by the rule two lines above it.
    const obligations = flat(await read(tree, OBLIGATIONS));
    expect(obligations).toContain("## Resolving the owning spec");
    expect(obligations).toContain("`### Contract → Spec` section");
    expect(obligations).toContain("traceability.contracts.idToSpecs");
    expect(obligations).toContain(
      "Read the `Contract-Refs` column of `.qfai/specs/*/04_Business-Rules.md`",
    );
    // The index is the wrong file to reach for, and it has no spec column.
    expect(obligations).toContain(
      "`.qfai/specs/_policies/05_Contracts.md` does **not** answer this",
    );
    // Several owners, and none, both have an answer.
    expect(obligations).toContain("**Several specs** — every one of them owns it");
    expect(obligations).toContain("**No spec** — the contract is an orphan");

    // The rule-table read is a merge, not a fallback. A contract declared by a
    // sibling in `01_Spec.md` and by *this* spec only in its rule table gives a
    // non-empty map line, so a fallback gated on `(none)` never fires and the
    // run records its own contract as the sibling's residue.
    expect(obligations).toContain(
      "always, not only when step 1 is unavailable or answers `(none)`",
    );
    expect(obligations).toContain("**merge** its owners into the map's answer");
    expect(obligations).toContain("it never proves it found them all");
    expect(obligations).toContain("**Your own spec's rule table is inside that merge**");
    expect(obligations).toContain("it FAILs here rather than becoming residue");
    // …and self-ownership is a FAIL on both the one-owner and co-owner answers.
    expect(obligations).toContain(
      "unless it is this spec: then the contract is this run's own and it FAILs",
    );
    expect(obligations).toContain(
      "a co-owner discharges its own contracts, it does not hand them to a co-owner",
    );

    // …and the Read Set Contract admits the read, or the procedure is one the
    // skill's own mandatory read set forbids.
    const atdd = flat(await read(tree, ATDD));
    // The read-set exception has to describe the same merge, or the mandatory
    // read set licenses only the fallback that misses the partly-filled map.
    expect(atdd).toContain(
      "**and** merge into it the `Contract-Refs` column of `.qfai/specs/*/04_Business-Rules.md` — always, not only when the map answers `(none)`",
    );
    // The exception fires on the *unresolved* residual finding. Gating it on
    // "a sibling's" made the read set unreachable: sibling / own / orphan is
    // precisely what the map + rule-table merge decides, so an agent holding
    // the Mandatory Read Set could never open the sources that would let it
    // fire, and had to FAIL every residual as unattributable.
    expect(atdd).toContain(
      "Do not read `_policies/**` by default. **One narrow exception**, and only when the scoped gate exits 1 on a residual `QFAI-ATDD-113` / `-115`",
    );
    expect(atdd).toContain(
      "whether it is a sibling's, this spec's own or an orphan's is what this read _decides_, so the exception fires on the unresolved finding, not on an ownership you cannot yet have",
    );
    expect(atdd).not.toContain("only when the scoped gate exits 1 on a sibling's");
    expect(atdd).toContain("#resolving-the-owning-spec");

    // The resolving step has to name an invocation that actually reads the
    // scoped gate's artifact. A bare `npx qfai report` reads the configured
    // `validate.json` (`src/cli/commands/report.ts`), which a `--spec` run
    // never writes — exit 2 on a fresh repo, a stale unscoped run otherwise.
    expect(obligations).toContain("`npx qfai report --in <scoped-json>`");
    expect(obligations).toContain(
      "A bare `npx qfai report` reads the configured `validate.json`, which a `--spec` run never writes",
    );
    expect(atdd).toContain("`npx qfai report --in` the scoped gate's `validate.spec-<id>.json`");
  });

  it("resolves the owner without re-running a validator", async () => {
    // `--run-validate` is not a report-only flag. `runReport` calls
    // `validateProject` with no `specScope` and, absent `--profile`, the
    // default `full` profile (`src/core/validate.ts`), whose
    // `runFullValidators` runs `runAtddValidators` over every spec. The
    // scaffold-placeholder rule inside it calls `recordValidateCycle` per
    // (spec, TC), which increments PERSISTED state
    // (`src/core/atdd/scaffoldEscalation.ts`) and escalates the placeholder
    // from warning to error once the threshold is crossed. Looking up an owner
    // would therefore move the verdict it is being consulted for, on this spec
    // and on its siblings alike. `--in` parses a JSON file and runs nothing.
    const obligations = flat(await read(tree, OBLIGATIONS));
    expect(obligations).toContain("**Not `--run-validate`, and not a bare `npx qfai report`.**");
    expect(obligations).toContain(
      "with no `--profile` it re-runs the full profile **unscoped**, which re-runs the ATDD validators over every spec",
    );
    expect(obligations).toContain(
      "scaffold-placeholder rule advances a persistent per-`TC` validate-cycle counter",
    );
    expect(obligations).toContain("`--in` reads the JSON it is given and runs no validator");
    // The skill body offers the same choice, so it drifts back on its own.
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain(
      "never `--run-validate`, which re-runs the full profile unscoped and advances every spec's scaffold-placeholder counters",
    );
    // Neither file may offer the mutating form for this read any more.
    for (const text of [obligations, atdd]) {
      expect(text).not.toContain("`npx qfai report --run-validate`");
    }
  });

  it("derives the scoped `--in` path from `output.validateJsonPath`", async () => {
    // `scopedReportPath` splits the CONFIGURED `output.validateJsonPath` and
    // inserts `.spec-<ids>` before its extension
    // (`src/cli/commands/validate.ts`), so the scoped artifact lands beside
    // that file — not inside `paths.outDir`, which is a separate config key
    // that only happens to share the `.qfai/report` default. A repository that
    // sets them apart gets an ENOENT from an `--in` built out of `outDir`.
    const obligations = flat(await read(tree, OBLIGATIONS));
    expect(obligations).toContain(
      "**Derive `<scoped-json>` from `output.validateJsonPath`, not from `paths.outDir`**",
    );
    expect(obligations).toContain("inserting `.spec-<id>` before that path's extension");
    expect(obligations).toContain(
      "sets `output.validateJsonPath` and `paths.outDir` to different places gets an ENOENT",
    );
    expect(obligations).not.toContain("`npx qfai report --in <report>/validate.spec-<id>.json`");
    expect(flat(await read(tree, ATDD))).toContain(
      "whose path is derived from `output.validateJsonPath` and not from `paths.outDir`",
    );
  });

  it("normalizes the short contract-ref form before calling a contract an orphan", async () => {
    // `parseContractRefs` accepts `API-0001` / `DB-0001` / `UI-0001` as well as
    // the full `CON-API-0001` (`src/core/parse/contractRefs.ts`), but
    // `collectSpecContractRefs` seeds `idToSpecs` from the contract index —
    // always full IDs (`src/core/contractsDecl.ts`) — and then looks each ref
    // up verbatim (`src/core/report.ts`), so a short ref matches no key and is
    // dropped. The owning spec then reads as `(none)` on that line, and a run
    // following the unnormalized procedure FAILs a residue that was
    // attributable all along. The short form does survive in
    // `### Spec → Contracts`, which prints each spec's refs as written.
    const obligations = flat(await read(tree, OBLIGATIONS));
    expect(obligations).toContain(
      "**Normalize the short form before you read an owner off that line**",
    );
    expect(obligations).toContain("`API-NNNN` _is_ `CON-API-NNNN`");
    expect(obligations).toContain("the short ref is matched verbatim against those keys");
    expect(obligations).toContain(
      "read the `### Spec → Contracts` table beside it, which prints each spec's refs as written",
    );
    expect(obligations).toContain("names this contract in **either** form");
    // Step 2's column takes the short form too, so it needs the same rule.
    expect(obligations).toContain("a row reading `API-0001` binds `CON-API-0001`");
    // The orphan branch is the one that has to wait for the normalization.
    expect(obligations).toContain(
      "**No spec** — the contract is an orphan, declared under `.qfai/contracts/**` and referenced by no spec. Only after the normalization and the merge above",
    );
    expect(flat(await read(tree, ATDD))).toContain(
      "misses the ones that write the short `API-NNNN` / `DB-NNNN` form its keys never match",
    );
  });

  it("keeps the contract residue non-blocking in `/qfai-implement` too", async () => {
    // The next stage keeps its `E2E` / `API` / `Integration` evidence in the
    // same `atdd-<spec-id>.md`, and its completion prohibition read ANY open
    // `## Cross-spec obligations` entry as a blocker — so the rows this
    // terminal state exists to record blocked completion one stage later
    // instead. Narrow it to the code-ownership kind, keeping the floor.
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).not.toContain(
      "- A `## Cross-spec obligations` entry in this spec's evidence file is still open",
    );
    expect(implement).toContain(
      "A `## Cross-spec obligations` entry of the **code-ownership** kind in this spec's evidence file is still open",
    );
    expect(implement).toContain("**Not the contract-residue kind.**");
    expect(implement).toContain(
      "a `/qfai-atdd` run that ended `PASS with cross-spec obligations` leaves rows in this very section",
    );
    expect(implement).toContain("`../qfai-atdd/references/cross-spec-obligations.md`");
    // Told apart by fields, not by trust — and with the same floor as the
    // stage that wrote them, or the carve-out is a way out of both gates.
    expect(implement).toContain(
      "a code-ownership row names a `Test file` and a blocked `TDD-ID`, a contract-residue row names a `Contract ID` and an `Owning spec`",
    );
    expect(implement).toContain(
      "naming **this** spec as the owner, or omitting the contract ID is not attributed residue and is still this condition",
    );
    // Over-correction pin: the code-ownership kind still blocks, on both sides.
    expect(implement).toContain(
      "A clean completion here would certify an obligation this run knowingly left unmet (`references/cross-spec-ownership.md`)",
    );
    const obligations = flat(await read(tree, OBLIGATIONS));
    expect(obligations).toContain("That kind **blocks** completion while it is open");
    expect(obligations).toContain(
      "`../../qfai-implement/SKILL.md` narrows that condition to the code-ownership kind",
    );
  });

  it("records the residue per contract, since the findings aggregate per family", async () => {
    // `QFAI-ATDD-113` / `-115` are emitted once per family with every
    // uncovered contract in `refs`. One row per *finding* therefore had one
    // `Contract ID` and one `Owning spec` cell for two contracts owned by two
    // different specs — and dropping one of them still read as complete.
    const obligations = flat(await read(tree, OBLIGATIONS));
    expect(obligations).toContain("**one row per uncovered contract ID** — not one per finding");
    expect(obligations).toContain("aggregated into that single finding's `refs`");
    expect(obligations).toContain("one ID per row, never a list");
    expect(obligations).toContain(
      "leaves any ID from the finding's `refs` without a row of its own",
    );
    // The worked example has to show the split, not a single tidy row.
    expect(obligations).toContain("| QFAI-ATDD-113 | CON-API-0004 |");
    expect(obligations).toContain("| QFAI-ATDD-113 | CON-API-0005 |");

    // The evidence-template bullet in the skill is the copy an executor works
    // from; "one row per residual finding" there put the two contracts back on
    // one row and dropped an ID and an owner with them.
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain(
      "one row per uncovered contract ID the scoped gate still exits 1 on, never one per finding",
    );
    expect(atdd).not.toContain("one row per residual finding");
  });

  it("cites only contract IDs the validator accepts", async () => {
    // `API_CONTRACT_ID_RE` is `^CON-API-\d+$` (`core/atddTraceability.ts`), so
    // a copied `CON-API-0004-002` is declared by nothing and annotates as a
    // different ID than the one written.
    const cited = (await read(tree, OBLIGATIONS)).match(/CON-(?:API|DB)-\d[\dA-Za-z-]*/g) ?? [];
    expect(cited.length).toBeGreaterThan(0);
    for (const id of cited) {
      expect(id).toMatch(/^CON-(?:API|DB)-\d+$/);
    }
  });

  it("scopes the coverage criteria to the contracts this spec owns", async () => {
    // The two-part DoD names `PASS with cross-spec obligations`, but the flat
    // `All required CON-API are covered` bullet above it and the
    // `Any required US / TC / CON-API remains uncovered` not-done rule below it
    // still read a recorded sibling contract as required-and-uncovered — so the
    // compliant run was in its terminal state and not done at the same time,
    // by two lines of the same section.
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).not.toContain("- All required `CON-API` are covered by API tests.");
    expect(atdd).not.toContain("- Any required `US` / `TC` / `CON-API` remains uncovered.");
    expect(atdd).toContain("All required `CON-API` **this spec owns** are covered by API tests");
    expect(atdd).toContain(
      "All required `CON-DB` **this spec owns** are covered by integration tests",
    );
    expect(atdd).toContain(
      "Any required `US` / `TC` remains uncovered, or any required `CON-API` / `CON-DB` **this spec owns** does",
    );
    // Ownership is the resolved merge, not "the finding cites it".
    expect(atdd).toContain(
      "Ownership is the merge in `references/cross-spec-obligations.md#resolving-the-owning-spec`, not membership in the finding",
    );
    // Same floor as the validation criterion: the carve-out is not a free pass.
    expect(atdd).toContain(
      "Unrecorded, unattributable, or self-attributed residue is still this criterion",
    );
    // The Final Gate's confirmation step is the same completion prohibition and
    // drifts back into the deadlock if it keeps the unscoped wording.
    expect(atdd).not.toContain("1. Confirm required `US` / `TC` / `CON-API` coverage is complete.");
    expect(atdd).toContain("coverage is complete for the obligations this spec owns");
  });

  it("reads the Contract → Spec report from the configured out dir", async () => {
    // `runReport` writes `<paths.outDir>/report.md` (or `--out`) and prints the
    // resolved path (`src/cli/commands/report.ts`). `paths.outDir` defaults to
    // `.qfai/report` but is configurable, so a hardcoded `.qfai/report/report.md`
    // finds no report where it is configured elsewhere — every residual contract
    // then reads as unattributable — or finds a stale one left at the old default
    // and fills the load-bearing `Owning spec` field from it.
    const obligations = flat(await read(tree, OBLIGATIONS));
    expect(obligations).not.toContain("`.qfai/report/report.md`");
    expect(obligations).toContain("The run writes `<report>/report.md`");
    expect(obligations).toContain("`<report>` is `paths.outDir` from `qfai.config.yaml`");
    expect(obligations).toContain("Open the path the run just printed as `wrote report: <path>`");
    // Over-correction pin: the report OUTPUT still comes from `paths.outDir`.
    // Only the `--in` input moved to `output.validateJsonPath`; collapsing both
    // onto one key would break the other read the same way round.
    expect(obligations).toContain("and `--out` overrides even that");
  });

  it("limits the repo-wide TRACE claim to the findings that have no spec owner", async () => {
    // `QFAI-TRACE-104`..`-116` are filed against the spec's own
    // `03_Acceptance-Criteria.md` / `04_Business-Rules.md` / `05_Examples.md` /
    // `06_Test-Cases.md`, and `-002` against its ledger, so the scope filter
    // drops a sibling's before this checkpoint ever sees them.
    const checkpoint = flat(await read(tree, CHECKPOINT));
    expect(checkpoint).toContain("`QFAI-TRACE-*` findings **that have no spec owner** are filed");
    expect(checkpoint).toContain("**Not the whole `QFAI-TRACE-*` family**");
  });
});
