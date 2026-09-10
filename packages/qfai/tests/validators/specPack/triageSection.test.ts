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

  it("QFAI-TRIAGE-003 points a colon-form Operation at the Sub-op cell", () => {
    // The colon form is prose shorthand only. Repairing from the old hint
    // alone dropped the sub-op and landed the author on QFAI-TRIAGE-004.
    const text = buildDelta([["REQ-1", "subject", "spec-0001", "UPDATE:APPEND", "-", "-", "-"]]);
    const issues = validateTriageSection(text, DELTA_PATH);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-TRIAGE-003"]);
    expect(issues[0]?.suggested_action).toContain("Sub-op");
    expect(issues[0]?.suggested_action).toContain("APPEND / MODIFY / REMOVE");
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
    // An UPDATE row with an unknown Sub-op (here "REMOVE-WRONG") and an
    // empty Approved By column should report QFAI-TRIAGE-004 only.
    // Continuing past the Sub-op check to also validate Approved By
    // would emit QFAI-TRIAGE-005 against the same row, conflating an
    // enum issue with an approval issue.
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

  it("validates every canonical `## Triage` section, not just the first", () => {
    // A re-run of the SDD skill appends a second `## Triage` section rather
    // than extending the first table. Reading only the first section would
    // leave every later row ungated.
    const text = [
      "# 09 Delta",
      "",
      "## Change Summary",
      "",
      "## Triage",
      "",
      ...triageTable([["REQ-1", "extend", "spec-0001", "UPDATE", "APPEND", "-", "-"]]),
      "",
      "## Triage",
      "",
      ...triageTable([["REQ-2", "later", "spec-0001", "BOGUSOP", "-", "-", "-"]]),
      "",
    ].join("\n");
    const issues = validateTriageSection(text, DELTA_PATH);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-TRIAGE-003"]);
    expect(issues[0]?.message).toContain("section 2");
  });

  it("emits QFAI-TRIAGE-008 for a Triage heading no validator reads", () => {
    const text = [
      "# 09 Delta",
      "",
      "## Change Summary",
      "",
      "## Triage",
      "",
      ...triageTable([["REQ-1", "extend", "spec-0001", "UPDATE", "APPEND", "-", "-"]]),
      "",
      "## Triage — 2026-07-26",
      "",
      ...triageTable([["REQ-2", "later", "spec-0001", "BOGUSOP", "-", "-", "-"]]),
      "",
    ].join("\n");
    const issues = validateTriageSection(text, DELTA_PATH);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-TRIAGE-008"]);
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.refs).toEqual(["## Triage — 2026-07-26"]);
  });

  it("reads a section whose heading names its round in parentheses", () => {
    // A ledger records one Triage section per round, so the bare heading made
    // every section in such a file identical. The qualifier names each one and
    // the rows under it are checked exactly as an unqualified section's are —
    // which is what "section 2" reporting on the second table proves.
    const text = [
      "# 09 Delta",
      "",
      "## Change Summary",
      "",
      "## Triage (2026-05-06)",
      "",
      ...triageTable([["REQ-1", "extend", "spec-0001", "UPDATE", "APPEND", "-", "-"]]),
      "",
      "## Triage (2026-05-24)",
      "",
      ...triageTable([["REQ-2", "later", "spec-0001", "BOGUSOP", "-", "-", "-"]]),
      "",
    ].join("\n");
    const issues = validateTriageSection(text, DELTA_PATH);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-TRIAGE-003"]);
    expect(issues[0]?.message).toContain("section 2");
  });

  it("keeps every trailer but a parenthesised one outside the grammar", () => {
    // The qualifier is one form on purpose. A bare word after `Triage` is the
    // shape this rule exists to catch, and a hyphen with no space reads as a
    // compound word rather than as a name for the section.
    for (const heading of [
      "## Triage Table",
      "## Triage Table (cross-spec rows only)",
      "## Triage-Table",
      "## Triage — 2026-05-24",
      "## Triage: 2026-05-24",
      "## Triage ()",
      "## Triage (a) (b)",
    ]) {
      const text = [
        "# 09 Delta",
        "",
        "## Change Summary",
        "",
        "## Triage",
        "",
        ...triageTable([["REQ-1", "extend", "spec-0001", "UPDATE", "APPEND", "-", "-"]]),
        "",
        heading,
        "",
        ...triageTable([["REQ-2", "later", "spec-0001", "UPDATE", "APPEND", "-", "-"]]),
        "",
      ].join("\n");
      const issues = validateTriageSection(text, DELTA_PATH);
      expect(
        issues.map((i) => i.code),
        heading,
      ).toEqual(["QFAI-TRIAGE-008"]);
      expect(issues[0]?.refs, heading).toEqual([heading]);
    }
  });

  it("emits QFAI-TRIAGE-008 when the only Triage heading is a non-canonical one", () => {
    const text = [
      "# 09 Delta",
      "",
      "## Change Summary",
      "",
      "### Triage (rows owned by this spec)",
      "",
      ...triageTable([["REQ-1", "extend", "spec-0001", "UPDATE", "APPEND", "-", "-"]]),
      "",
    ].join("\n");
    const issues = validateTriageSection(text, DELTA_PATH);
    // QFAI-TRIAGE-001 alone would only say "no Triage section"; the heading
    // finding names the section that is carrying the ungated rows.
    expect(issues.map((i) => i.code)).toEqual(["QFAI-TRIAGE-008", "QFAI-TRIAGE-001"]);
  });

  it("does not emit QFAI-TRIAGE-008 for headings inside a canonical Triage section", () => {
    const text = [
      "# 09 Delta",
      "",
      "## Triage",
      "",
      "### Triage Table (cross-spec rows only)",
      "",
      ...triageTable([["REQ-1", "extend", "spec-0001", "UPDATE", "APPEND", "-", "-"]]),
      "",
      "## Triaged backlog",
      "",
    ].join("\n");
    expect(validateTriageSection(text, DELTA_PATH)).toEqual([]);
  });

  it("ignores a `## Triage` example inside a fenced code block", () => {
    // 書式例を fence に置いた delta が、例示を 2 つ目のセクションとして
    // 収集され QFAI-TRIAGE-002 で落ちてはならない。
    const text = [
      "# 09 Delta",
      "",
      "## Change Summary",
      "",
      "## Triage",
      "",
      ...triageTable([["REQ-1", "extend", "spec-0001", "UPDATE", "APPEND", "-", "-"]]),
      "",
      "## Notes",
      "",
      "追記するときの書式:",
      "",
      "```markdown",
      "## Triage",
      "",
      "(ここに表を書く)",
      "",
      "### Triage Table",
      "```",
      "",
    ].join("\n");
    expect(validateTriageSection(text, DELTA_PATH)).toEqual([]);
  });

  it("does not emit QFAI-TRIAGE-001 when both headings only appear as an example", () => {
    // 完全な書式例 (Change Summary + Triage) を fence / HTML コメントに置いた
    // だけの文書。本文にはどちらも無いので「Change Summary はあるのに Triage
    // が無い」は成立しない — Triage 側だけ mask して片側を生テキストで読むと
    // QFAI-TRIAGE-001 が誤発火する。
    const text = [
      "# 09 Delta",
      "",
      "この delta はまだ空。書式:",
      "",
      "```markdown",
      "## Change Summary",
      "",
      "- 変更点を書く",
      "",
      "## Triage",
      "",
      "(ここに表を書く)",
      "```",
      "",
      "<!--",
      "## Change Summary",
      "",
      "## Triage",
      "-->",
      "",
    ].join("\n");
    expect(validateTriageSection(text, DELTA_PATH)).toEqual([]);
  });

  it("ignores a Triage heading inside an HTML comment", () => {
    const text = [
      "# 09 Delta",
      "",
      "## Change Summary",
      "",
      "## Triage",
      "",
      ...triageTable([["REQ-1", "extend", "spec-0001", "UPDATE", "APPEND", "-", "-"]]),
      "",
      "<!--",
      "## Triage — 2026-07-26",
      "",
      "(過去の草案。復活させる場合はこの上の表に追記する)",
      "-->",
      "",
    ].join("\n");
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

describe("validateTriageSection Existing Spec grammar (QFAI-TRIAGE-009)", () => {
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

  it("emits QFAI-TRIAGE-009 when a named spec has no directory on disk", () => {
    const issues = validateTriageSection(
      buildDelta([["REQ-1", "extend", "spec-0009", "UPDATE", "APPEND", "-", "why"]]),
      DELTA_PATH,
      KNOWN,
    );
    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-TRIAGE-009"]);
    // The `Existing Spec` grammar is newer than the cells it reads, including
    // approved rows nothing rewrites, so a project meets a backlog of these.
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.refs).toEqual(["spec-0009"]);
  });

  it("emits QFAI-TRIAGE-009 for range notation even when both ends exist", () => {
    // `spec-0001〜spec-0004` resolves to no directory; `+` is the only
    // multi-spec form.
    expect(
      codesFor([["REQ-1", "sweep", "spec-0001〜spec-0004", "UPDATE", "MODIFY", "-", "why"]], KNOWN),
    ).toEqual(["QFAI-TRIAGE-009"]);
    expect(
      codesFor([["REQ-1", "sweep", "spec-0001..0004", "UPDATE", "MODIFY", "-", "why"]], KNOWN),
    ).toEqual(["QFAI-TRIAGE-009"]);
  });

  it("emits QFAI-TRIAGE-009 when a non-CREATE row leaves Existing Spec unfilled", () => {
    expect(codesFor([["REQ-1", "extend", "", "UPDATE", "APPEND", "-", "why"]], KNOWN)).toEqual([
      "QFAI-TRIAGE-009",
    ]);
    expect(codesFor([["REQ-1", "extend", "-", "UPDATE", "APPEND", "-", "why"]], KNOWN)).toEqual([
      "QFAI-TRIAGE-009",
    ]);
  });

  it("emits QFAI-TRIAGE-009 when the cell names nothing resolvable", () => {
    expect(codesFor([["REQ-1", "extend", "TBD", "UPDATE", "APPEND", "-", "why"]], KNOWN)).toEqual([
      "QFAI-TRIAGE-009",
    ]);
  });

  it("emits QFAI-TRIAGE-009 for a spec token that is not exactly four digits", () => {
    // `spec-00010` shares a prefix with the existing `spec-0001`; matching the
    // whole token keeps the typo from borrowing that spec's existence.
    const issues = validateTriageSection(
      buildDelta([["REQ-1", "extend", "spec-00010", "UPDATE", "APPEND", "-", "why"]]),
      DELTA_PATH,
      KNOWN,
    );
    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-TRIAGE-009"]);
    expect(issues[0]?.refs).toEqual(["spec-00010"]);
    expect(
      codesFor([["REQ-1", "extend", "spec-001", "UPDATE", "APPEND", "-", "why"]], KNOWN),
    ).toEqual(["QFAI-TRIAGE-009"]);
    // A malformed member of a `+` enumeration is caught even when the other
    // member resolves.
    expect(
      codesFor(
        [["REQ-1", "merge", "spec-0003+spec-0004x", "MERGE", "-", "user@host", "why"]],
        KNOWN,
      ),
    ).toEqual(["QFAI-TRIAGE-009"]);
    // The grammar check does not need the known-spec set.
    expect(codesFor([["REQ-1", "extend", "spec-00010", "UPDATE", "APPEND", "-", "why"]])).toEqual([
      "QFAI-TRIAGE-009",
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
    ).toEqual(["QFAI-TRIAGE-009"]);
  });

  it("checks the grammar but not existence when the known-spec set is absent", () => {
    // Callers that validate one delta.md in isolation cannot resolve spec
    // directories, so only the shape is enforced.
    expect(codesFor([["REQ-1", "extend", "spec-0099", "UPDATE", "APPEND", "-", "why"]])).toEqual(
      [],
    );
    expect(codesFor([["REQ-1", "extend", "", "UPDATE", "APPEND", "-", "why"]])).toEqual([
      "QFAI-TRIAGE-009",
    ]);
  });

  it("reports the Existing Spec defect alongside the approval gate on the same row", () => {
    expect(
      codesFor([["REQ-1", "retire spec-0003", "spec-0009", "SUPERSEDE", "-", "-", "why"]], KNOWN),
    ).toEqual(["QFAI-TRIAGE-009", "QFAI-TRIAGE-005"]);
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
      expect(issues.map((entry) => entry.code)).toEqual(["QFAI-TRIAGE-009"]);
      expect(issues[0]?.refs).toEqual([cell]);
    }
  });

  it("rejects a cell that only contains the `_policies` literal", () => {
    for (const cell of ["_policies_typo", "not_policies", "`_policies` かどこか"]) {
      expect(codesFor([["REQ-1", "policy", cell, "UPDATE", "APPEND", "-", "why"]], KNOWN)).toEqual([
        "QFAI-TRIAGE-009",
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
    ).toEqual(["QFAI-TRIAGE-009"]);
    // SUPERSEDE keeps the directory, so existence still applies there.
    expect(
      codesFor(
        [["REQ-1", "retire the subject", "spec-0017", "SUPERSEDE", "-", "user@host", "why"]],
        KNOWN,
      ),
    ).toEqual(["QFAI-TRIAGE-009"]);
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
      expect(issues.map((entry) => entry.code)).toEqual(["QFAI-TRIAGE-009"]);
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
      ).toEqual(["QFAI-TRIAGE-009"]);
      expect(
        codesFor(
          [["REQ-1", "policy work", "`_policies/05_Contracts.md`", op, "-", "user@host", "why"]],
          KNOWN,
        ),
      ).toEqual(["QFAI-TRIAGE-009"]);
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
      ).toEqual(["QFAI-TRIAGE-009"]);
    }
    expect(codesFor([["REQ-1", "retire", "", "DELETE", "-", "user@host", "why"]], KNOWN)).toEqual([
      "QFAI-TRIAGE-009",
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
        "QFAI-TRIAGE-009",
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

  it("refuses a policy path that walks out of `_policies`", () => {
    // The path charset admitted `.` and `..` as ordinary segments, so a cell
    // that normalises to a spec — or to any neighbouring path — was accepted
    // as a policy target and skipped the spec existence check entirely.
    for (const cell of [
      "\\_policies/../spec-0001",
      "\\_policies/..",
      "\\_policies/./05_Contracts.md",
      "`_policies/sub/../../etc`",
    ]) {
      expect(
        codesFor([["REQ-1", "policy work", cell, "UPDATE", "APPEND", "-", "why"]], KNOWN),
      ).toEqual(["QFAI-TRIAGE-009"]);
    }
    // Over-correction pin: an ordinary dotted filename is still a path.
    expect(
      codesFor(
        [["REQ-1", "policy work", "`_policies/05_Contracts.md`", "UPDATE", "APPEND", "-", "why"]],
        KNOWN,
      ),
    ).toEqual([]);
  });

  it("undoes markdown decoration only where markdown put it", () => {
    // Deleting every backtick and backslash in the cell repaired the very
    // values the grammar exists to reject: both of these normalised to the
    // existing `spec-0001`.
    for (const cell of ["spec-00\\01", "spec-00`01", "spec-`0001`", "\\spec-0001"]) {
      expect(codesFor([["REQ-1", "extend", cell, "UPDATE", "APPEND", "-", "why"]], KNOWN)).toEqual([
        "QFAI-TRIAGE-009",
      ]);
    }
    // Over-correction pin: the decorations markdown really produces — one
    // matched code span (around the whole cell or around each target) and the
    // `\_` escape `renderTriageMarkdown` writes — still normalise away.
    for (const cell of [
      "`spec-0001`",
      "`spec-0003`+`spec-0004`",
      "`spec-0003+spec-0004`",
      "\\_policies",
    ]) {
      expect(codesFor([["REQ-1", "extend", cell, "UPDATE", "APPEND", "-", "why"]], KNOWN)).toEqual(
        [],
      );
    }
  });

  it("rejects an enumeration that names the same target twice", () => {
    // Two slots, one target. It also fools the removal check below, which
    // reads "every target gone" as "the operation has been carried out": a
    // duplicated ID makes one absent spec look like a complete set.
    for (const cell of ["spec-0001+spec-0001", "`spec-0003`, spec-0003", "\\_policies+_policies"]) {
      expect(
        codesFor([["REQ-1", "collapse", cell, "MERGE", "-", "user@host", "why"]], KNOWN),
      ).toEqual(["QFAI-TRIAGE-009"]);
    }
    // Over-correction pin: a MERGE row may name one spec — the destination
    // that absorbs the `Source` — which is the form this repository's own
    // `.qfai/specs/spec-0012/09_delta.md` uses, and distinct targets enumerate
    // as before.
    expect(
      codesFor([["REQ-1", "absorb", "spec-0003", "MERGE", "-", "user@host", "why"]], KNOWN),
    ).toEqual([]);
    expect(
      codesFor(
        [["REQ-1", "collapse", "spec-0003+spec-0004", "MERGE", "-", "user@host", "why"]],
        KNOWN,
      ),
    ).toEqual([]);
  });
});

function triageTable(rows: string[][]): string[] {
  const header =
    "| Source | Subject | Existing Spec | Operation | Sub-op | Approved By | Rationale |";
  const sep = "| --- | --- | --- | --- | --- | --- | --- |";
  return [header, sep, ...rows.map((row) => `| ${row.join(" | ")} |`)];
}

function buildDelta(rows: string[][]): string {
  return [
    "# 09 Delta",
    "",
    "## Change Summary",
    "",
    "## Triage",
    "",
    ...triageTable(rows),
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

  it("reaches CREATE rows in a second `## Triage` section", async () => {
    const capPath = await newTempCapabilitiesPath("# 03 Capabilities\n\n- CAP-0001 sample\n");
    const text = [
      "# 09 Delta",
      "",
      "## Triage",
      "",
      ...triageTable([["REQ-1", "extend", "spec-0001", "UPDATE", "APPEND", "-", "-"]]),
      "",
      "## Triage",
      "",
      ...triageTable([["REQ-2", "new feature", "(none)", "CREATE", "-", "user@host", "no CAP"]]),
      "",
    ].join("\n");
    const issues = await validateCreateRowCapabilityRefs(text, DELTA_PATH, capPath);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-TRIAGE-006"]);
    expect(issues[0]?.message).toContain("section 2");
  });

  it("ignores a CREATE row in a `## Triage` example inside a fenced code block", async () => {
    const capPath = await newTempCapabilitiesPath("# 03 Capabilities\n\n- CAP-0001 sample\n");
    const text = [
      "# 09 Delta",
      "",
      "## Triage",
      "",
      ...triageTable([["REQ-1", "extend", "spec-0001", "UPDATE", "APPEND", "-", "-"]]),
      "",
      "## Notes",
      "",
      "```markdown",
      "## Triage",
      "",
      ...triageTable([["REQ-9", "例示", "(none)", "CREATE", "-", "user@host", "no CAP"]]),
      "```",
      "",
    ].join("\n");
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
    // When the CAP catalog cannot be read, `validateCreateRowCapabilityRefs`
    // intentionally treats the known set as empty so that every cited CAP
    // is reported as unregistered. The append-first guard should fail
    // loud, not silently skip, when the SSOT is unavailable — the test
    // name reflects that behaviour explicitly so readers do not mistake
    // "ignores" for a no-op.
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
