import { access, mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { run } from "../../src/cli/main.js";
import type { Issue, ValidationResult } from "../../src/core/types.js";
import { captureStderr } from "../helpers/stderr.js";
import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

const flowIds = ["0001", "0002"];

/** A story tree of two flows, each with a story directory that has no 03_Example.md. */
async function twoFlowRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-flow-runs-"));
  roots.push(root);
  for (const id of flowIds) {
    const flow = path.join(root, `.qfai/spec/02_business-flow/business-flow-${id}`);
    const story = path.join(flow, `user-story-${id}-0001`);
    await mkdir(story, { recursive: true });
    await writeFile(path.join(flow, "business-flow.md"), `# BF-${id}: Flow ${id}\n`, "utf8");
    await writeFile(path.join(story, "01_User-story.md"), `# US-${id}-0001: Story\n`, "utf8");
    await writeFile(
      path.join(story, "02_Acceptance-Criteria.md"),
      `\`\`\`gherkin\n# AC-${id}-0001-01\nScenario: Criterion\n  Given a project\n\`\`\`\n`,
      "utf8",
    );
  }
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    "utf8",
  );
  return root;
}

async function cli(root: string, args: string[]) {
  const previous = process.exitCode;
  process.exitCode = undefined;
  try {
    let stdout = "";
    const stderr = await captureStderr(async () => {
      stdout = await captureStdout(() => run(args, root));
    });
    return { exit: process.exitCode, stdout, stderr };
  } finally {
    process.exitCode = previous;
  }
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function listing(root: string): Promise<string[]> {
  return (await readdir(root, { recursive: true })).map((entry) => entry.split(path.sep).join("/"));
}

function fixture(code: string): Issue {
  return { code, severity: "warning", category: "canonical", message: `fixture ${code}` };
}

async function writeResult(root: string, name: string, issues: Issue[]): Promise<void> {
  const result: ValidationResult = {
    toolVersion: "2.0.0-test",
    profile: "full",
    issues,
    counts: { info: 0, warning: issues.length, error: 0 },
  };
  const target = path.join(root, ".qfai/report", name);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(result)}\n`, "utf8");
}

describe("flow-scoped validate", () => {
  // QFAI:AC-0001-0057-01
  it("checks only the named flow and leaves the shared results as they were", async () => {
    const root = await twoFlowRoot();
    const report = path.join(root, ".qfai/report");
    await mkdir(report, { recursive: true });
    await writeFile(path.join(report, "validate.json"), "earlier shared result\n", "utf8");
    await writeFile(path.join(report, "validate-full.json"), "earlier profile result\n", "utf8");

    await cli(root, ["validate", "--flow", "BF-0001", "--fail-on", "never"]);

    const scoped = JSON.parse(
      await readFile(path.join(report, "validate.flow-0001.json"), "utf8"),
    ) as ValidationResult;
    const missing = scoped.issues.filter((finding) => finding.code === "QFAI-STORY-001");
    expect(missing.map((finding) => finding.file).join("\n")).toContain("user-story-0001-0001");
    expect(
      scoped.issues
        .filter((finding) => finding.code.startsWith("QFAI-STORY-"))
        .map((finding) => `${finding.file ?? ""} ${finding.message}`)
        .join("\n"),
    ).not.toContain("0002");
    expect(await readFile(path.join(report, "validate.json"), "utf8")).toBe(
      "earlier shared result\n",
    );
    expect(await readFile(path.join(report, "validate-full.json"), "utf8")).toBe(
      "earlier profile result\n",
    );

    await cli(root, ["validate", "--flow", "BF-0001", "--flow", "BF-0002", "--fail-on", "never"]);
    expect(await exists(path.join(report, "validate.flow-0001+0002.json"))).toBe(true);
  });
});

describe("flow-scoped report", () => {
  /** Validate flow 1, then replace its scoped result and the shared one with known findings. */
  async function scopedRoot(): Promise<string> {
    const root = await twoFlowRoot();
    await cli(root, ["validate", "--flow", "BF-0001", "--fail-on", "never"]);
    await writeResult(root, "validate.flow-0001.json", [fixture("QFAI-TEST-001")]);
    await writeResult(root, "validate.json", [fixture("QFAI-TEST-999")]);
    await writeFile(path.join(root, ".qfai/report/report.md"), "earlier report.md\n", "utf8");
    await writeFile(path.join(root, ".qfai/report/report.json"), "earlier report.json\n", "utf8");
    return root;
  }

  // QFAI:AC-0001-0066-01
  it.each(["md", "json"] as const)(
    "renders the scoped result of the named flow to its own %s report",
    async (format) => {
      const root = await scopedRoot();
      const report = path.join(root, ".qfai/report");

      const result = await cli(root, ["report", "--flow", "BF-0001", "--format", format]);

      expect(result.exit).toBe(0);
      const rendered = await readFile(path.join(report, `report.flow-0001.${format}`), "utf8");
      expect(rendered).toContain("QFAI-TEST-001");
      expect(rendered).toContain("BF-0001");
      expect(rendered).not.toContain("QFAI-TEST-999");
      expect(rendered).not.toContain("BF-0002");
      expect(await exists(path.join(report, "business-flow-0001/coverage.md"))).toBe(true);
      expect(await exists(path.join(report, "business-flow-0002"))).toBe(false);
      expect(await readFile(path.join(report, "report.md"), "utf8")).toBe("earlier report.md\n");
      expect(await readFile(path.join(report, "report.json"), "utf8")).toBe(
        "earlier report.json\n",
      );
    },
  );

  // QFAI:AC-0001-0066-01
  it("writes to the path --out names instead of the scoped report", async () => {
    const root = await scopedRoot();
    const target = path.join(root, "custom/flow-report.md");

    await cli(root, ["report", "--flow", "BF-0001", "--out", target]);

    expect(await readFile(target, "utf8")).toContain("QFAI-TEST-001");
    expect(await exists(path.join(root, ".qfai/report/report.flow-0001.md"))).toBe(false);
  });

  // QFAI:AC-0001-0066-02
  // QFAI:EX-0001-0066-02
  it("refuses --spec, exits 2 and names --flow BF-NNNN", async () => {
    const root = await twoFlowRoot();
    const before = await listing(root);

    const result = await cli(root, ["report", "--spec", "spec-0001"]);

    expect(result.exit).toBe(2);
    expect(result.stderr).toContain("--flow BF-NNNN");
    expect(await listing(root)).toEqual(before);
  });

  // QFAI:AC-0001-0066-03
  // QFAI:EX-0001-0066-03
  it.each(["../../etc", "flow-1"])("exits 2 and writes no file for --flow %s", async (value) => {
    const root = await twoFlowRoot();
    const before = await listing(root);

    const result = await cli(root, ["report", "--flow", value]);

    expect(result.exit).toBe(2);
    expect(await listing(root)).toEqual(before);
    expect(await exists(path.join(root, ".qfai/report/report.md"))).toBe(false);
  });
});
