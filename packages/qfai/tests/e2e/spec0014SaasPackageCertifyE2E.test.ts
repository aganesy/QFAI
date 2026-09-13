/**
 * The saas-package certificate journey, run through the built `qfai` binary:
 * seal a scope-limited certificate, refuse its promotion while the gates it
 * skipped are missing, and promote it once they pass.
 *
 * Needs `pnpm -C packages/qfai build` first. Without a build the binary is
 * absent and the first case fails on it rather than passing without running.
 */
// QFAI:SPEC-0014:US-0014-0020

import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import { SAAS_PACKAGE_SKIPPED_GATES } from "../../src/core/saasPackage/skippedGates.js";
import {
  CERTIFICATE_REL,
  seedSaasPackageCertifyProject,
  seedSaasPackageGatesPassing,
} from "../helpers/saasPackageCertifyFixture.js";

const execFileAsync = promisify(execFile);

const CLI_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "dist",
  "cli",
  "index.mjs",
);

const roots: string[] = [];

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) await rm(root, { recursive: true, force: true });
  }
});

/** One run of the built binary in `root`: its exit code and stderr. */
async function qfai(
  root: string,
  args: readonly string[],
): Promise<{ code: number; stderr: string }> {
  try {
    const { stderr } = await execFileAsync(process.execPath, [CLI_PATH, ...args], { cwd: root });
    return { code: 0, stderr };
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && typeof err.code === "number") {
      const stderr = "stderr" in err && typeof err.stderr === "string" ? err.stderr : "";
      return { code: err.code, stderr };
    }
    throw err;
  }
}

async function certificate(root: string): Promise<Record<string, unknown>> {
  const parsed: unknown = JSON.parse(await readFile(path.join(root, CERTIFICATE_REL), "utf-8"));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${CERTIFICATE_REL} is not a JSON object`);
  }
  return Object.fromEntries(Object.entries(parsed));
}

describe("US-0014-0020: a saas-package certificate through the built binary", () => {
  it("seals a scope-limited certificate that names every gate it skipped", async () => {
    await access(CLI_PATH);
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-certify-e2e-"));
    roots.push(root);
    await seedSaasPackageCertifyProject(root);

    const sealed = await qfai(root, ["prototyping", "certify", "--scope", "saas-package"]);

    expect(sealed.code).toBe(0);
    const cert = await certificate(root);
    expect(cert.scope).toBe("saas-package");
    const notes = Array.isArray(cert.notes) ? cert.notes : [];
    for (const gate of SAAS_PACKAGE_SKIPPED_GATES) {
      expect(notes.some((note) => typeof note === "string" && note.includes(gate))).toBe(true);
    }
  });

  it("refuses the promotion to full while gates are missing, then promotes once they pass", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-certify-e2e-"));
    roots.push(root);
    await seedSaasPackageCertifyProject(root);
    const upgrade = [
      "prototyping",
      "certify",
      "--scope",
      "saas-package",
      "--upgrade-scope",
      "full",
    ];

    expect((await qfai(root, ["prototyping", "certify", "--scope", "saas-package"])).code).toBe(0);
    const refused = await qfai(root, upgrade);

    expect(refused.code).not.toBe(0);
    for (const gate of SAAS_PACKAGE_SKIPPED_GATES) {
      expect(refused.stderr).toContain(gate);
    }
    expect((await certificate(root)).scope).toBe("saas-package");

    await seedSaasPackageGatesPassing(root);
    const promoted = await qfai(root, upgrade);

    expect(promoted.code).toBe(0);
    const cert = await certificate(root);
    expect(cert.scope).toBeUndefined();
    expect(cert.notes).toBeUndefined();
  });
});
