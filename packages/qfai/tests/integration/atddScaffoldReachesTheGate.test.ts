import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runAtddScaffold } from "../../src/cli/commands/atddScaffold.js";
import { scaffoldDestPath } from "../../src/core/atdd/scaffold.js";
import { resolveScaffoldDialect } from "../../src/core/atdd/scaffoldDialect.js";
import { deriveTestFileExtensions } from "../../src/core/atddTraceability.js";

const ac = { kind: "AC" as const, id: "AC-0001-0001-01", storyId: "US-0001-0001" };
const bf = { kind: "BF" as const, id: "BF-0001" };

async function withStory(task: (root: string) => Promise<void>, config?: string): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-scaffold-dialect-"));
  try {
    const flow = path.join(root, ".qfai", "spec", "02_business-flow", "business-flow-0001");
    const story = path.join(flow, "user-story-0001-0001");
    await mkdir(story, { recursive: true });
    await writeFile(path.join(flow, "business-flow.md"), `# ${bf.id}: Checkout\n`);
    await writeFile(path.join(story, "01_User-story.md"), `# ${ac.storyId}: Checkout\n`);
    await writeFile(
      path.join(story, "02_Acceptance-Criteria.md"),
      `# Acceptance Criteria\n\n\`\`\`gherkin\n# ${ac.id}\nScenario: checkout\n  Given a cart\n\`\`\`\n`,
    );
    if (config !== undefined) await writeFile(path.join(root, "qfai.config.yaml"), config);
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function config(globs: readonly string[], excludeGlobs: readonly string[] = []): string {
  return [
    "validation:",
    "  traceability:",
    "    testFileGlobs:",
    ...globs.map((glob) => `      - '${glob}'`),
    "    testFileExcludeGlobs:",
    ...excludeGlobs.map((glob) => `      - '${glob}'`),
    "",
  ].join("\n");
}

describe("scaffold output reaches the ATDD test homes", () => {
  it("places AC in integration and BF in E2E with the configured tests root", () => {
    expect(scaffoldDestPath("/repo", ac, "checks").replace(/\\/g, "/")).toContain(
      "/checks/integration/US-0001-0001/AC-0001-0001-01.test.ts",
    );
    expect(scaffoldDestPath("/repo", bf, "checks").replace(/\\/g, "/")).toContain(
      "/checks/e2e/BF-0001.test.ts",
    );
  });

  it("honors an absolute tests root without rebasing it under the project", () => {
    const root = path.resolve("project");
    const testsRoot = path.resolve("outside-tests");
    expect(scaffoldDestPath(root, ac, testsRoot)).toBe(
      path.join(testsRoot, "integration", ac.storyId, `${ac.id}.test.ts`),
    );
  });

  it("emits the extension and naming convention collected by the project", async () => {
    await withStory(
      async (root) => {
        expect(
          await runAtddScaffold({ root, storyId: ac.storyId, write: () => {}, writeErr: () => {} }),
        ).toBe(0);
        expect(
          await readFile(
            path.join(
              root,
              "tests",
              "integration",
              ac.storyId,
              `test_${ac.id.toLowerCase().replace(/-/g, "_")}.py`,
            ),
            "utf8",
          ),
        ).toContain(`QFAI:${ac.id}`);
      },
      config(["tests/**/test_*.py"]),
    );
  });

  it("refuses unsupported and excluded destinations before creating files", async () => {
    for (const globs of [["tests/**/*.rb"], ["src/**/*.test.ts"]]) {
      await withStory(async (root) => {
        expect(
          await runAtddScaffold({ root, storyId: ac.storyId, write: () => {}, writeErr: () => {} }),
        ).toBe(2);
        await expect(
          readFile(path.join(root, "tests", "integration", ac.storyId, `${ac.id}.test.ts`), "utf8"),
        ).rejects.toMatchObject({ code: "ENOENT" });
      }, config(globs));
    }
    await withStory(
      async (root) => {
        expect(
          await runAtddScaffold({ root, storyId: ac.storyId, write: () => {}, writeErr: () => {} }),
        ).toBe(2);
      },
      config(["tests/**/*.test.ts"], ["tests/integration/**"]),
    );
  });
});

describe("scaffold dialect matches the runner's glob", () => {
  it("uses the default TypeScript skeleton when no test globs are configured", () => {
    const result = resolveScaffoldDialect([]);
    expect(result.outcome).toBe("resolved");
    if (result.outcome === "resolved")
      expect(result.dialect.fileName(ac.id)).toBe(`${ac.id}.test.ts`);
  });

  it.each([
    ["JS extension", "tests/**/*.test.js", "js-ts", `${ac.id}.test.js`],
    ["TS extglob", "tests/**/*.@(test|spec).ts", "js-ts", `${ac.id}.test.ts`],
    [
      "pytest prefix",
      "tests/**/test_*.py",
      "python",
      `test_${ac.id.toLowerCase().replace(/-/g, "_")}.py`,
    ],
    [
      "pytest suffix",
      "tests/**/*_test.py",
      "python",
      `${ac.id.toLowerCase().replace(/-/g, "_")}_test.py`,
    ],
  ])("selects %s", (_name, glob, family, fileName) => {
    const result = resolveScaffoldDialect([glob]);
    expect(result.outcome).toBe("resolved");
    if (result.outcome === "resolved") {
      expect(result.dialect.id).toBe(family);
      expect(result.dialect.fileName(ac.id)).toBe(fileName);
    }
  });

  it.each([
    ["brace range", "tests/**/AC-{0000..0002}-0000-01.test.ts", "resolved"],
    ["range excludes probe", "tests/**/AC-{0001..0002}-0000-01.test.ts", "naming-mismatch"],
    ["extension range", "tests/**/*.{s..u}est.ts", "resolved"],
    ["unexpanded large range", "tests/**/AC-{0000..9999}-0000-01.test.ts", "naming-mismatch"],
    ["unsupported language", "tests/**/*.rb", "unsupported-stack"],
    ["uncollectable Python name", "tests/**/check_*.py", "naming-mismatch"],
    ["case-sensitive Python name", "tests/**/TEST_*.py", "naming-mismatch"],
  ])("handles %s", (_name, glob, outcome) => {
    expect(resolveScaffoldDialect([glob]).outcome).toBe(outcome);
  });

  it("checks every AC ID when a brace range restricts names", () => {
    const glob = "tests/**/AC-0001-0001-0{1..2}.test.ts";
    expect(
      resolveScaffoldDialect([glob], { ids: ["AC-0001-0001-01", "AC-0001-0001-02"] }).outcome,
    ).toBe("resolved");
    expect(
      resolveScaffoldDialect([glob], { ids: ["AC-0001-0001-01", "AC-0001-0001-03"] }).outcome,
    ).toBe("naming-mismatch");
  });

  it("matches the whole path and honors exclusions", () => {
    const scaffoldDir = "tests/integration/US-0001-0001";
    expect(resolveScaffoldDialect(["src/**/*.test.ts"], { scaffoldDir }).outcome).toBe(
      "naming-mismatch",
    );
    expect(resolveScaffoldDialect(["tests/**/*.test.ts"], { scaffoldDir }).outcome).toBe(
      "resolved",
    );
    expect(
      resolveScaffoldDialect(["tests/**/*.test.ts"], {
        scaffoldDir,
        excludeGlobs: ["tests/integration/**"],
      }).outcome,
    ).toBe("naming-mismatch");
  });

  it("tries Python after an unreachable JS naming and keeps JS first when both work", () => {
    const scaffoldDir = "tests/integration/US-0001-0001";
    const python = resolveScaffoldDialect(["src/**/*.test.ts", "tests/**/*.py"], { scaffoldDir });
    expect(python.outcome).toBe("resolved");
    if (python.outcome === "resolved") expect(python.dialect.id).toBe("python");
    const mixed = resolveScaffoldDialect(["tests/**/*.test.ts", "tests/**/*.py"], { scaffoldDir });
    expect(mixed.outcome).toBe("resolved");
    if (mixed.outcome === "resolved") expect(mixed.dialect.id).toBe("js-ts");
  });

  it("does not claim an extension when brace expansion exceeds the scan bound", () => {
    const globs = ["tests/**/*.{a..z}{a..z}{a..z}{a..z}"];
    expect([...deriveTestFileExtensions(globs)]).toEqual([]);
    expect(resolveScaffoldDialect(globs).outcome).toBe("naming-mismatch");
  });
});
