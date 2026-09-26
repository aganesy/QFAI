import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { ensureRootGitignoreEntries } from "../../../../src/cli/commands/init.js";
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
      targets: [".gitignore"],
    });
    const operation = plan.operations[0];
    if (operation?.kind !== "delegate") throw new Error("Expected a delegated operation.");
    await operation.apply();
    const updated = await readFile(gitignore, "utf8");
    expect(updated).toContain("project-only\n");
    expect(updated).toContain("QFAI managed");
    expect(updated).toContain("!.qfai/evidence/decision/");
    expect((await step10.plan(context)).operations).toEqual([]);
    expect(await readFile(gitignore, "utf8")).toBe(updated);
  });

  it("reclaims an authenticated half-state when the managed block is current", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "qfai-migration-gitignore-"));
    roots.push(root);
    const context: MigrationContext = {
      root,
      specsDir: path.join(root, ".qfai", "spec"),
      contractsDir: path.join(root, ".qfai", "spec", "03_contract"),
      config: {} as MigrationContext["config"],
    };
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
      "utf8",
    );
    await ensureRootGitignoreEntries(root, false, () => {});
    const gitignore = path.join(root, ".gitignore");
    const before = await readFile(gitignore, "utf8");

    const exited = spawnSync(process.execPath, ["-e", "process.exit(0)"]);
    expect(exited.status).toBe(0);
    const stageDir = path.join(root, ".qfai", "report");
    await mkdir(stageDir, { recursive: true });
    const name = `.gitignore-${exited.pid}-${randomUUID()}.tmp`;
    const conflict = `.gitignore-${exited.pid}-${randomUUID()}.tmp`;
    const payload = "complete abandoned stage";
    const marker = JSON.stringify({
      owner: "qfai-init-gitignore-stage-v1",
      size: Buffer.byteLength(payload),
      sha256: createHash("sha256").update(payload, "utf8").digest("hex"),
    });
    await writeFile(path.join(stageDir, name), payload, "utf8");
    await writeFile(path.join(stageDir, `${name}.owner`), marker, "utf8");
    await writeFile(path.join(stageDir, conflict), "user data", "utf8");
    await writeFile(path.join(stageDir, `${conflict}.owner`), "invalid marker", "utf8");

    const planned = await step10.plan(context);
    const stage = `.qfai/report/${name}`;
    expect(planned.operations[0]).toMatchObject({
      kind: "delegate",
      target: stage,
      targets: [stage, `${stage}.owner`],
    });
    expect(planned.forAPerson?.join("\n")).toContain(conflict);
    expect(await readFile(gitignore, "utf8")).toBe(before);
    expect(await readdir(stageDir)).toHaveLength(4);

    let output = "";
    const io = {
      stdout: { write: (value: string) => (output += value) },
      stderr: {
        write: (value: string) => {
          throw new Error(value);
        },
      },
    };
    expect(await runStep(10, ["--dry-run"], { cwd: root, ...io })).toBe(3);
    expect(output).toContain(`${stage}.owner`);
    expect(await readdir(stageDir)).toHaveLength(4);

    output = "";
    expect(await runStep(10, [], { cwd: root, ...io })).toBe(3);
    expect((await readdir(stageDir)).sort()).toEqual([conflict, `${conflict}.owner`].sort());
    expect(await readFile(gitignore, "utf8")).toBe(before);
    expect((await step10.plan(context)).operations).toEqual([]);
  });
});
