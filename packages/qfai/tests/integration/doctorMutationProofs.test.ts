import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import type * as FsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { loadConfig } from "../../src/core/config.js";
import { createDoctorData } from "../../src/core/doctor.js";
import { checkMutationProofs } from "../../src/core/doctor/mutationProofs.js";
import type * as StoryReader from "../../src/core/validators/storyTreeObligations.js";
import { removeTempTree } from "../helpers/tempTree.js";

const scan = vi.hoisted(
  (): {
    fault: Error | undefined;
    truncated: boolean;
    targetFault: Error | undefined;
    targetPath: string | undefined;
    displayTestPath: string | undefined;
  } => ({
    fault: undefined,
    truncated: false,
    targetFault: undefined,
    targetPath: undefined,
    displayTestPath: undefined,
  }),
);

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof FsPromises>();
  return {
    ...actual,
    readFile: async (...args: Parameters<typeof actual.readFile>) => {
      if (args[0] === scan.targetPath && scan.targetFault) throw scan.targetFault;
      return actual.readFile(...args);
    },
  };
});

vi.mock("../../src/core/validators/storyTreeObligations.js", async (importOriginal) => {
  const actual = await importOriginal<typeof StoryReader>();
  return {
    ...actual,
    readStoryTests: async (...args: Parameters<typeof actual.readStoryTests>) => {
      if (scan.fault) throw scan.fault;
      const read = await actual.readStoryTests(...args);
      if (scan.displayTestPath) {
        read.files = read.files.map((file) => ({
          ...file,
          file: scan.displayTestPath ?? file.file,
        }));
      }
      return scan.truncated ? { ...read, truncated: true } : read;
    },
  };
});

const roots: string[] = [];

afterEach(async () => {
  scan.fault = undefined;
  scan.truncated = false;
  scan.targetFault = undefined;
  scan.targetPath = undefined;
  scan.displayTestPath = undefined;
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

describe("mutation-proof target file boundary", () => {
  it.each(["ENOTDIR", "EISDIR"])(
    "warns when %s means the source is no longer a file",
    async (code) => {
      const root = await project(WITH_PROOF);
      const { config } = await loadConfig(root);
      scan.targetPath = path.join(root, "src", "total.ts");
      scan.targetFault = Object.assign(new Error("proof target is no longer a source file"), {
        code,
        path: scan.targetPath,
      });
      const check = await checkMutationProofs(root, config);
      expect(check).toMatchObject({
        id: "tests.mutationProofs",
        severity: "warning",
        details: {
          stale: [
            {
              test: "tests/unit/total.test.ts",
              line: 4,
              target: "src/total.ts",
              original: "a + b",
            },
          ],
        },
      });
    },
  );

  it.each(["EACCES", "EIO"])("preserves the original %s target-read failure", async (code) => {
    const root = await project(WITH_PROOF);
    const { config } = await loadConfig(root);
    scan.targetPath = path.join(root, "src", "total.ts");
    const fault = Object.assign(new Error("cannot read the proof target"), {
      code,
      path: scan.targetPath,
    });
    scan.targetFault = fault;
    await expect(checkMutationProofs(root, config)).rejects.toBe(fault);
  });
});

describe("mutation-proof diagnostic display boundary", () => {
  it("escapes a test filename's newline while retaining the raw structured path", async () => {
    const root = await project(WITH_PROOF);
    const { config } = await loadConfig(root);
    scan.displayTestPath = path.join(root, "tests", "unit", "total\n[ok] forged.test.ts");
    await rm(path.join(root, "src", "total.ts"));
    const check = await checkMutationProofs(root, config);
    if (!check) throw new Error("a missing mutation target must produce a check");
    expect(check.message).not.toContain("\n");
    expect(check.message).toContain("total\\x0a[ok] forged.test.ts:4");
    expect(check.details.stale[0]?.test).toBe("tests/unit/total\n[ok] forged.test.ts");
  });

  it("escapes a target's terminal sequence while retaining its raw structured path", async () => {
    const target = "src/\u001b[2Jmissing.ts";
    const root = await project(WITH_PROOF.replace("src/total.ts", target));
    const { config } = await loadConfig(root);
    scan.targetPath = path.resolve(root, target);
    scan.targetFault = Object.assign(new Error("proof target is missing"), {
      code: "ENOENT",
      path: scan.targetPath,
    });
    const check = await checkMutationProofs(root, config);
    if (!check) throw new Error("a missing mutation target must produce a check");
    expect(check.message).not.toContain("\u001b");
    expect(check.message).toContain("src/\\x1b[2Jmissing.ts");
    expect(check.details.stale[0]?.target).toBe(target);
  });
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
  // QFAI:AC-0003-0030-01
  // QFAI:EX-0003-0030-01
  it("is ok while the code holds the original text, and warns once it does not", async () => {
    const root = await project(WITH_PROOF);
    expect((await mutationProofs(root))?.severity).toBe("ok");

    await writeFile(path.join(root, "src", "total.ts"), "export const add = (x, y) => x + y;\n");
    const changed = await mutationProofs(root);
    expect(changed?.severity).toBe("warning");
    expect(changed?.message).toContain("tests/unit/total.test.ts:4");
    if (!changed?.details) throw new Error("stale mutation proof must include diagnostic details");
    expect(changed.details.stale).toEqual([
      { test: "tests/unit/total.test.ts", line: 4, target: "src/total.ts", original: "a + b" },
    ]);

    await rm(path.join(root, "src", "total.ts"));
    const missing = await mutationProofs(root);
    expect(missing?.severity).toBe("warning");
    expect(missing?.message).toContain("tests/unit/total.test.ts:4");
    if (!missing?.details)
      throw new Error("missing mutation target must include diagnostic details");
    expect(missing.details.stale).toEqual([
      { test: "tests/unit/total.test.ts", line: 4, target: "src/total.ts", original: "a + b" },
    ]);
  });

  // QFAI:EX-0003-0030-02
  it("reports no check when no example test carries a proof", async () => {
    const root = await project('import { it } from "vitest";\n\nit("adds", () => {});\n');
    expect(await mutationProofs(root)).toBeUndefined();
  });
});

describe("mutation-proof scan failure boundary", () => {
  it.each(["EACCES", "EIO"])("preserves the original %s test-read failure", async (code) => {
    const root = await project(WITH_PROOF);
    const { config } = await loadConfig(root);
    const fault = Object.assign(new Error("cannot read the selected example test"), {
      code,
      path: path.join(root, "tests", "unit", "total.test.ts"),
    });
    scan.fault = fault;
    await expect(checkMutationProofs(root, config)).rejects.toBe(fault);
  });

  it.each(["", WITH_PROOF])(
    "refuses a truncated scan before reporting null or ok",
    async (body) => {
      const root = await project(body);
      const { config } = await loadConfig(root);
      scan.truncated = true;
      await expect(checkMutationProofs(root, config)).rejects.toThrow(
        /mutation proof.*incomplete/i,
      );
    },
  );
});
