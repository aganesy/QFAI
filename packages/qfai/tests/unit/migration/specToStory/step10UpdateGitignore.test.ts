import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runStep } from "../../../../src/migration/specToStory/harness.js";
import type { MigrationContext } from "../../../../src/migration/specToStory/harness.js";
import { step10 } from "../../../../src/migration/specToStory/step10UpdateGitignore.js";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

describe("migration managed gitignore update", () => {
  it("leaves a story-tree project with no migration evidence unchanged", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "qfai-migration-gitignore-"));
    roots.push(root);
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
      "utf8",
    );
    let output = "";
    const code = await runStep(10, [], {
      cwd: root,
      stdout: { write: (value) => (output += value) },
      stderr: {
        write: (value) => {
          throw new Error(value);
        },
      },
    });
    expect(code).toBe(0);
    expect(output).toContain("## Operations\nnone");
    await expect(readFile(path.join(root, ".gitignore"), "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("resets an outdated managed block on a story-tree project with no 1.x layout", async () => {
    // QFAI:EX-0004-0011-02
    const root = await mkdtemp(path.join(tmpdir(), "qfai-migration-gitignore-"));
    roots.push(root);
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
      "utf8",
    );
    await writeFile(path.join(root, ".gitignore"), "project-only\n", "utf8");
    let output = "";
    const io = {
      cwd: root,
      stdout: { write: (value: string) => (output += value) },
      stderr: {
        write: (value: string) => {
          throw new Error(value);
        },
      },
    };
    expect(await runStep(10, [], io)).toBe(0);
    expect(output.split("\n")[0]).toBe("1.x layout found, migrating");
    expect(output).toContain("- .gitignore: reset the managed QFAI block");
    const updated = await readFile(path.join(root, ".gitignore"), "utf8");
    expect(updated).toContain("project-only\n");
    expect(updated).toContain("QFAI managed");
    output = "";
    expect(await runStep(10, [], io)).toBe(0);
    expect(output).toContain("## Operations\nnone");
    expect(await readFile(path.join(root, ".gitignore"), "utf8")).toBe(updated);
  });

  it("plans only the managed block and leaves a current file unchanged", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "qfai-migration-gitignore-"));
    roots.push(root);
    const context: MigrationContext = {
      root,
      specsDir: path.join(root, ".qfai", "spec"),
      contractsDir: path.join(root, ".qfai", "spec", "03_contract"),
      config: {} as MigrationContext["config"],
    };
    const gitignore = path.join(root, ".gitignore");
    await writeFile(gitignore, "project-only\n", "utf8");

    const plan = await step10.plan(context);
    expect(await readFile(gitignore, "utf8")).toBe("project-only\n");
    expect(plan.operations).toHaveLength(1);
    expect(plan.operations[0]).toMatchObject({
      kind: "delegate",
      target: ".gitignore",
    });
    const operation = plan.operations[0];
    if (operation?.kind !== "delegate") throw new Error("Expected a delegated operation.");
    await operation.apply();
    const updated = await readFile(gitignore, "utf8");
    expect(updated).toContain("project-only\n");
    expect(updated).toContain("QFAI managed");
    expect(updated).not.toContain("!.qfai/evidence/");
    expect((await step10.plan(context)).operations).toEqual([]);
    expect(await readFile(gitignore, "utf8")).toBe(updated);
  });
});
