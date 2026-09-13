import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import type { QfaiConfig } from "../../src/core/config.js";
import { evaluateAtddCodeTraceability } from "../../src/core/atddTraceability.js";
import { validateAtddCodeTraceability } from "../../src/core/validators/atddCodeTraceability.js";

/**
 * A glob `fast-glob` rejects, spelled so this file stays text.
 *
 * The value needs a NUL byte, and a raw one in tracked source is its own
 * defect: `sourceEncodingHygiene.test.ts` scans every tracked text file for byte
 * zero, and text tooling reads such a file as binary.
 */
const INVALID_GLOB = `a${String.fromCharCode(0)}b`;

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
      const summary = await readFile(reportPath, "utf-8");
      expect(summary).toContain('"missing"');
      // The scan total reaches the report, and it counts only what an
      // acceptance layer owns — so a reader can take it for "acceptance tests
      // scanned" without discounting anything.
      expect(JSON.parse(summary).scan).toMatchObject({ matchedFileCount: 3 });
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

  it("separates the missing identifiers from the package-suite hint", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedApiContract(root, "CON-API-0001");
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedTest(root, "api", "a.test.ts", "/* QFAI:CON-API-0001 */");

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      const fix = issues.find((entry) => entry.code === "QFAI-ATDD-112")?.suggested_action ?? "";
      // Appended straight after the last identifier the two ran together as
      // `TC-0001A package with…`, which reads as one token.
      expect(fix).not.toMatch(/TC-\d{4}(?:-\d{4})?A package/);
      expect(fix).toMatch(/TC-\d{4}(?:-\d{4})?\. A package with a suite of its own/);
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

describe("an id a file holds as DATA is not a reference", () => {
  // A TRUNCATED id must not be matched out of a regex literal. The scanner's
  // stated structural problem — "a string in a regex, a string
  // literal, a comment, and a real annotation are the same text" — means a
  // COMPLETE id would still fire from any of them, unless `maskJsNonCode`
  // blanks all of those spans EXCEPT comments.
  //
  // The prefix is built from a placeholder for the same reason as the suite
  // above: a fixture for the scanner must not be visible to the scanner.
  const tc = (spec: string): string => `QFAI:SPEC-${spec}:${"TC"}-`;
  const us = (spec: string): string => `QFAI:SPEC-${spec}:${"US"}-`;

  for (const [label, line] of [
    ["a string literal", `const id = "${"@TC@"}0003-0004";`],
    ["a template literal", "const id = `" + "@TC@" + "0003-0004`;"],
    ["a regex literal", `const shape = /^${"@TC@"}0003-0004$/;`],
  ] as const) {
    it(`raises no QFAI-ATDD-102 for a complete id inside ${label}`, async () => {
      await withProject(async (root) => {
        await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
        await seedApiContract(root, "CON-API-0001");
        await seedTest(root, "e2e", "a.test.ts", `/* ${us("0001")}0001 */`);
        await seedTest(
          root,
          "integration",
          "a.test.ts",
          [`/* ${tc("0001")}0001 */`, line.replace("@TC@", tc("0001"))].join("\n"),
        );
        await seedTest(root, "api", "a.test.ts", "/* QFAI:CON-API-0001 */");

        const issues = await validateAtddCodeTraceability(root, defaultConfig);
        expect(issues.filter((entry) => entry.code === "QFAI-ATDD-102")).toEqual([]);
      });
    });
  }

  it("still reads a real annotation, which is written in a COMMENT", async () => {
    // The direction a wrong fix breaks, and it breaks QUIETLY: blanking
    // comments would stop finding every real annotation, so coverage findings
    // would VANISH rather than appear. `TC-0001` is covered only by the
    // comment, so `QFAI-ATDD-112` fires the moment the comment stops counting.
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedApiContract(root, "CON-API-0001");
      await seedTest(root, "e2e", "a.test.ts", `// ${us("0001")}0001`);
      await seedTest(root, "integration", "a.test.ts", `// ${tc("0001")}0001`);
      await seedTest(root, "api", "a.test.ts", "// QFAI:CON-API-0001");

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      expect(issues.filter((entry) => entry.code === "QFAI-ATDD-112")).toEqual([]);
      expect(issues.filter((entry) => entry.code === "QFAI-ATDD-111")).toEqual([]);
    });
  });

  it("still reports an unknown id that a comment really does reference", async () => {
    // Masking must not turn the scanner off. An id named in a comment is a
    // reference, and an unregistered one is still an error.
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedApiContract(root, "CON-API-0001");
      await seedTest(root, "e2e", "a.test.ts", `/* ${us("0001")}0001 */`);
      await seedTest(
        root,
        "integration",
        "a.test.ts",
        [`/* ${tc("0001")}0001 */`, `/* ${tc("0001")}0003-0004 */`].join("\n"),
      );
      await seedTest(root, "api", "a.test.ts", "/* QFAI:CON-API-0001 */");

      const unknown = (await validateAtddCodeTraceability(root, defaultConfig)).filter(
        (entry) => entry.code === "QFAI-ATDD-102",
      );
      expect(unknown).toHaveLength(1);
      expect(unknown[0]?.message).toContain("TC-0003-0004");
    });
  });

  it("leaves a Markdown annotation carrier alone, apostrophes and all", async () => {
    // `.md` and `.feature` are in `DEFAULT_TEST_FILE_GLOB` as annotation
    // carriers, so this needs no configuration to reach. A JS lexer over
    // Markdown reads the apostrophe in "row's" as a string opening that runs to
    // end of line — the annotation after it would be BLANKED and its coverage
    // would vanish SILENTLY, which is the direction the extension gate exists
    // to prevent. The first draft of this row used `.py`, which is scanned only
    // when a project configures `testFileGlobs`, so the fixture was never
    // collected and the row failed for the wrong reason.
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedApiContract(root, "CON-API-0001");
      await seedTest(root, "e2e", "a.test.ts", `/* ${us("0001")}0001 */`);
      await seedTest(
        root,
        "integration",
        "ledger.md",
        `- the row's deferral is recorded here: ${tc("0001")}0001`,
      );
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
  // the truncation invented it.
  //
  // The fixtures build the prefix from a placeholder so this test file does not
  // carry a contiguous annotation of its own. This is deliberately placed here
  // and nowhere else, because a fixture for the scanner must not be visible to
  // the scanner.
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
      // The fix names a layer directory, so it carries the package-suite hint
      // every such remediation does.
      expect(deferral?.suggested_action).toContain("A package with a suite of its own");
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

/**
 * Writes a test file verbatim, without the fixed `describe`/`it` pair
 * {@link seedTest} appends. The suite's call form is the subject here, so it
 * has to be the one under test rather than one the helper supplies.
 */
async function seedRawTest(
  root: string,
  kind: "e2e" | "api" | "integration",
  fileName: string,
  lines: string[],
): Promise<void> {
  const dir = path.join(root, "tests", kind);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), [...lines, ""].join("\n"), "utf-8");
}

/** The reported idiom: a runner entry point chosen at runtime, then called. */
function computedSuite(annotation: string, binding = "deployed"): string[] {
  return [
    annotation,
    `const ${binding} = process.env.LIVE_TARGET ? describe : describe.skip;`,
    "",
    `${binding}("probe", () => {`,
    '  it("reaches the target", () => {});',
    "});",
  ];
}

describe("QFAI-ATDD-124: coverage that rests on a suite bound at runtime", () => {
  it("names the carrier whose suite is chosen by a ternary", async () => {
    // The gap this reports: `QFAI-ATDD-112` is satisfied by the annotation
    // string alone, so the obligation clears whether the runner collects the
    // suite or skips it. Deleting the production code behind such a TC leaves
    // every gate green, which is the one thing the coverage gate exists to
    // prevent.
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedApiContract(root, "CON-API-0001");
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedTest(root, "api", "a.test.ts", "/* QFAI:CON-API-0001 */");
      await seedRawTest(
        root,
        "integration",
        "probe.test.ts",
        computedSuite("/* QFAI:SPEC-0001:TC-0001 */"),
      );

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      const finding = issues.find((entry) => entry.code === "QFAI-ATDD-124");

      expect(finding).toBeDefined();
      expect(finding?.severity).toBe("info");
      expect(finding?.file).toBe("tests/integration/probe.test.ts");
      expect(finding?.message).toContain("tests/integration/probe.test.ts");
      // Reported, not accused: the annotation still satisfies the obligation,
      // and nothing about the run is made to fail.
      expect(issues.filter((entry) => entry.severity === "error")).toEqual([]);
      expect(issues.some((entry) => entry.code === "QFAI-ATDD-112")).toBe(false);
    });
  });

  it("stays quiet on an ordinary suite", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedApiContract(root, "CON-API-0001");
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");
      await seedTest(root, "api", "a.test.ts", "/* QFAI:CON-API-0001 */");

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      expect(issues.some((entry) => entry.code === "QFAI-ATDD-124")).toBe(false);
    });
  });

  it("stays quiet on a literal describe.skip", async () => {
    // A written-out modifier is a token any scan can already read, so it is a
    // different problem with a different answer. Reporting it here would make
    // the finding mean "this file might not run", which is true of far too
    // much to be worth saying.
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedApiContract(root, "CON-API-0001");
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedTest(root, "api", "a.test.ts", "/* QFAI:CON-API-0001 */");
      await seedRawTest(root, "integration", "held.test.ts", [
        "/* QFAI:SPEC-0001:TC-0001 */",
        'describe.skip("held back", () => {',
        '  it("will run later", () => {});',
        "});",
      ]);

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      expect(issues.some((entry) => entry.code === "QFAI-ATDD-124")).toBe(false);
    });
  });

  it("stays quiet when the computed name is never called as a suite", async () => {
    // Both halves are required. An initializer alone may be a value passed to
    // something else entirely, and calling it is what makes the file's suite
    // the undecidable one.
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedApiContract(root, "CON-API-0001");
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedTest(root, "api", "a.test.ts", "/* QFAI:CON-API-0001 */");
      await seedRawTest(root, "integration", "unused.test.ts", [
        "/* QFAI:SPEC-0001:TC-0001 */",
        "const maybe = process.env.LIVE_TARGET ? describe : describe.skip;",
        "void maybe;",
        "",
        'describe("plain", () => {',
        '  it("runs", () => {});',
        "});",
      ]);

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      expect(issues.some((entry) => entry.code === "QFAI-ATDD-124")).toBe(false);
    });
  });

  it("finds a called binding that follows an uncalled one", async () => {
    // Reading only the first binding in the file made the report depend on
    // declaration order, so a file that computes a spare name before the one it
    // uses read as ordinary.
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedApiContract(root, "CON-API-0001");
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedTest(root, "api", "a.test.ts", "/* QFAI:CON-API-0001 */");
      await seedRawTest(root, "integration", "second.test.ts", [
        "/* QFAI:SPEC-0001:TC-0001 */",
        "const spare = process.env.OTHER ? describe : describe.skip;",
        "void spare;",
        ...computedSuite("", "used").slice(1),
      ]);

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      expect(issues.some((entry) => entry.code === "QFAI-ATDD-124")).toBe(true);
    });
  });

  it("reports the carriers as sorted repository-relative paths", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedApiContract(root, "CON-API-0001");
      await seedRawTest(root, "e2e", "b.test.ts", computedSuite("/* QFAI:SPEC-0001:US-0001 */"));
      await seedRawTest(root, "api", "a.test.ts", computedSuite("/* QFAI:CON-API-0001 */"));
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");

      const result = await evaluateAtddCodeTraceability(root, defaultConfig);
      expect(result.computedSuiteCarriers).toEqual(["tests/api/a.test.ts", "tests/e2e/b.test.ts"]);
    });
  });

  it("truncates the list at ten and counts the rest", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedApiContract(root, "CON-API-0001");
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedTest(root, "api", "a.test.ts", "/* QFAI:CON-API-0001 */");
      for (let index = 0; index < 12; index += 1) {
        await seedRawTest(
          root,
          "integration",
          `probe-${String(index).padStart(2, "0")}.test.ts`,
          // Every file is annotated: an unannotated one is never classified at
          // all, because the classification tokenizes the whole body and
          // nothing downstream would read the answer.
          computedSuite("/* QFAI:SPEC-0001:TC-0001 */"),
        );
      }

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      const finding = issues.find((entry) => entry.code === "QFAI-ATDD-124");

      expect(finding?.message).toContain("12 file(s)");
      expect(finding?.message).toContain("(and 2 more)");
      expect(finding?.message).toContain("tests/integration/probe-09.test.ts");
      expect(finding?.message).not.toContain("tests/integration/probe-10.test.ts");
      // The truncation is a message length limit, not a loss of the data: the
      // structured payload still carries every carrier.
      expect(finding?.relatedFiles).toHaveLength(11);
    });
  });
});

describe("acceptance tests outside paths.testsDir", () => {
  // `paths.testsDir` holds one path, so a repository with a suite per package
  // could name at most one of them. Every other package's acceptance tests sat
  // outside the three globs built from it, their annotations counted towards
  // nothing, and the coverage rules were satisfied by whatever remained under
  // the configured root — in this repository, two prose carriers.
  const withProjectGlobs = (globs: string[], excludeGlobs: string[] = []): QfaiConfig => ({
    ...defaultConfig,
    validation: {
      ...defaultConfig.validation,
      traceability: {
        ...defaultConfig.validation.traceability,
        testFileGlobs: globs,
        testFileExcludeGlobs: excludeGlobs,
      },
    },
  });

  it.each([
    ["testFileExcludeGlobs", ["tests/**/*.test.ts"], ["tests/e2e/legacy/**"]],
    ["a negative testFileGlobs entry", ["tests/**/*.test.ts", "!tests/e2e/legacy/**"], []],
  ])(
    "a test the configuration excludes through %s discharges nothing",
    async (_, globs, excludes) => {
      await withProject(async (root) => {
        await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
        await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");
        // The project withdrew this directory from its test selection. Read anyway,
        // its annotation satisfied the story while every other scan skipped it.
        const dir = path.join(root, "tests", "e2e", "legacy");
        await mkdir(dir, { recursive: true });
        await writeFile(
          path.join(dir, "journey.test.ts"),
          [
            "/* QFAI:SPEC-0001:US-0001 */",
            "describe('journey', () => {",
            "  it('runs', () => {});",
            "});",
            "",
          ].join("\n"),
          "utf-8",
        );

        const result = await evaluateAtddCodeTraceability(root, withProjectGlobs(globs, excludes));

        expect(result.missing.us).toEqual(["SPEC-0001:US-0001"]);
      });
    },
  );

  it("a suite outside testsDir answers from its own layer directory", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedPackageTest(root, "checkout", "integration", "pay.test.ts", [
        "/* QFAI:SPEC-0001:TC-0001 */",
      ]);
      await seedPackageTest(root, "checkout", "e2e", "journey.test.ts", [
        "/* QFAI:SPEC-0001:US-0001 */",
      ]);

      const result = await evaluateAtddCodeTraceability(
        root,
        withProjectGlobs(["packages/*/tests/**/*.test.ts"]),
      );

      expect(result.missing.us).toEqual([]);
      expect(result.missing.tc).toEqual([]);
      expect(result.scan.matchedFileCount).toBe(2);
    });
  });

  it("a data file an extension-broad glob sweeps into a layer discharges nothing", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedPackageTest(root, "checkout", "e2e", "journey.test.ts", [
        "/* QFAI:SPEC-0001:US-0001 */",
      ]);
      // A fixture value that happens to spell an annotation. The glob collects
      // it, but it is data, not a test source.
      const dir = path.join(root, "packages", "checkout", "tests", "integration");
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(dir, "data.json"),
        '{ "note": "QFAI:SPEC-0001:TC-0001" }\n',
        "utf-8",
      );

      const result = await evaluateAtddCodeTraceability(
        root,
        withProjectGlobs(["packages/*/tests/**/*"]),
      );

      expect(result.missing.tc).toEqual(["SPEC-0001:TC-0001"]);
      expect(result.missing.us).toEqual([]);
    });
  });

  it("a source whose extension a project glob names outright still counts", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedPackageTest(root, "checkout", "e2e", "journey.test.ts", [
        "/* QFAI:SPEC-0001:US-0001 */",
      ]);
      await seedPackageTest(root, "checkout", "integration", "pay.sol", [
        "// QFAI:SPEC-0001:TC-0001",
      ]);

      const result = await evaluateAtddCodeTraceability(
        root,
        withProjectGlobs(["packages/*/tests/**/*.test.ts", "packages/*/tests/**/*.@(sol|zig)"]),
      );

      expect(result.missing.tc).toEqual([]);
    });
  });

  it("a source a test-name glob selects counts whatever its extension", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedPackageTest(root, "checkout", "e2e", "journey.test.ts", [
        "/* QFAI:SPEC-0001:US-0001 */",
      ]);
      await seedPackageTest(root, "checkout", "integration", "pay.test.zig", [
        "// QFAI:SPEC-0001:TC-0001",
      ]);

      const result = await evaluateAtddCodeTraceability(
        root,
        withProjectGlobs(["packages/*/tests/**/*.test.*"]),
      );

      expect(result.missing.tc).toEqual([]);
    });
  });

  it("names the package-local file a misplaced test-case reference sits in", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");
      await seedPackageTest(root, "checkout", "e2e", "journey.test.ts", [
        "/* QFAI:SPEC-0001:US-0001 */",
      ]);
      await seedPackageTest(root, "checkout", "api", "client.test.ts", [
        "/* QFAI:SPEC-0001:TC-0001 */",
      ]);

      const issues = await validateAtddCodeTraceability(
        root,
        withProjectGlobs(["packages/*/tests/**/*.test.ts"]),
      );
      const misplaced = issues.find((entry) => entry.code === "QFAI-ATDD-121");

      // The fix edits the file that carries the reference, not the configured
      // central directory.
      expect(misplaced?.suggested_action).toContain("packages/checkout/tests/api/client.test.ts");
    });
  });

  it("the layer is the segment inside the test root, not an ancestor", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      // A package may be called `api`. Scanning ancestors put every test under
      // it in the API layer — including this unit suite, which owes ATDD
      // nothing and would have had its stub block the gate.
      await seedPackageTest(root, "api", "unit", "pure.test.ts", ["/* no annotation */"]);
      await seedPackageTest(root, "api", "integration", "pay.test.ts", [
        "/* QFAI:SPEC-0001:TC-0001 */",
      ]);
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");

      const result = await evaluateAtddCodeTraceability(
        root,
        withProjectGlobs(["packages/*/tests/**/*.test.ts"]),
      );

      expect(result.missing.tc).toEqual([]);
      expect(result.forbidden.tcInApi).toEqual([]);
      // Two acceptance files: the package's integration suite and the e2e
      // carrier. The unit suite is dropped before it is counted.
      expect(result.scan.matchedFileCount).toBe(2);
    });
  });

  it("a collected file in no layer directory is neither counted nor reported as misplaced", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");
      // A unit suite owes ATDD nothing wherever it sits. Reporting it as a file
      // to move into `integration/` would be the all-integration collapse
      // `catalog/test-layers.md` lists as an anti-pattern.
      await seedPackageTest(root, "checkout", "unit", "pure.test.ts", ["/* no annotation */"]);

      const result = await evaluateAtddCodeTraceability(
        root,
        withProjectGlobs(["packages/*/tests/**/*.test.ts"]),
      );

      expect(result.scan.matchedFileCount).toBe(2);
      expect(result.skippedTestFiles).toEqual([]);
    });
  });

  it("a glob the project excludes is not read", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedPackageTest(root, "legacy", "integration", "old.test.ts", [
        "/* QFAI:SPEC-0001:TC-0001 */",
      ]);

      const result = await evaluateAtddCodeTraceability(
        root,
        withProjectGlobs(["packages/*/tests/**/*.test.ts"], ["packages/legacy/**"]),
      );

      // The annotation is real and the file is real; the project withdrew the
      // path, so no lane may read it — least of all one that would then report
      // the obligation as covered.
      expect(result.missing.tc).toEqual(["SPEC-0001:TC-0001"]);
    });
  });

  it("an excluded glob written with surrounding whitespace is still honoured", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedPackageTest(root, "legacy", "integration", "old.test.ts", [
        "/* QFAI:SPEC-0001:TC-0001 */",
      ]);

      // The config loader keeps the padding, and every other scan of this list
      // trims it. A raw pattern here excluded nothing, so the withdrawn suite
      // was read and its annotation reported the obligation as covered.
      const result = await evaluateAtddCodeTraceability(
        root,
        withProjectGlobs(["packages/*/tests/**/*.test.ts"], ["  packages/legacy/**  "]),
      );

      expect(result.missing.tc).toEqual(["SPEC-0001:TC-0001"]);
    });
  });

  it("a package named for a layer does not decide its tests' layer", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      // A package may legitimately be called `api`. Reading the path outwards
      // classified everything under it as an API test, so an L3 annotation was
      // reported uncovered and forbidden at once. The directory holding the
      // test is the one that names its layer.
      await seedPackageTest(root, "api", "integration", "pay.test.ts", [
        "/* QFAI:SPEC-0001:TC-0001 */",
      ]);
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");

      const result = await evaluateAtddCodeTraceability(
        root,
        withProjectGlobs(["packages/*/tests/**/*.test.ts"]),
      );

      expect(result.missing.tc).toEqual([]);
      expect(result.forbidden.tcInApi).toEqual([]);
    });
  });

  it.each([
    ["testFileExcludeGlobs", ["packages/*/tests/**/*.test.ts"], ["tests/atdd/**"]],
    ["a negative testFileGlobs entry", ["packages/*/tests/**/*.test.ts", "!tests/atdd/**"], []],
  ])(
    "a scaffold excluded through %s is not reported as a file to move",
    async (_, globs, excludes) => {
      await withProject(async (root) => {
        await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
        await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
        await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");
        const scaffoldDir = path.join(root, "tests", "atdd");
        await mkdir(scaffoldDir, { recursive: true });
        await writeFile(
          path.join(scaffoldDir, "old.test.ts"),
          "/* QFAI:SPEC-0001:TC-0001 */\ndescribe('x', () => { it('y', () => {}); });\n",
          "utf-8",
        );

        const result = await evaluateAtddCodeTraceability(root, withProjectGlobs(globs, excludes));

        // The project withdrew the path. Asking an operator to move a file they
        // took out of scope is advice about a file no lane reads.
        expect(result.skippedTestFiles).toEqual([]);
      });
    },
  );

  it("still reports a scaffold the configuration leaves in scope", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");
      const scaffoldDir = path.join(root, "tests", "atdd");
      await mkdir(scaffoldDir, { recursive: true });
      await writeFile(
        path.join(scaffoldDir, "old.test.ts"),
        "/* QFAI:SPEC-0001:TC-0001 */\ndescribe('x', () => { it('y', () => {}); });\n",
        "utf-8",
      );

      const result = await evaluateAtddCodeTraceability(
        root,
        withProjectGlobs(["packages/*/tests/**/*.test.ts", "!tests/other/**"]),
      );

      expect(result.skippedTestFiles).toEqual(["tests/atdd/old.test.ts"]);
    });
  });

  it("a colocated unit test is not read as its source directory's layer", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");
      // The glob `qfai init` derives reaches colocated sources, and `src/api/`
      // is a source directory rather than an acceptance layer. Answering from
      // the file's own parent would let a unit test discharge an API
      // obligation, so a path carrying no test root answers nothing.
      const dir = path.join(root, "packages", "app", "src", "api");
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(dir, "client.spec.ts"),
        [
          "/* QFAI:SPEC-0001:US-0001 */",
          "describe('client', () => {",
          "  it('runs', () => {});",
          "});",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await evaluateAtddCodeTraceability(
        root,
        withProjectGlobs(["packages/*/src/**/*.spec.ts"]),
      );

      expect(result.missing.us).toEqual(["SPEC-0001:US-0001"]);
      // Not misplaced either: a unit test owes ATDD nothing wherever it sits.
      expect(result.skippedTestFiles).toEqual([]);
    });
  });

  it("a suite outside the named roots is read once its root is named", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");
      // `spec/acceptance/e2e/` anchors on nothing, so the suite is reported as
      // uncovered. The escape is the project's own: name the root `tests`,
      // `test` or `__tests__`, or point `paths.testsDir` at it.
      const write = async (...segments: string[]): Promise<void> => {
        const dir = path.join(root, ...segments);
        await mkdir(dir, { recursive: true });
        await writeFile(
          path.join(dir, "journey.test.ts"),
          [
            "/* QFAI:SPEC-0001:US-0001 */",
            "describe('suite', () => {",
            "  it('runs', () => {});",
            "});",
            "",
          ].join("\n"),
          "utf-8",
        );
      };

      await write("packages", "app", "spec", "acceptance", "e2e");
      expect(
        (
          await evaluateAtddCodeTraceability(
            root,
            withProjectGlobs(["packages/*/spec/**/*.test.ts"]),
          )
        ).missing.us,
      ).toEqual(["SPEC-0001:US-0001"]);

      await write("packages", "app", "tests", "e2e");
      expect(
        (
          await evaluateAtddCodeTraceability(
            root,
            withProjectGlobs(["packages/*/spec/**/*.test.ts", "packages/*/tests/**/*.test.ts"]),
          )
        ).missing.us,
      ).toEqual([]);
    });
  });

  it("a package named like a test root does not become one", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");
      // `packages/tests/` is a workspace package whose name happens to match a
      // test root, and `api/` under it is a source directory. Reading the
      // segment after it would put every test of that package in the API
      // layer, which is the ancestor-scanning defect one directory further out.
      const dir = path.join(root, "packages", "tests", "api");
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(root, "packages", "tests", "package.json"),
        JSON.stringify({ name: "tests", version: "0.0.0" }),
        "utf-8",
      );
      await writeFile(
        path.join(dir, "client.spec.ts"),
        [
          "/* QFAI:SPEC-0001:US-0001 */",
          "describe('client', () => {",
          "  it('runs', () => {});",
          "});",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await evaluateAtddCodeTraceability(
        root,
        withProjectGlobs(["packages/*/**/*.spec.ts"]),
      );

      expect(result.missing.us).toEqual(["SPEC-0001:US-0001"]);
    });
  });

  it("recognizes a package manifest from any ecosystem it reads tests in", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");
      // A Python workspace package called `tests`. Reading only Node's manifest
      // would make `api/` its acceptance layer, which is the same defect the
      // discriminator exists to stop.
      const dir = path.join(root, "packages", "tests", "api");
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(root, "packages", "tests", "pyproject.toml"),
        ["[project]", 'name = "tests"', ""].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(dir, "client.spec.ts"),
        [
          "/* QFAI:SPEC-0001:US-0001 */",
          "describe('client', () => {",
          "  it('runs', () => {});",
          "});",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await evaluateAtddCodeTraceability(
        root,
        withProjectGlobs(["packages/*/**/*.spec.ts"]),
      );

      expect(result.missing.us).toEqual(["SPEC-0001:US-0001"]);
    });
  });

  it("reads a deno.jsonc package name through its comments", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");
      // Comments and a trailing comma are legal JSONC. The top-level name makes
      // `packages/tests/` a package, so its `api/` is a source directory.
      const dir = path.join(root, "packages", "tests", "api");
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(root, "packages", "tests", "deno.jsonc"),
        [
          "{",
          "  /* the workspace member */",
          '  "name": "tests",',
          '  "version": "0.0.0",',
          "}",
          "",
        ].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(dir, "client.spec.ts"),
        [
          "/* QFAI:SPEC-0001:US-0001 */",
          "describe('client', () => {",
          "  it('runs', () => {});",
          "});",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await evaluateAtddCodeTraceability(
        root,
        withProjectGlobs(["packages/*/**/*.spec.ts"]),
      );

      expect(result.missing.us).toEqual(["SPEC-0001:US-0001"]);
    });
  });

  it("and a suite directory inside that package still is one", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");
      // The discriminator is the manifest, not the name: `packages/tests/` is a
      // package and `packages/tests/tests/` is its suite, so the deeper one
      // anchors and the layer beneath it answers.
      const dir = path.join(root, "packages", "tests", "tests", "e2e");
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(root, "packages", "tests", "package.json"),
        JSON.stringify({ name: "tests", version: "0.0.0" }),
        "utf-8",
      );
      await writeFile(
        path.join(dir, "journey.test.ts"),
        [
          "/* QFAI:SPEC-0001:US-0001 */",
          "describe('journey', () => {",
          "  it('runs', () => {});",
          "});",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await evaluateAtddCodeTraceability(
        root,
        withProjectGlobs(["packages/*/**/*.test.ts"]),
      );

      expect(result.missing.us).toEqual([]);
    });
  });

  it.each([
    ["setup.cfg", ["[tool:pytest]", "addopts = -q", ""].join("\n")],
    ["pyproject.toml", ["[tool.pytest.ini_options]", 'addopts = "-q"', ""].join("\n")],
    ["package.json", JSON.stringify({ type: "module" })],
    // A name inside a comment or a nested object names no package.
    [
      "deno.jsonc",
      ["{", '  // "name": "tests",', '  "tasks": { "name": "check" },', "}", ""].join("\n"),
    ],
  ])("a suite keeping %s for its runner is still a test root", async (manifest, content) => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      // The file configures the suite and names no package. Read by name, it
      // made `tests/` itself a package and dropped the acceptance file below it.
      const dir = path.join(root, "packages", "app", "tests", "integration");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(root, "packages", "app", "tests", manifest), content, "utf-8");
      await writeFile(
        path.join(dir, "pay.test.ts"),
        [
          "/* QFAI:SPEC-0001:TC-0001 */",
          "describe('pay', () => {",
          "  it('runs', () => {});",
          "});",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await evaluateAtddCodeTraceability(
        root,
        withProjectGlobs(["packages/*/tests/**/*.test.ts"]),
      );

      expect(result.missing.tc).toEqual([]);
    });
  });

  it("keeps the layer when a suite nests a second conventional root", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");
      // The documented `<package>/tests/<layer>/**` layout with one more
      // directory inside it. Taking the deepest root unconditionally put the
      // boundary past the layer, where nothing follows.
      const dir = path.join(root, "packages", "app", "tests", "e2e", "__tests__");
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(dir, "journey.test.ts"),
        [
          "/* QFAI:SPEC-0001:US-0001 */",
          "describe('journey', () => {",
          "  it('runs', () => {});",
          "});",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await evaluateAtddCodeTraceability(
        root,
        withProjectGlobs(["packages/*/tests/**/*.test.ts"]),
      );

      expect(result.missing.us).toEqual([]);
    });
  });

  it("answers nothing when a nested root declares a layer this stage does not own", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");
      // A unit suite nested under a fixture tree. Leaving the outer `e2e` root
      // standing would let its annotation discharge the story and its stubs
      // block a gate that owns no unit test.
      const dir = path.join(root, "packages", "app", "tests", "e2e", "fixtures", "tests", "unit");
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(dir, "pay.test.ts"),
        [
          "/* QFAI:SPEC-0001:US-0001 */",
          "describe('pay', () => {",
          "  it('runs', () => {});",
          "});",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await evaluateAtddCodeTraceability(
        root,
        withProjectGlobs(["packages/*/tests/**/*.test.ts"]),
      );

      expect(result.missing.us).toEqual(["SPEC-0001:US-0001"]);
      // A unit suite owes ATDD nothing wherever it sits.
      expect(result.skippedTestFiles).toEqual([]);
    });
  });

  it("drops a file under a package nested inside an acceptance fixture", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001", "TC-0002"]);
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");
      // A package embedded under the outer suite's fixtures. Its `api`
      // directory belongs to that package, not to the outer layout. With the
      // outer `tests` still standing over it the file read as `Integration`,
      // and the annotation below discharged an obligation the inner package
      // does not own.
      const fixtureRoot = path.join(root, "packages", "app", "tests", "integration", "fixtures");
      const dir = path.join(fixtureRoot, "tests", "api");
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(fixtureRoot, "tests", "package.json"),
        JSON.stringify({ name: "inner-fixture" }),
        "utf-8",
      );
      await writeFile(
        path.join(dir, "client.test.ts"),
        [
          "/* QFAI:SPEC-0001:TC-0002 */",
          "describe('client', () => {",
          "  it('runs', () => {});",
          "});",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await evaluateAtddCodeTraceability(
        root,
        withProjectGlobs(["packages/*/tests/**/*.test.ts"]),
      );

      // The outer suite covers the first obligation; the nested fixture
      // covers nothing, so the second is still missing.
      expect(result.missing.tc).toEqual(["SPEC-0001:TC-0002"]);
    });
  });

  it("finds a deeper root past one an earlier fixture path invalidated", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");
      // `examples/test/projects/` is a fixture path whose `test` is followed by
      // no layer; the suite is the `tests/e2e` below it. Stopping at
      // the first invalidation dropped the acceptance test entirely.
      const dir = path.join(
        root,
        "packages",
        "app",
        "examples",
        "test",
        "projects",
        "demo",
        "tests",
        "e2e",
      );
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(dir, "pay.test.ts"),
        [
          "/* QFAI:SPEC-0001:US-0001 */",
          "describe('pay', () => {",
          "  it('runs', () => {});",
          "});",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await evaluateAtddCodeTraceability(
        root,
        withProjectGlobs(["packages/*/examples/**/*.test.ts"]),
      );

      expect(result.missing.us).toEqual([]);
    });
  });

  it("a malformed project glob does not abort the run", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");

      // The pattern is valid YAML and invalid as a glob. Letting it reject
      // turns every other result in the batch into a generic incomplete run,
      // and the finding the user can act on — the invalid-glob configuration
      // one — never reaches them.
      const result = await evaluateAtddCodeTraceability(
        root,
        withProjectGlobs(["packages/*/tests/**/*.test.ts", INVALID_GLOB]),
      );

      expect(result.scan.matchedFileCount).toBe(0);
      expect(result.scan.truncated).toBe(false);
    });
  });
  it("a file in no acceptance layer never costs a collection slot", async () => {
    await withProject(async (root) => {
      await seedSpec(root, "0001", ["US-0001"], ["TC-0001"]);
      await seedTest(root, "e2e", "a.test.ts", "/* QFAI:SPEC-0001:US-0001 */");
      await seedTest(root, "integration", "a.test.ts", "/* QFAI:SPEC-0001:TC-0001 */");
      await seedPackageTest(root, "checkout", "unit", "pure.test.ts", ["/* no annotation */"]);

      const result = await evaluateAtddCodeTraceability(
        root,
        withProjectGlobs(["packages/*/tests/**/*.test.ts"]),
      );

      // Three files match the globs and two are owned by a layer. The third is
      // dropped while the stream runs, not after: a project glob may match a
      // whole monorepo, and files no rule reads would otherwise spend the
      // collection limit before the later packages' suites are reached.
      expect(result.scan.matchedFileCount).toBe(2);
      expect(result.scan.truncated).toBe(false);
    });
  });
});

async function seedPackageTest(
  root: string,
  packageName: string,
  layerPath: string,
  fileName: string,
  lines: string[],
): Promise<void> {
  const dir = path.join(root, "packages", packageName, "tests", ...layerPath.split("/"));
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, fileName),
    [...lines, "describe('sample', () => {", "  it('works', () => {});", "});", ""].join("\n"),
    "utf-8",
  );
}
