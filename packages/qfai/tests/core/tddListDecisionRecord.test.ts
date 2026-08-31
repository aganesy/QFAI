/**
 * `DR-ID` was a hard, `error`-severity precondition with no referent.
 *
 * `qfai-implement` makes a non-empty `DR-ID` the gate for the `exception`
 * status and `tddList.ts` enforced exactly `drId.length === 0` — so any
 * non-empty string satisfied it. Nothing in qfai defined what a DR-ID *is*: no
 * entry in `ids.ts`, no row schema in either shipped Decisions template, no
 * validator that resolved the reference. Five shipped files pointed readers at
 * `09_delta.md`, whose only identifier is `DELTA-0001`.
 *
 * The gate now has a format and a resolution target. Both new findings are
 * `warning`, deliberately: a ledger written before the format existed must not
 * start failing CI on upgrade, and the error-severity emptiness check is
 * unchanged.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { extractIds } from "../../src/core/ids.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

const HEADER = `# TDD Execution Ledger

| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |
| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |`;

type Fixture = {
  drId: string;
  /** Body of the spec's `07_Decisions.md`. */
  specDecisions?: string;
  /** Body of `_policies/08_Decisions.md`. */
  policyDecisions?: string;
};

async function run(fixture: Fixture): Promise<Array<{ code: string; severity: string }>> {
  const root = path.join(
    os.tmpdir(),
    `qfai-dr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const specsRoot = path.join(root, ".qfai", "specs");
  const specDir = path.join(specsRoot, "spec-0001");
  await mkdir(path.join(specDir, "tdd"), { recursive: true });
  await mkdir(path.join(specsRoot, "_policies"), { recursive: true });
  try {
    for (const [name, body] of [
      ["01_Spec.md", "# Spec\n"],
      ["02_User-stories.md", "# US\n"],
      ["03_Acceptance-Criteria.md", "# AC\n"],
      ["06_Test-Cases.md", "# TC\n"],
      ["07_Decisions.md", fixture.specDecisions ?? "# 07 Decisions\n"],
    ] as const) {
      await writeFile(path.join(specDir, name), body, "utf-8");
    }
    await writeFile(
      path.join(specsRoot, "_policies", "08_Decisions.md"),
      fixture.policyDecisions ?? "# 08 Decisions\n",
      "utf-8",
    );
    await writeFile(
      path.join(specDir, "tdd", "test-list.md"),
      `${HEADER}\n| TDD-0001 | TC-0001 | Unit | tests/unit/a.test.ts | a | exception | ${fixture.drId} | - |\n`,
      "utf-8",
    );
    const issues = await validateTddList(root, defaultConfig);
    return issues.map((i) => ({ code: i.code, severity: i.severity }));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const codes = async (f: Fixture): Promise<string[]> => (await run(f)).map((i) => i.code);

describe("the DR-ID has a declared format", () => {
  it("registers DR in the ID registry", () => {
    // Absent before: `ids.ts` knew `ADR` and eleven spec-item prefixes, and no
    // `DR`, so nothing could even say what a well-formed DR-ID looks like.
    expect(extractIds("see DR-0270 and DR-0015-0005", "DR")).toEqual(["DR-0270", "DR-0015-0005"]);
  });

  for (const drId of ["DR-0270", "DR-0015-0005"]) {
    it(`accepts the shape ${drId}`, async () => {
      const found = await codes({
        drId,
        specDecisions: `# 07 Decisions\n\n### ${drId}: t\n`,
      });
      expect(found).not.toContain("TDDLIST_EXCEPTION_INVALID_DR");
      expect(found).not.toContain("TDDLIST_EXCEPTION_UNRESOLVED_DR");
    });
  }

  // `DR-ABCD` / `DR-foo` are the invented tokens the format exists to surface;
  // a narrower "DR followed by a digit" shape let them through unreported.
  for (const drId of ["DR-27", "DR-0015-5", "DR_0015", "DR-ABCD", "DR-foo"]) {
    it(`reports the malformed ${drId}`, async () => {
      expect(await codes({ drId })).toContain("TDDLIST_EXCEPTION_INVALID_DR");
    });
  }

  // Ledgers predating the format must not start failing CI on upgrade; the
  // error-severity emptiness gate is what still blocks.
  it("reports a malformed id at warning, not error", async () => {
    const found = await run({ drId: "DR-27" });
    expect(found.find((i) => i.code === "TDDLIST_EXCEPTION_INVALID_DR")?.severity).toBe("warning");
  });

  it("leaves a non-DR token alone", async () => {
    // The column also carries `CR-*`, and a project may cite something else
    // beside the DR. Only `DR`-shaped tokens are judged against the DR format.
    const found = await codes({
      drId: "DR-0015-0005, CR-20260731-0001",
      specDecisions: "# 07 Decisions\n\n### DR-0015-0005: t\n",
    });
    expect(found).not.toContain("TDDLIST_EXCEPTION_INVALID_DR");
  });
});

describe("the DR-ID resolves to a Decisions file", () => {
  it("reports a well-formed id that is declared nowhere", async () => {
    // The defect's core: the reference was unresolvable by construction.
    expect(await codes({ drId: "DR-0015-0005" })).toContain("TDDLIST_EXCEPTION_UNRESOLVED_DR");
  });

  it("resolves against the spec's own 07_Decisions.md", async () => {
    const found = await codes({
      drId: "DR-0001-0002",
      specDecisions: "# 07 Decisions\n\n### DR-0001-0002: park the row\n",
    });
    expect(found).not.toContain("TDDLIST_EXCEPTION_UNRESOLVED_DR");
  });

  it("resolves a policy-level id against _policies/08_Decisions.md", async () => {
    // Reading only the spec-local file would report every citation of a shared
    // decision as unresolved.
    const found = await codes({
      drId: "DR-0270",
      policyDecisions: "# 08 Decisions\n\n### DR-0270: envelope taxonomy\n",
    });
    expect(found).not.toContain("TDDLIST_EXCEPTION_UNRESOLVED_DR");
  });

  it("is waivable, because a project may keep decisions elsewhere", async () => {
    const issues = await run({ drId: "DR-0015-0005" });
    expect(issues.find((i) => i.code === "TDDLIST_EXCEPTION_UNRESOLVED_DR")?.severity).toBe(
      "warning",
    );
  });
});

describe("the emptiness gate is unchanged", () => {
  it("still errors on an empty DR-ID", async () => {
    const issues = await run({ drId: "" });
    const missing = issues.find((i) => i.code === "TDDLIST_EXCEPTION_MISSING_DR");
    expect(missing?.severity).toBe("error");
  });

  it("does not also report format or resolution for an empty cell", async () => {
    const found = await codes({ drId: "" });
    expect(found).not.toContain("TDDLIST_EXCEPTION_INVALID_DR");
    expect(found).not.toContain("TDDLIST_EXCEPTION_UNRESOLVED_DR");
  });
});
