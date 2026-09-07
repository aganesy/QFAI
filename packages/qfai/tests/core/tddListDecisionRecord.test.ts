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

import { mkdir, rm, symlink, writeFile } from "node:fs/promises";
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
  /** Filenames created under `.qfai/decisions/` — the Drift Protocol's record home. */
  decisionRecords?: string[];
  /** Directory names created under `.qfai/decisions/`, which declare nothing. */
  decisionDirs?: string[];
  /**
   * Symlinks created under `.qfai/decisions/`. `target` is seeded relative to
   * the project root, or — with `outside` — relative to a sibling directory
   * that is no part of the project and would not travel with a checkout of it.
   */
  decisionLinks?: Array<{ name: string; target: string; outside?: boolean }>;
};

async function run(
  fixture: Fixture,
): Promise<Array<{ code: string; severity: string; message: string; suggested_action?: string }>> {
  const root = path.join(
    os.tmpdir(),
    `qfai-dr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const external = `${root}-external`;
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
    for (const name of fixture.decisionRecords ?? []) {
      const recordDir = path.join(root, ".qfai", "decisions");
      await mkdir(recordDir, { recursive: true });
      await writeFile(
        path.join(recordDir, name),
        "# record\n\nSupersedes DR-0009-0009.\n",
        "utf-8",
      );
    }
    for (const name of fixture.decisionDirs ?? []) {
      await mkdir(path.join(root, ".qfai", "decisions", name), { recursive: true });
    }
    for (const link of fixture.decisionLinks ?? []) {
      const target = path.join(link.outside === true ? external : root, link.target);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, "# record\n", "utf-8");
      const recordDir = path.join(root, ".qfai", "decisions");
      await mkdir(recordDir, { recursive: true });
      await symlink(target, path.join(recordDir, link.name));
    }
    await writeFile(
      path.join(specDir, "tdd", "test-list.md"),
      `${HEADER}\n| TDD-0001 | TC-0001 | Unit | tests/unit/a.test.ts | a | exception | ${fixture.drId} | - |\n`,
      "utf-8",
    );
    const issues = await validateTddList(root, defaultConfig);
    return issues.map((i) => ({
      code: i.code,
      severity: i.severity,
      message: i.message,
      suggested_action: i.suggested_action,
    }));
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(external, { recursive: true, force: true });
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

  // The Drift Protocol lets an implement-stage anomaly create the record under
  // `.qfai/decisions/` while still forbidding the `07_Decisions.md` write that
  // would cite it. Resolving only against the upstream files made the compliant
  // path a dead end: the DR-ID the protocol mandates was reported unresolved on
  // every subsequent validate, leaving only the forbidden write or a waiver.
  it("resolves a spec-scoped id against a standalone record in .qfai/decisions/", async () => {
    const found = await codes({
      drId: "DR-0001-0003",
      decisionRecords: ["DR-0001-0003-park-the-row.md"],
    });
    expect(found).not.toContain("TDDLIST_EXCEPTION_UNRESOLVED_DR");
  });

  it("resolves a policy-level id against a standalone record", async () => {
    const found = await codes({
      drId: "DR-0270",
      decisionRecords: ["DR-0270-envelope-taxonomy.md"],
    });
    expect(found).not.toContain("TDDLIST_EXCEPTION_UNRESOLVED_DR");
  });

  it("reads the record's filename, not its prose", async () => {
    // A record that cites a neighbouring decision must not thereby declare it,
    // which is why the filename alone is the declaration.
    const found = await codes({
      drId: "DR-0009-0009",
      decisionRecords: ["DR-0001-0003-park-the-row.md"],
    });
    expect(found).toContain("TDDLIST_EXCEPTION_UNRESOLVED_DR");
  });

  it("resolves a policy-level id whose slug opens with four digits", async () => {
    // `DR-0270-2026-envelope.md` is the documented `DR-<id>-<slug>.md` for
    // `DR-0270`, but the filename grammar also reads it as the spec-scoped
    // `DR-0270-2026`. Parsing the longest id out of the name took the second
    // reading and left the ledger's own `DR-0270` unresolved.
    const found = await codes({
      drId: "DR-0270",
      decisionRecords: ["DR-0270-2026-envelope.md"],
    });
    expect(found).not.toContain("TDDLIST_EXCEPTION_UNRESOLVED_DR");
  });

  it("resolves a scoped record whose first segment is another spec's number", async () => {
    // Pairing the leading segment with the citing spec's own number is the
    // convention the shipped `07_Decisions.md` template recommends, and that
    // same template states validation checks the shape, not the match. A
    // declaration in `07_Decisions.md` is read that way, so requiring the match
    // for a standalone record alone would make an id's validity depend on where
    // it was declared — and would leave the implement stage, which may write
    // nowhere but `.qfai/decisions/`, only the forbidden upstream write or a
    // waiver.
    const found = await codes({
      drId: "DR-0002-0003",
      decisionRecords: ["DR-0002-0003-park-the-row.md"],
    });
    expect(found).not.toContain("TDDLIST_EXCEPTION_UNRESOLVED_DR");
  });

  it("does not accept a directory named like a record", async () => {
    // The finding asks whether the Decision Record exists; a directory whose
    // name matches is not one, and reading `readdir` names alone said it was.
    const found = await codes({
      drId: "DR-0270",
      decisionDirs: ["DR-0270-envelope-taxonomy.md"],
    });
    expect(found).toContain("TDDLIST_EXCEPTION_UNRESOLVED_DR");
  });

  it("ignores a non-DR file in the record directory", async () => {
    // Change Requests live in the same directory and declare no DR.
    const found = await codes({
      drId: "DR-0015-0005",
      decisionRecords: ["CR-20260731-0001-widen-the-search.md"],
    });
    expect(found).toContain("TDDLIST_EXCEPTION_UNRESOLVED_DR");
  });

  // Only the id prefix of a filename was checked, so anything that merely
  // started like a record declared its id — and the warning that would have
  // said the record is still missing was suppressed by the file that proves it.
  //
  // `posixOnly` marks a fixture Windows cannot CREATE. `<` and `>` are illegal
  // in a Windows filename, so `writeFile` answers `ENOENT` before the row
  // reaches its assertion — and the hazard itself cannot occur there for the
  // same reason, so the rule is unreachable rather than unverified (#1133).
  // The sibling fixtures below are creatable and run everywhere.
  for (const [label, fileName, posixOnly] of [
    ["whose slug placeholder was never substituted", "DR-0270-<slug>.md", true],
    ["left with a separator and an empty slug", "DR-0270-.md", false],
    ["whose slug is a bare separator", "DR-0270--.md", false],
  ] as const) {
    it.skipIf(posixOnly && process.platform === "win32")(
      `does not accept a record filename ${label}`,
      async () => {
        const found = await codes({ drId: "DR-0270", decisionRecords: [fileName] });
        expect(found).toContain("TDDLIST_EXCEPTION_UNRESOLVED_DR");
      },
    );
  }

  // The whole-basename match must not turn into a naming rule of its own:
  // each of these is a record that exists, and reporting it as declared
  // nowhere would trade one false negative for a false positive.
  for (const [label, fileName] of [
    ["named by its id alone", "DR-0270.md"],
    ["whose slug is written in the project's own language", "DR-0270-例外の記録.md"],
    ["whose slug carries an underscore and a dot", "DR-0270-envelope_v2.taxonomy.md"],
    ["whose extension is upper-cased", "DR-0270-envelope-taxonomy.MD"],
  ] as const) {
    it(`accepts a record ${label}`, async () => {
      const found = await codes({ drId: "DR-0270", decisionRecords: [fileName] });
      expect(found).not.toContain("TDDLIST_EXCEPTION_UNRESOLVED_DR");
    });
  }

  it("names all three homes in the unresolved message", async () => {
    const issues = await run({ drId: "DR-0015-0005" });
    const message = issues.find((i) => i.code === "TDDLIST_EXCEPTION_UNRESOLVED_DR")?.message ?? "";
    expect(message).toContain("07_Decisions.md");
    expect(message).toContain("_policies/08_Decisions.md");
    expect(message).toContain(".qfai/decisions/DR-*.md");
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

/**
 * A finding that names a declaration home must name the ones the resolver
 * searches. The missing- and malformed-DR findings named only the two upstream
 * files, which `qfai-implement` carries `[DRIFT-PROTOCOL:MANDATORY]` against —
 * so an operator following the finding's own instructions was sent into the
 * upstream write the standalone record home exists to avoid.
 */
describe("every DR finding names the same homes", () => {
  const find = async (
    fixture: Fixture,
    code: string,
  ): Promise<{ message: string; suggested_action?: string }> => {
    const found = (await run(fixture)).find((i) => i.code === code);
    expect(found, `expected ${code}`).toBeDefined();
    return found ?? { message: "" };
  };

  it("sends the missing-DR finding to the standalone record home", async () => {
    const missing = await find({ drId: "" }, "TDDLIST_EXCEPTION_MISSING_DR");
    expect(missing.message).toContain(".qfai/decisions/DR-*.md");
    expect(missing.suggested_action).toContain(".qfai/decisions/DR-<id>-<slug>.md");
  });

  it("sends the malformed-DR fix hint to the standalone record home", async () => {
    const invalid = await find({ drId: "DR-27" }, "TDDLIST_EXCEPTION_INVALID_DR");
    expect(invalid.suggested_action).toContain(".qfai/decisions/DR-<id>-<slug>.md");
  });

  // The record home is an addition, not a replacement: an sdd-stage operator
  // still declares the decision upstream.
  it("keeps naming the two upstream files", async () => {
    const missing = await find({ drId: "" }, "TDDLIST_EXCEPTION_MISSING_DR");
    const invalid = await find({ drId: "DR-27" }, "TDDLIST_EXCEPTION_INVALID_DR");
    for (const text of [missing.message, missing.suggested_action, invalid.suggested_action]) {
      expect(text).toContain("07_Decisions.md");
      expect(text).toContain("_policies/08_Decisions.md");
    }
  });
});

/**
 * The finding asks whether the governance record exists — for everyone, not
 * for whoever ran `validate`. A link out of the project resolves on one machine
 * and dangles in every clean checkout, so accepting it silenced the warning
 * exactly where the record was never committed.
 *
 * Windows without Developer Mode or elevated rights refuses to create the
 * symlinks these cases need; the behaviour is platform-independent, so skipping
 * there still leaves it covered by the Linux CI job.
 */
describe.skipIf(process.platform === "win32")("a linked record travels with the project", () => {
  it("does not accept a link to a file outside the project root", async () => {
    const found = await codes({
      drId: "DR-0270",
      decisionLinks: [{ name: "DR-0270-envelope-taxonomy.md", target: "record.md", outside: true }],
    });
    expect(found).toContain("TDDLIST_EXCEPTION_UNRESOLVED_DR");
  });

  it("accepts a link to a file kept elsewhere inside the project", async () => {
    // Committed, and so reproducible in a clean checkout — the reason the
    // resolver follows links at all.
    const found = await codes({
      drId: "DR-0270",
      decisionLinks: [
        { name: "DR-0270-envelope-taxonomy.md", target: "docs/decisions/envelope.md" },
      ],
    });
    expect(found).not.toContain("TDDLIST_EXCEPTION_UNRESOLVED_DR");
  });
});
