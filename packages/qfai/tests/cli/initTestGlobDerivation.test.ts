/**
 * `qfai init` aims `testFileGlobs` at the repository it is initialising.
 *
 * The key selects the files two gates read: the SC traceability lane, and the
 * stub scan behind `QFAI-TEST-001`. Written empty, both are pointed at nothing
 * — the stub gate enabled and unable to fire however many stubs exist, over a
 * scan that opened no file. `QFAI-TEST-002` reports that at `info`, but on a
 * tree the tool just produced it reports it about the shipped default rather
 * than about the project.
 *
 * So a fresh config carries the layouts the repository actually has, and `[]`
 * survives only where nothing matched — where it is a fact about that
 * repository.
 */

import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import {
  CANDIDATE_TEST_FILE_GLOBS,
  deriveTestFileGlobs,
  EMPTY_TEST_FILE_GLOBS_LINE,
  withDerivedTestFileGlobs,
} from "../../src/core/testGlobDerivation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.resolve(__dirname, "../../assets/init/root/qfai.config.yaml");

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-globs-"));
  try {
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function plant(root: string, relFile: string): Promise<void> {
  const full = path.join(root, relFile);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, "// a test file\n", "utf-8");
}

const globsLineOf = (config: string): string =>
  config.split("\n").find((line) => line.trimStart().startsWith("testFileGlobs:")) ?? "";

describe("the shipped template and the candidates stay one list", () => {
  it("documents every candidate it may write", async () => {
    // A candidate the template does not mention would be written into a project
    // whose config gives its reader no account of it.
    const template = await readFile(TEMPLATE, "utf-8");
    for (const glob of CANDIDATE_TEST_FILE_GLOBS) {
      expect(template, `the config comment does not document ${glob}`).toContain(glob);
    }
  });

  it("still carries the empty line the derivation replaces", async () => {
    // The replacement is a targeted line edit. If the template's shape moves,
    // the edit silently stops happening — this is what makes that loud.
    const template = await readFile(TEMPLATE, "utf-8");
    expect(template).toContain(`${EMPTY_TEST_FILE_GLOBS_LINE}\n`);
  });
});

describe("deriveTestFileGlobs reads the tree, not a stack guess", () => {
  it("returns only the layouts that select a real file", async () => {
    await withProject(async (root) => {
      await plant(root, "tests/unit/thing.test.ts");
      await plant(root, "features/checkout.feature");

      expect(await deriveTestFileGlobs(root)).toEqual([
        "tests/**/*.test.ts",
        "features/**/*.feature",
      ]);
    });
  });

  it("returns nothing for a repository with no test file", async () => {
    await withProject(async (root) => {
      await plant(root, "src/index.ts");

      expect(await deriveTestFileGlobs(root)).toEqual([]);
    });
  });

  it("does not read a dependency's vendored tests as this repository's layout", async () => {
    // Without the default excludes, `**/*_test.go` matches inside node_modules
    // on a repository with no Go in it at all.
    await withProject(async (root) => {
      await plant(root, "node_modules/some-dep/pkg/thing_test.go");
      await plant(root, "dist/bundled.test.ts");

      expect(await deriveTestFileGlobs(root)).toEqual([]);
    });
  });
});

describe("withDerivedTestFileGlobs edits the line and nothing else", () => {
  it("keeps every comment around the value", async () => {
    const template = await readFile(TEMPLATE, "utf-8");

    const after = withDerivedTestFileGlobs(template, ["tests/**/*.test.ts"]);

    expect(after).toContain(`testFileGlobs: ["tests/**/*.test.ts"]`);
    // The comment block is the reader's only account of what the key selects.
    expect(after).toContain("Run /qfai-configure to");
    expect(after).toContain("The layouts init recognises:");
    expect(after.split("\n").length).toBe(template.split("\n").length);
  });

  it("leaves the file alone when nothing was derived", async () => {
    const template = await readFile(TEMPLATE, "utf-8");

    expect(withDerivedTestFileGlobs(template, [])).toBe(template);
  });

  it("leaves the file alone when the line it edits is gone", () => {
    const moved = "validation:\n  traceability:\n    testFileGlobs:\n      - kept\n";

    expect(withDerivedTestFileGlobs(moved, ["tests/**/*.test.ts"])).toBe(moved);
  });

  it("edits a CRLF template and keeps its line endings", async () => {
    // A checkout under `core.autocrlf` gives the template CRLF. Matching LF
    // alone reads as "the line is gone" and returns the file untouched, so
    // every such project keeps the empty value this function exists to replace.
    const template = (await readFile(TEMPLATE, "utf-8")).replace(/\n/g, "\r\n");

    const after = withDerivedTestFileGlobs(template, ["tests/**/*.test.ts"]);

    expect(after).toContain(`testFileGlobs: ["tests/**/*.test.ts"]\r\n`);
    expect(after).not.toContain(EMPTY_TEST_FILE_GLOBS_LINE);
    // Every line ending stays CRLF: a lone LF here would be the one line in
    // the file that differs from the rest.
    expect(after.split("\n").length).toBe(after.split("\r\n").length);
  });
});

describe("qfai init writes the derived value", () => {
  it("points a fresh config at the layouts the repository has", async () => {
    await withProject(async (root) => {
      await plant(root, "tests/unit/thing.test.ts");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const config = await readFile(path.join(root, "qfai.config.yaml"), "utf-8");
      expect(globsLineOf(config)).toBe(`    testFileGlobs: ["tests/**/*.test.ts"]`);
    });
  });

  it("replaces the config by rename, keeping its mode and leaving no temp file", async () => {
    // The refinement rewrites a file every later `validate` and `doctor` run
    // reads. Writing over it truncates first, so a failure partway through
    // leaves a half-written config and no copy of what it replaced. The
    // replacement goes through a temp file beside the target: it is created
    // `0600` and widened before the rename, and it is this function's alone —
    // a leftover would put a partial YAML in the project root.
    await withProject(async (root) => {
      await plant(root, "tests/unit/thing.test.ts");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const config = path.join(root, "qfai.config.yaml");
      expect(globsLineOf(await readFile(config, "utf-8"))).toContain(`"tests/**/*.test.ts"`);
      const mode = (await stat(config)).mode & 0o777;
      expect(mode, "the temp file's own 0600 must not survive the rename").not.toBe(0o600);
      const sibling = (await stat(path.join(root, "AGENTS.md"))).mode & 0o777;
      expect(mode, "the same mode as a root file the same run copied").toBe(sibling);
      expect((await readdir(root)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
    });
  });

  it("leaves the empty value on a repository with no test file", async () => {
    await withProject(async (root) => {
      await plant(root, "src/index.ts");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const config = await readFile(path.join(root, "qfai.config.yaml"), "utf-8");
      expect(globsLineOf(config)).toBe(EMPTY_TEST_FILE_GLOBS_LINE);
    });
  });

  it("does not rewrite a config this run did not write", async () => {
    // The copy is create-only, so an existing config is the adopter's — already
    // tuned, perhaps by `/qfai-configure`. Re-running init must not replace a
    // value they chose, including a deliberate empty one.
    await withProject(async (root) => {
      await plant(root, "tests/unit/thing.test.ts");
      const config = path.join(root, "qfai.config.yaml");
      await writeFile(config, "custom config\n", "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      expect(await readFile(config, "utf-8")).toBe("custom config\n");
    });
  });

  it("writes nothing under --dry-run", async () => {
    await withProject(async (root) => {
      await plant(root, "tests/unit/thing.test.ts");

      await runInit({ dir: root, force: false, dryRun: true, yes: true });

      await expect(readFile(path.join(root, "qfai.config.yaml"), "utf-8")).rejects.toThrow();
    });
  });
});
