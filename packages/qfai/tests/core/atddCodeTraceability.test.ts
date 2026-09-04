import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { evaluateAtddCodeTraceability } from "../../src/core/atddTraceability.js";
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

  it("attributes a finding to the spec directory as it is spelled on disk", async () => {
    await withProject(async (root) => {
      // `listSpecDirs` matches `spec-NNNN` case-insensitively and keeps the name
      // it read, so this pack is discovered under `SPEC-0001`. A finding that
      // rebuilt the path from the number alone would name `spec-0001`, which on
      // a case-sensitive filesystem does not exist — the CLI report and the
      // GitHub annotation would both point at nothing.
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"], { dirName: "SPEC-0001" });
      await seedApiContract(root, "CON-API-0001");
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");
      await seedTest(root, "api", "a.test.ts", "/* QFAI:CON-API-0001 */");

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      const missingUs = issues.find((entry) => entry.code === "QFAI-ATDD-111");
      expect(missingUs?.file).toBe(path.join(root, ".qfai", "specs", "SPEC-0001"));
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

describe("a TC that exists only in a fenced sample is not declared", () => {
  it("raises no QFAI-ATDD-112 for an id inside a code fence", async () => {
    // `collectTcLevels` masks fenced samples and HTML comments; the declared-id
    // collector read the raw text, so a sample id stayed in the declared set
    // with no `Level`, fell through to the integration default, and the gate
    // raised a hard error against a TC that does not exist. Both have to read
    // the same text or they can always disagree.
    await withProject(async (root) => {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await mkdir(specDir, { recursive: true });
      await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
      await writeFile(
        path.join(specDir, "02_User-stories.md"),
        ["# 02 User stories", "", "## US-0001: title", "- Parent: CAP-0001", ""].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(specDir, "06_Test-Cases.md"),
        [
          "# 06 Test cases",
          "",
          "## TC-0001: title",
          "- Parent: EX-0001",
          "",
          "## Format example",
          "",
          "```md",
          "## TC-0009: an id that only appears in this sample",
          "```",
          "",
        ].join("\n"),
        "utf-8",
      );
      await seedApiContract(root, "CON-API-0001");
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");
      await seedTest(root, "api", "a.test.ts", "/* QFAI:CON-API-0001 */");

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      expect(issues.filter((entry) => entry.code === "QFAI-ATDD-112")).toEqual([]);
    });
  });
});

describe("an id truncated out of a regex literal is not a reference", () => {
  // `QFAI:SPEC-(\d{4}):TC-(\d{4}(?:-\d{4})?)\b` made the second half optional,
  // so a test validating its own annotations matched as the four-digit-short
  // prefix of itself: the optional half cannot consume `-\d`, the short form
  // succeeds, and `\b` holds because `-` is not a word character. The scanner
  // reported a TC id four digits short — unregistered by construction, because
  // the truncation invented it (#1123).
  //
  // The fixtures build the prefix from a placeholder so this test file does not
  // carry a contiguous annotation of its own. That is the workaround the issue
  // calls unexplained cleverness; it is right here and nowhere else, because a
  // fixture for the scanner must not be visible to the scanner.
  const tc = (spec: string): string => `QFAI:SPEC-${spec}:${"TC"}-`;
  const us = (spec: string): string => `QFAI:SPEC-${spec}:${"US"}-`;

  it("raises no QFAI-ATDD-102 for a TC prefix followed by a digit class", async () => {
    // Only the LONG id is declared, which is what makes the row able to fail.
    // An earlier draft declared the short one, so the truncation the old regex
    // produced was a KNOWN reference and no finding was ever owed — the row
    // passed against the very defect it exists for.
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001-0002"], ["TC-0001-0002"]);
      await seedApiContract(root, "CON-API-0001");
      await seedTest(root, "e2e", "a.test.ts", `/* ${us("0001")}0001-0002 */`);
      await seedTest(
        root,
        "integration",
        "a.test.ts",
        [
          `/* ${tc("0001")}0001-0002 */`,
          `if (!/^${tc("0001")}0001-\\d{4}$/.test(entry.repro)) throw new Error("x");`,
        ].join("\n"),
      );
      await seedTest(root, "api", "a.test.ts", "/* QFAI:CON-API-0001 */");

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      expect(issues.filter((entry) => entry.code === "QFAI-ATDD-102")).toEqual([]);
      // And the declared TC is still covered — by the real annotation beside
      // it, not by the regex literal. A literal is not a reference.
      expect(issues.filter((entry) => entry.code === "QFAI-ATDD-112")).toEqual([]);
    });
  });

  it("raises no QFAI-ATDD-101 for a US prefix followed by a digit class", async () => {
    // Same shape one letter away. Fixing only the reported form would leave it.
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001-0002"], ["TC-0001-0002"]);
      await seedApiContract(root, "CON-API-0001");
      await seedTest(
        root,
        "e2e",
        "a.test.ts",
        [`/* ${us("0001")}0001-0002 */`, `const shape = /^${us("0001")}0001-\\d{4}$/;`].join("\n"),
      );
      await seedTest(root, "integration", "a.test.ts", `/* ${tc("0001")}0001-0002 */`);
      await seedTest(root, "api", "a.test.ts", "/* QFAI:CON-API-0001 */");

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      expect(issues.filter((entry) => entry.code === "QFAI-ATDD-101")).toEqual([]);
      expect(issues.filter((entry) => entry.code === "QFAI-ATDD-111")).toEqual([]);
    });
  });

  it("still reports an unknown SHORT-form TC id", async () => {
    // The other direction, and the one a too-tight fix breaks. `TC-0001` is a
    // legal id here — `TC_ID_RE`, `TC_REF_SHAPE` and `TC_ID_TOKEN` all accept
    // four digits — so requiring eight would stop matching every annotation
    // written the short way, and every unknown one would go unreported.
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedApiContract(root, "CON-API-0001");
      await seedTest(root, "e2e", "a.test.ts", `/* ${us("0001")}0001 */`);
      await seedTest(
        root,
        "integration",
        "a.test.ts",
        [`/* ${tc("0001")}0001 */`, `/* ${tc("0001")}9999 */`].join("\n"),
      );
      await seedTest(root, "api", "a.test.ts", "/* QFAI:CON-API-0001 */");

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      const unknown = issues.filter((entry) => entry.code === "QFAI-ATDD-102");
      expect(unknown).toHaveLength(1);
      expect(unknown[0]?.message).toContain("TC-9999");
    });
  });

  it("still reports an unknown LONG-form TC id", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001-0002"]);
      await seedApiContract(root, "CON-API-0001");
      await seedTest(root, "e2e", "a.test.ts", `/* ${us("0001")}0001 */`);
      await seedTest(
        root,
        "integration",
        "a.test.ts",
        [`/* ${tc("0001")}0001-0002 */`, `/* ${tc("0001")}0003-0004 */`].join("\n"),
      );
      await seedTest(root, "api", "a.test.ts", "/* QFAI:CON-API-0001 */");

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      const unknown = issues.filter((entry) => entry.code === "QFAI-ATDD-102");
      expect(unknown).toHaveLength(1);
      expect(unknown[0]?.message).toContain("TC-0003-0004");
    });
  });

  it("still reports a complete id that trails junk, rather than dropping it", async () => {
    // The deliberate asymmetry: `(?!-)` guards the SHORT alternative only. A
    // complete `TC-0003-0004` followed by `-foo` still matches and is still
    // reported. Guarding both would have turned a false report into a silent
    // miss, which is the worse trade in a validator.
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedApiContract(root, "CON-API-0001");
      await seedTest(root, "e2e", "a.test.ts", `/* ${us("0001")}0001 */`);
      await seedTest(
        root,
        "integration",
        "a.test.ts",
        [`/* ${tc("0001")}0001 */`, `/* ${tc("0001")}0003-0004-draft */`].join("\n"),
      );
      await seedTest(root, "api", "a.test.ts", "/* QFAI:CON-API-0001 */");

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      const unknown = issues.filter((entry) => entry.code === "QFAI-ATDD-102");
      expect(unknown).toHaveLength(1);
      expect(unknown[0]?.message).toContain("TC-0003-0004");
    });
  });
});

async function seedSpec(
  root: string,
  specNumber: string,
  usIds: string[],
  tcIds: string[],
  options: { dirName?: string } = {},
): Promise<void> {
  const specDir = path.join(root, ".qfai", "specs", options.dirName ?? `spec-${specNumber}`);
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

describe("QFAI-ATDD-113 deferral via x-qfai-status: planned", () => {
  it("excludes a planned contract from the API-test obligation", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedApiContract(root, "CON-API-0001");
      await seedApiContract(root, "CON-API-0002", {
        planned: true,
        fileName: "api-0002-planned.yaml",
      });
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");
      await seedTest(root, "api", "a.test.ts", "/* QFAI:CON-API-0001 */");

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      expect(issues.some((entry) => entry.code === "QFAI-ATDD-113")).toBe(false);

      const deferral = issues.find((entry) => entry.code === "QFAI-ATDD-114");
      expect(deferral?.severity).toBe("info");
      expect(deferral?.refs).toEqual(["CON-API-0002"]);
    });
  });

  it("still errors on an unplanned contract with no API test", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedApiContract(root, "CON-API-0001");
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      const error = issues.find((entry) => entry.code === "QFAI-ATDD-113");
      expect(error?.severity).toBe("error");
      expect(error?.refs).toContain("CON-API-0001");
    });
  });

  it("emits no deferral notice when nothing is planned", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedApiContract(root, "CON-API-0001");
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");
      await seedTest(root, "api", "a.test.ts", "/* QFAI:CON-API-0001 */");

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      expect(issues.some((entry) => entry.code === "QFAI-ATDD-114")).toBe(false);
    });
  });

  it("ignores the marker nested under an operation, so one path cannot defer the file", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      const apiDir = path.join(root, ".qfai", "contracts", "api");
      await mkdir(apiDir, { recursive: true });
      await writeFile(
        path.join(apiDir, "api-nested.yaml"),
        [
          "# QFAI-CONTRACT-ID: CON-API-0001",
          "openapi: 3.1.0",
          "paths:",
          "  /widgets:",
          "    get:",
          "      x-qfai-status: planned",
          "      responses: {}",
          "",
        ].join("\n"),
        "utf-8",
      );
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      // Only the document root defers; the obligation survives.
      const error = issues.find((entry) => entry.code === "QFAI-ATDD-113");
      expect(error?.severity).toBe("error");
      expect(error?.refs).toContain("CON-API-0001");
      expect(issues.some((entry) => entry.code === "QFAI-ATDD-114")).toBe(false);
    });
  });

  it("honours a quoted top-level key and a column-0 comment, but not an indented comment", async () => {
    const contract = (marker: string): string =>
      ["# QFAI-CONTRACT-ID: CON-API-0001", marker, "openapi: 3.1.0", "paths: {}", ""].join("\n");

    for (const marker of ['"x-qfai-status": "planned"', "# x-qfai-status: planned"]) {
      await withProject(async (root) => {
        await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
        const apiDir = path.join(root, ".qfai", "contracts", "api");
        await mkdir(apiDir, { recursive: true });
        await writeFile(path.join(apiDir, "api.yaml"), contract(marker), "utf-8");
        await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
        await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");

        const issues = await validateAtddCodeTraceability(root, defaultConfig);
        expect(issues.some((entry) => entry.code === "QFAI-ATDD-113")).toBe(false);
        expect(issues.find((entry) => entry.code === "QFAI-ATDD-114")?.refs).toEqual([
          "CON-API-0001",
        ]);
      });
    }

    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      const apiDir = path.join(root, ".qfai", "contracts", "api");
      await mkdir(apiDir, { recursive: true });
      await writeFile(
        path.join(apiDir, "api.yaml"),
        contract("  # x-qfai-status: planned"),
        "utf-8",
      );
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      expect(issues.find((entry) => entry.code === "QFAI-ATDD-113")?.refs).toContain(
        "CON-API-0001",
      );
    });
  });

  it("treats a deferred contract as declared, so an early API test is not an unknown ref", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedApiContract(root, "CON-API-0002", {
        planned: true,
        fileName: "api-0002-planned.yaml",
      });
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");
      // Deferral removes the test *obligation*; it must not un-declare the ID.
      await seedTest(root, "api", "a.test.ts", "/* QFAI:CON-API-0002 */");

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      expect(issues.filter((entry) => entry.severity === "error")).toEqual([]);
      expect(issues.some((entry) => entry.code === "QFAI-ATDD-103")).toBe(false);
    });
  });

  it("keeps the public apiContractIds as the declared set, active plus deferred", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedApiContract(root, "CON-API-0001");
      await seedApiContract(root, "CON-API-0002", {
        planned: true,
        fileName: "api-0002-planned.yaml",
      });

      const result = await evaluateAtddCodeTraceability(root, defaultConfig);
      // Deferral suspends the obligation, not the declaration: an external
      // consumer asking "is this ID declared?" must still see the planned one.
      expect([...result.apiContractIds].sort()).toEqual(["CON-API-0001", "CON-API-0002"]);
      expect([...result.activeApiContractIds]).toEqual(["CON-API-0001"]);
      expect([...result.deferredApiContractIds]).toEqual(["CON-API-0002"]);
    });
  });

  it("persists the deferred IDs in the traceability report", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedApiContract(root, "CON-API-0002", {
        planned: true,
        fileName: "api-0002-planned.yaml",
      });
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");

      await validateAtddCodeTraceability(root, defaultConfig);

      const reportDir = path.join(root, ".qfai", "report", "atdd-traceability");
      const summary: unknown = JSON.parse(
        await readFile(path.join(reportDir, "summary.json"), "utf-8"),
      );
      // `missing.conApi: []` alone cannot say whether everything is covered or
      // everything is deferred, so the audit artifact records both.
      expect(summary).toMatchObject({
        missing: { conApi: [] },
        deferred: { conApi: ["CON-API-0002"] },
      });

      const markdown = await readFile(path.join(reportDir, "summary.md"), "utf-8");
      expect(markdown).toContain("## Deferred Coverage");
      expect(markdown).toContain("CON-API-0002");
    });
  });
});

async function seedApiContract(
  root: string,
  contractId: string,
  opts: { planned?: boolean; fileName?: string } = {},
): Promise<void> {
  const apiDir = path.join(root, ".qfai", "contracts", "api");
  await mkdir(apiDir, { recursive: true });
  // Default the filename off the contract id. A shared constant meant two
  // seeds in one test silently wrote the same file, so the second contract
  // replaced the first instead of joining it.
  await writeFile(
    path.join(apiDir, opts.fileName ?? `${contractId.toLowerCase()}.yaml`),
    [
      `# QFAI-CONTRACT-ID: ${contractId}`,
      ...(opts.planned ? ["x-qfai-status: planned"] : []),
      "openapi: 3.1.0",
      "paths: {}",
      "",
    ].join("\n"),
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

describe("a mistyped TC column still declares its ids", () => {
  it("keeps QFAI-ATDD-112 owed when the authoritative table cannot be resolved", async () => {
    // Reading ids from the resolved tables closed the appendix hole but opened
    // this one: a mistyped header drops the whole table, so `TC-0001` left the
    // declared set and the ATDD gate stopped asking for it. The ledger side
    // does not cover the gap — with no `tdd/test-list.md` at all
    // `TDDLIST_MISSING` is a warning and the check returns early — so
    // `--profile full --fail-on error` passed with neither a test nor a row.
    await withProject(async (root) => {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await mkdir(specDir, { recursive: true });
      await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
      await writeFile(
        path.join(specDir, "02_User-stories.md"),
        ["# 02 User stories", "", "## US-0001: title", "- Parent: CAP-0001", ""].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(specDir, "06_Test-Cases.md"),
        [
          "# 06 Test cases",
          "",
          "## Test Case Table",
          "",
          "| TC Id | Level | AC-Refs | EX-Ref | Steps | Expected |",
          "| ----- | ----- | ------- | ------ | ----- | -------- |",
          "| TC-0001 | L3 | AC-0001 | - | s | e |",
          "",
        ].join("\n"),
        "utf-8",
      );
      await seedApiContract(root, "CON-API-0001");
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedTest(root, "api", "a.test.ts", "/* QFAI:CON-API-0001 */");
      // No integration annotation for TC-0001: the gate has to say so.

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      expect(issues.map((entry) => entry.code)).toContain("QFAI-ATDD-112");
    });
  });
});
