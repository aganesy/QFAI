/**
 * Spawn-based tests for `scripts/generate-emitted-rule-codes.mjs`.
 *
 * The generator's contract:
 *   - `--check` with the committed module in sync -> exit 0
 *   - `--check` with a stale module               -> exit 1
 *   - unknown flag                                -> exit 2
 *
 * The first case is the one that matters in CI: `src/core/emittedRuleCodes.ts`
 * is what the waiver engine consults to tell a mistyped rule id apart from a
 * real rule that stayed quiet, so a new validator whose code never reaches the
 * generated module would make waivers for that code read as unknown. Running
 * the generator in `--check` mode here fails the moment the two drift apart.
 *
 * The scanning cases use `--src` / `--out` against synthetic fixtures so they
 * assert the extraction rules without depending on the real source tree.
 */
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tests/scripts → tests → packages/qfai
const PACKAGE_ROOT = path.resolve(__dirname, "../..");
const SCRIPT = path.join(PACKAGE_ROOT, "scripts", "generate-emitted-rule-codes.mjs");

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runGenerator(args: string[]): RunResult {
  const child = spawnSync("node", [SCRIPT, ...args], { encoding: "utf-8" });
  return {
    status: child.status,
    stdout: child.stdout ?? "",
    stderr: child.stderr ?? "",
  };
}

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-rule-codes-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("generate-emitted-rule-codes.mjs", () => {
  it("reports the committed emittedRuleCodes.ts as in sync", () => {
    const result = runGenerator(["--check"]);

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  it("exits 1 when the generated module is stale", async () => {
    const dir = await newTempDir();
    const source = path.join(dir, "validator.ts");
    const output = path.join(dir, "emittedRuleCodes.ts");
    await writeFile(source, 'issue("QFAI-EXAMPLE-001", "msg");\n', "utf-8");
    await writeFile(output, "export const EMITTED_RULE_CODES = [];\n", "utf-8");

    const result = runGenerator(["--check", "--src", dir, "--out", output]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("stale");
  });

  it("collects both the issue() call and the code: field spellings", async () => {
    const dir = await newTempDir();
    const output = path.join(dir, "emittedRuleCodes.ts");
    await writeFile(
      path.join(dir, "a.ts"),
      ['issue("QFAI-EXAMPLE-001", "msg");', 'const x = { code: "E_EXAMPLE_ORPHAN" };'].join("\n"),
      "utf-8",
    );
    // Neither literal is a rule id: one is lowercase, one is a dotted
    // validator path used as a `rule`, not a `code`.
    await writeFile(
      path.join(dir, "b.ts"),
      ['issue("not-a-code", "msg");', 'const y = { code: "specPack.layerPolicy" };'].join("\n"),
      "utf-8",
    );

    const result = runGenerator(["--src", dir, "--out", output]);
    const written = await readFile(output, "utf-8");

    expect(result.status).toBe(0);
    expect(written).toContain('"E_EXAMPLE_ORPHAN"');
    expect(written).toContain('"QFAI-EXAMPLE-001"');
    expect(written).not.toContain("not-a-code");
    expect(written).not.toContain("specPack.layerPolicy");
  });

  it("exits 2 on an unknown flag", () => {
    const result = runGenerator(["--nope"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("unknown argument");
  });
});
