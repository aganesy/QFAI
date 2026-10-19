import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runAtddScaffold } from "../../src/cli/commands/atddScaffold.js";
import { buildSkeleton } from "../../src/core/atdd/scaffold.js";
import { resolveScaffoldDialect } from "../../src/core/atdd/scaffoldDialect.js";

let root: string;
const flowId = "BF-0008";
const storyId = "US-0008-0007";
const acIds = ["AC-0008-0007-01", "AC-0008-0007-02"];

async function seedStory(ids: string[] = acIds): Promise<void> {
  const flow = path.join(root, ".qfai", "spec", "02_business-flow", "business-flow-0008");
  const story = path.join(flow, "user-story-0008-0007");
  await mkdir(story, { recursive: true });
  await writeFile(path.join(flow, "business-flow.md"), `# ${flowId}: Checkout\n`);
  await writeFile(path.join(story, "01_User-story.md"), `# ${storyId}: Checkout\n`);
  await writeFile(
    path.join(story, "02_Acceptance-Criteria.md"),
    [
      "# Acceptance Criteria",
      "",
      "```gherkin",
      ...ids.map((id) => `# ${id}\nScenario: ${id}\n  Given a checkout`),
      "```",
      "",
    ].join("\n"),
  );
}

/**
 * Runs a vitest skeleton against a stand-in for `describe` and `it`, and
 * returns the names of the tests that ran to the end. A skipped or todo test
 * is not reached through `it` itself, so it would be missing from the result.
 */
function runVitestSkeleton(body: string): string[] {
  const ran: string[] = [];
  const source = body.replace(/^import .*$/m, "");
  const describeBlock = (_name: string, block: () => void): void => block();
  const test = (name: string, block: () => void): void => {
    block();
    ran.push(name);
  };
  new Function("describe", "it", source)(describeBlock, test);
  return ran;
}

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-scaffold-story-"));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("atdd scaffold story-tree targets", () => {
  // QFAI:AC-0001-0073-01
  // QFAI:EX-0001-0073-01
  it("writes one empty, passing integration test per declared AC with its annotation", async () => {
    await seedStory();
    expect(await runAtddScaffold({ root, storyId, write: () => {}, writeErr: () => {} })).toBe(0);
    const dir = path.join(root, "tests", "integration", storyId);
    expect((await readdir(dir)).sort()).toEqual(acIds.map((id) => `${id}.test.ts`));
    for (const id of acIds) {
      const body = await readFile(path.join(dir, `${id}.test.ts`), "utf8");
      expect(body).toContain(`QFAI:${id}`);
      expect(body).not.toMatch(/\.(skip|todo)\b|TODO/);
      expect(runVitestSkeleton(body)).toEqual([id]);
    }
  });

  // QFAI:AC-0001-0073-03
  // QFAI:EX-0001-0073-04
  it("writes one empty, passing flow test into the E2E home, once", async () => {
    await seedStory();
    expect(await runAtddScaffold({ root, flowId, write: () => {}, writeErr: () => {} })).toBe(0);
    const file = path.join(root, "tests", "e2e", `${flowId}.test.ts`);
    const body = await readFile(file, "utf8");
    expect(body).toContain(`QFAI:${flowId}`);
    expect(runVitestSkeleton(body)).toEqual([flowId]);
    expect(await runAtddScaffold({ root, flowId, write: () => {}, writeErr: () => {} })).toBe(0);
    expect(await readFile(file, "utf8")).toBe(body);
    expect(await readdir(path.dirname(file))).toEqual([`${flowId}.test.ts`]);
  });

  // QFAI:AC-0001-0073-02
  // QFAI:EX-0001-0073-05
  it("preserves an existing test and creates no duplicate on a second run", async () => {
    await seedStory([acIds[0] ?? ""]);
    const file = path.join(root, "tests", "integration", storyId, `${acIds[0]}.test.ts`);
    expect(await runAtddScaffold({ root, storyId, write: () => {}, writeErr: () => {} })).toBe(0);
    await writeFile(file, `// QFAI:${acIds[0]}\nit("works", () => {});\n`);
    expect(await runAtddScaffold({ root, storyId, write: () => {}, writeErr: () => {} })).toBe(0);
    expect(await readFile(file, "utf8")).toContain('it("works"');
    expect(await readdir(path.dirname(file))).toEqual([`${acIds[0]}.test.ts`]);
  });

  it("fails rather than calling a directory at the destination an existing test", async () => {
    await seedStory([acIds[0] ?? ""]);
    const file = path.join(root, "tests", "integration", storyId, `${acIds[0]}.test.ts`);
    await mkdir(file, { recursive: true });
    const messages: string[] = [];
    expect(
      await runAtddScaffold({
        root,
        storyId,
        write: () => {},
        writeErr: (message) => messages.push(message),
      }),
    ).toBe(1);
    expect(messages.join("\n")).toContain("is not a test file");
  });

  // QFAI:AC-0001-0073-04
  // QFAI:EX-0001-0073-03
  it("rejects missing, mixed, malformed and undefined scaffold targets before writes", async () => {
    await seedStory();
    for (const options of [
      {},
      { storyId, flowId },
      { storyId: "US-8-7" },
      { flowId: "BF-9999" },
      { storyId: "US-0008-9999" },
    ]) {
      const messages: string[] = [];
      expect(
        await runAtddScaffold({
          root,
          ...options,
          write: () => {},
          writeErr: (message) => messages.push(message),
        }),
      ).toBe(2);
      expect(messages.length).toBeGreaterThan(0);
    }
    await expect(readdir(path.join(root, "tests"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects duplicate AC declarations before writing any skeleton", async () => {
    await seedStory([acIds[0] ?? "", acIds[0] ?? ""]);
    expect(await runAtddScaffold({ root, storyId, write: () => {}, writeErr: () => {} })).toBe(2);
    await expect(readdir(path.join(root, "tests"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("honors the configured tests root and a Python dialect", async () => {
    await seedStory([acIds[0] ?? ""]);
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      [
        "paths:",
        "  testsDir: checks",
        "validation:",
        "  traceability:",
        "    testFileGlobs:",
        "      - checks/**/*.py",
        "",
      ].join("\n"),
    );
    expect(await runAtddScaffold({ root, storyId, write: () => {}, writeErr: () => {} })).toBe(0);
    const file = path.join(
      root,
      "checks",
      "integration",
      storyId,
      `test_${acIds[0]?.toLowerCase().replace(/-/g, "_")}.py`,
    );
    expect(await readFile(file, "utf8")).toContain(`QFAI:${acIds[0]}`);
  });

  // QFAI:EX-0001-0073-08
  it("writes a node:test test into a project whose test script runs node --test", async () => {
    await seedStory();
    await writeNodeTestProject({ scripts: { test: "node --test tests/" } });
    expect(await runAtddScaffold({ root, flowId, write: () => {}, writeErr: () => {} })).toBe(0);
    const body = await readFile(path.join(root, "tests", "e2e", `${flowId}.test.mjs`), "utf8");
    expect(body.split("\n")[0]).toBe(`// QFAI:${flowId}`);
    expect(body).toContain(`import { describe, it } from "node:test";`);
    expect(body).not.toContain("vitest");
    expect(runVitestSkeleton(body)).toEqual([flowId]);
  });

  it("keeps vitest when the project declares vitest beside a node --test script", async () => {
    await seedStory();
    await writeNodeTestProject({
      scripts: { "test:unit": "node --import tsx --test src/" },
      devDependencies: { vitest: "^3.0.0" },
    });
    expect(await runAtddScaffold({ root, flowId, write: () => {}, writeErr: () => {} })).toBe(0);
    const body = await readFile(path.join(root, "tests", "e2e", `${flowId}.test.mjs`), "utf8");
    expect(body).toContain(`import { describe, it } from "vitest";`);
  });

  // QFAI:EX-0001-0073-09
  it("refuses a package.json that names no test runner, before writing", async () => {
    await seedStory();
    await writeNodeTestProject({ scripts: { build: "node build.mjs && echo --test" } });
    const messages: string[] = [];
    expect(
      await runAtddScaffold({
        root,
        flowId,
        write: () => {},
        writeErr: (message) => messages.push(message),
      }),
    ).toBe(2);
    expect(messages.join("\n")).toContain("names no test runner");
    expect(messages.join("\n")).toContain("vitest, node:test");
    await expect(readdir(path.join(root, "tests"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  // QFAI:EX-0001-0073-09
  it("refuses a jest project, naming the supported runners, before writing", async () => {
    await seedStory();
    await writeNodeTestProject({ devDependencies: { jest: "^29.0.0" } });
    const messages: string[] = [];
    expect(
      await runAtddScaffold({
        root,
        flowId,
        write: () => {},
        writeErr: (message) => messages.push(message),
      }),
    ).toBe(2);
    expect(messages.join("\n")).toContain("jest");
    expect(messages.join("\n")).toContain("vitest, node:test");
    await expect(readdir(path.join(root, "tests"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("fails without writing when package.json is not valid JSON", async () => {
    await seedStory();
    await writeNodeTestProject({});
    await writeFile(path.join(root, "package.json"), "{ not json");
    const messages: string[] = [];
    expect(
      await runAtddScaffold({
        root,
        flowId,
        write: () => {},
        writeErr: (message) => messages.push(message),
      }),
    ).toBe(1);
    expect(messages.join("\n")).toContain(`${path.join(root, "package.json")} is not valid JSON`);
    await expect(readdir(path.join(root, "tests"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("reads a package.json that starts with a byte order mark", async () => {
    await seedStory();
    await writeNodeTestProject({});
    await writeFile(
      path.join(root, "package.json"),
      String.fromCharCode(0xfeff) + JSON.stringify({ scripts: { test: "node --test" } }),
    );
    expect(await runAtddScaffold({ root, flowId, write: () => {}, writeErr: () => {} })).toBe(0);
    const body = await readFile(path.join(root, "tests", "e2e", `${flowId}.test.mjs`), "utf8");
    expect(body).toContain(`import { describe, it } from "node:test";`);
  });

  // QFAI:EX-0001-0073-10
  it("decides the runner from the workspace member that holds the destination", async () => {
    await seedStory();
    await writeWorkspace(
      { scripts: { test: "pnpm -r test" } },
      { devDependencies: { vitest: "^3.0.0" } },
    );
    expect(await scaffoldedMemberFlowTest()).toContain(`import { describe, it } from "vitest";`);
  });

  // QFAI:EX-0001-0073-10
  it("reads a member script that runs vitest as vitest", async () => {
    await seedStory();
    await writeWorkspace(
      { devDependencies: { vitest: "^3.0.0" } },
      { scripts: { test: "vitest run" } },
    );
    expect(await scaffoldedMemberFlowTest()).toContain(`import { describe, it } from "vitest";`);
  });

  // QFAI:EX-0001-0073-10
  it("walks past a member package.json that names no runner", async () => {
    await seedStory();
    await writeWorkspace({ scripts: { test: "node --test" } }, { scripts: { build: "tsc" } });
    expect(await scaffoldedMemberFlowTest()).toContain(`import { describe, it } from "node:test";`);
  });

  it("stops the walk at the project root", async () => {
    const outer = root;
    root = path.join(outer, "project");
    await mkdir(root, { recursive: true });
    await writeFile(
      path.join(outer, "package.json"),
      JSON.stringify({ devDependencies: { jest: "^29.0.0" } }),
    );
    try {
      await seedStory();
      expect(await runAtddScaffold({ root, flowId, write: () => {}, writeErr: () => {} })).toBe(0);
      const body = await readFile(path.join(root, "tests", "e2e", `${flowId}.test.ts`), "utf8");
      expect(body).toContain(`import { describe, it } from "vitest";`);
    } finally {
      root = outer;
    }
  });

  it("does not read package.json for a Python project", async () => {
    await seedStory([acIds[0] ?? ""]);
    await writeFile(path.join(root, "package.json"), "{ not json");
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      ["validation:", "  traceability:", "    testFileGlobs:", "      - tests/**/*.py", ""].join(
        "\n",
      ),
    );
    expect(await runAtddScaffold({ root, storyId, write: () => {}, writeErr: () => {} })).toBe(0);
    const file = path.join(
      root,
      "tests",
      "integration",
      storyId,
      `test_${acIds[0]?.toLowerCase().replace(/-/g, "_")}.py`,
    );
    expect(await readFile(file, "utf8")).toContain("import unittest");
  });
});

/** A root and a `packages/app` member manifest, with tests inside the member. */
async function writeWorkspace(
  rootManifest: Record<string, unknown>,
  memberManifest: Record<string, unknown>,
): Promise<void> {
  const member = path.join(root, "packages", "app");
  await mkdir(member, { recursive: true });
  await writeFile(path.join(root, "package.json"), JSON.stringify(rootManifest));
  await writeFile(path.join(member, "package.json"), JSON.stringify(memberManifest));
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    [
      "paths:",
      "  testsDir: packages/app/tests",
      "validation:",
      "  traceability:",
      "    testFileGlobs:",
      "      - packages/app/tests/**/*.test.ts",
      "",
    ].join("\n"),
  );
}

/** Scaffold the flow test into the workspace member and return its text. */
async function scaffoldedMemberFlowTest(): Promise<string> {
  expect(await runAtddScaffold({ root, flowId, write: () => {}, writeErr: () => {} })).toBe(0);
  return readFile(path.join(root, "packages", "app", "tests", "e2e", `${flowId}.test.ts`), "utf8");
}

/** A package.json with `manifest`, and globs that collect `tests/**\/*.test.mjs`. */
async function writeNodeTestProject(manifest: Record<string, unknown>): Promise<void> {
  await writeFile(path.join(root, "package.json"), JSON.stringify(manifest));
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    [
      "validation:",
      "  traceability:",
      "    testFileGlobs:",
      "      - tests/**/*.test.mjs",
      "",
    ].join("\n"),
  );
}

describe("atdd scaffold dialects", () => {
  // QFAI:EX-0001-0073-01
  it("writes a vitest test that carries its annotation, is not skipped and passes empty", () => {
    const resolution = resolveScaffoldDialect(["tests/**/*.test.ts"]);
    if (resolution.outcome !== "resolved") throw new Error(resolution.outcome);
    const body = buildSkeleton({ id: flowId, kind: "BF" }, resolution.dialect);

    expect(body.split("\n")[0]).toBe(`// QFAI:${flowId}`);
    expect(body).not.toMatch(/\.(skip|todo)\b/);
    expect(runVitestSkeleton(body)).toEqual([flowId]);
  });

  // QFAI:EX-0001-0073-01
  it("writes a Python test that carries its annotation, is not skipped and passes empty", () => {
    const resolution = resolveScaffoldDialect(["tests/**/test_*.py"]);
    if (resolution.outcome !== "resolved") throw new Error(resolution.outcome);
    const id = acIds[0] ?? "";
    const body = buildSkeleton({ id, kind: "AC", storyId }, resolution.dialect);

    const lines = body.split("\n");
    expect(lines[0]).toBe(`# QFAI:${id}`);
    expect(body).not.toMatch(/skip|raise|TODO/i);
    // A unittest method whose only statement is `pass` passes under both
    // pytest and unittest.
    expect(lines.slice(-4)).toEqual([
      "class Test_AC_0008_0007_01(unittest.TestCase):",
      "    def test_ac_0008_0007_01(self) -> None:",
      "        pass",
      "",
    ]);
  });
});
