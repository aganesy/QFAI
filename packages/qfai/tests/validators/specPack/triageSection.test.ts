import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { RULE_PROMOTIONS } from "../../../src/core/sunset.js";
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

/**
 * A version inside every promotion window, so `QFAI-TRIAGE-008` reports at its
 * pre-promotion severity. A literal rather than the shipped version, so the
 * cases below keep asserting what they were written for once the promotion
 * release lands; the promotion itself is asserted separately, against the pin.
 */
const TOOL_VERSION = "0.0.0";

describe("validateTriageSection", () => {
  it("returns no issues when delta has neither Change Summary nor Triage", () => {
    const text = "# 09 Delta\n";
    expect(validateTriageSection(text, DELTA_PATH, TOOL_VERSION)).toEqual([]);
  });

  it("emits QFAI-TRIAGE-001 when Change Summary exists without Triage", () => {
    const text = "# 09 Delta\n\n## Change Summary\n\n- one change\n";
    const issues = validateTriageSection(text, DELTA_PATH, TOOL_VERSION);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-TRIAGE-001");
    expect(issues[0]?.severity).toBe("warning");
  });

  it("emits QFAI-TRIAGE-002 when Triage section has no table", () => {
    const text = "# 09 Delta\n\n## Change Summary\n\n## Triage\n\nno table here\n";
    const issues = validateTriageSection(text, DELTA_PATH, TOOL_VERSION);
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
    const issues = validateTriageSection(text, DELTA_PATH, TOOL_VERSION);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-TRIAGE-002"]);
  });

  it("emits QFAI-TRIAGE-003 for invalid Operation enum", () => {
    const text = buildDelta([["REQ-1", "subject", "spec-0001", "ARCHIVE", "-", "-", "-"]]);
    const issues = validateTriageSection(text, DELTA_PATH, TOOL_VERSION);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-TRIAGE-003"]);
  });

  it("emits QFAI-TRIAGE-004 when UPDATE has invalid Sub-op", () => {
    const text = buildDelta([["REQ-1", "subject", "spec-0001", "UPDATE", "PATCH", "-", "-"]]);
    const issues = validateTriageSection(text, DELTA_PATH, TOOL_VERSION);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-TRIAGE-004"]);
  });

  it("emits QFAI-TRIAGE-004 when UPDATE has empty Sub-op", () => {
    const text = buildDelta([["REQ-1", "subject", "spec-0001", "UPDATE", "-", "-", "-"]]);
    const issues = validateTriageSection(text, DELTA_PATH, TOOL_VERSION);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-TRIAGE-004"]);
  });

  it("emits QFAI-TRIAGE-005 when CREATE has no Approved By", () => {
    const text = buildDelta([["REQ-1", "new", "(none)", "CREATE", "-", "-", "-"]]);
    const issues = validateTriageSection(text, DELTA_PATH, TOOL_VERSION);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-TRIAGE-005"]);
  });

  it("emits QFAI-TRIAGE-005 when UPDATE:REMOVE has no Approved By", () => {
    const text = buildDelta([["REQ-1", "drop", "spec-0001", "UPDATE", "REMOVE", "-", "-"]]);
    const issues = validateTriageSection(text, DELTA_PATH, TOOL_VERSION);
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
    const issues = validateTriageSection(text, DELTA_PATH, TOOL_VERSION);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-TRIAGE-004"]);
  });

  it("returns no issues for a complete UPDATE:APPEND triage", () => {
    const text = buildDelta([
      ["REQ-1", "extend", "spec-0001", "UPDATE", "APPEND", "-", "rationale"],
    ]);
    expect(validateTriageSection(text, DELTA_PATH, TOOL_VERSION)).toEqual([]);
  });

  it("returns no issues for a complete CREATE triage with approval", () => {
    const text = buildDelta([
      ["REQ-1", "new packaging command", "(none)", "CREATE", "-", "user@host", "rationale"],
    ]);
    expect(validateTriageSection(text, DELTA_PATH, TOOL_VERSION)).toEqual([]);
  });

  it("validates every canonical `## Triage` section, not just the first", () => {
    // A re-run of the SDD skill appends a second `## Triage` section rather
    // than extending the first table. Reading only the first section left
    // every later row ungated (issue #619).
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
    const issues = validateTriageSection(text, DELTA_PATH, TOOL_VERSION);
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
    const issues = validateTriageSection(text, DELTA_PATH, TOOL_VERSION);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-TRIAGE-008"]);
    expect(issues[0]?.severity).toBe("warning");
    expect(issues[0]?.message).toContain(
      RULE_PROMOTIONS.triageHeadingNonCanonical.promoteAt,
      // P7 step 3: the finding names the release that ends its window, so an
      // operator running `--fail-on error` can read the debt they will owe.
    );
    expect(issues[0]?.refs).toEqual(["## Triage — 2026-07-26"]);
  });

  it("promotes QFAI-TRIAGE-008 to an error at its pinned release", () => {
    // The half-landed state P7 exists to stop is a promotion that is declared
    // and never applied. Asserted against the pin rather than a copy of it, so
    // moving the pin moves this test with it.
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
      ...triageTable([["REQ-2", "later", "spec-0001", "UPDATE", "APPEND", "-", "-"]]),
      "",
    ].join("\n");
    const promoteAt = RULE_PROMOTIONS.triageHeadingNonCanonical.promoteAt;
    const issues = validateTriageSection(text, DELTA_PATH, promoteAt);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-TRIAGE-008"]);
    expect(issues[0]?.severity).toBe("error");
    // The window note is dropped once the window has closed: there is no
    // remaining grace to describe.
    expect(issues[0]?.message).not.toContain(promoteAt);
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
    const issues = validateTriageSection(text, DELTA_PATH, TOOL_VERSION);
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
    expect(validateTriageSection(text, DELTA_PATH, TOOL_VERSION)).toEqual([]);
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
    expect(validateTriageSection(text, DELTA_PATH, TOOL_VERSION)).toEqual([]);
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
    expect(validateTriageSection(text, DELTA_PATH, TOOL_VERSION)).toEqual([]);
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
    expect(validateTriageSection(text, DELTA_PATH, TOOL_VERSION)).toEqual([]);
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
    expect(validateTriageSection(text, DELTA_PATH, TOOL_VERSION)).toEqual([]);
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
