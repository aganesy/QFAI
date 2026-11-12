/**
 * verify semantics audit tests — spec-0014 migration / compatibility alignment
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runValidate } from "../../src/cli/commands/validate.js";
import { captureStdout } from "../helpers/stdout.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("TC-0014-0018: a validation error keeps verify from passing", () => {
  // QFAI:AC-0001-0156-02
  it("a verify run that reports an error exits non-zero and names the finding", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-verify-semantics-"));
    tempDirs.push(root);
    // A deliberation record without its Interview and Agent decisions sections
    // is a layout error the verify profile reports.
    await mkdir(path.join(root, ".qfai", "deliberation"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai", "deliberation", "20260101000000-broken.md"),
      "# Deliberation record\n\n## Subject\n\nA broken record.\n",
      "utf-8",
    );

    let exit = -1;
    const output = await captureStdout(async () => {
      exit = await runValidate({ root, strict: false, failOn: "error", profile: "verify" });
    });

    expect(exit).toBe(1);
    expect(output).toContain("QFAI-DELIB-001");
  });
});

// QFAI:AC-0001-0156-03
// QFAI:EX-0001-0156-02
describe("TC-0014-0019: removed compatibility surface", () => {
  it("package surface exposes no legacy namespace or compatibility category", async () => {
    const [validatorsIndexSrc, typesSrc] = await Promise.all([
      readFile(
        path.join(repoRoot, "packages", "qfai", "src", "core", "validators", "index.ts"),
        "utf-8",
      ),
      readFile(path.join(repoRoot, "packages", "qfai", "src", "core", "types.ts"), "utf-8"),
    ]);

    expect(validatorsIndexSrc).not.toContain("validators/legacy");
    expect(validatorsIndexSrc).not.toContain("runLegacyUixCompatibilityValidators");
    expect(typesSrc).toMatch(/type\s+IssueCategory\s*=\s*"canonical"\s*\|\s*"change"/);
    expect(typesSrc).not.toContain('"compatibility"');
  });
});
