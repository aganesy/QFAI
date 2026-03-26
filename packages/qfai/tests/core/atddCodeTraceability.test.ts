import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateAtddCodeTraceability } from "../../src/core/validators/atddCodeTraceability.js";

describe("validateAtddCodeTraceability", () => {
  it("passes when US/TC/CON-API are fully referenced in required test layers", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedApiContract(root, "CON-API-0001");
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");
      await seedTest(root, "api", "a.test.ts", "/* QFAI:CON-API-0001 */");

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      expect(issues.filter((entry) => entry.severity === "error")).toEqual([]);

      const reportPath = path.join(root, ".qfai", "report", "atdd-traceability", "summary.json");
      await expect(readFile(reportPath, "utf-8")).resolves.toContain('"missing"');
    });
  });

  it("supports variable-length CON-API IDs declared in contracts", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedApiContract(root, "CON-API-12345");
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");
      await seedTest(root, "api", "a.test.ts", "/* QFAI:CON-API-12345 */");

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      expect(issues.filter((entry) => entry.severity === "error")).toEqual([]);
    });
  });

  it("accepts layered US/TC annotations", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001-0001"], ["TC-0001-0001"]);
      await seedApiContract(root, "CON-API-0001");
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001-0001 */");
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001-0001 */");
      await seedTest(root, "api", "a.test.ts", "/* QFAI:CON-API-0001 */");

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      expect(issues.filter((entry) => entry.severity === "error")).toEqual([]);
    });
  });

  it("emits QFAI-ATDD-111 when US references are missing in tests/e2e", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedApiContract(root, "CON-API-0001");
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");
      await seedTest(root, "api", "a.test.ts", "/* QFAI:CON-API-0001 */");

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      expect(issues.some((entry) => entry.code === "QFAI-ATDD-111")).toBe(true);
    });
  });

  it("emits QFAI-ATDD-112 when TC references are missing in tests/integration", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedApiContract(root, "CON-API-0001");
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedTest(root, "api", "a.test.ts", "/* QFAI:CON-API-0001 */");

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      expect(issues.some((entry) => entry.code === "QFAI-ATDD-112")).toBe(true);
    });
  });

  it("emits QFAI-ATDD-113 when CON-API references are missing in tests/api", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedApiContract(root, "CON-API-0001");
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      expect(issues.some((entry) => entry.code === "QFAI-ATDD-113")).toBe(true);
    });
  });

  it("emits unknown reference errors for undefined TC and CON-API", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedApiContract(root, "CON-API-0001");
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedTest(
        root,
        "integration",
        "a.test.ts",
        ["/* QFAI:SPEC-0001:TC-0001 */", "/* QFAI:SPEC-0001:TC-9999 */"].join("\n"),
      );
      await seedTest(
        root,
        "api",
        "a.test.ts",
        ["/* QFAI:CON-API-0001 */", "/* QFAI:CON-API-9999 */"].join("\n"),
      );

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      expect(issues.some((entry) => entry.code === "QFAI-ATDD-102")).toBe(true);
      expect(issues.some((entry) => entry.code === "QFAI-ATDD-103")).toBe(true);
    });
  });

  it("emits forbidden reference errors when TC is referenced from API/E2E tests", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedApiContract(root, "CON-API-0001");
      await seedTest(
        root,
        "e2e",
        "a.test.ts",
        ["/* QFAI:SPEC-0001:US-0001 */", "/* QFAI:SPEC-0001:TC-0001 */"].join("\n"),
      );
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");
      await seedTest(
        root,
        "api",
        "a.test.ts",
        ["/* QFAI:CON-API-0001 */", "/* QFAI:SPEC-0001:TC-0001 */"].join("\n"),
      );

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      expect(issues.some((entry) => entry.code === "QFAI-ATDD-121")).toBe(true);
      expect(issues.some((entry) => entry.code === "QFAI-ATDD-122")).toBe(true);
    });
  });
});

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-trace-"));
  try {
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function seedSpec(
  root: string,
  specNumber: string,
  usIds: string[],
  tcIds: string[],
): Promise<void> {
  const specDir = path.join(root, ".qfai", "specs", `spec-${specNumber}`);
  await mkdir(specDir, { recursive: true });

  const usLines = usIds.flatMap((id) => [`## ${id}: title`, "- Parent: CAP-0001", ""]);
  const tcLines = tcIds.flatMap((id) => [`## ${id}: title`, "- Parent: EX-0001", ""]);

  await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
  await writeFile(
    path.join(specDir, "02_User-stories.md"),
    ["# 02 User stories", "", ...usLines].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(specDir, "06_Test-Cases.md"),
    ["# 06 Test cases", "", ...tcLines].join("\n"),
    "utf-8",
  );
}

async function seedApiContract(root: string, contractId: string): Promise<void> {
  const apiDir = path.join(root, ".qfai", "contracts", "api");
  await mkdir(apiDir, { recursive: true });
  await writeFile(
    path.join(apiDir, "api-0001-sample.yaml"),
    [`# QFAI-CONTRACT-ID: ${contractId}`, "openapi: 3.1.0", "paths: {}", ""].join("\n"),
    "utf-8",
  );
}

async function seedTest(
  root: string,
  kind: "e2e" | "api" | "integration",
  fileName: string,
  body: string,
): Promise<void> {
  const dir = path.join(root, "tests", kind);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, fileName),
    [body, "describe('sample', () => {", "  it('works', () => {});", "});", ""].join("\n"),
    "utf-8",
  );
}
