import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { collectSpecSummaries, extractScopeBullets } from "../../src/core/specSummary.js";

const tempDirs: string[] = [];

async function newTempSpecsRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec-summary-"));
  tempDirs.push(root);
  return root;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function writeSpec(
  specsRoot: string,
  specNumber: string,
  options: {
    status?: string;
    capability?: string;
    title?: string;
    scopeIn?: string;
    scopeOut?: string;
    acIds?: string[];
    tcIds?: string[];
  } = {},
): Promise<void> {
  const dir = path.join(specsRoot, `spec-${specNumber}`);
  await mkdir(dir, { recursive: true });
  const lines: string[] = [
    `# ${options.title ?? "01 Spec"}`,
    "",
    `- Spec: spec-${specNumber}`,
  ];
  if (options.capability) {
    lines.push(`- Parent: ${options.capability}`);
  }
  if (options.status) {
    lines.push(`- Status: ${options.status}`);
  }
  lines.push("");
  if (options.scopeIn || options.scopeOut) {
    lines.push("## Scope", "");
    if (options.scopeIn) {
      lines.push(`- In: ${options.scopeIn}`);
    }
    if (options.scopeOut) {
      lines.push(`- Out: ${options.scopeOut}`);
    }
    lines.push("");
  }
  await writeFile(path.join(dir, "01_Spec.md"), `${lines.join("\n")}\n`, "utf-8");

  // Layered v1421 structure: writing 02_User-stories.md picks up the layered detector.
  await writeFile(path.join(dir, "02_User-stories.md"), `# 02 User Stories\n`, "utf-8");
  await writeFile(
    path.join(dir, "03_Acceptance-Criteria.md"),
    (options.acIds ?? []).map((id) => `- ${id}: criterion`).join("\n") + "\n",
    "utf-8",
  );
  await writeFile(
    path.join(dir, "06_Test-Cases.md"),
    (options.tcIds ?? []).map((id) => `- ${id}: case`).join("\n") + "\n",
    "utf-8",
  );
}

describe("extractScopeBullets", () => {
  it("returns the In bullet content split on commas", () => {
    const md = "## Scope\n\n- In: alpha, beta、gamma\n- Out: outside\n";
    expect(extractScopeBullets(md, "In")).toEqual(["alpha", "beta", "gamma"]);
  });

  it("returns empty array when no Scope heading is present", () => {
    expect(extractScopeBullets("# Spec\n", "In")).toEqual([]);
  });

  it("returns empty array when the In bullet is missing", () => {
    expect(extractScopeBullets("## Scope\n- Out: only\n", "In")).toEqual([]);
  });
});

describe("collectSpecSummaries", () => {
  it("returns empty array when specs root does not exist", async () => {
    const root = await newTempSpecsRoot();
    expect(await collectSpecSummaries(path.join(root, "missing"))).toEqual([]);
  });

  it("collects active specs sorted by id", async () => {
    const root = await newTempSpecsRoot();
    await writeSpec(root, "0002", {
      status: "active",
      capability: "CAP-0002",
      acIds: ["AC-0002-0001", "AC-0002-0002"],
      tcIds: ["TC-0002-0001"],
      scopeIn: "feature B",
      scopeOut: "feature A",
    });
    await writeSpec(root, "0001", {
      status: "active",
      capability: "CAP-0001",
      acIds: ["AC-0001-0001"],
      tcIds: [],
    });

    const summaries = await collectSpecSummaries(root);
    expect(summaries.map((s) => s.specId)).toEqual(["spec-0001", "spec-0002"]);
    expect(summaries[0]).toMatchObject({
      specId: "spec-0001",
      status: "active",
      capability: "CAP-0001",
      acCount: 1,
      tcCount: 0,
    });
    expect(summaries[1]).toMatchObject({
      specId: "spec-0002",
      status: "active",
      capability: "CAP-0002",
      acCount: 2,
      tcCount: 1,
      scopeIn: ["feature B"],
      scopeOut: ["feature A"],
    });
  });

  it("falls back to active when Status bullet is missing or unparseable", async () => {
    const root = await newTempSpecsRoot();
    await writeSpec(root, "0010", { acIds: [], tcIds: [] });
    await writeSpec(root, "0011", { status: "archived", acIds: [], tcIds: [] });

    const summaries = await collectSpecSummaries(root);
    expect(summaries.find((s) => s.specId === "spec-0010")?.status).toBe("active");
    expect(summaries.find((s) => s.specId === "spec-0011")?.status).toBe("active");
  });

  it("propagates non-active status when valid", async () => {
    const root = await newTempSpecsRoot();
    await writeSpec(root, "0020", {
      status: "deprecated",
      capability: "CAP-0020",
      acIds: [],
      tcIds: [],
    });

    const summaries = await collectSpecSummaries(root);
    expect(summaries[0]?.status).toBe("deprecated");
  });
});
