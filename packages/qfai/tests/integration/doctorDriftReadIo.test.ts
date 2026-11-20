import type * as fsPromises from "node:fs/promises";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

type FsPromises = typeof fsPromises;

/** Absolute paths whose read fails, with the error it fails with. */
const { failing } = vi.hoisted(() => ({ failing: new Map<string, Error>() }));

function refusal(code: string, target: string): Error {
  return Object.assign(new Error(`${code}: permission denied, open '${target}'`), {
    code,
    syscall: "open",
    path: target,
  });
}

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    readFile: (...args: Parameters<FsPromises["readFile"]>) => {
      const error = failing.get(String(args[0]));
      return error === undefined ? actual.readFile(...args) : Promise.reject(error);
    },
  };
});

const { createDoctorData } = await import("../../src/core/doctor.js");
const { getInitAssetsDir } = await import("../../src/shared/assets.js");
const { removeTempTree } = await import("../helpers/tempTree.js");

const roots: string[] = [];

afterEach(async () => {
  failing.clear();
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

async function project(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-drift-read-io-"));
  roots.push(root);
  await writeFile(path.join(root, "qfai.config.yaml"), "paths:\n  specsDir: .qfai/spec\n", "utf-8");
  for (const [relative, text] of Object.entries(files)) {
    const target = path.join(root, ...relative.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, text, "utf-8");
  }
  return root;
}

async function findings(root: string, prefix: string) {
  const data = await createDoctorData({ startDir: root, rootExplicit: true });
  return data.checks.filter((check) => check.id.startsWith(prefix));
}

function packaged(...segments: string[]): string {
  return path.join(getInitAssetsDir(), ...segments);
}

describe("qfai doctor names an installed or packaged workflow copy it cannot read", () => {
  // QFAI:EX-0003-0011-39
  it("warns for each copy that cannot be read, with the path and the cause, and still compares the rest", async () => {
    // QFAI:AC-0003-0011-11
    const root = await project({
      ".github/workflows/qfai-docs.yml": "name: ours\n",
      ".github/workflows/qfai-tests.yml": "name: ours\n",
      ".github/workflows/qfai-validate.yml": "name: ours\n",
    });
    const installed = path.join(root, ".github", "workflows", "qfai-tests.yml");
    const packagedCopy = packaged("root", ".github", "workflows", "qfai-validate.yml");
    failing.set(installed, refusal("EACCES", installed));
    failing.set(packagedCopy, refusal("EIO", packagedCopy));

    const found = await findings(root, "workflows.drift.");

    expect(found.map((check) => check.id)).toEqual([
      "workflows.drift.qfai-docs",
      "workflows.drift.qfai-tests",
      "workflows.drift.qfai-validate",
    ]);
    const [docs, tests, validate] = found;
    expect(docs?.message).toContain(".github/workflows/qfai-docs.yml differs");
    expect(tests?.severity).toBe("warning");
    expect(tests?.message).toContain(".github/workflows/qfai-tests.yml cannot be read: EACCES");
    expect(tests?.details).toMatchObject({
      path: ".github/workflows/qfai-tests.yml",
      unreadable: ".github/workflows/qfai-tests.yml",
      code: "EACCES",
    });
    expect(validate?.severity).toBe("warning");
    expect(validate?.message).toContain(`${packagedCopy} cannot be read: EIO`);
    expect(validate?.details).toMatchObject({
      path: ".github/workflows/qfai-validate.yml",
      unreadable: packagedCopy,
      code: "EIO",
    });
  });
});

describe("qfai doctor names an installed or packaged assistant copy it cannot read", () => {
  // QFAI:EX-0003-0031-05
  it("warns for each copy that cannot be read, with the path and the cause, and still compares the rest", async () => {
    // QFAI:AC-0003-0031-01
    const root = await project({
      ".qfai/assistant/rule/workflow.md": "edited\n",
      ".qfai/assistant/skill/qfai-sdd/SKILL.md": "edited\n",
      ".qfai/assistant/skill/qfai-run/SKILL.md": "edited\n",
    });
    const installed = path.join(root, ".qfai", "assistant", "rule", "workflow.md");
    const packagedCopy = packaged(".qfai", "assistant", "skill", "qfai-run", "SKILL.md");
    failing.set(installed, refusal("EACCES", installed));
    failing.set(packagedCopy, refusal("EIO", packagedCopy));

    const found = await findings(root, "assistant.drift.");
    const byId = new Map(found.map((check) => [check.id, check]));

    expect([...byId.keys()].sort()).toEqual([
      "assistant.drift.rule/workflow.md",
      "assistant.drift.skill/qfai-run/SKILL.md",
      "assistant.drift.skill/qfai-sdd/SKILL.md",
    ]);
    expect(byId.get("assistant.drift.skill/qfai-sdd/SKILL.md")?.message).toContain(
      ".qfai/assistant/skill/qfai-sdd/SKILL.md differs",
    );
    const rule = byId.get("assistant.drift.rule/workflow.md");
    expect(rule?.severity).toBe("warning");
    expect(rule?.message).toContain(".qfai/assistant/rule/workflow.md cannot be read: EACCES");
    expect(rule?.details).toMatchObject({
      path: ".qfai/assistant/rule/workflow.md",
      unreadable: ".qfai/assistant/rule/workflow.md",
      code: "EACCES",
    });
    const run = byId.get("assistant.drift.skill/qfai-run/SKILL.md");
    expect(run?.severity).toBe("warning");
    expect(run?.message).toContain(`${packagedCopy} cannot be read: EIO`);
    expect(run?.details).toMatchObject({
      path: ".qfai/assistant/skill/qfai-run/SKILL.md",
      unreadable: packagedCopy,
      code: "EIO",
    });
  });
});
