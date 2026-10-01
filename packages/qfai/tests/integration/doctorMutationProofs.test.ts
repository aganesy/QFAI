import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createDoctorData } from "../../src/core/doctor.js";
import { removeTempTree } from "../helpers/tempTree.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

const CONFIG = [
  "paths:",
  "  specsDir: .qfai/spec",
  "validation:",
  "  traceability:",
  "    testFileGlobs:",
  "      - tests/**/*.test.ts",
  "",
].join("\n");

async function project(testBody: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-mutation-proofs-"));
  roots.push(root);
  await writeFile(path.join(root, "qfai.config.yaml"), CONFIG, "utf-8");
  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(path.join(root, "src", "total.ts"), "export const add = (a, b) => a + b;\n");
  await mkdir(path.join(root, "tests", "unit"), { recursive: true });
  await writeFile(path.join(root, "tests", "unit", "total.test.ts"), testBody, "utf-8");
  return root;
}

async function mutationProofs(root: string) {
  const data = await createDoctorData({ startDir: root, rootExplicit: true });
  return data.checks.find((check) => check.id === "tests.mutationProofs");
}

const WITH_PROOF = [
  'import { it } from "vitest";',
  "",
  `// ${["QFAI", "EX-0001-0001-01"].join(":")}`,
  '// Mutation: src/total.ts `a + b` -> `a - b` fails "adds"',
  'it("adds", () => {});',
  "",
].join("\n");

describe("qfai doctor checks that each mutation proof still names existing code", () => {
  // QFAI:EX-0003-0030-01
  it("is ok while the code holds the original text, and warns once it does not", async () => {
    const root = await project(WITH_PROOF);
    expect((await mutationProofs(root))?.severity).toBe("ok");

    await writeFile(path.join(root, "src", "total.ts"), "export const add = (x, y) => x + y;\n");
    const changed = await mutationProofs(root);
    expect(changed?.severity).toBe("warning");
    expect(changed?.message).toContain("tests/unit/total.test.ts:4");

    await rm(path.join(root, "src", "total.ts"));
    expect((await mutationProofs(root))?.severity).toBe("warning");
  });

  // QFAI:EX-0003-0030-02
  it("reports no check when no example test carries a proof", async () => {
    const root = await project('import { it } from "vitest";\n\nit("adds", () => {});\n');
    expect(await mutationProofs(root)).toBeUndefined();
  });
});
