import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type * as FsPromises from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";

const { fault } = vi.hoisted(() => ({ fault: { failPublish: false, staged: "" } }));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof FsPromises>();
  return {
    ...actual,
    rename: async (...args: Parameters<typeof actual.rename>): Promise<void> => {
      const [from, to] = args;
      if (fault.failPublish && path.basename(String(to)) === ".gitignore") {
        fault.staged = await actual.readFile(from, "utf-8");
        throw Object.assign(new Error("EIO: publish interrupted"), { code: "EIO" });
      }
      await actual.rename(...args);
    },
  };
});

const { ensureRootGitignoreEntries } = await import("../../src/cli/commands/init.js");
const { QFAI_GITIGNORE_MARKER } = await import("../../src/core/gitignore.js");

function ownerFor(content: string): string {
  return JSON.stringify({
    owner: "qfai-init-gitignore-stage-v1",
    size: Buffer.byteLength(content),
    sha256: createHash("sha256").update(content, "utf-8").digest("hex"),
  });
}

describe("root .gitignore replacement", () => {
  it("keeps every project line when publishing fails, then completes on retry", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-gitignore-atomic-"));
    const target = path.join(root, ".gitignore");
    const original = "node_modules/\n# Project rules\ncustom-output/\n";
    try {
      await writeFile(target, original, "utf-8");
      fault.failPublish = true;
      await expect(ensureRootGitignoreEntries(root, false, () => {})).rejects.toThrow(
        "publish interrupted",
      );

      expect(fault.staged).toContain("custom-output/\n");
      expect(await readFile(target, "utf-8")).toBe(original);
      expect(await readdir(path.join(root, ".qfai", "report"))).toEqual([]);

      fault.failPublish = false;
      await ensureRootGitignoreEntries(root, false, () => {});
      const updated = await readFile(target, "utf-8");
      expect(updated).toContain(original);
      expect(updated).toContain(QFAI_GITIGNORE_MARKER);
      await ensureRootGitignoreEntries(root, false, () => {});
      expect(await readFile(target, "utf-8")).toBe(updated);
    } finally {
      fault.failPublish = false;
      fault.staged = "";
      await rm(root, { recursive: true, force: true });
    }
  });

  it("leaves a previously absent .gitignore absent when publishing fails", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-gitignore-atomic-"));
    try {
      fault.failPublish = true;
      await expect(ensureRootGitignoreEntries(root, false, () => {})).rejects.toThrow(
        "publish interrupted",
      );
      await expect(readFile(path.join(root, ".gitignore"), "utf-8")).rejects.toMatchObject({
        code: "ENOENT",
      });
      expect(await readdir(path.join(root, ".qfai", "report"))).toEqual([]);
    } finally {
      fault.failPublish = false;
      fault.staged = "";
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reclaims an interrupted process's stage on the next run", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-gitignore-atomic-"));
    try {
      const exited = spawnSync(process.execPath, ["-e", "process.exit(0)"]);
      expect(exited.status).toBe(0);
      const stageDir = path.join(root, ".qfai", "report");
      await mkdir(stageDir, { recursive: true });
      const abandoned = `.gitignore-${exited.pid}-${randomUUID()}.tmp`;
      const active = `.gitignore-${process.pid}-${randomUUID()}.tmp`;
      const userFile = `.gitignore-${exited.pid}-${randomUUID()}.tmp`;
      const edited = `.gitignore-${exited.pid}-${randomUUID()}.tmp`;
      await writeFile(path.join(stageDir, abandoned), "complete stage", "utf-8");
      await writeFile(
        path.join(stageDir, `${abandoned}.owner`),
        ownerFor("complete stage"),
        "utf-8",
      );
      await writeFile(path.join(stageDir, active), "another live run", "utf-8");
      await writeFile(
        path.join(stageDir, `${active}.owner`),
        ownerFor("another live run"),
        "utf-8",
      );
      await writeFile(path.join(stageDir, userFile), "user-owned same-name file", "utf-8");
      await writeFile(path.join(stageDir, edited), "user edit", "utf-8");
      await writeFile(path.join(stageDir, `${edited}.owner`), ownerFor("original stage"), "utf-8");

      const preview: string[] = [];
      const planned = await ensureRootGitignoreEntries(root, true, (line) => preview.push(line));
      expect(preview.join("\n")).toContain(`would remove: .qfai/report/${abandoned}`);
      expect(preview.join("\n")).toContain("would update: .gitignore");
      expect(planned.staging).toEqual([`.qfai/report/${abandoned}`]);
      expect(planned.stagingConflicts.join("\n")).toContain(edited);
      expect(await readdir(stageDir)).toHaveLength(7);
      await expect(readFile(path.join(root, ".gitignore"), "utf-8")).rejects.toMatchObject({
        code: "ENOENT",
      });

      await ensureRootGitignoreEntries(root, false, () => {});

      expect((await readdir(stageDir)).sort()).toEqual(
        [active, `${active}.owner`, userFile, edited, `${edited}.owner`].sort(),
      );
      expect(await readFile(path.join(stageDir, userFile), "utf-8")).toBe(
        "user-owned same-name file",
      );
      expect(await readFile(path.join(stageDir, edited), "utf-8")).toBe("user edit");
      expect(await readFile(path.join(root, ".gitignore"), "utf-8")).toContain(
        QFAI_GITIGNORE_MARKER,
      );

      const stable = await readFile(path.join(root, ".gitignore"), "utf-8");
      const ownerOnly = `.gitignore-${exited.pid}-${randomUUID()}.tmp`;
      await writeFile(path.join(stageDir, `${ownerOnly}.owner`), ownerFor(stable), "utf-8");
      const noOpPreview = await ensureRootGitignoreEntries(root, true, () => {});
      expect(noOpPreview.copied).toEqual([]);
      expect(noOpPreview.staging).toEqual([`.qfai/report/${ownerOnly}`]);
      await ensureRootGitignoreEntries(root, false, () => {});
      expect(await readFile(path.join(root, ".gitignore"), "utf-8")).toBe(stable);
      expect(await readdir(stageDir)).not.toContain(`${ownerOnly}.owner`);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
