import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import {
  QFAI_GITIGNORE_GOVERNANCE_NEGATIONS,
  QFAI_GITIGNORE_RECOMMENDED_ENTRIES,
} from "../../src/core/gitignore.js";
import { isCoverageTargetLevel, NON_COVERAGE_LAYERS } from "../../src/core/tddHelpers.js";
import { validateLayeredTraceability } from "../../src/core/validators/layeredTraceability.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const TEMPLATE = "assistant/skills/qfai-sdd/templates/specs/spec/tdd/test-list.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Splits a markdown table row into trimmed cells. */
const cells = (row: string): string[] =>
  row
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());

/** Inserts a ledger row directly under the template's header separator. */
const withLedgerRow = (template: string, row: string): string => {
  const lines = template.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.trim().startsWith("| TDD-ID"));
  if (headerIndex < 0) {
    throw new Error("the shipped template no longer carries a ledger header row");
  }
  lines.splice(headerIndex + 2, 0, row);
  return lines.join("\n");
};

/** The `Status` values the template's schema table documents as legal. */
const schemaStatuses = (template: string): string[] => {
  const row = template
    .split(/\r?\n/)
    .find((line) => line.startsWith("| Status ") && line.includes("`todo`"));
  if (row === undefined) {
    throw new Error("the shipped template no longer documents the `Status` column");
  }
  return [...cells(row)[1].matchAll(/`([a-z-]+)`/g)].map((match) => match[1]);
};

/** A ledger row for a TC that `06_Test-Cases.md` does not declare. */
const deletedTcRow = (tddId: string, status: string): string =>
  `| ${tddId} | TC-0009 | Unit | tests/deleted.test.ts | deleted | ${status} | - | - |`;

/**
 * A resolvable Test Case Table declaring one non-coverage TC.
 *
 * `TC-0009` is deliberately absent: it stands for the TC deleted upstream whose
 * ledger row Phase 2b has to retire. `L3` keeps the declared TC off the
 * coverage-target list so the only findings are the ones under test.
 */
const TEST_CASES = [
  "# 06 Test Cases",
  "",
  "## Test Case Table",
  "",
  "| TC-ID | Level | Description |",
  "| ------- | ----- | ----------- |",
  "| TC-0001 | L3 | still declared |",
  "",
].join("\n");

/** Seeds a throwaway project holding one spec whose ledger is `ledger`. */
const seedSpec = async (ledger: string): Promise<string> => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ledger-retire-"));
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(path.join(specDir, "tdd"), { recursive: true });
  await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
  await writeFile(path.join(specDir, "02_User-stories.md"), "# US\n", "utf-8");
  await writeFile(path.join(specDir, "06_Test-Cases.md"), TEST_CASES, "utf-8");
  await writeFile(path.join(specDir, "tdd", "test-list.md"), ledger, "utf-8");
  return root;
};

/**
 * The canonical `## Triage` table `sdd-triage.md` persists cross-spec rows into.
 *
 * Header membership matters: `maskTriageSection` exempts a table's cells only
 * when it carries every column of `TRIAGE_TABLE_HEADER`.
 */
const CROSS_SPEC_TRIAGE = [
  "# 10 delta",
  "",
  "## Triage",
  "",
  "| Source | Subject | Existing Spec | Operation | Sub-op | Approved By | Rationale |",
  "| ------ | ------- | ------------- | --------- | ------ | ----------- | --------- |",
  "| REQ-0001 | retire a row | spec-0001 | UPDATE | REMOVE | owner | body in 09_delta.md |",
  "",
].join("\n");

/**
 * A transcribed `### TDD-NNNN` evidence body. `qfai-implement/SKILL.md` makes
 * exactly one obligation reference (`TC-ref` / `US-ref` / `CON-API-ref`)
 * mandatory in it, which is why such a body can never be legal in `_policies`.
 */
const EVIDENCE_BODY = [
  "### TDD-0001",
  "",
  "- TC-ref: TC-0001",
  "- RED command: `npx vitest run tests/x.test.ts`",
  "- RED result: 1 failed",
  "- GREEN command: `npx vitest run tests/x.test.ts`",
  "- GREEN result: 1 passed",
  "",
].join("\n");

/**
 * Runs `validateLayeredTraceability` over a throwaway v1421 project holding one
 * spec and `_policies/10_delta.md`, and reports the codes it raised.
 */
const layeredCodesFor = async (policies: string, specDelta: string | null): Promise<string[]> => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ledger-policies-"));
  try {
    const specsRoot = path.join(root, ".qfai", "specs");
    const specDir = path.join(specsRoot, "spec-0001");
    await mkdir(specDir, { recursive: true });
    await mkdir(path.join(specsRoot, "_policies"), { recursive: true });
    // `06_Test-Cases.md` is the case-exact marker that makes this a v1421
    // layered spec, which is what puts `_policies` under the shared-scope scan.
    await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
    await writeFile(path.join(specDir, "02_User-stories.md"), "# US\n", "utf-8");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), TEST_CASES, "utf-8");
    if (specDelta !== null) {
      await writeFile(path.join(specDir, "09_delta.md"), specDelta, "utf-8");
    }
    await writeFile(path.join(specsRoot, "_policies", "10_delta.md"), policies, "utf-8");
    const issues = await validateLayeredTraceability(root, defaultConfig);
    return issues.map((entry) => entry.code);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};

/** The distinct `UPDATE:*` Triage operations a passage names. */
const triageOps = (text: string): string[] => [
  ...new Set([...text.matchAll(/UPDATE:[A-Z]+/g)].map((match) => match[0])),
];

/** The slice of `text` from `from` up to (not including) `to`. */
const between = (text: string, from: string, to: string): string => {
  const start = text.indexOf(from);
  const end = text.indexOf(to, start + from.length);
  if (start < 0 || end < 0) {
    throw new Error(`the shipped surface no longer carries the passage "${from}" … "${to}"`);
  }
  return text.slice(start, end);
};

/** Runs `validateTddList` over a throwaway project and cleans it up. */
const codesFor = async (ledger: string): Promise<Array<{ code: string; severity: string }>> => {
  const root = await seedSpec(ledger);
  try {
    const issues = await validateTddList(root, defaultConfig);
    return issues.map((entry) => ({ code: entry.code, severity: entry.severity }));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};

describe("tdd/test-list.md has a shipped template and a named producer", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the ledger is the first table so validateTddList parses it`, async () => {
      const template = await read(tree, TEMPLATE);
      // `validateTddList` reads `parseFirstMarkdownTable`: any table above the
      // ledger is parsed as the ledger and raises eight
      // TDDLIST_REQUIRED_COLUMN_MISSING errors.
      const header = template.split(/\r?\n/).find((line) => line.trim().startsWith("|"));
      expect(header).toBeDefined();
      expect(cells(header ?? "")).toEqual([
        "TDD-ID",
        "TC-Refs",
        "Layer",
        "Test file",
        "Selector",
        "Status",
        "DR-ID",
        "Evidence",
      ]);
      expect(template.indexOf("## Ledger")).toBeLessThan(template.indexOf("## Schema"));
    });

    it(`${tree}: the template states who produces the rows`, async () => {
      const template = await read(tree, TEMPLATE);
      expect(template).toContain("## Producer");
      expect(template).toContain("one row per coverage-target TC");
      expect(template).toContain("An empty table below is valid");
    });

    it(`${tree}: the template claims no producer the shipped skills do not implement`, async () => {
      const template = await read(tree, TEMPLATE);
      expect(template).toContain("`/qfai-atdd` does not write to\nthis ledger");
      expect(template).not.toContain("`Layer = E2E`");
    });

    it(`${tree}: reseeding is stated as a delta, not a regeneration`, async () => {
      const template = await read(tree, TEMPLATE);
      expect(template).toContain("Reseeding is a **delta**, never a regeneration");

      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      expect(skill).toContain("**Seeding is a delta,\n   not a regeneration, in both directions**");

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain(
        "Delta only: an unchanged TC's row keeps its `TDD-ID`, `Status`, `Test file`, `Selector`, `DR-ID` and `Evidence`.",
      );
    });

    it(`${tree}: the delta reconciles changed and removed TCs, not only new ones`, async () => {
      const template = await read(tree, TEMPLATE);
      expect(template).toContain("The delta runs in both directions.");
      expect(template).toContain("has its row retired the same way");

      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      expect(skill).toContain("changed / removed TCs are reset or retired");

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain("Reconcile changed and removed TCs");
    });

    it(`${tree}: "retire" names an encoding the ledger schema can express`, async () => {
      // "retire the row" named no state. `retired` is not a legal `Status`, and
      // the two states the row could hold are the two the same sentence
      // forbids — so the instruction was unperformable and the literal reading
      // failed `qfai validate`. Every surface that says "retire" must now say
      // what it means: delete the row, under the driving `CR-*`.
      const template = await read(tree, TEMPLATE);
      expect(template).toContain("**Retiring a row means deleting it from the table.**");
      // Deleting it is not losing the cycle: `Evidence` is a pointer.
      expect(template).toContain("`.qfai/evidence/implement-<spec-id>.md`");

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain("Retiring a row means **deleting it from the ledger table**");

      const rules = await read(
        tree,
        "assistant/skills/qfai-sdd/references/spec-traceability-rules.md",
      );
      expect(rules).toContain("There is no `retired` value");

      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      expect(skill).toContain("since there is no `retired` status");
    });

    it(`${tree}: the schema table lists every Status validateTddList accepts`, async () => {
      // The retirement paragraph points at this table as the list of legal
      // values, so an incomplete table would have an agent rewrite a legitimate
      // `blocked` / `review-fix` row into some other state.
      const template = await read(tree, TEMPLATE);
      const listed = schemaStatuses(template);
      expect(listed).toEqual([
        "todo",
        "blocked",
        "red",
        "green",
        "refactor",
        "review-fix",
        "done",
        "exception",
      ]);
      // A `blocked` row needs its blocker named, which the table alone does not say.
      expect(template).toContain("`Blocked-By`");

      for (const status of listed) {
        const codes = await codesFor(withLedgerRow(template, deletedTcRow("TDD-0001", status)));
        expect(
          codes.filter((entry) => entry.code === "TDDLIST_INVALID_STATUS"),
          `the template documents \`${status}\` but validateTddList rejects it`,
        ).toHaveLength(0);
      }
    });

    it(`${tree}: retirement points at the layer's evidence file and a spec-qualified ID`, async () => {
      // `Evidence` is owned per `Layer`: an Integration/API/E2E row's proof
      // lives in `atdd-<spec-id>.md`, not `implement-<spec-id>.md` — see
      // `qfai-implement/references/execution-ledger.md`. And `TDD-ID` is unique
      // only within its spec, so a CR retiring rows in two specs has to qualify
      // it. Reusing a retired number would point a fresh row's `Evidence`
      // anchor at the old cycle's section.
      const template = await read(tree, TEMPLATE);
      expect(template).toContain("`.qfai/evidence/atdd-<spec-id>.md`");
      expect(template).toContain("Record it as `<spec-id>/TDD-NNNN` (`spec-0001/TDD-0001`)");
      expect(template).toContain("**never reused**");

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain(
        "`.qfai/evidence/atdd-<spec-id>.md` for an `Integration` / `API` / `E2E` row",
      );
      expect(checklists).toContain(
        "recorded as `<spec-id>/TDD-NNNN` in the record that authorised the deletion",
      );
      expect(checklists).toContain("A retired `TDD-ID` is never reused");

      const rules = await read(
        tree,
        "assistant/skills/qfai-sdd/references/spec-traceability-rules.md",
      );
      expect(rules).toContain("A retired `TDD-ID` is **never reused**");

      // The evidence-ownership split the template now mirrors is real.
      const ledger = await read(
        tree,
        "assistant/skills/qfai-implement/references/execution-ledger.md",
      );
      expect(ledger).toContain("`.qfai/evidence/atdd-<spec-id>.md`");
    });

    it(`${tree}: the retirement record follows the approval, not a fixed artifact`, async () => {
      // A normal `/qfai-sdd` run reaches a deletion through an `UPDATE:REMOVE`
      // Triage row that AskUserQuestion already approved and `sdd-triage.md`
      // persists to `09_delta.md` — no `CR-*` exists on that path. Demanding
      // one unconditionally would either strand the stale row or manufacture a
      // duplicate CR for a change the operator has already approved.
      const template = await read(tree, TEMPLATE);
      expect(template).toContain("**Normal `/qfai-sdd` reseed, TC deleted upstream.**");
      expect(template).toContain("**Drift Protocol owner rerun.**");
      expect(template).toContain("Do not open a `CR-*` for a deletion Triage already approved.");

      const triage = await read(tree, "assistant/skills/qfai-sdd/references/sdd-triage.md");
      expect(triage).toContain("`<spec>/09_delta.md` for rows that touch a single spec");

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain("do not open a `CR-*` for it");

      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      expect(skill).toContain("recorded in whatever authorised\n   the deletion");
    });

    it(`${tree}: the deleted row's Evidence value is transcribed somewhere tracked`, async () => {
      // The premise, asserted against the writer rather than restated: the
      // managed block ignores `.qfai/evidence/*` and re-includes neither
      // `implement-<spec-id>.md` nor `atdd-<spec-id>.md`, so on a default
      // layout the file the `Evidence` cell points at never reaches a commit.
      // The tracked record — CR under `.qfai/decisions/`, or the Triage row's
      // `09_delta.md` under `.qfai/specs/` — has to carry the value itself.
      expect(QFAI_GITIGNORE_RECOMMENDED_ENTRIES).toContain(".qfai/evidence/*");
      for (const negation of QFAI_GITIGNORE_GOVERNANCE_NEGATIONS) {
        expect(negation).not.toMatch(/evidence\/(implement|atdd)/);
      }

      const template = await read(tree, TEMPLATE);
      expect(template).toContain("Copy the deleted row's `Evidence` cell into that record");
      expect(template).toContain("excludes `.qfai/evidence/*`");

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain("Copy the deleted row's `Evidence` cell into that record");

      // The CR template is one of those records, so its enumeration and its
      // `Resolution` both have to ask for the spec-qualified ID and the value.
      const cr = await read(tree, "assistant/skills/qfai-sdd/templates/change-request.md");
      expect(cr).toContain("reset **or retire** these `tdd/test-list.md` rows");
      expect(cr).toContain("`<spec-id>/TDD-NNNN` — `<that row's Evidence cell, verbatim>`");
      expect(cr).toContain("resets and retirements listed separately");
      expect(cr).not.toContain("- `<TDD-NNNN>`, `<TDD-NNNN>`, …");
    });

    it(`${tree}: retiring a row assigns its test an owner before the row goes`, async () => {
      // The row is the only thing that names the test: `/qfai-sdd` does not
      // edit test code and `/qfai-implement` only selects rows the ledger still
      // holds, so a `done` row deleted without a disposition leaves a test
      // asserting a retired behaviour with no owner and no traceable origin.
      const template = await read(tree, TEMPLATE);
      expect(template).toContain("**Deleting the row does not delete the test it drove.**");
      expect(template).toContain("assign that\ntest an owner in the same record");
      expect(template).toContain("delete only the named selector");

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain("Deleting a row does not delete its test");

      // The CR — one of the two records — has a slot for that disposition.
      const cr = await read(tree, "assistant/skills/qfai-sdd/templates/change-request.md");
      expect(cr).toContain("Name the test's disposition here too");
    });

    it(`${tree}: a TC that leaves coverage without being deleted has a record too`, async () => {
      // `sdd-triage.md` encodes "the TC survives, its `Level` changed" as
      // `UPDATE:MODIFY`; only a deleted item is `UPDATE:REMOVE`. Naming the
      // removal record as `UPDATE:REMOVE`-only would leave this reseed path
      // pointing at a Triage row that was never raised.
      const template = await read(tree, TEMPLATE);
      expect(template).toContain("**Normal `/qfai-sdd` reseed, TC deleted upstream.**");
      expect(template).toContain("**Normal `/qfai-sdd` reseed, TC no longer a coverage target.**");
      expect(template).toContain("That `UPDATE:MODIFY` row is the");

      const triage = await read(tree, "assistant/skills/qfai-sdd/references/sdd-triage.md");
      expect(triage).toContain("Now-obsolete US/AC/BR/EX/TC → **UPDATE:REMOVE**");

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain("so that `UPDATE:MODIFY` row is the record instead");

      const rules = await read(
        tree,
        "assistant/skills/qfai-sdd/references/spec-traceability-rules.md",
      );
      expect(rules).toContain("`Level` leaves coverage, no `UPDATE:REMOVE` row was raised");
    });

    it(`${tree}: the retirement record carries the evidence body, not just the anchor`, async () => {
      // The `Evidence` cell is a pointer (`references/execution-ledger.md`
      // caps it at the one-word outcomes plus an anchor) into a file the
      // managed `.gitignore` excludes. Transcribing the pointer alone puts an
      // unresolvable reference in the tracked record, so the `### TDD-NNNN`
      // body has to come with it.
      const template = await read(tree, TEMPLATE);
      expect(template).toContain("the body of the `### TDD-NNNN` section it points at");
      expect(template).toContain("the RED/GREEN commands and their output");

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain(
        "and with it the body of the `### TDD-NNNN` section that cell anchors to",
      );

      const cr = await read(tree, "assistant/skills/qfai-sdd/templates/change-request.md");
      expect(cr).toContain("paste the body of the `### TDD-NNNN`");
      expect(cr).toContain("the\ntranscribed `### TDD-NNNN` evidence body");
    });

    it(`${tree}: a cross-spec retirement keeps the evidence body out of _policies`, async () => {
      // `sdd-triage.md` persists a cross-spec row to `_policies/10_delta.md`,
      // but `maskTriageSection` exempts only the canonical `## Triage` table's
      // cells there. A `### TDD-NNNN` body pasted under it stays visible to the
      // shared-scope scan — and it always carries an obligation reference,
      // because the evidence contract makes `TC-ref` / `US-ref` /
      // `CON-API-ref` mandatory. So the unconditional "transcribe the body into
      // that record" was unsatisfiable on exactly this path.
      const template = await read(tree, TEMPLATE);
      expect(template).toContain("**The body never goes into `_policies/10_delta.md`.**");
      expect(template).toContain("`QFAI-LAYER-100`");
      expect(template).toContain("`TRACE_SHARED_SCOPE_VIOLATION`");
      expect(template).toContain("Put the body in the retiring spec's own `09_delta.md`");

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain("Never put the body in `_policies/10_delta.md`");

      const rules = await read(
        tree,
        "assistant/skills/qfai-sdd/references/spec-traceability-rules.md",
      );
      expect(rules).toContain("the body never goes into\n  `_policies/10_delta.md`");

      const cr = await read(tree, "assistant/skills/qfai-sdd/templates/change-request.md");
      expect(cr).toContain("put the evidence\n     body in the retiring spec's `09_delta.md`");

      // Both halves of the claim, against the validator rather than restated.
      const inPolicies = await layeredCodesFor(`${CROSS_SPEC_TRIAGE}\n${EVIDENCE_BODY}`, null);
      expect(inPolicies).toContain("TRACE_SHARED_SCOPE_VIOLATION");

      const inSpecDelta = await layeredCodesFor(CROSS_SPEC_TRIAGE, EVIDENCE_BODY);
      expect(inSpecDelta).not.toContain("TRACE_SHARED_SCOPE_VIOLATION");
      expect(inSpecDelta).not.toContain("QFAI-LAYER-100");
    });

    it(`${tree}: every Triage row the guidance retires under is one Triage approves`, async () => {
      // The ownership split makes a row deletion an upstream change and grants
      // one exception: a Triage row carrying the operator's approval. Naming
      // `UPDATE:MODIFY` as a retirement record while the carve-out covered only
      // `UPDATE:REMOVE` — and while `sdd-triage.md`'s approval pass collected an
      // approver for neither — left that path deleting rows on no authority.
      const template = await read(tree, TEMPLATE);
      const retirement = between(
        template,
        "Record the removal where the authorisation for it already lives.",
        "Record it as `<spec-id>/TDD-NNNN`",
      );
      const ops = triageOps(retirement);
      expect(ops).toContain("UPDATE:REMOVE");
      expect(ops).toContain("UPDATE:MODIFY");

      const rules = await read(
        tree,
        "assistant/skills/qfai-sdd/references/spec-traceability-rules.md",
      );
      const carveOut = between(rules, "- **Ownership split.**", "\n- `Evidence` is a **pointer**");

      const triage = await read(tree, "assistant/skills/qfai-sdd/references/sdd-triage.md");
      const approvalPass = between(triage, "5. **Approval pass.**", "\n6. **Persist.**");

      for (const op of ops) {
        expect(carveOut, `${op} retires rows but the ownership split does not exempt it`).toContain(
          op,
        );
        // The approval pass names an operation either whole (`UPDATE:MODIFY`)
        // or split across the two Triage columns it is stored in ("Sub-op is
        // REMOVE"), so accept both spellings — what must not happen is a sub-op
        // that retires rows appearing nowhere in it.
        const subOp = op.slice(op.indexOf(":") + 1);
        expect(
          approvalPass.includes(op) || approvalPass.includes(`Sub-op is ${subOp}`),
          `${op} retires rows but the approval pass collects no approver for it`,
        ).toBe(true);
      }
      // The approval is for the deletion, not for the `Level` edit that caused it.
      expect(approvalPass).toContain("deleting\n   a ledger row is operator-approved");
      expect(template).toContain("record the approver in that row's `Approved By`");
    });

    it(`${tree}: a row retired before it ran records "no evidence" instead of inventing one`, async () => {
      // `EVIDENCE_CHECK_STATUSES` asks for a command and its result only from
      // `green` / `refactor` / `review-fix` / `done`, so a row deleted while
      // still `todo` has an empty `Evidence` cell and no `### TDD-NNNN` section
      // to transcribe. The unconditional requirement left the agent inventing a
      // section or refusing to retire the row.
      const template = await read(tree, TEMPLATE);
      expect(template).toContain("**A row retired before it ever ran has no such section.**");
      expect(template).toContain("no evidence — retired at Status = <status>, never\nexecuted");
      expect(template).toContain("Transcribe a body only when the cell names\none");

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain("Transcribe a body only when the cell anchors one");

      const rules = await read(
        tree,
        "assistant/skills/qfai-sdd/references/spec-traceability-rules.md",
      );
      expect(rules).toContain("when that cell holds an anchor");

      const cr = await read(tree, "assistant/skills/qfai-sdd/templates/change-request.md");
      expect(cr).toContain("`no evidence — retired at Status = <status>, never executed`");

      // The premise: these statuses legitimately hold no evidence…
      for (const status of ["todo", "blocked", "red", "exception"]) {
        const codes = await codesFor(withLedgerRow(template, deletedTcRow("TDD-0001", status)));
        expect(
          codes.map((entry) => entry.code),
          `\`${status}\` is documented as owing no evidence but the validator demands it`,
        ).not.toContain("TDDLIST_EVIDENCE_EMPTY");
      }
      // …and the over-correction pin: a row that did run still owes it, so the
      // branch cannot widen into "transcription is optional".
      const done = await codesFor(withLedgerRow(template, deletedTcRow("TDD-0001", "done")));
      expect(done.map((entry) => entry.code)).toContain("TDDLIST_EVIDENCE_EMPTY");
    });

    it(`${tree}: the encodings the guidance rules out are the ones validateTddList rejects`, async () => {
      const template = await read(tree, TEMPLATE);

      // The literal reading of "retire": a hard error, which is why the
      // guidance may not leave it as the obvious move.
      const retired = await codesFor(withLedgerRow(template, deletedTcRow("TDD-0001", "retired")));
      expect(
        retired.filter(
          (entry) => entry.code === "TDDLIST_INVALID_STATUS" && entry.severity === "error",
        ),
      ).toHaveLength(1);

      // Parking the row below the ledger is not retiring it either:
      // `collectLedgerTables` scores every schema-complete table in the file,
      // so the row for the deleted TC is still read and still reported.
      const parked = [
        template.trimEnd(),
        "",
        "## Retired",
        "",
        "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
        "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |",
        deletedTcRow("TDD-0002", "done"),
        "",
      ].join("\n");
      expect((await codesFor(parked)).map((entry) => entry.code)).toContain("TDDLIST_UNKNOWN_REF");

      // …and trimming that parked table down to hide it is worse: a table
      // carrying both markers is a ledger table, and an incomplete one is a gap.
      const trimmed = [
        template.trimEnd(),
        "",
        "## Retired",
        "",
        "| TDD-ID | TC-Refs | Status |",
        "| ------ | ------- | ------ |",
        "| TDD-0002 | TC-0009 | done |",
        "",
      ].join("\n");
      expect(
        (await codesFor(trimmed)).filter(
          (entry) => entry.code === "TDDLIST_REQUIRED_COLUMN_MISSING" && entry.severity === "error",
        ).length,
      ).toBeGreaterThan(0);
    });

    it(`${tree}: an empty ledger is only "nothing to do" when 06_Test-Cases.md agrees`, async () => {
      // The rule is stated in SKILL.md; the procedure behind it lives in the
      // reference, where the progressive-disclosure split (#414) put it.
      const skill = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      expect(skill).toContain(
        "**An empty ledger is a fault only when `06_Test-Cases.md` disagrees.**",
      );
      expect(skill).toContain("references/ledger-preconditions.md");

      const preconditions = await read(
        tree,
        "assistant/skills/qfai-implement/references/ledger-preconditions.md",
      );
      expect(preconditions).toContain("read `06_Test-Cases.md` and");
      expect(preconditions).toContain("Run the recovery above instead of exiting");
    });

    it(`${tree}: the coverage-target test matches the validator, not a level allowlist`, async () => {
      const preconditions = await read(
        tree,
        "assistant/skills/qfai-implement/references/ledger-preconditions.md",
      );
      // `isCoverageTargetLevel` excludes only the non-coverage layers;
      // everything else — including `unit`, `component` and any unrecognised
      // value — is a target, and a `06_Test-Cases.md` with no `Level` column
      // makes every TC one. Guidance naming a narrower allowlist makes a
      // header-only ledger look truthful and skips the whole implementation.
      //
      // Compared case-insensitively: the set is normalised to lower case for
      // matching, while the doc quotes the spelling the shipped
      // `06_Test-Cases.md` template uses (`L3`, not `l3`).
      const flatPreconditions = preconditions.toLowerCase();
      for (const layer of NON_COVERAGE_LAYERS) {
        expect(isCoverageTargetLevel(layer)).toBe(false);
        expect(flatPreconditions).toContain(`\`${layer}\``);
      }
      for (const target of ["unit", "component", "l1", "l2", ""]) {
        expect(isCoverageTargetLevel(target)).toBe(true);
      }
      expect(preconditions).toMatch(/no `Level` column/);
      // The removed claim: only `L1` / `L2` counted as coverage targets.
      expect(preconditions).not.toMatch(/`L1`\s*\/\s*`L2`/);
    });

    it(`${tree}: qfai-sdd owns a ledger-seeding phase in every phase-order surface`, async () => {
      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      expect(skill).toContain("Phase 2b: Seed each target spec's `tdd/test-list.md`");
      expect(skill).toContain("zero selectable items");
      // The fixed order block and project_memory are what an agent follows.
      expect(skill).toContain("-> Phase 2b Seed tdd/test-list.md (per spec)");
      // #383 inserted Phase 2c between the seeding phase and Plan finalize; this
      // assertion is about Phase 2b keeping its slot after Phase 2 Slice.
      expect(skill).toContain("Phase 2 Slice → Phase 2b Seed tdd/test-list.md → Phase 2c");

      const playbook = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-execution-playbook.md",
      );
      expect(playbook).toContain("**Phase 2b - Seed `tdd/test-list.md`** (per spec)");

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain("## Phase 2b: Seed `tdd/test-list.md`");
      expect(checklists.indexOf("## Phase 2b")).toBeLessThan(checklists.indexOf("## Phase 3"));
    });

    it(`${tree}: qfai-implement names the producer and the recovery command`, async () => {
      const skill = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      // SKILL.md still names the producer and forbids inventing rows — those
      // bind the agent before it opens anything else.
      expect(skill).toContain("**Producer**");
      expect(skill).toContain("do **not** invent rows that no TC backs");

      const preconditions = await read(
        tree,
        "assistant/skills/qfai-implement/references/ledger-preconditions.md",
      );
      expect(preconditions).toContain("Rerun `/qfai-sdd <spec-id>`");
    });

    it(`${tree}: an empty ledger is not routed into recovery`, async () => {
      const preconditions = await read(
        tree,
        "assistant/skills/qfai-implement/references/ledger-preconditions.md",
      );
      expect(preconditions).toContain("## Recovery when it is missing");
      expect(preconditions).toContain(
        "## An empty ledger is a fault only when `06_Test-Cases.md` disagrees",
      );
      expect(preconditions).toContain('Report\n  "nothing to do" and exit');
    });

    it(`${tree}: a spec seeded from the template passes validateTddList`, async () => {
      const template = await read(tree, TEMPLATE);
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ledger-tpl-"));
      try {
        const specDir = path.join(root, ".qfai", "specs", "spec-0001");
        await mkdir(path.join(specDir, "tdd"), { recursive: true });
        await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
        await writeFile(path.join(specDir, "02_User-stories.md"), "# US\n", "utf-8");
        await writeFile(path.join(specDir, "06_Test-Cases.md"), "# 06 Test Cases\n", "utf-8");
        await writeFile(path.join(specDir, "tdd", "test-list.md"), template, "utf-8");

        const issues = await validateTddList(root, defaultConfig);
        expect(issues.map((entry) => entry.code)).not.toContain("TDDLIST_REQUIRED_COLUMN_MISSING");
        // Header-only ledger is the informational, non-blocking outcome.
        expect(issues.map((entry) => entry.code)).toContain("TDDLIST_INFO");
        expect(issues.filter((entry) => entry.severity === "error")).toEqual([]);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
  }
});
