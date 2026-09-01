/**
 * `CON-DB` coverage is a blocking obligation (`QFAI-ATDD-115`, `error`), and it
 * cannot be spec-scoped away, yet `/qfai-atdd` stated it only once — in Success
 * Criteria. Every other enumeration of the obligation set stopped at `CON-API`:
 * the reviewer gate, the mandatory-obligation bullets, Mandatory Output 3, the
 * Volume Signals line, the not-done test, Completion Criteria step 1, the rerun
 * action and `project_memory`.
 *
 * So the three checklists a human or agent consults to *avoid* an uncovered DB
 * contract were the three that omitted it: a `completion-reviewer` following
 * the reviewer gate literally returns `PASS` on a spec the very next command —
 * `qfai validate --profile atdd --fail-on error --spec <id>` — exits 1 on.
 *
 * These tests pin `CON-DB` into every one of those lists, in both the shipped
 * asset tree and its generated root mirror.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const ATDD = "assistant/skills/qfai-atdd/SKILL.md";
const ATE = "assistant/agents/acceptance-test-engineer.md";
const CATALOG = "assistant/manifest/agent-catalog.yml";
const LAYERS = "assistant/catalog/test-layers.md";
const RED_PROVENANCE = "assistant/skills/qfai-atdd/references/red-provenance.md";

const readAt = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

const read = (tree: string): Promise<string> => readAt(tree, ATDD);

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s+/g, " ");

/**
 * The `developer_instructions` of one `agent-catalog.yml` entry, by tree and id.
 * Two suites below read this block, and the YAML shape they walk is one shape —
 * duplicating the walk meant a catalog restructure could be followed in one
 * copy and missed in the other.
 */
const catalogInstructions = async (tree: string, id: string): Promise<string> => {
  const parsed: unknown = parseYaml(await readAt(tree, CATALOG));
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${tree}/${CATALOG}: must parse to an object`);
  }
  const agents = (parsed as Record<string, unknown>)["agents"];
  if (!Array.isArray(agents)) {
    throw new Error(`${tree}/${CATALOG}: agents must be an array`);
  }
  for (const entry of agents) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) continue;
    const agent: Record<string, unknown> = entry as Record<string, unknown>;
    if (agent["id"] !== id) continue;
    const instructions = agent["developer_instructions"];
    if (typeof instructions !== "string") {
      throw new Error(`${tree}/${CATALOG}: ${id}.developer_instructions must be a string`);
    }
    return instructions;
  }
  throw new Error(`${tree}/${CATALOG}: no agent with id ${id}`);
};

describe.each(TREES)("%s — /qfai-atdd enumerates CON-DB wherever it enumerates CON-API", (tree) => {
  it("the frontmatter description — the discovery surface — names CON-DB", async () => {
    // A skill candidate is selected from `description` before anything reads
    // the body, so a DB-contract-only request must be able to match here.
    const atdd = flat(await read(tree));
    expect(atdd).toContain(
      'description: "Implement automated acceptance tests (E2E/API/Integration) aligned with US/TC/CON-API/CON-DB obligations from specs and contracts."',
    );
    expect(atdd).not.toContain("aligned with US/TC/CON-API obligations");
  });

  it("the reviewer gate asks about Integration/CON-DB coverage", async () => {
    // A `completion-reviewer` works from this bullet and nothing else.
    const atdd = flat(await read(tree));
    expect(atdd).toContain(
      "coverage obligations met: E2E covers `US`, API covers `CON-API`, Integration covers `CON-DB`,",
    );
  });

  it("the mandatory-obligation bullets name the directory CON-DB is discharged from", async () => {
    // This is the only list that states a directory per obligation, and the
    // annotation obligations already assign `QFAI:CON-DB-XXXX` to
    // `tests/integration/**`. It shares the `CON-API` bullet because the file
    // sits on the 500-line ceiling `assets.test.ts` enforces.
    const atdd = flat(await read(tree));
    expect(atdd).toContain(
      "`tests/api/**` must cover all required `CON-API-*`, and `tests/integration/**` all required `CON-DB-*` (`QFAI-ATDD-115`)",
    );
    // The deferral form travels with the obligation: a reader who only meets
    // the rule here must still learn it has an out-of-slice escape.
    expect(atdd).toContain("`-- x-qfai-status: planned`, never left uncovered.");
  });

  it("Mandatory Output 3, the not-done test and Completion Criteria step 1 all list it", async () => {
    const atdd = flat(await read(tree));
    expect(atdd).toContain("Coverage obligations checklist (`US` / `TC` / `CON-API` / `CON-DB`)");
    expect(atdd).toContain("Any required `US` / `TC` / `CON-API` / `CON-DB` remains uncovered.");
    expect(atdd).toContain(
      "Confirm required `US` / `TC` / `CON-API` / `CON-DB` coverage is complete.",
    );
    expect(atdd).toContain(
      "close uncovered `US` / `TC` / `CON-API` / `CON-DB` obligations and rerun validation",
    );
  });

  it("an undeclared CON-DB reference is named as an error, like the other three", async () => {
    // `QFAI-ATDD-104` errors on an undefined `QFAI:CON-DB-*` annotation
    // (`src/core/validators/atddCodeTraceability.ts:704`), so a rule that
    // enumerates only `US/TC/CON-API` tells the reader to ignore what the very
    // next validate run fails on.
    const atdd = flat(await read(tree));
    expect(atdd).toContain(
      "Unknown references (`US/TC/CON-API/CON-DB` not declared) must be treated as errors.",
    );
  });

  it("the volume estimate sizes Integration with its DB contracts", async () => {
    // The Integration row was defined as `#TC`, so the layer that owes the
    // `CON-DB` work was estimated without counting any of it.
    const atdd = flat(await read(tree));
    // Which CON-DB are counted is pinned separately, below.
    expect(atdd).toContain("Integration = required `TC-*` plus **active** `CON-DB-*` —");
    expect(atdd).toContain("| Integration | #TC + #CON-DB active |");
    expect(atdd).toContain("`CON-DB` in Integration.");
  });

  it("project_memory restates it for an agent that never opens the body", async () => {
    const atdd = flat(await read(tree));
    expect(atdd).toContain("Coverage obligations stay layer-pinned for US, CON-API and CON-DB");
    expect(atdd).toContain("all required CON-DB (QFAI-ATDD-115");
  });

  it("no obligation enumeration stops at CON-API any more", async () => {
    // The regression this file exists to stop: a list that ends at `CON-API`
    // is a list a reader treats as complete.
    const atdd = flat(await read(tree));
    for (const stale of [
      "API covers `CON-API`, and every `TC`",
      "checklist (`US` / `TC` / `CON-API`),",
      "Any required `US` / `TC` / `CON-API` remains uncovered.",
      "Confirm required `US` / `TC` / `CON-API` coverage is complete.",
      "close uncovered `US` / `TC` / `CON-API` obligations",
      "Integration = required `TC-*`. When a signal",
      "`tests/api/**` must cover all required `CON-API-*`. -",
      "layer-pinned for US and CON-API",
      "Unknown references (`US/TC/CON-API` not declared)",
    ]) {
      expect(atdd).not.toContain(stale);
    }
  });
});

/**
 * `catalog/test-layers.md` is the annotation reference `/qfai-atdd` sends the
 * reader to, and it stated the same unknown-reference rule with the same gap.
 * Leaving it at `CON-API` there re-teaches the omission one hop away from the
 * skill that was just corrected.
 */
describe.each(TREES)("%s — the layer catalog errors on an undeclared CON-DB too", (tree) => {
  it("the unknown-reference rule enumerates all four obligation kinds", async () => {
    const layers = flat(await readAt(tree, LAYERS));
    expect(layers).toContain(
      "Unknown references (`US/TC/CON-API/CON-DB` not declared) are errors.",
    );
    expect(layers).not.toContain("Unknown references (`US/TC/CON-API` not declared)");
  });
});

/**
 * The work order at `SKILL.md` assigns the `CON-DB` obligation to the
 * Integration layer, but the layer is implemented by the mandatory delegate
 * `acceptance-test-engineer`. Its role contract stopped at `CON-API` in
 * responsibilities, required inputs and deliverables, so a delegate that obeys
 * its own contract literally never opens `.qfai/contracts/db/**` and the very
 * next `QFAI-ATDD-115` run stops the stage.
 *
 * The codex TOML mirror is not re-checked here: `tests/codex/agents.test.ts`
 * (TC-0003-0003) already pins `developer_instructions` to the canonical MD
 * body byte for byte, so these assertions propagate to it.
 */
describe.each(TREES)("%s — the ATDD delegate is contracted to cover CON-DB", (tree) => {
  const assertContract = (doc: string): void => {
    expect(doc).toContain(
      "- Implement integration coverage for required `TC-*` behavior and active `CON-DB-*` contracts (those not deferred by `-- x-qfai-status: planned`).",
    );
    // The read set names the configured root, not only its default spelling.
    expect(doc).toContain(
      "- .qfai/contracts/db/\\*\\* (under the configured `paths.contractsDir`, not always this default)",
    );
    expect(doc).toContain("- Mapping from US / TC / CON-API / CON-DB to test assets");
    // The regression: a contract that ends at `CON-API` reads as complete.
    expect(doc).not.toContain("- Implement integration coverage for required `TC-*` behavior.");
    expect(doc).not.toContain("- Mapping from US / TC / CON-API to test assets");
    // And the over-scope: `QFAI-ATDD-115` never asks for a deferred contract.
    expect(doc).not.toContain("behavior and declared `CON-DB-*` contracts");
  };

  it("the canonical role assigns DB contracts, their directory and their mapping", async () => {
    assertContract(flat(await readAt(tree, ATE)));
  });

  it("agent-catalog.yml carries the same contract for that agent", async () => {
    assertContract(flat(await catalogInstructions(tree, "acceptance-test-engineer")));
  });
});

/**
 * The Volume Signal added `CON-DB` to the Integration row as *declared*, but a
 * contract carrying `-- x-qfai-status: planned` is deferred: it is excluded
 * from `activeDbContractIds` (`src/core/atddTraceability.ts:227`) and so from
 * `QFAI-ATDD-115`, which fires on `result.missing.conDb`
 * (`src/core/validators/atddCodeTraceability.ts:474`). Counting the deferred
 * ones sized the mandatory estimate for tests this slice must not write, and
 * an over-sized signal recommends work the gate does not ask for.
 *
 * And the estimate has to be computable by whoever owns it: `agent-routing.yml`
 * makes `test-design-analyst` and `qa-strategist` the mandatory pair of the
 * `coverage` phase, and the former owns "Estimate test volume" outright —
 * neither read set opened `.qfai/contracts/db/**`, so a delegate following its
 * contract literally had to guess `#CON-DB` or omit it.
 */
describe.each(TREES)("%s — the CON-DB volume signal is countable and not inflated", (tree) => {
  it("counts the active CON-DB, not every declared one", async () => {
    const atdd = flat(await read(tree));
    expect(atdd).toContain(
      "Integration = required `TC-*` plus **active** `CON-DB-*` — active meaning the contract does **not** declare `-- x-qfai-status: planned`",
    );
    expect(atdd).toContain("carries no `QFAI-ATDD-115` obligation in this slice");
    // The regression: "declared" swept the deferred contracts back in.
    expect(atdd).not.toContain("Integration = required `TC-*` plus declared `CON-DB-*`.");
  });

  it("says the same thing in the estimator table the stage must output", async () => {
    // The prose and the required table are two statements of one count; a
    // reader filling the table works from the table alone.
    const atdd = flat(await read(tree));
    expect(atdd).toContain("| Integration | #TC + #CON-DB active | INT_s | test cases + active DB");
    expect(atdd).not.toContain("| #TC + #CON-DB | INT_s | test cases + DB contracts |");
  });

  it("completes the zero-row enumeration in the reference an implementer reads", async () => {
    // `references/red-provenance.md`'s "A spec with no ATDD-owned rows" section
    // is the page an implementer opens when the ledger yields zero rows, and it
    // listed the non-row obligations as US/CON-API and the completion gate as
    // `QFAI-ATDD-111`/`-113`. `CON-DB-*` produces no ledger row anywhere, so
    // that is exactly the spec where a DB contract is most likely to be
    // dropped — and the drop only surfaces at the next validate.
    const provenance = flat(await readAt(tree, RED_PROVENANCE));
    expect(provenance).toContain("The US, CON-API and CON-DB coverage obligations");
    expect(provenance).toContain(
      "`CON-DB-*` is row-producing nowhere, so a spec with no ATDD-owned rows can still owe every one of its active DB contracts an `Integration` test",
    );
    expect(provenance).toContain("`QFAI-ATDD-111` / `QFAI-ATDD-113` / `QFAI-ATDD-115` clean");
    expect(provenance).not.toContain("The US and CON-API coverage obligations");
    expect(provenance).not.toContain("`QFAI-ATDD-111` / `QFAI-ATDD-113` clean");
  });

  it("keeps the reason in the table a reader fills in", async () => {
    // The prose no longer has room for the rationale (the shipped SKILL.md is
    // at its 500-line ceiling), so the Notes column carries it.
    const atdd = flat(await read(tree));
    expect(atdd).toContain(
      "| test cases + active DB contracts | deferred contracts owe no test here, so counting them oversizes the slice |",
    );
  });

  it.each(["test-design-analyst", "qa-strategist"])(
    "%s can open the DB contracts its estimate counts",
    async (id) => {
      // `agent-routing.yml` coverage phase: mandatory_agents are exactly these
      // two, and the volume estimate is `test-design-analyst`'s deliverable.
      const qualified =
        "- .qfai/contracts/db/\\*\\* (under the configured `paths.contractsDir`, not always this default)";
      const canonical = flat(await readAt(tree, `assistant/agents/${id}.md`));
      expect(canonical).toContain(qualified);
      expect(flat(await catalogInstructions(tree, id))).toContain(qualified);
    },
  );
});
