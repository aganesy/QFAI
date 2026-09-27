import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runAtddScaffold } from "../../src/cli/commands/atddScaffold.js";
import { defaultConfig } from "../../src/core/config.js";
import { validateScaffoldPlaceholder } from "../../src/core/validators/scaffoldPlaceholder.js";

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

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-scaffold-story-"));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("atdd scaffold story-tree targets", () => {
  it("writes one integration skeleton per declared AC with a single AC annotation", async () => {
    await seedStory();
    expect(await runAtddScaffold({ root, storyId, write: () => {}, writeErr: () => {} })).toBe(0);
    const dir = path.join(root, "tests", "integration", storyId);
    expect((await readdir(dir)).sort()).toEqual(acIds.map((id) => `${id}.test.ts`));
    for (const id of acIds) {
      const body = await readFile(path.join(dir, `${id}.test.ts`), "utf8");
      expect(body).toContain(`QFAI:${id}`);
      expect(body).toContain(`TODO: implement assertion for ${id}`);
      expect(body).toContain("QFAI-SCAFFOLD-PLACEHOLDER");
      expect(body).not.toContain("QFAI:SPEC-");
    }
  });

  it("writes one flow skeleton into the E2E home", async () => {
    await seedStory();
    expect(await runAtddScaffold({ root, flowId, write: () => {}, writeErr: () => {} })).toBe(0);
    const file = path.join(root, "tests", "e2e", `${flowId}.test.ts`);
    const body = await readFile(file, "utf8");
    expect(body).toContain(`QFAI:${flowId}`);
    expect(body).toContain(`TODO: implement assertion for ${flowId}`);
    expect(await runAtddScaffold({ root, flowId, write: () => {}, writeErr: () => {} })).toBe(0);
    expect(await readFile(file, "utf8")).toBe(body);
    const findings = await validateScaffoldPlaceholder(root, defaultConfig);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.code).toBe("D-SCAFFOLD-PLACEHOLDER");
    expect(findings[0]?.refs).toEqual([flowId]);
  });

  it("preserves an existing test and creates no duplicate on a second run", async () => {
    await seedStory([acIds[0] ?? ""]);
    const file = path.join(root, "tests", "integration", storyId, `${acIds[0]}.test.ts`);
    expect(await runAtddScaffold({ root, storyId, write: () => {}, writeErr: () => {} })).toBe(0);
    await writeFile(file, `// QFAI:${acIds[0]}\nit("works", () => {});\n`);
    expect(await runAtddScaffold({ root, storyId, write: () => {}, writeErr: () => {} })).toBe(0);
    expect(await readFile(file, "utf8")).toContain('it("works"');
    expect(await readdir(path.dirname(file))).toEqual([`${acIds[0]}.test.ts`]);
  });

  it("rejects missing, mixed, malformed, undefined, and retired spec targets before writes", async () => {
    await seedStory();
    for (const options of [
      {},
      { storyId, flowId },
      { storyId: "US-8-7" },
      { flowId: "BF-9999" },
      { storyId: "US-0008-9999" },
      { specId: "spec-0008" },
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
      if ("specId" in options) {
        expect(messages.join("\n")).toContain("--story");
        expect(messages.join("\n")).toContain("--flow");
      }
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
});
