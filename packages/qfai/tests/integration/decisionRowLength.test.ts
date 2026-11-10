import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateProject } from "../../src/core/validate.js";

let root: string;
const specs = ".qfai/spec";
const header = ["| ID | Content | Approach |", "| --- | --- | --- |"];

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-decision-length-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function put(file: string, text: string): Promise<void> {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, text, "utf8");
}

/** A row whose Content and Approach together hold `length` characters. */
function row(id: string, length: number): string {
  const content = "Decide x.";
  return `| ${id} | ${content} | ${"a".repeat(length - content.length)} |`;
}

async function lengthFindings() {
  const config = structuredClone(defaultConfig);
  config.paths.specsDir = specs;
  config.paths.contractsDir = `${specs}/03_contract`;
  const result = await validateProject(
    root,
    { config, issues: [], configPath: path.join(root, "qfai.config.yaml") },
    { profile: "sdd" },
  );
  return result.issues.filter((item) => item.code === "QFAI-STORY-018");
}

describe("a decision row over the length limit", () => {
  // QFAI:AC-0001-0053-10
  // QFAI:EX-0001-0053-37
  it("is warned about in either ID form, and a row at the limit is not", async () => {
    await put(
      `${specs}/decisions.md`,
      [
        "# Decisions",
        "",
        "## Decisions",
        "",
        ...header,
        row("DEC-20261110120000", 601),
        row("DEC-20261110120001", 600),
        row("DEC-0001", 900),
        "",
      ].join("\n"),
    );
    const findings = await lengthFindings();
    expect(findings.map((item) => [item.refs, item.severity])).toEqual([
      [["DEC-20261110120000"], "warning"],
      [["DEC-0001"], "warning"],
    ]);
    expect(findings[0]?.message).toContain("601 characters");
    expect(findings[0]?.message).toContain("600");
    expect(findings[0]?.file).toBe(path.posix.join(specs, "decisions.md"));
  });

  // QFAI:AC-0001-0053-10
  // QFAI:EX-0001-0053-39
  it("does not count the paths a change request names", async () => {
    const paths = Array.from({ length: 20 }, (_, n) => `.qfai/spec/03_contract/cli/c-${n}.md`);
    const approach = "a".repeat(550);
    await put(
      `${specs}/decisions.md`,
      [
        "# Decisions",
        "",
        "## Decisions",
        "",
        ...header,
        `| DEC-20261110120000 | Change request: ${paths.join(", ")} | ${approach} |`,
        `| DEC-20261110120001 | Declined change request: ${paths.join(", ")} | ${approach} |`,
        `| DEC-20261110120002 | Change request: a.md | ${"a".repeat(590)} |`,
        "",
      ].join("\n"),
    );
    const findings = await lengthFindings();
    expect(findings.map((item) => item.refs)).toEqual([["DEC-20261110120002"]]);
  });

  // QFAI:AC-0001-0053-10
  // QFAI:EX-0001-0053-38
  it("on a decision page is warned about with the page's file and row", async () => {
    await put(
      `${specs}/decisions.md`,
      [
        "# Decisions",
        "",
        "## Decision pages",
        "",
        "- decisions/page-0001.md",
        "",
        "## Decisions",
        "",
        ...header,
        "",
      ].join("\n"),
    );
    await put(
      `${specs}/decisions/page-0001.md`,
      ["# Decisions", "", "## Decisions", "", ...header, row("DEC-0002", 700), ""].join("\n"),
    );
    const findings = await lengthFindings();
    expect(findings.map((item) => [item.refs, item.severity])).toEqual([[["DEC-0002"], "warning"]]);
    expect(findings[0]?.file).toBe(path.posix.join(specs, "decisions", "page-0001.md"));
    expect(findings[0]?.message).toContain("page-0001.md:7: DEC-0002");
  });
});
