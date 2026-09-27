import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runDoctor } from "../../src/cli/commands/doctor.js";
import type { DoctorData } from "../../src/core/doctor.js";
import { captureStdout } from "../helpers/stdout.js";

async function withWorkspace(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf0003-examples-"));
  try {
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
      "utf8",
    );
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function put(root: string, relative: string, content: string): Promise<void> {
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

describe("BF-0003 diagnostic examples", () => {
  it("counts every doctor severity in the machine-readable summary", async () => {
    // QFAI:EX-0003-0001-04
    await withWorkspace(async (root) => {
      await put(
        root,
        "qfai.config.yaml",
        "paths:\n  specsDir: .qfai/missing-spec\n  contractsDir: .qfai/spec/03_contract\n",
      );
      let code = -1;
      const output = await captureStdout(async () => {
        code = await runDoctor({ root, rootExplicit: true, format: "json", failOn: "never" });
      });
      expect(code).toBe(0);
      const data = JSON.parse(output) as DoctorData;
      expect(data.config.found).toBe(true);
      expect(
        data.checks.some((check) => check.id === "paths.specsDir" && check.severity === "warning"),
      ).toBe(true);
      expect(data.summary).toEqual({
        ok: data.checks.filter((check) => check.severity === "ok").length,
        info: data.checks.filter((check) => check.severity === "info").length,
        warning: data.checks.filter((check) => check.severity === "warning").length,
        error: data.checks.filter((check) => check.severity === "error").length,
      });
    });
  });
});
