/**
 * `qfai prototyping certify --scope saas-package` and `--upgrade-scope full`,
 * entered through the command line.
 *
 * The function-level suites pass each flag's value straight to
 * `runPrototypingCertify`, so a change to argument parsing or dispatch that
 * stopped forwarding either flag would leave them all passing. These cases run
 * the same argv an operator types.
 */
// QFAI:SPEC-0014:TC-0014-0035
// QFAI:SPEC-0014:TC-0014-0036

import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { run } from "../../src/cli/main.js";
import { SAAS_PACKAGE_SKIPPED_GATES } from "../../src/core/saasPackage/skippedGates.js";
import {
  CERTIFICATE_REL,
  seedSaasPackageCertifyProject,
  seedSaasPackageGatesPassing,
} from "../helpers/saasPackageCertifyFixture.js";

const roots: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) await rm(root, { recursive: true, force: true });
  }
});

async function newProject(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-certify-cli-"));
  roots.push(root);
  await seedSaasPackageCertifyProject(root);
  return root;
}

/** One `qfai` invocation: its exit code and what it wrote to stderr. */
async function qfai(root: string, args: string[]): Promise<{ exitCode: number; stderr: string }> {
  const chunks: string[] = [];
  vi.spyOn(process.stderr, "write").mockImplementation((chunk: unknown) => {
    if (typeof chunk === "string") chunks.push(chunk);
    else if (chunk instanceof Uint8Array) chunks.push(Buffer.from(chunk).toString("utf-8"));
    return true;
  });
  const previous = process.exitCode;
  process.exitCode = undefined;
  try {
    await run([...args, "--root", root], root);
    const code = process.exitCode;
    return {
      exitCode: typeof code === "number" ? code : Number(code ?? 0),
      stderr: chunks.join(""),
    };
  } finally {
    process.exitCode = previous;
    vi.restoreAllMocks();
  }
}

async function certificate(root: string): Promise<Record<string, unknown>> {
  const parsed: unknown = JSON.parse(await readFile(path.join(root, CERTIFICATE_REL), "utf-8"));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${CERTIFICATE_REL} is not a JSON object`);
  }
  return Object.fromEntries(Object.entries(parsed));
}

describe("TC-0014-0035: certify --scope saas-package from the command line", () => {
  it("seals a certificate scoped to saas-package whose notes name every skipped gate", async () => {
    const root = await newProject();

    const { exitCode } = await qfai(root, ["prototyping", "certify", "--scope", "saas-package"]);

    expect(exitCode).toBe(0);
    const cert = await certificate(root);
    expect(cert.scope).toBe("saas-package");
    const notes = Array.isArray(cert.notes) ? cert.notes : [];
    for (const gate of SAAS_PACKAGE_SKIPPED_GATES) {
      expect(notes.some((note) => typeof note === "string" && note.includes(gate))).toBe(true);
    }
  });
});

describe("TC-0014-0036: certify --upgrade-scope full from the command line", () => {
  it("refuses the upgrade while the skipped gates are missing, naming them", async () => {
    const root = await newProject();
    expect((await qfai(root, ["prototyping", "certify", "--scope", "saas-package"])).exitCode).toBe(
      0,
    );

    const { exitCode, stderr } = await qfai(root, [
      "prototyping",
      "certify",
      "--scope",
      "saas-package",
      "--upgrade-scope",
      "full",
    ]);

    expect(exitCode).not.toBe(0);
    for (const gate of SAAS_PACKAGE_SKIPPED_GATES) {
      expect(stderr).toContain(gate);
    }
    expect((await certificate(root)).scope).toBe("saas-package");
  });

  it("promotes the certificate to full once the skipped gates pass", async () => {
    const root = await newProject();
    expect((await qfai(root, ["prototyping", "certify", "--scope", "saas-package"])).exitCode).toBe(
      0,
    );
    // Sealed scope-limited first, so a promotion cannot pass on a certificate
    // that was never scoped.
    expect((await certificate(root)).scope).toBe("saas-package");
    await seedSaasPackageGatesPassing(root);

    const { exitCode } = await qfai(root, [
      "prototyping",
      "certify",
      "--scope",
      "saas-package",
      "--upgrade-scope",
      "full",
    ]);

    expect(exitCode).toBe(0);
    const cert = await certificate(root);
    expect(cert.scope).toBeUndefined();
    expect(cert.notes).toBeUndefined();
  });
});
