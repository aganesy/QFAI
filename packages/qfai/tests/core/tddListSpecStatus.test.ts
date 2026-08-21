import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

const HEADERS =
  "| TDD-ID   | TC-Refs | Layer | Test file       | Selector | Status    | DR-ID        | Evidence |";
const SEP =
  "| -------- | ------- | ----- | --------------- | -------- | --------- | ------------ | -------- |";

const ROWS = [
  "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | case a   | exception | DR-0001-0001 | anomaly  |",
  "| TDD-0002 | TC-0002 | Unit  | tests/b.test.ts | case b   | done      | -            |          |",
];

type Issues = Awaited<ReturnType<typeof validateTddList>>;

/**
 * A spec whose ledger owes both a warning (`TDDLIST_EXCEPTION_PARKED`) and an
 * error (`TDDLIST_EVIDENCE_EMPTY`), with the `Status:` bullet under test.
 */
async function withSpecStatus(
  statusBullets: readonly string[],
  assertion: (issues: Issues) => void,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tdd-spec-status-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    await writeFile(
      path.join(specDir, "01_Spec.md"),
      ["# SPEC-0001 Sample", "", ...statusBullets, ""].join("\n"),
      "utf-8",
    );
    await writeFile(path.join(specDir, "02_User-stories.md"), "# US\n", "utf-8");
    await writeFile(path.join(specDir, "03_Acceptance-Criteria.md"), "# AC\n", "utf-8");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), "# TC\n", "utf-8");
    await writeFile(
      path.join(specDir, "tdd", "test-list.md"),
      [HEADERS, SEP, ...ROWS].join("\n"),
      "utf-8",
    );
    assertion(await validateTddList(root, defaultConfig));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const severityOf = (issues: Issues, code: string): string | undefined =>
  issues.find((entry) => entry.code === code)?.severity;

describe("ledger findings follow the spec's lifecycle Status", () => {
  it("keeps full severity while the spec is active", async () => {
    await withSpecStatus(["- Status: active"], (issues) => {
      expect(severityOf(issues, "TDDLIST_EXCEPTION_PARKED")).toBe("warning");
      expect(severityOf(issues, "TDDLIST_EVIDENCE_EMPTY")).toBe("error");
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
      expect(severityOf(issues, "TDDLIST_EVIDENCE_EMPTY")).toBe("error");
    });
  });

  it("treats an unparseable Status value as active", async () => {
    // `QFAI-STATUS-002` reports the bad value; the ledger must not retire
    // itself on a spelling nobody validated.
    await withSpecStatus(["- Status: retired"], (issues) => {
      expect(severityOf(issues, "TDDLIST_EVIDENCE_EMPTY")).toBe("error");
    });
  });
});
