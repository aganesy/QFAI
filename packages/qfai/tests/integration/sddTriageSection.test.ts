import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateSpecPacks } from "../../src/core/validators/specPack.js";

const tempDirs: string[] = [];

async function newTempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-triage-int-"));
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

const TRIAGE_TABLE = [
  "| Source | Subject | Existing Spec | Operation | Sub-op | Approved By | Rationale |",
  "| --- | --- | --- | --- | --- | --- | --- |",
  "| REQ-0001 | extend rule | spec-0001 | UPDATE | APPEND | - | initial seed |",
  "",
].join("\n");

async function seedLayeredSpec(
  root: string,
  specNumber: string,
  options: {
    status: string;
    capability: string;
    supersededBy?: string;
    deprecatedAt?: string;
    deltaTriage?: string | null;
    capabilityCatalog?: string[];
  },
): Promise<void> {
  const specsDir = path.join(root, ".qfai", "specs");
  const policiesDir = path.join(specsDir, "_policies");
  await mkdir(policiesDir, { recursive: true });
  await writeFile(path.join(policiesDir, "11_Slice-Policy.md"), "# 11 Slice Policy\n", "utf-8");
  if (options.capabilityCatalog) {
    const lines = ["# 03 Capabilities", ""];
    for (const cap of options.capabilityCatalog) {
      lines.push(`- ${cap}`);
    }
    await writeFile(path.join(policiesDir, "03_Capabilities.md"), `${lines.join("\n")}\n`, "utf-8");
  }

  const dir = path.join(specsDir, `spec-${specNumber}`);
  await mkdir(dir, { recursive: true });

  const headerLines = [
    "# 01 Spec",
    "",
    `- Spec: spec-${specNumber}`,
    `- Parent: ${options.capability}`,
    `- Status: ${options.status}`,
    `- Superseded-by: ${options.supersededBy ?? "-"}`,
    `- Deprecated-at: ${options.deprecatedAt ?? "-"}`,
    "",
    "## Scope",
    "",
    "- In: example",
    "- Out: nothing",
    "",
  ];
  await writeFile(path.join(dir, "01_Spec.md"), `${headerLines.join("\n")}\n`, "utf-8");
  await writeFile(path.join(dir, "02_User-stories.md"), "# 02 User Stories\n", "utf-8");
  await writeFile(
    path.join(dir, "03_Acceptance-Criteria.md"),
    "# 03 AC\n\n- AC-XXXX-0001: rule\n",
    "utf-8",
  );
  await writeFile(path.join(dir, "04_Business-Rules.md"), "# 04 BR\n", "utf-8");
  await writeFile(path.join(dir, "05_Examples.md"), "# 05 EX\n", "utf-8");
  await writeFile(path.join(dir, "06_Test-Cases.md"), "# 06 TC\n\n- TC-XXXX-0001\n", "utf-8");
  await writeFile(path.join(dir, "07_Decisions.md"), "# 07 Decisions\n", "utf-8");
  await writeFile(path.join(dir, "08_Open-questions.md"), "# 08 OQ\n", "utf-8");

  const deltaSections: string[] = ["# 09 Delta", "", "## Change Summary", "", "- one change", ""];
  if (options.deltaTriage !== null) {
    deltaSections.push(options.deltaTriage ?? `## Triage\n\n${TRIAGE_TABLE}`);
  }
  await writeFile(path.join(dir, "09_delta.md"), `${deltaSections.join("\n")}\n`, "utf-8");
}

function codes(issues: { code: string }[]): string[] {
  return issues
    .map((i) => i.code)
    .filter((c) => c.startsWith("QFAI-STATUS-") || c.startsWith("QFAI-TRIAGE-"));
}

describe("validateSpecPacks - status & triage integration", () => {
  it("emits no status/triage errors for a well-formed active spec", async () => {
    const root = await newTempRoot();
    await seedLayeredSpec(root, "0001", {
      status: "active",
      capability: "CAP-0001",
    });
    const issues = await validateSpecPacks(root, defaultConfig);
    expect(codes(issues)).toEqual([]);
  });

  it("emits QFAI-STATUS-001 when Status bullet is missing", async () => {
    const root = await newTempRoot();
    const specsDir = path.join(root, ".qfai", "specs");
    await mkdir(path.join(specsDir, "_policies"), { recursive: true });
    await writeFile(
      path.join(specsDir, "_policies", "11_Slice-Policy.md"),
      "# 11 Slice Policy\n",
      "utf-8",
    );
    const dir = path.join(specsDir, "spec-0002");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "01_Spec.md"),
      "# 01 Spec\n\n- Spec: spec-0002\n- Parent: CAP-0002\n",
      "utf-8",
    );
    await writeFile(path.join(dir, "02_User-stories.md"), "# 02\n", "utf-8");
    await writeFile(path.join(dir, "03_Acceptance-Criteria.md"), "# 03\n", "utf-8");
    await writeFile(path.join(dir, "04_Business-Rules.md"), "# 04\n", "utf-8");
    await writeFile(path.join(dir, "05_Examples.md"), "# 05\n", "utf-8");
    await writeFile(path.join(dir, "06_Test-Cases.md"), "# 06\n", "utf-8");
    await writeFile(path.join(dir, "07_Decisions.md"), "# 07\n", "utf-8");
    await writeFile(path.join(dir, "08_Open-questions.md"), "# 08\n", "utf-8");
    await writeFile(path.join(dir, "09_delta.md"), "# 09 Delta\n", "utf-8");

    const issues = await validateSpecPacks(root, defaultConfig);
    expect(codes(issues)).toContain("QFAI-STATUS-001");
  });

  it("emits QFAI-STATUS-004 when Superseded-by points to non-existent spec", async () => {
    const root = await newTempRoot();
    await seedLayeredSpec(root, "0001", {
      status: "superseded",
      capability: "CAP-0001",
      supersededBy: "spec-0099",
    });
    const issues = await validateSpecPacks(root, defaultConfig);
    expect(codes(issues)).toContain("QFAI-STATUS-004");
  });

  it("accepts SUPERSEDE chain when target spec exists", async () => {
    const root = await newTempRoot();
    await seedLayeredSpec(root, "0001", {
      status: "superseded",
      capability: "CAP-0001",
      supersededBy: "spec-0002",
    });
    await seedLayeredSpec(root, "0002", {
      status: "active",
      capability: "CAP-0001",
    });
    const issues = await validateSpecPacks(root, defaultConfig);
    expect(codes(issues)).toEqual([]);
  });

  it("emits QFAI-TRIAGE-009 when a triage row names a spec with no directory on disk", async () => {
    const root = await newTempRoot();
    await seedLayeredSpec(root, "0001", {
      status: "active",
      capability: "CAP-0001",
      deltaTriage: [
        "## Triage",
        "",
        "| Source | Subject | Existing Spec | Operation | Sub-op | Approved By | Rationale |",
        "| --- | --- | --- | --- | --- | --- | --- |",
        "| REQ-0001 | extend rule | spec-0099 | UPDATE | APPEND | - | seed |",
        "",
      ].join("\n"),
    });
    const issues = await validateSpecPacks(root, defaultConfig);
    expect(codes(issues)).toContain("QFAI-TRIAGE-009");
  });

  it("emits QFAI-TRIAGE-001 when delta has Change Summary but no Triage", async () => {
    const root = await newTempRoot();
    await seedLayeredSpec(root, "0001", {
      status: "active",
      capability: "CAP-0001",
      deltaTriage: null,
    });
    const issues = await validateSpecPacks(root, defaultConfig);
    expect(codes(issues)).toContain("QFAI-TRIAGE-001");
  });

  it("emits QFAI-TRIAGE-006 when CREATE row references a CAP missing from 03_Capabilities", async () => {
    const root = await newTempRoot();
    await seedLayeredSpec(root, "0001", {
      status: "active",
      capability: "CAP-0001",
      capabilityCatalog: ["CAP-0001 baseline"],
      deltaTriage: [
        "## Triage",
        "",
        "| Source | Subject | Existing Spec | Operation | Sub-op | Approved By | Rationale |",
        "| --- | --- | --- | --- | --- | --- | --- |",
        "| REQ-0001 | brand new feature | (none) | CREATE | - | user@host | introduces CAP-0099 |",
        "",
      ].join("\n"),
    });
    const issues = await validateSpecPacks(root, defaultConfig);
    expect(codes(issues)).toContain("QFAI-TRIAGE-006");
  });

  it("returns no triage errors when CREATE row references a CAP registered in 03_Capabilities", async () => {
    const root = await newTempRoot();
    await seedLayeredSpec(root, "0001", {
      status: "active",
      capability: "CAP-0001",
      capabilityCatalog: ["CAP-0001 baseline", "CAP-0099 brand new feature"],
      deltaTriage: [
        "## Triage",
        "",
        "| Source | Subject | Existing Spec | Operation | Sub-op | Approved By | Rationale |",
        "| --- | --- | --- | --- | --- | --- | --- |",
        "| REQ-0001 | brand new feature | (none) | CREATE | - | user@host | introduces CAP-0099 |",
        "",
      ].join("\n"),
    });
    const issues = await validateSpecPacks(root, defaultConfig);
    expect(codes(issues)).toEqual([]);
  });

  it("emits QFAI-TRIAGE-005 when CREATE triage row lacks approval", async () => {
    const root = await newTempRoot();
    await seedLayeredSpec(root, "0001", {
      status: "active",
      capability: "CAP-0001",
      deltaTriage: [
        "## Triage",
        "",
        "| Source | Subject | Existing Spec | Operation | Sub-op | Approved By | Rationale |",
        "| --- | --- | --- | --- | --- | --- | --- |",
        "| REQ-0001 | new thing | (none) | CREATE | - | - | seed |",
        "",
      ].join("\n"),
    });
    const issues = await validateSpecPacks(root, defaultConfig);
    expect(codes(issues)).toContain("QFAI-TRIAGE-005");
  });
});
