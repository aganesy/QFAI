import { access, mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { run } from "../../src/cli/main.js";
import type { Issue, ValidationResult } from "../../src/core/types.js";
import { captureStderr } from "../helpers/stderr.js";
import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

const roots: string[] = [];

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

const warning: Issue = {
  code: "QFAI-TEST-001",
  severity: "warning",
  category: "canonical",
  message: "fixture warning",
  file: ".qfai/spec/decisions.md",
};
const note: Issue = {
  code: "QFAI-TEST-002",
  severity: "info",
  category: "canonical",
  message: "fixture note",
};

async function scratch(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-report-cli-"));
  roots.push(dir);
  return dir;
}

/** A story tree with one flow, one story, one criterion and one example. */
async function storyRoot(): Promise<string> {
  const root = await scratch();
  const flow = path.join(root, ".qfai/spec/02_business-flow/business-flow-0001");
  const story = path.join(flow, "user-story-0001-0001");
  await mkdir(story, { recursive: true });
  await writeFile(path.join(flow, "business-flow.md"), "# BF-0001: Checkout\n", "utf8");
  await writeFile(path.join(story, "01_User-story.md"), "# US-0001-0001: Pay\n", "utf8");
  await writeFile(
    path.join(story, "02_Acceptance-Criteria.md"),
    "```gherkin\n# AC-0001-0001-01\nScenario: Pay\n  Given a cart\n```\n",
    "utf8",
  );
  await writeFile(
    path.join(story, "03_Example.md"),
    "| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001-01 | AC-0001-0001-01 | cart | paid |\n",
    "utf8",
  );
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    "utf8",
  );
  return root;
}

async function writeValidation(root: string, issues: Issue[]): Promise<void> {
  const counts = { info: 0, warning: 0, error: 0 };
  for (const issue of issues) counts[issue.severity] += 1;
  const result: ValidationResult = { toolVersion: "2.0.0-test", profile: "full", issues, counts };
  const output = path.join(root, ".qfai/report/validate.json");
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(result)}\n`, "utf8");
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
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

async function markdownLines(root: string): Promise<string[]> {
  return (await readFile(path.join(root, ".qfai/report/report.md"), "utf8")).split("\n");
}

describe("qfai report", () => {
  // QFAI:AC-0001-0058-01
  // QFAI:EX-0001-0058-01
  it("writes report.md with a summary, the stored findings and the flow trace", async () => {
    const root = await storyRoot();
    await writeValidation(root, [warning, note]);

    const result = await cli(root, ["report", "--format", "md"]);

    expect(result.exit).toBe(0);
    const lines = await markdownLines(root);
    expect(lines[0]).toBe("# QFAI Report");
    expect(lines).toEqual(
      expect.arrayContaining([
        "- Business flows: 1",
        "- User stories: 1",
        "- Acceptance criteria: 1",
        "- Examples: 1",
        "- Findings: info=1 warning=1 error=0",
      ]),
    );
    expect(lines.indexOf("## Business flows")).toBeGreaterThan(lines.indexOf("# QFAI Report"));
    expect(lines.indexOf("## Findings")).toBeGreaterThan(lines.indexOf("## Business flows"));
    expect(lines.filter((line) => /^- (INFO|WARNING|ERROR) /.test(line))).toEqual([
      "- WARNING QFAI-TEST-001: fixture warning (.qfai/spec/decisions.md)",
      "- INFO QFAI-TEST-002: fixture note",
    ]);
    const flow = lines.slice(lines.indexOf("### BF-0001"));
    expect(flow).toEqual(
      expect.arrayContaining([
        "- Stories: US-0001-0001",
        "- Acceptance criteria: AC-0001-0001-01",
        "- Examples: EX-0001-0001-01",
      ]),
    );
  });

  // QFAI:AC-0001-0059-01
  // QFAI:EX-0001-0059-01
  it("writes report.json with the structured data of the stored result", async () => {
    const root = await storyRoot();
    await writeValidation(root, [warning, note]);

    const result = await cli(root, ["report", "--format", "json"]);

    expect(result.exit).toBe(0);
    const data = JSON.parse(await readFile(path.join(root, ".qfai/report/report.json"), "utf8"));
    expect(data).toMatchObject({
      tool: "qfai",
      version: "2.0.0-test",
      summary: {
        flows: 1,
        stories: 1,
        acceptanceCriteria: 1,
        examples: 1,
        counts: { info: 1, warning: 1, error: 0 },
      },
      flows: [
        {
          id: "BF-0001",
          stories: ["US-0001-0001"],
          acceptanceCriteria: ["AC-0001-0001-01"],
          examples: ["EX-0001-0001-01"],
        },
      ],
      issues: [warning, note],
    });
    expect(await exists(path.join(root, ".qfai/report/report.md"))).toBe(false);
  });

  // QFAI:AC-0001-0060-01
  // QFAI:EX-0001-0060-01
  it("links a finding's file path to the repository with --base-url", async () => {
    const root = await storyRoot();
    await writeValidation(root, [warning]);

    await cli(root, ["report", "--format", "md", "--base-url", "https://github.com/org/repo"]);

    expect(await markdownLines(root)).toContain(
      "- WARNING QFAI-TEST-001: fixture warning ([.qfai/spec/decisions.md](https://github.com/org/repo/.qfai/spec/decisions.md))",
    );
  });

  // QFAI:AC-0001-0061-01
  // QFAI:EX-0001-0061-01
  it("builds the report from a validation it runs itself and ignores --in", async () => {
    const root = await storyRoot();
    const validateJson = path.join(root, ".qfai/report/validate.json");
    expect(await exists(validateJson)).toBe(false);

    const result = await cli(root, [
      "report",
      "--run-validate",
      "--fail-on",
      "never",
      "--in",
      path.join(root, "missing.json"),
    ]);

    expect(result.exit).toBe(0);
    expect(result.stdout).toContain("report: --in is ignored because --run-validate was given.");
    const written = JSON.parse(await readFile(validateJson, "utf8")) as ValidationResult;
    expect(written.issues.length).toBeGreaterThan(0);
    const lines = await markdownLines(root);
    expect(lines).toContain(
      `- Findings: info=${written.counts.info} warning=${written.counts.warning} error=${written.counts.error}`,
    );
    for (const issue of written.issues) {
      expect(lines.some((line) => line.includes(` ${issue.code}: `))).toBe(true);
    }
  });

  // QFAI:AC-0001-0061-02
  // QFAI:EX-0001-0061-02
  it("reports a narrow profile run in CI at warning without failing on it", async () => {
    const root = await storyRoot();
    await writeFile(
      path.join(root, ".qfai/spec/decisions.md"),
      [
        "| ID | Content | Approach | Status |",
        "| --- | --- | --- | --- |",
        "| DEC-0001 | Test exception: BF-0001, AC-0001-0001-01 | No tests yet | DONE |",
        "",
      ].join("\n"),
      "utf8",
    );
    vi.stubEnv("CI", "true");

    const result = await cli(root, ["report", "--run-validate", "--profile", "atdd"]);

    const written = JSON.parse(
      await readFile(path.join(root, ".qfai/report/validate.json"), "utf8"),
    ) as ValidationResult;
    expect(written.issues).toContainEqual(
      expect.objectContaining({ code: "QFAI-VALIDATE-017", severity: "warning" }),
    );
    expect(written.issues.filter((issue) => issue.severity === "error")).toEqual([]);
    expect(result.stdout).toContain("run a full scan");
    expect(result.exit).toBe(0);
  });

  // QFAI:AC-0001-0062-01
  // QFAI:EX-0001-0062-01
  it("exits 2 and says the input file was not found when no validate.json exists", async () => {
    const root = await storyRoot();

    const result = await cli(root, ["report"]);

    expect(result.exit).toBe(2);
    expect(result.stderr).toContain("qfai report: input file not found");
    expect(await exists(path.join(root, ".qfai/report/report.md"))).toBe(false);
  });

  // QFAI:AC-0001-0063-01
  // QFAI:EX-0001-0063-01
  it("writes the report to the path --out names", async () => {
    const root = await storyRoot();
    await writeValidation(root, [warning]);
    const target = path.join(await scratch(), "custom-report.md");

    const result = await cli(root, ["report", "--format", "md", "--out", target]);

    expect(result.exit).toBe(0);
    expect((await readFile(target, "utf8")).split("\n")[0]).toBe("# QFAI Report");
    expect(await exists(path.join(root, ".qfai/report/report.md"))).toBe(false);
  });

  // QFAI:EX-0001-0064-01
  it("writes one report directory per business flow beside report.md", async () => {
    const root = await storyRoot();
    const flow = path.join(root, ".qfai/spec/02_business-flow/business-flow-0002");
    const story = path.join(flow, "user-story-0002-0001");
    await mkdir(story, { recursive: true });
    await writeFile(path.join(flow, "business-flow.md"), "# BF-0002: Refund\n", "utf8");
    await writeFile(path.join(story, "01_User-story.md"), "# US-0002-0001: Refund\n", "utf8");
    await writeFile(
      path.join(story, "02_Acceptance-Criteria.md"),
      "```gherkin\n# AC-0002-0001-01\nScenario: Refund\n  Given a paid cart\n```\n",
      "utf8",
    );
    await writeFile(
      path.join(story, "03_Example.md"),
      "| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0002-0001-01 | AC-0002-0001-01 | cart | refunded |\n",
      "utf8",
    );
    await writeValidation(root, [warning]);

    const result = await cli(root, ["report"]);

    expect(result.exit).toBe(0);
    const reportDir = path.join(root, ".qfai/report");
    expect(await exists(path.join(reportDir, "report.md"))).toBe(true);
    for (const flowDir of ["business-flow-0001", "business-flow-0002"]) {
      expect((await readdir(path.join(reportDir, flowDir))).sort()).toEqual([
        "coverage.md",
        "traceability-graph.json",
      ]);
      const graph = JSON.parse(
        await readFile(path.join(reportDir, flowDir, "traceability-graph.json"), "utf8"),
      ) as { nodes: Array<{ type: string }> };
      expect(graph.nodes.length).toBeGreaterThan(0);
      for (const node of graph.nodes) {
        expect(["BF", "US", "AC", "EX", "BR", "CON"]).toContain(node.type);
      }
    }
    expect((await readdir(reportDir)).filter((entry) => entry.startsWith("spec-"))).toEqual([]);
  });
});
