import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runPrototypingCertify } from "../../src/cli/commands/prototypingCertify.js";
import { removeTempTree } from "../helpers/tempTree.js";

const roots: string[] = [];

async function put(root: string, relative: string, content: string): Promise<void> {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, "utf8");
}

async function project(configuredLatest = ".qfai/report/validate.json"): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cert-profile-"));
  roots.push(root);
  await put(
    root,
    "qfai.config.yaml",
    `paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\noutput:\n  validateJsonPath: ${configuredLatest}\n`,
  );
  await put(
    root,
    ".qfai/spec/03_contract/ui/home.yaml",
    "# QFAI-CONTRACT-ID: CON-UI-0001\nscreens: [{id: home}]\n",
  );
  await put(
    root,
    ".qfai/evidence/prototyping/prototyping.json",
    JSON.stringify({
      runId: "run-profile-gate",
      uiContractsCovered: ["CON-UI-0001"],
      frozenSurfaceUnion: ["CON-UI-0001"],
      iterations: [],
    }),
  );
  return root;
}

async function certifyError(root: string): Promise<{ exit: number; stderr: string }> {
  const lines: string[] = [];
  vi.spyOn(process.stderr, "write").mockImplementation((chunk: unknown): boolean => {
    lines.push(String(chunk));
    return true;
  });
  try {
    return { exit: await runPrototypingCertify({ root, check: false }), stderr: lines.join("") };
  } finally {
    vi.restoreAllMocks();
  }
}

afterEach(async () => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) await removeTempTree(root);
});

describe("certify selects the prototyping validation result", () => {
  // QFAI:AC-0001-0049-01
  // QFAI:EX-0001-0049-04
  it("uses a passing prototyping report despite a newer failing default pointer", async () => {
    const root = await project();
    await put(
      root,
      ".qfai/report/validate-prototyping.json",
      JSON.stringify({ profile: "prototyping", counts: { error: 0 } }),
    );
    await put(
      root,
      ".qfai/report/validate.json",
      JSON.stringify({ profile: "default", counts: { error: 1 } }),
    );

    const result = await certifyError(root);
    expect(result.exit).toBe(2);
    expect(result.stderr).toContain("verify.json is missing");
    expect(result.stderr).not.toContain('profile="default"');
    expect(result.stderr).not.toContain("reports 1 error");
  });

  // QFAI:AC-0001-0049-01
  it("requires the dedicated result even when the latest pointer looks passing", async () => {
    const root = await project();
    await put(
      root,
      ".qfai/report/validate.json",
      JSON.stringify({ profile: "prototyping", counts: { error: 0 } }),
    );

    const result = await certifyError(root);
    expect(result.exit).toBe(2);
    expect(result.stderr).toContain("validate-prototyping.json is missing");
    expect(result.stderr).not.toContain("verify.json is missing");
  });

  it("derives the dedicated result from a configured latest path", async () => {
    const root = await project("custom/validation.json");
    await put(
      root,
      "custom/validation-prototyping.json",
      JSON.stringify({ profile: "prototyping", counts: { error: 0 } }),
    );
    await put(
      root,
      "custom/validation.json",
      JSON.stringify({ profile: "default", counts: { error: 1 } }),
    );

    const result = await certifyError(root);
    expect(result.exit).toBe(2);
    expect(result.stderr).toContain("verify.json is missing");
    expect(result.stderr).not.toContain("validation.json was produced by");
  });
});
