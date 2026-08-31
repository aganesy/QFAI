import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { newRuleSeverity, RULE_PROMOTIONS } from "../../src/core/sunset.js";
import { validateTddList } from "../../src/core/validators/tddList.js";
import { resolveToolVersion } from "../../src/core/version.js";

const HEADERS =
  "| TDD-ID   | TC-Refs | Layer | Test file       | Selector | Status    | DR-ID        | Evidence |";
const SEP =
  "| -------- | ------- | ----- | --------------- | -------- | --------- | ------------ | -------- |";

const ROWS = [
  "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | case a   | exception | DR-0001-0001 | anomaly  |",
  "| TDD-0002 | TC-0002 | Unit  | tests/b.test.ts | case b   | done      | -            |          |",
];

type Issues = Awaited<ReturnType<typeof validateTddList>>;

/** The successor's own lifecycle bullet, when a case needs it retired too. */
type SuccessorState = boolean | string;

/** Write the layered skeleton every spec in these fixtures needs. */
async function writeSpecPack(specsRoot: string, dirName: string, body: string): Promise<string> {
  const specDir = path.join(specsRoot, dirName);
  await mkdir(specDir, { recursive: true });
  await writeFile(path.join(specDir, "01_Spec.md"), body, "utf-8");
  await writeFile(path.join(specDir, "02_User-stories.md"), "# US\n", "utf-8");
  await writeFile(path.join(specDir, "03_Acceptance-Criteria.md"), "# AC\n", "utf-8");
  await writeFile(path.join(specDir, "06_Test-Cases.md"), "# TC\n", "utf-8");
  return specDir;
}

/**
 * A spec whose ledger owes a fixed-severity warning (`TDDLIST_EXCEPTION_PARKED`)
 * and a promotion-window finding (`TDDLIST_EVIDENCE_EMPTY`, see
 * {@link undemotedEvidenceEmpty}), with the `Status:` bullet under test.
 *
 * `spec-0002` exists alongside it as an active spec unless `successor` says
 * otherwise — `false` leaves it out, a string replaces its lifecycle bullets —
 * so a `Superseded-by: spec-0002` names a spec that can inherit the rows. The
 * assertion sees only spec-0001's findings — the successor has no ledger of
 * its own and its `TDDLIST_MISSING` is not what any of these cases is about.
 */
async function withSpecStatus(
  statusBullets: readonly string[],
  assertion: (issues: Issues) => void,
  options: { successor?: SuccessorState } = {},
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tdd-spec-status-"));
  try {
    const specsRoot = path.join(root, ".qfai", "specs");
    const specDir = await writeSpecPack(
      specsRoot,
      "spec-0001",
      ["# SPEC-0001 Sample", "", ...statusBullets, ""].join("\n"),
    );
    const successor = options.successor ?? true;
    if (successor !== false) {
      const bullets = typeof successor === "string" ? successor : "- Status: active";
      await writeSpecPack(
        specsRoot,
        "spec-0002",
        ["# SPEC-0002 Successor", "", bullets, ""].join("\n"),
      );
    }
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    await writeFile(
      path.join(specDir, "tdd", "test-list.md"),
      [HEADERS, SEP, ...ROWS].join("\n"),
      "utf-8",
    );
    const issues = await validateTddList(root, defaultConfig);
    assertion(issues.filter((entry) => (entry.file ?? "").includes("spec-0001")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const severityOf = (issues: Issues, code: string): string | undefined =>
  issues.find((entry) => entry.code === code)?.severity;

/**
 * The severity `TDDLIST_EVIDENCE_EMPTY` carries when nothing has demoted it.
 *
 * The rule runs a promotion window (`RULE_PROMOTIONS.tddListEvidenceEmpty`), so
 * that severity is `warning` until the tool reaches `promoteAt` and `error`
 * after it. These cases are about the lifecycle demotion, not about the window:
 * asserting a literal would make them fail on one side of the promotion or the
 * other while the behaviour they cover — active keeps the rule's own severity,
 * retired drops to `info` — never changed.
 */
let undemotedEvidenceEmpty: "warning" | "error";

beforeAll(async () => {
  undemotedEvidenceEmpty = newRuleSeverity(
    await resolveToolVersion(),
    RULE_PROMOTIONS.tddListEvidenceEmpty.promoteAt,
  );
});

describe("ledger findings follow the spec's lifecycle Status", () => {
  it("keeps full severity while the spec is active", async () => {
    await withSpecStatus(["- Status: active"], (issues) => {
      expect(severityOf(issues, "TDDLIST_EXCEPTION_PARKED")).toBe("warning");
      expect(severityOf(issues, "TDDLIST_EVIDENCE_EMPTY")).toBe(undemotedEvidenceEmpty);
    });
  });

  it("demotes every finding to info once the spec is superseded", async () => {
    await withSpecStatus(["- Status: superseded", "- Superseded-by: spec-0002"], (issues) => {
      expect(severityOf(issues, "TDDLIST_EXCEPTION_PARKED")).toBe("info");
      expect(severityOf(issues, "TDDLIST_EVIDENCE_EMPTY")).toBe("info");
      expect(issues.every((entry) => entry.severity === "info")).toBe(true);
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  it("names the retired status so the demotion is auditable", async () => {
    await withSpecStatus(["- Status: deprecated", "- Deprecated-at: 2026-01-01"], (issues) => {
      const parked = issues.find((entry) => entry.code === "TDDLIST_EXCEPTION_PARKED");
      expect(parked?.severity).toBe("info");
      expect(parked?.message).toContain("Status: deprecated");
      // The row identity a waiver keys on must survive the demotion.
      expect(parked?.dl_id).toBe("TDD-0001");
    });
  });

  it("treats a spec with no Status bullet as active", async () => {
    await withSpecStatus([], (issues) => {
      expect(severityOf(issues, "TDDLIST_EVIDENCE_EMPTY")).toBe(undemotedEvidenceEmpty);
    });
  });

  it("treats an unparseable Status value as active", async () => {
    // `QFAI-STATUS-002` reports the bad value; the ledger must not retire
    // itself on a spelling nobody validated.
    await withSpecStatus(["- Status: retired"], (issues) => {
      expect(severityOf(issues, "TDDLIST_EVIDENCE_EMPTY")).toBe(undemotedEvidenceEmpty);
    });
  });

  it("ignores a Status bullet outside the header block", async () => {
    // A bullet quoted in a prose section is an example, not this spec's
    // lifecycle — and with no header `Status:` at all, `QFAI-STATUS-001` is the
    // rule that answers for the file.
    await withSpecStatus(
      [
        "## Notes",
        "",
        "SUPERSEDE writes this pair into the source spec:",
        "",
        "- Status: deprecated",
        "- Deprecated-at: 2026-01-01",
      ],
      (issues) => {
        expect(severityOf(issues, "TDDLIST_EVIDENCE_EMPTY")).toBe(undemotedEvidenceEmpty);
      },
    );
  });

  it("ignores a nested bullet quoting a retirement", async () => {
    // Inside the header block, indented under `- Notes:`, so neither the
    // `## heading` boundary nor `maskNonSpecRegions` removes it — list
    // continuations are kept on purpose. Read as this spec's metadata it
    // retires it; read as what it is, a child bullet, it says nothing.
    await withSpecStatus(
      ["- Notes:", "    - Status: deprecated", "    - Deprecated-at: 2026-01-01"],
      (issues) => {
        expect(severityOf(issues, "TDDLIST_EVIDENCE_EMPTY")).toBe(undemotedEvidenceEmpty);
      },
    );
  });

  it("ignores a lifecycle written without a space after the bullet marker", async () => {
    // `-Status:` is not a list marker, so this renders as a paragraph and no
    // `QFAI-STATUS-*` rule looks at it — prose alone must not take the ledger
    // out of the gate.
    await withSpecStatus(["-Status: deprecated", "-Deprecated-at: 2026-01-01"], (issues) => {
      expect(severityOf(issues, "TDDLIST_EVIDENCE_EMPTY")).toBe(undemotedEvidenceEmpty);
    });
  });

  it("takes the top-level Status when a nested one precedes it", async () => {
    // The nested declaration is complete and comes first, so a first-match
    // extraction adopts it and the real `- Status: active` below never runs.
    await withSpecStatus(
      [
        "- Notes:",
        "    - Status: superseded",
        "    - Superseded-by: spec-0002",
        "- Status: active",
      ],
      (issues) => {
        expect(severityOf(issues, "TDDLIST_EVIDENCE_EMPTY")).toBe(undemotedEvidenceEmpty);
      },
    );
  });

  it("does not retire a spec whose retirement declaration is incomplete", async () => {
    // `--profile tdd` never runs `validateSpecPacks`, so a `superseded` bullet
    // with no `Superseded-by` would demote the whole ledger with nothing
    // anywhere reporting the omission.
    await withSpecStatus(["- Status: superseded"], (issues) => {
      expect(severityOf(issues, "TDDLIST_EVIDENCE_EMPTY")).toBe(undemotedEvidenceEmpty);
    });
    await withSpecStatus(["- Status: deprecated", "- Deprecated-at: last spring"], (issues) => {
      expect(severityOf(issues, "TDDLIST_EVIDENCE_EMPTY")).toBe(undemotedEvidenceEmpty);
    });
  });

  it("does not retire a spec whose Superseded-by names no spec", async () => {
    // `QFAI-STATUS-004` reports the dangling reference, but only under
    // `--profile full`. Demoting here would drop every outstanding row out of
    // the gate with no spec left owing it.
    await withSpecStatus(
      ["- Status: superseded", "- Superseded-by: spec-0002"],
      (issues) => {
        expect(severityOf(issues, "TDDLIST_EVIDENCE_EMPTY")).toBe(undemotedEvidenceEmpty);
      },
      { successor: false },
    );
  });

  it("does not retire a spec that supersedes itself", async () => {
    // The source cannot inherit its own obligations, so nothing moved.
    await withSpecStatus(["- Status: superseded", "- Superseded-by: spec-0001"], (issues) => {
      expect(severityOf(issues, "TDDLIST_EVIDENCE_EMPTY")).toBe(undemotedEvidenceEmpty);
    });
  });

  it("does not retire a spec whose successor is itself retired", async () => {
    // A retired successor is not a spec anyone will implement the rows in;
    // following the chain instead would have to reason about cycles.
    await withSpecStatus(
      ["- Status: superseded", "- Superseded-by: spec-0002"],
      (issues) => {
        expect(severityOf(issues, "TDDLIST_EVIDENCE_EMPTY")).toBe(undemotedEvidenceEmpty);
      },
      { successor: "- Status: deprecated\n- Deprecated-at: 2026-01-01" },
    );
  });

  it("ends the header block at an indented heading too", async () => {
    // 1-3 leading spaces is still an ATX heading in CommonMark, and this
    // repository already treats one as a section boundary elsewhere. Anchored
    // at column 0, the block ran on past `  ## Notes` and the illustration
    // below it retired a spec that declared no lifecycle of its own.
    await withSpecStatus(
      [
        "  ## Notes",
        "",
        "SUPERSEDE writes this pair into the source spec:",
        "",
        "- Status: deprecated",
        "- Deprecated-at: 2026-01-01",
      ],
      (issues) => {
        expect(severityOf(issues, "TDDLIST_EVIDENCE_EMPTY")).toBe(undemotedEvidenceEmpty);
      },
    );
  });

  it("does not retire a spec whose successor declares no readable lifecycle", async () => {
    // The successor directory exists, but its `01_Spec.md` has no `Status:` at
    // all — the same evidence `readSpecLifecycle` returns for a missing or
    // unreadable file. Nothing has shown that spec to be current, so the
    // obligations have no home and the source keeps gating.
    await withSpecStatus(
      ["- Status: superseded", "- Superseded-by: spec-0002"],
      (issues) => {
        expect(severityOf(issues, "TDDLIST_EVIDENCE_EMPTY")).toBe(undemotedEvidenceEmpty);
      },
      { successor: "" },
    );
    await withSpecStatus(
      ["- Status: superseded", "- Superseded-by: spec-0002"],
      (issues) => {
        expect(severityOf(issues, "TDDLIST_EVIDENCE_EMPTY")).toBe(undemotedEvidenceEmpty);
      },
      { successor: "- Status: retired" },
    );
  });

  it("does not retire a spec whose lifecycle value is wrapped onto the next line", async () => {
    // `- Status:` / `deprecated` on two lines is not the `- Name: value`
    // bullet `QFAI-STATUS-001` asks for. Read as one, it would demote the
    // whole ledger under `--profile tdd`, where no status validator runs.
    await withSpecStatus(
      ["- Status:", "deprecated", "- Deprecated-at:", "2026-01-01"],
      (issues) => {
        expect(severityOf(issues, "TDDLIST_EVIDENCE_EMPTY")).toBe(undemotedEvidenceEmpty);
      },
    );
  });

  it("does not retire a spec on a Deprecated-at that is not a real date", async () => {
    // `2026-02-30` passes the shape regex and rolls over to March 2. A
    // retirement date nobody can audit is not a retirement.
    await withSpecStatus(["- Status: deprecated", "- Deprecated-at: 2026-02-30"], (issues) => {
      expect(severityOf(issues, "TDDLIST_EVIDENCE_EMPTY")).toBe(undemotedEvidenceEmpty);
    });
    await withSpecStatus(["- Status: removed", "- Deprecated-at: 9999-99-99"], (issues) => {
      expect(severityOf(issues, "TDDLIST_EVIDENCE_EMPTY")).toBe(undemotedEvidenceEmpty);
    });
  });

  it("ignores a retirement parked in an HTML comment or a fenced sample", async () => {
    // Both are how a rewrite keeps what it replaced, and both sit in the
    // header block above the live bullet. Unmasked, the hidden declaration
    // wins and the whole ledger stops gating.
    await withSpecStatus(
      [
        "<!--",
        "- Status: superseded",
        "- Superseded-by: spec-0002",
        "-->",
        "",
        "```markdown",
        "- Status: deprecated",
        "- Deprecated-at: 2026-01-01",
        "```",
        "",
        "- Status: active",
      ],
      (issues) => {
        expect(severityOf(issues, "TDDLIST_EVIDENCE_EMPTY")).toBe(undemotedEvidenceEmpty);
      },
    );
  });

  it("names every non-done ledger status in the migration instruction", async () => {
    // `blocked` and `review-fix` are live obligations too: a migration that
    // lists only some of them retires work that was never delivered.
    await withSpecStatus(["- Status: superseded", "- Superseded-by: spec-0002"], (issues) => {
      const action = issues[0]?.suggested_action ?? "";
      for (const status of ["todo", "blocked", "red", "green", "refactor", "review-fix"]) {
        expect(action).toContain(status);
      }
      expect(action).toContain("TC-Ref");
      // `Layer=E2E` rows carry their obligation in `US-Refs`, and nothing
      // downstream catches one copied out of the retired spec's namespace.
      expect(action).toContain("US-Refs");
      expect(action).toContain("02_User-stories.md");
      // `TDD-NNNN` is ledger-local: a copied one collides in the successor.
      expect(action).toContain("TDDLIST_DUPLICATE_ID");
      // A renumbered row leaves every `Blocked-By` that named it dangling, and
      // `TDDLIST_BLOCKED_MISSING_REF` only checks the cell is non-empty.
      expect(action).toContain("Blocked-By");
      expect(action).toContain("TDDLIST_BLOCKED_MISSING_REF");
      // An in-progress row's Status / DR-ID / Evidence describe a run against
      // the retired obligation; carried over they claim the inheritor's new
      // TC/US was evidenced by work that never referenced it.
      expect(action).toContain("Status: todo");
      expect(action).toContain("DR-ID");
      expect(action).toContain("Evidence");
    });
  });
});
