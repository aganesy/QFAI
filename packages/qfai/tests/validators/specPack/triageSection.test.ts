import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { TRIAGE_NO_EXISTING_SPEC } from "../../../src/core/sddTriage.js";
import {
  validateCreateRowCapabilityRefs,
  validateTriageSection,
} from "../../../src/core/validators/specPack.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function newTempCapabilitiesPath(content: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-cap-"));
  tempDirs.push(dir);
  const policiesDir = path.join(dir, "_policies");
  await mkdir(policiesDir, { recursive: true });
  const filePath = path.join(policiesDir, "03_Capabilities.md");
  await writeFile(filePath, content, "utf-8");
  return filePath;
}

const DELTA_PATH = "spec-0042/09_delta.md";

describe("validateTriageSection", () => {
  it("returns no issues when delta has neither Change Summary nor Triage", () => {
    const text = "# 09 Delta\n";
    expect(validateTriageSection(text, DELTA_PATH)).toEqual([]);
  });

  it("emits QFAI-TRIAGE-001 when Change Summary exists without Triage", () => {
    const text = "# 09 Delta\n\n## Change Summary\n\n- one change\n";
    const issues = validateTriageSection(text, DELTA_PATH);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-TRIAGE-001");
    expect(issues[0]?.severity).toBe("warning");
  });

  it("emits QFAI-TRIAGE-002 when Triage section has no table", () => {
    const text = "# 09 Delta\n\n## Change Summary\n\n## Triage\n\nno table here\n";
    const issues = validateTriageSection(text, DELTA_PATH);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-TRIAGE-002"]);
  });

  it("emits QFAI-TRIAGE-002 when required columns are missing", () => {
    const text = [
      "# 09 Delta",
      "",
      "## Change Summary",
      "",
      "## Triage",
      "",
      "| Source | Operation |",
      "| --- | --- |",
      "| REQ-1 | CREATE |",
      "",
    ].join("\n");
    const issues = validateTriageSection(text, DELTA_PATH);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-TRIAGE-002"]);
  });

  it("emits QFAI-TRIAGE-003 for invalid Operation enum", () => {
    const text = buildDelta([["REQ-1", "subject", "spec-0001", "ARCHIVE", "-", "-", "-"]]);
    const issues = validateTriageSection(text, DELTA_PATH);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-TRIAGE-003"]);
  });

  it("emits QFAI-TRIAGE-004 when UPDATE has invalid Sub-op", () => {
    const text = buildDelta([["REQ-1", "subject", "spec-0001", "UPDATE", "PATCH", "-", "-"]]);
    const issues = validateTriageSection(text, DELTA_PATH);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-TRIAGE-004"]);
  });

  it("emits QFAI-TRIAGE-004 when UPDATE has empty Sub-op", () => {
    const text = buildDelta([["REQ-1", "subject", "spec-0001", "UPDATE", "-", "-", "-"]]);
    const issues = validateTriageSection(text, DELTA_PATH);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-TRIAGE-004"]);
  });

  it("emits QFAI-TRIAGE-005 when CREATE has no Approved By", () => {
    const text = buildDelta([["REQ-1", "new", "(none)", "CREATE", "-", "-", "-"]]);
    const issues = validateTriageSection(text, DELTA_PATH);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-TRIAGE-005"]);
  });

  it("emits QFAI-TRIAGE-005 when UPDATE:REMOVE has no Approved By", () => {
    const text = buildDelta([["REQ-1", "drop", "spec-0001", "UPDATE", "REMOVE", "-", "-"]]);
    const issues = validateTriageSection(text, DELTA_PATH);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-TRIAGE-005"]);
  });

  it("does not double-fire QFAI-TRIAGE-005 when QFAI-TRIAGE-004 already invalidated the Sub-op", () => {
    // PR #206 review #37: an UPDATE row with an unknown Sub-op (here
    // "REMOVE-WRONG") and an empty Approved By column should report
    // QFAI-TRIAGE-004 only. Previously the validator continued past
    // the Sub-op check and also emitted QFAI-TRIAGE-005 against the
    // same row, conflating an enum issue with an approval issue.
    const text = buildDelta([
      ["REQ-1", "drop something", "spec-0001", "UPDATE", "REMOVE-WRONG", "-", "-"],
    ]);
    const issues = validateTriageSection(text, DELTA_PATH);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-TRIAGE-004"]);
  });

  it("returns no issues for a complete UPDATE:APPEND triage", () => {
    const text = buildDelta([
      ["REQ-1", "extend", "spec-0001", "UPDATE", "APPEND", "-", "rationale"],
    ]);
    expect(validateTriageSection(text, DELTA_PATH)).toEqual([]);
  });

  it("returns no issues for a complete CREATE triage with approval", () => {
    const text = buildDelta([
      ["REQ-1", "new packaging command", "(none)", "CREATE", "-", "user@host", "rationale"],
    ]);
    expect(validateTriageSection(text, DELTA_PATH)).toEqual([]);
  });

  it("returns no issues when Triage exists without Change Summary", () => {
    const text = [
      "# 09 Delta",
      "",
      "## Triage",
      "",
      "| Source | Subject | Existing Spec | Operation | Sub-op | Approved By | Rationale |",
      "| --- | --- | --- | --- | --- | --- | --- |",
      "| REQ-1 | extend | spec-0001 | UPDATE | APPEND | - | - |",
      "",
    ].join("\n");
    expect(validateTriageSection(text, DELTA_PATH)).toEqual([]);
  });
});

describe("validateTriageSection Existing Spec grammar (QFAI-TRIAGE-008)", () => {
  const KNOWN = new Set(["spec-0001", "spec-0003", "spec-0004"]);

  const codesFor = (rows: string[][], known?: ReadonlySet<string>): string[] =>
    validateTriageSection(buildDelta(rows), DELTA_PATH, known).map((entry) => entry.code);

  it("accepts a single spec, a `+` enumeration and a `_policies` target", () => {
    expect(
      codesFor(
        [
          ["REQ-1", "extend", "spec-0001", "UPDATE", "APPEND", "-", "why"],
          ["REQ-2", "merge two specs", "spec-0003+spec-0004", "MERGE", "-", "user@host", "why"],
          ["REQ-3", "policy only", "\\_policies", "UPDATE", "APPEND", "-", "why"],
          ["REQ-4", "policy file", "`_policies/05_Contracts.md`", "UPDATE", "MODIFY", "-", "why"],
        ],
        KNOWN,
      ),
    ).toEqual([]);
  });

  it("emits QFAI-TRIAGE-008 when a named spec has no directory on disk", () => {
    const issues = validateTriageSection(
      buildDelta([["REQ-1", "extend", "spec-0009", "UPDATE", "APPEND", "-", "why"]]),
      DELTA_PATH,
      KNOWN,
    );
    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-TRIAGE-008"]);
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.refs).toEqual(["spec-0009"]);
  });

  it("emits QFAI-TRIAGE-008 for range notation even when both ends exist", () => {
    // `spec-0001〜spec-0004` resolves to no directory; `+` is the only
    // multi-spec form.
    expect(
      codesFor([["REQ-1", "sweep", "spec-0001〜spec-0004", "UPDATE", "MODIFY", "-", "why"]], KNOWN),
    ).toEqual(["QFAI-TRIAGE-008"]);
    expect(
      codesFor([["REQ-1", "sweep", "spec-0001..0004", "UPDATE", "MODIFY", "-", "why"]], KNOWN),
    ).toEqual(["QFAI-TRIAGE-008"]);
  });

  it("emits QFAI-TRIAGE-008 when a non-CREATE row leaves Existing Spec unfilled", () => {
    expect(codesFor([["REQ-1", "extend", "", "UPDATE", "APPEND", "-", "why"]], KNOWN)).toEqual([
      "QFAI-TRIAGE-008",
    ]);
    expect(codesFor([["REQ-1", "extend", "-", "UPDATE", "APPEND", "-", "why"]], KNOWN)).toEqual([
      "QFAI-TRIAGE-008",
    ]);
  });

  it("emits QFAI-TRIAGE-008 when the cell names nothing resolvable", () => {
    expect(codesFor([["REQ-1", "extend", "TBD", "UPDATE", "APPEND", "-", "why"]], KNOWN)).toEqual([
      "QFAI-TRIAGE-008",
    ]);
  });

  it("emits QFAI-TRIAGE-008 for a spec token that is not exactly four digits", () => {
    // `spec-00010` shares a prefix with the existing `spec-0001`; matching the
    // whole token keeps the typo from borrowing that spec's existence.
    const issues = validateTriageSection(
      buildDelta([["REQ-1", "extend", "spec-00010", "UPDATE", "APPEND", "-", "why"]]),
      DELTA_PATH,
      KNOWN,
    );
    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-TRIAGE-008"]);
    expect(issues[0]?.refs).toEqual(["spec-00010"]);
    expect(
      codesFor([["REQ-1", "extend", "spec-001", "UPDATE", "APPEND", "-", "why"]], KNOWN),
    ).toEqual(["QFAI-TRIAGE-008"]);
    // A malformed member of a `+` enumeration is caught even when the other
    // member resolves.
    expect(
      codesFor(
        [["REQ-1", "merge", "spec-0003+spec-0004x", "MERGE", "-", "user@host", "why"]],
        KNOWN,
      ),
    ).toEqual(["QFAI-TRIAGE-008"]);
    // The grammar check does not need the known-spec set.
    expect(codesFor([["REQ-1", "extend", "spec-00010", "UPDATE", "APPEND", "-", "why"]])).toEqual([
      "QFAI-TRIAGE-008",
    ]);
  });

  it("requires the `-` literal on a CREATE row and rejects a spec ID there", () => {
    expect(
      codesFor([["REQ-1", "new scope", "-", "CREATE", "-", "user@host", "CAP-0001"]], KNOWN),
    ).toEqual([]);
    // `(none)` stays accepted so deltas written by an older renderer keep
    // validating after an upgrade.
    expect(
      codesFor([["REQ-1", "new scope", "(none)", "CREATE", "-", "user@host", "CAP-0001"]], KNOWN),
    ).toEqual([]);
    expect(
      codesFor(
        [["REQ-1", "new scope", "spec-0004", "CREATE", "-", "user@host", "CAP-0001"]],
        KNOWN,
      ),
    ).toEqual(["QFAI-TRIAGE-008"]);
  });

  it("checks the grammar but not existence when the known-spec set is absent", () => {
    // Callers that validate one delta.md in isolation cannot resolve spec
    // directories, so only the shape is enforced.
    expect(codesFor([["REQ-1", "extend", "spec-0099", "UPDATE", "APPEND", "-", "why"]])).toEqual(
      [],
    );
    expect(codesFor([["REQ-1", "extend", "", "UPDATE", "APPEND", "-", "why"]])).toEqual([
      "QFAI-TRIAGE-008",
    ]);
  });

  it("reports the Existing Spec defect alongside the approval gate on the same row", () => {
    expect(
      codesFor([["REQ-1", "retire spec-0003", "spec-0009", "SUPERSEDE", "-", "-", "why"]], KNOWN),
    ).toEqual(["QFAI-TRIAGE-008", "QFAI-TRIAGE-005"]);
  });

  it("rejects a spec token that carries a suffix past the ID", () => {
    // The token is read to the next separator, so `_` / `/` suffixes cannot
    // borrow the existence of the spec whose ID they start with.
    for (const cell of ["spec-0001_old", "spec-0001/01_Spec.md", "spec-0001-draft"]) {
      const issues = validateTriageSection(
        buildDelta([["REQ-1", "extend", cell, "UPDATE", "APPEND", "-", "why"]]),
        DELTA_PATH,
        KNOWN,
      );
      expect(issues.map((entry) => entry.code)).toEqual(["QFAI-TRIAGE-008"]);
      expect(issues[0]?.refs).toEqual([cell]);
    }
  });

  it("rejects a cell that only contains the `_policies` literal", () => {
    for (const cell of ["_policies_typo", "not_policies", "`_policies` かどこか"]) {
      expect(codesFor([["REQ-1", "policy", cell, "UPDATE", "APPEND", "-", "why"]], KNOWN)).toEqual([
        "QFAI-TRIAGE-008",
      ]);
    }
  });

  it("does not turn a completed removal into a permanent existence error", () => {
    // DELETE removes the spec directory, and MERGE / SPLIT collapse their
    // source into other IDs, so the row outlives the directory it names.
    for (const op of ["DELETE", "MERGE", "SPLIT"]) {
      expect(
        codesFor(
          [["REQ-1", "retire the subject", "spec-0017", op, "-", "user@host", "why"]],
          KNOWN,
        ),
      ).toEqual([]);
    }
    // A removal whose every target is gone is complete however many it named.
    expect(
      codesFor(
        [["REQ-1", "collapse both", "spec-0017+spec-0018", "MERGE", "-", "user@host", "why"]],
        KNOWN,
      ),
    ).toEqual([]);
    // The shape is still enforced on those rows.
    expect(
      codesFor(
        [["REQ-1", "retire the subject", "spec-00170", "DELETE", "-", "user@host", "why"]],
        KNOWN,
      ),
    ).toEqual(["QFAI-TRIAGE-008"]);
    // SUPERSEDE keeps the directory, so existence still applies there.
    expect(
      codesFor(
        [["REQ-1", "retire the subject", "spec-0017", "SUPERSEDE", "-", "user@host", "why"]],
        KNOWN,
      ),
    ).toEqual(["QFAI-TRIAGE-008"]);
  });

  it("checks existence on a removal row that has not been carried out", () => {
    // A row whose other targets still resolve cannot be the tombstone of a
    // completed removal, so the unresolvable one is a typo or an invented
    // source and must not reach the approval stage unchallenged.
    for (const op of ["MERGE", "SPLIT", "DELETE"]) {
      const issues = validateTriageSection(
        buildDelta([["REQ-1", "collapse", "spec-0003+spec-9999", op, "-", "user@host", "why"]]),
        DELTA_PATH,
        KNOWN,
      );
      expect(issues.map((entry) => entry.code)).toEqual(["QFAI-TRIAGE-008"]);
      expect(issues[0]?.refs).toEqual(["spec-9999"]);
    }
    // Over-correction pin: a pending removal whose targets all resolve is
    // clean, and so is the all-gone tombstone above.
    expect(
      codesFor(
        [["REQ-1", "collapse", "spec-0003+spec-0004", "MERGE", "-", "user@host", "why"]],
        KNOWN,
      ),
    ).toEqual([]);
  });

  it("rejects a `_policies` target on a spec-scoped operation", () => {
    // SPLIT / MERGE / SUPERSEDE / DELETE act on a whole spec directory, so a
    // policy target leaves the approved row with nothing to execute against.
    for (const op of ["DELETE", "SPLIT", "MERGE", "SUPERSEDE"]) {
      expect(
        codesFor([["REQ-1", "policy work", "\\_policies", op, "-", "user@host", "why"]], KNOWN),
      ).toEqual(["QFAI-TRIAGE-008"]);
      expect(
        codesFor(
          [["REQ-1", "policy work", "`_policies/05_Contracts.md`", op, "-", "user@host", "why"]],
          KNOWN,
        ),
      ).toEqual(["QFAI-TRIAGE-008"]);
    }
    // Over-correction pin: UPDATE rows are how policy-only work is recorded.
    expect(
      codesFor([["REQ-1", "policy work", "\\_policies", "UPDATE", "APPEND", "-", "why"]], KNOWN),
    ).toEqual([]);
  });

  it("rejects the `-` placeholder the classifier renders for a targetless DELETE", () => {
    // `classifyTriage` emits `op: "DELETE", existingSpec: null`, which
    // `renderTriageMarkdown` writes as `TRIAGE_NO_EXISTING_SPEC`. DELETE
    // removes a whole spec directory, so that proposal is not persistable
    // until the target is filled in — the approval gate cannot supply one.
    for (const op of ["DELETE", "SPLIT", "MERGE", "SUPERSEDE"]) {
      expect(
        codesFor(
          [["REQ-1", "retire the subject", TRIAGE_NO_EXISTING_SPEC, op, "-", "user@host", "why"]],
          KNOWN,
        ),
      ).toEqual(["QFAI-TRIAGE-008"]);
    }
    expect(codesFor([["REQ-1", "retire", "", "DELETE", "-", "user@host", "why"]], KNOWN)).toEqual([
      "QFAI-TRIAGE-008",
    ]);
    // Over-correction pin: `-` remains the required CREATE spelling, and a
    // DELETE that names its target is clean.
    expect(
      codesFor(
        [["REQ-1", "new scope", TRIAGE_NO_EXISTING_SPEC, "CREATE", "-", "user@host", "CAP-0001"]],
        KNOWN,
      ),
    ).toEqual([]);
    expect(
      codesFor([["REQ-1", "retire", "spec-0003", "DELETE", "-", "user@host", "why"]], KNOWN),
    ).toEqual([]);
  });

  it("matches the whole cell against the grammar, not a token inside it", () => {
    // Each of these contains a well-formed, existing spec ID; none of them is
    // a well-formed cell, and reading only the extracted token let them pass.
    for (const cell of [
      "spec-0001 trailing prose",
      "spec-0001+",
      "+spec-0001",
      "spec-0001++spec-0003",
      "spec-0001, ",
      "spec-0001+_policies",
      "see spec-0001",
      "spec-0001 (spec-0003 も)",
    ]) {
      expect(codesFor([["REQ-1", "extend", cell, "UPDATE", "APPEND", "-", "why"]], KNOWN)).toEqual([
        "QFAI-TRIAGE-008",
      ]);
    }
    // Over-correction pin: the forms the grammar does declare stay clean,
    // including the backticked / escaped and comma-separated spellings this
    // repository's own `_policies/10_delta.md` uses.
    for (const cell of [
      "spec-0001",
      "spec-0003+spec-0004",
      "spec-0003, spec-0004",
      "`spec-0001`",
      "\\_policies",
      "`_policies/03_Capabilities.md`",
    ]) {
      expect(codesFor([["REQ-1", "extend", cell, "UPDATE", "APPEND", "-", "why"]], KNOWN)).toEqual(
        [],
      );
    }
  });
});

function buildDelta(rows: string[][]): string {
  const header =
    "| Source | Subject | Existing Spec | Operation | Sub-op | Approved By | Rationale |";
  const sep = "| --- | --- | --- | --- | --- | --- | --- |";
  return [
    "# 09 Delta",
    "",
    "## Change Summary",
    "",
    "## Triage",
    "",
    header,
    sep,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
    "",
  ].join("\n");
}

describe("validateCreateRowCapabilityRefs (QFAI-TRIAGE-006)", () => {
  it("emits QFAI-TRIAGE-006 when CREATE row Rationale lacks any CAP reference", async () => {
    const capPath = await newTempCapabilitiesPath("# 03 Capabilities\n\n- CAP-0001 sample\n");
    const text = buildDelta([
      ["REQ-1", "new feature", "(none)", "CREATE", "-", "user@host", "no CAP cited"],
    ]);
    const issues = await validateCreateRowCapabilityRefs(text, DELTA_PATH, capPath);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-TRIAGE-006"]);
    expect(issues[0]?.message).toMatch(/CAP-NNNN の参照/);
  });

  it("emits QFAI-TRIAGE-006 when CREATE row references a CAP that is not in 03_Capabilities", async () => {
    const capPath = await newTempCapabilitiesPath("# 03 Capabilities\n\n- CAP-0001 sample\n");
    const text = buildDelta([
      ["REQ-2", "new feature", "(none)", "CREATE", "-", "user@host", "introduces CAP-0099"],
    ]);
    const issues = await validateCreateRowCapabilityRefs(text, DELTA_PATH, capPath);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-TRIAGE-006"]);
    expect(issues[0]?.refs).toEqual(["CAP-0099"]);
  });

  it("returns no issues when CREATE row references a registered CAP", async () => {
    const capPath = await newTempCapabilitiesPath(
      "# 03 Capabilities\n\n- CAP-0001 sample\n- CAP-0099 brand new\n",
    );
    const text = buildDelta([
      ["REQ-3", "new feature", "(none)", "CREATE", "-", "user@host", "introduces CAP-0099"],
    ]);
    const issues = await validateCreateRowCapabilityRefs(text, DELTA_PATH, capPath);
    expect(issues).toEqual([]);
  });

  it("ignores non-CREATE rows", async () => {
    const capPath = await newTempCapabilitiesPath("# 03 Capabilities\n\n- CAP-0001 sample\n");
    const text = buildDelta([
      ["REQ-4", "extend", "spec-0001", "UPDATE", "APPEND", "-", "no CAP needed"],
    ]);
    const issues = await validateCreateRowCapabilityRefs(text, DELTA_PATH, capPath);
    expect(issues).toEqual([]);
  });

  it("returns no issues when delta has no Triage section", async () => {
    const capPath = await newTempCapabilitiesPath("# 03 Capabilities\n\n- CAP-0001 sample\n");
    const text = "# 09 Delta\n\n## Change Summary\n\n- one change\n";
    const issues = await validateCreateRowCapabilityRefs(text, DELTA_PATH, capPath);
    expect(issues).toEqual([]);
  });

  it("still emits QFAI-TRIAGE-006 when capabilities file is missing (treats all CAPs as unknown)", async () => {
    // PR #206 review #39 / #47: when the CAP catalog cannot be read,
    // `validateCreateRowCapabilityRefs` intentionally treats the known
    // set as empty so that every cited CAP is reported as unregistered.
    // The append-first guard should fail loud, not silently skip, when
    // the SSOT is unavailable — the test name now reflects that
    // behaviour explicitly so future readers do not mistake "ignores"
    // for a no-op.
    const text = buildDelta([
      ["REQ-5", "new feature", "(none)", "CREATE", "-", "user@host", "introduces CAP-0099"],
    ]);
    const issues = await validateCreateRowCapabilityRefs(
      text,
      DELTA_PATH,
      "/nonexistent/03_Capabilities.md",
    );
    expect(issues.map((i) => i.code)).toEqual(["QFAI-TRIAGE-006"]);
  });
});
