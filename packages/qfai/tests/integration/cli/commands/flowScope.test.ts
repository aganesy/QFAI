import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runReport } from "../../../../src/cli/commands/report.js";
import { runValidate, scopedReportPath } from "../../../../src/cli/commands/validate.js";
import { parseArgs } from "../../../../src/cli/lib/args.js";
import { validateProject } from "../../../../src/core/validate.js";

const roots: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function storyRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-flow-cli-"));
  roots.push(root);
  const specs = path.join(root, ".qfai/spec");
  for (const id of ["0001", "0002"]) {
    const dir = path.join(specs, "02_business-flow", `business-flow-${id}`);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "business-flow.md"), `# BF-${id}: Flow ${id}\n`, "utf8");
  }
  await writeFile(
    path.join(specs, "02_business-flow", "business-flows.md"),
    "| BF-ID | Title |\n| --- | --- |\n| BF-0001 | Flow 0001 |\n| BF-0002 | Flow 0002 |\n",
    "utf8",
  );
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    "utf8",
  );
  return root;
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

describe("story-tree CLI flow scope", () => {
  it("TC-0004-0111: names a scoped validate result without touching the shared result", async () => {
    const root = await storyRoot();
    const shared = path.join(root, ".qfai/report/validate.json");
    const scoped = path.join(root, ".qfai/report/validate.flow-0001.json");
    await runValidate({ root, strict: false, failOn: "never", flowIds: ["BF-0001"] });
    expect(await exists(scoped)).toBe(true);
    expect(await exists(shared)).toBe(false);
  });

  it.each(["../outside", "BF-0009"])("TC-0004-0113: %s writes no scoped result", async (value) => {
    const root = await storyRoot();
    await runValidate({ root, strict: false, failOn: "never", flowIds: [value] });
    expect(await exists(path.join(root, ".qfai/report/validate.flow-0009.json"))).toBe(false);
    expect(await exists(path.join(root, ".qfai/report/validate.json"))).toBe(false);
  });

  it("TC-0004-0111: writes the scoped result when a v1 stateDiagram warning is present", async () => {
    // Only an unusable `--flow` value withholds the scoped result. A Mermaid
    // warning in the flow is an ordinary finding and must land in it.
    const root = await storyRoot();
    await writeFile(
      path.join(root, ".qfai/spec/02_business-flow/business-flow-0001/business-flow.md"),
      "# BF-0001: Flow 0001\n\n```mermaid\nstateDiagram\n  [*] --> Draft\n```\n",
      "utf8",
    );
    await runValidate({ root, strict: false, failOn: "never", flowIds: ["BF-0001"] });
    const scoped = path.join(root, ".qfai/report/validate.flow-0001.json");
    expect(await exists(scoped)).toBe(true);
    const result = JSON.parse(await readFile(scoped, "utf8")) as {
      issues: Array<{ code: string; severity: string }>;
    };
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "QFAI-FLOW-001", severity: "warning" }),
    );
    expect(result.issues.some((finding) => finding.code === "QFAI-FLOW-005")).toBe(false);
  });

  it.each(["../outside", "BF-0009"])(
    "TC-0004-0113: %s is reported as an unusable --flow value",
    async (value) => {
      const root = await storyRoot();
      const result = await validateProject(root, undefined, { profile: "sdd", flowIds: [value] });
      expect(result.issues).toContainEqual(
        expect.objectContaining({ code: "QFAI-FLOW-005", severity: "error", refs: [value] }),
      );
      expect(result.issues.some((finding) => finding.code === "QFAI-FLOW-001")).toBe(false);
    },
  );

  it("TC-0004-0112: refuses --spec on a story tree", async () => {
    // QFAI:EX-0001-0097-05
    const root = await storyRoot();
    const parsed = parseArgs(["validate", "--spec", "0001"], root);
    expect(parsed.invalid).toBe(true);
    expect(parsed.invalidReason).toContain("--flow BF-NNNN");
    expect(await exists(path.join(root, ".qfai/report/validate.spec-0001.json"))).toBe(false);
  });

  it.each(["md", "json"] as const)(
    "TC-0005-0015: reads the scoped validate result and writes a scoped %s report",
    async (format) => {
      const root = await storyRoot();
      await runValidate({ root, strict: false, failOn: "never", flowIds: ["BF-0001"] });
      await runReport({ root, format, failOn: "never", flowIds: ["BF-0001"] });
      expect(await exists(path.join(root, `.qfai/report/report.flow-0001.${format}`))).toBe(true);
      expect(await exists(path.join(root, `.qfai/report/report.${format}`))).toBe(false);
      expect(await exists(path.join(root, ".qfai/report/business-flow-0001/coverage.md"))).toBe(
        true,
      );
      expect(await exists(path.join(root, ".qfai/report/business-flow-0002/coverage.md"))).toBe(
        false,
      );
      const rendered = await readFile(
        path.join(root, `.qfai/report/report.flow-0001.${format}`),
        "utf8",
      );
      expect(rendered).toContain("BF-0001");
      expect(rendered).not.toContain("BF-0002");
      expect(rendered).not.toContain("SC Coverage");
      expect(rendered).not.toContain("TC coverage");
    },
  );

  it("TC-0005-0016/0017: refuses --spec and malformed --flow before writing", async () => {
    const root = await storyRoot();
    const parsed = parseArgs(["report", "--spec", "0001"], root);
    expect(parsed.invalid).toBe(true);
    expect(parsed.invalidReason).toContain("--flow BF-NNNN");
    expect(await runReport({ root, format: "md", flowIds: ["../../outside"] })).toBe(2);
    expect(await exists(path.join(root, ".qfai/report/report.md"))).toBe(false);
  });

  it("TC-0005-0015: missing input guidance retains the flow scope", async () => {
    const root = await storyRoot();
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    expect(await runReport({ root, format: "md", flowIds: ["BF-0001"] })).toBe(2);
    expect(stderr.mock.calls.map(([chunk]) => String(chunk)).join("")).toContain(
      "qfai validate --flow BF-0001",
    );
  });

  it("writes a sorted BF-to-contract graph from story declarations", async () => {
    const root = await storyRoot();
    const story = path.join(
      root,
      ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001",
    );
    const contract = path.join(root, ".qfai/spec/03_contract/api/orders.yaml");
    await mkdir(story, { recursive: true });
    await mkdir(path.dirname(contract), { recursive: true });
    await writeFile(path.join(story, "01_User-story.md"), "# US-0001-0001: Order\n", "utf8");
    await writeFile(
      path.join(story, "02_Acceptance-Criteria.md"),
      "```gherkin\n# AC-0001-0001-0001\nGiven an order\n```\n",
      "utf8",
    );
    await writeFile(
      path.join(story, "03_Example.md"),
      "| EX-ID | AC-Ref |\n| --- | --- |\n| EX-0001-0001-0001 | AC-0001-0001-0001 |\n",
      "utf8",
    );
    await writeFile(
      contract,
      "# QFAI-CONTRACT-ID: CON-API-0001\nx-qfai-rules:\n  - id: BR-0001\n    statement: Orders are accepted\n    examples: [EX-0001-0001-0001]\n",
      "utf8",
    );
    await runReport({
      root,
      format: "json",
      failOn: "never",
      flowIds: ["BF-0001"],
      runValidate: true,
    });
    const graph = JSON.parse(
      await readFile(
        path.join(root, ".qfai/report/business-flow-0001/traceability-graph.json"),
        "utf8",
      ),
    ) as { nodes: Array<{ id: string; type: string }>; edges: Array<{ relation: string }> };
    expect(new Set(graph.nodes.map((node) => node.type))).toEqual(
      new Set(["BF", "US", "AC", "EX", "BR", "CON"]),
    );
    expect(graph.nodes.map((node) => node.id)).toEqual(
      graph.nodes.map((node) => node.id).sort((left, right) => left.localeCompare(right)),
    );
    expect(graph.edges.map((edge) => edge.relation)).toContain("BF_TO_US");
    expect(graph.edges.map((edge) => edge.relation)).toContain("BR_TO_CON");
    expect(graph.nodes.map((node) => node.id)).toContain("CON-API-0001");
  });

  it("does not derive an output directory from an invalid flow heading", async () => {
    const root = await storyRoot();
    const malformed = path.join(root, ".qfai/spec/02_business-flow/business-flow-0003");
    await mkdir(malformed, { recursive: true });
    await writeFile(path.join(malformed, "business-flow.md"), "# BF-123456: Invalid\n", "utf8");
    await runReport({ root, format: "json", failOn: "never", runValidate: true });
    expect(await exists(path.join(root, ".qfai/report/business-flow-123456"))).toBe(false);
  });
});

describe("scoped report path", () => {
  it("writes flow names from validated IDs", () => {
    expect(scopedReportPath(".qfai/report/validate.json", ["BF-0002", "BF-0001"])).toBe(
      ".qfai/report/validate.flow-0001+0002.json",
    );
    expect(scopedReportPath(".qfai/report/validate.json", ["../outside"])).toBeNull();
  });
});
