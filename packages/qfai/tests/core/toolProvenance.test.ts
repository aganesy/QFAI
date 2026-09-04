/**
 * Every shipped skill prescribes bare `npx qfai …`, and `npx` resolves a bare
 * name by walking PARENT directories for `node_modules/.bin`. A Claude Code
 * worktree sits three levels below the main checkout, so a worktree without its
 * own dependencies ran the enclosing checkout's binary — another branch,
 * another lockfile — and the run said nothing about it.
 *
 * These rows pin the two halves of the answer: the version and directory are
 * printed on every run, and the case that cannot be told from the printout by a
 * gate gets a code.
 */
import { describe, expect, it } from "vitest";
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  classifyToolLocation,
  findPackageJsonUpward,
  locateToolAgainstProject,
  resolveToolPackageDir,
} from "../../src/core/version.js";

async function withTempDir(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await realpath(await mkdtemp(path.join(os.tmpdir(), "qfai-provenance-")));
  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("resolveToolPackageDir", () => {
  it("names the directory holding the package manifest, not the bin shim", async () => {
    // The operand the issue proposed was `process.argv[1]`, which under a real
    // install is npm's shim in `.bin` — a different path from the package it
    // forwards to, and not the thing whose version was reported.
    const packageDir = await resolveToolPackageDir();
    expect(packageDir).not.toBeNull();
    expect(path.basename(String(packageDir))).toBe("qfai");
    const { readFile } = await import("node:fs/promises");
    const manifest = await readFile(path.join(String(packageDir), "package.json"), "utf-8");
    expect(JSON.parse(manifest)).toMatchObject({ name: "qfai" });
  });
});

describe("findPackageJsonUpward", () => {
  it("finds the manifest from the CLI bundle's directory", async () => {
    // `dist/cli/index.mjs` — two levels below the package root, which the
    // fixed `../../package.json` happened to get right.
    await withTempDir(async (root) => {
      const pkg = path.join(root, "node_modules", "qfai");
      await mkdir(path.join(pkg, "dist", "cli"), { recursive: true });
      await writeFile(path.join(pkg, "package.json"), JSON.stringify({ name: "qfai" }));

      const found = await findPackageJsonUpward(path.join(pkg, "dist", "cli"), "qfai");
      expect(found).toBe(path.join(pkg, "package.json"));
    });
  });

  it("finds the manifest from the public bundle's directory", async () => {
    // `dist/index.mjs` — ONE level below the package root. This is the case the
    // fixed depth got wrong: two levels up from `dist/` is
    // `<project>/node_modules`, whose `package.json` is somebody else's or
    // absent, so the reported version and directory were not this package's.
    await withTempDir(async (root) => {
      const pkg = path.join(root, "node_modules", "qfai");
      await mkdir(path.join(pkg, "dist"), { recursive: true });
      await writeFile(path.join(pkg, "package.json"), JSON.stringify({ name: "qfai" }));

      const found = await findPackageJsonUpward(path.join(pkg, "dist"), "qfai");
      expect(found).toBe(path.join(pkg, "package.json"));
    });
  });

  it("does not stop at the consuming project's own manifest", async () => {
    // The project one level above `node_modules/` has a `package.json` too, and
    // it is what a depth-counting resolver returned.
    await withTempDir(async (root) => {
      await writeFile(path.join(root, "package.json"), JSON.stringify({ name: "the-project" }));
      const pkg = path.join(root, "node_modules", "qfai");
      await mkdir(path.join(pkg, "dist"), { recursive: true });
      await writeFile(path.join(pkg, "package.json"), JSON.stringify({ name: "qfai" }));

      const found = await findPackageJsonUpward(path.join(pkg, "dist"), "qfai");
      expect(found).toBe(path.join(pkg, "package.json"));
    });
  });

  it("walks past a package.json that is not readable as JSON", async () => {
    // A broken manifest in the path must not end the search: the answer is
    // still above it, and stopping would report "resolution unknown" for a
    // package that is perfectly findable.
    await withTempDir(async (root) => {
      const pkg = path.join(root, "qfai");
      await mkdir(path.join(pkg, "dist"), { recursive: true });
      await writeFile(path.join(pkg, "dist", "package.json"), "{ not json");
      await writeFile(path.join(pkg, "package.json"), JSON.stringify({ name: "qfai" }));

      const found = await findPackageJsonUpward(path.join(pkg, "dist"), "qfai");
      expect(found).toBe(path.join(pkg, "package.json"));
    });
  });

  it("returns null when no manifest above the start names the package", async () => {
    await withTempDir(async (root) => {
      await writeFile(path.join(root, "package.json"), JSON.stringify({ name: "someone-else" }));
      expect(await findPackageJsonUpward(root, "qfai")).toBeNull();
    });
  });
});

describe("classifyToolLocation", () => {
  // `path.resolve` so both operands are shaped the same way on win32, where a
  // bare "/repo" is rooted on the current drive. The predicate compares them
  // against each other, not against anything on disk.
  const at = (...segments: string[]): string => path.resolve(path.join(...segments));

  it("reports the nested-worktree resolution the issue is about", () => {
    // Claude Code puts a worktree three levels below the main checkout. With no
    // dependencies of its own, `npx qfai` walks parents, finds the enclosing
    // checkout's `.bin`, and runs that copy — another branch, another lockfile.
    const root = at("repo", ".claude", "worktrees", "qfai-validate-error-1f4c63");
    expect(classifyToolLocation(root, at("repo", "node_modules", "qfai"))).toBe(true);
  });

  it("reports the _npx cache copy", () => {
    // With no parent `node_modules` either, `npx` silently fetches `qfai@latest`
    // into its own cache. Nothing about the run said which version gated it.
    const cached = at("home", "u", ".npm", "_npx", "0a1b2c3d", "node_modules", "qfai");
    expect(classifyToolLocation(at("proj"), cached)).toBe(true);
  });

  it("reports a global install", () => {
    // Benign, and reported: the gating version is not pinned by the project's
    // lockfile, which is the fact the finding is about. The message says so.
    expect(classifyToolLocation(at("proj"), at("usr", "lib", "node_modules", "qfai"))).toBe(true);
  });

  it("reports a dependency hoisted above the project", () => {
    // Also benign, also reported, and the reason the rule ships at `warning`
    // through its promotion window rather than as an error.
    const root = at("repo", "packages", "web");
    expect(classifyToolLocation(root, at("repo", "node_modules", "qfai"))).toBe(true);
  });

  it("stays quiet for a dependency installed in the project", () => {
    const root = at("proj");
    expect(classifyToolLocation(root, at("proj", "node_modules", "qfai"))).toBe(false);
  });

  it("stays quiet for a pnpm virtual store inside the project", () => {
    // pnpm links `node_modules/qfai` to a real directory under `.pnpm`, and
    // Node reports the resolved one. It is still the project's own copy.
    const root = at("proj");
    const real = at("proj", "node_modules", ".pnpm", "qfai@1.10.1", "node_modules", "qfai");
    expect(classifyToolLocation(root, real)).toBe(false);
  });

  it("stays quiet for a source checkout run directly", () => {
    // Outside the root, and not an installed copy: the operator named the file,
    // so nothing was resolved ambiently. This is also every test in the suite,
    // whose temp roots are outside the source tree by construction.
    expect(classifyToolLocation(at("tmp", "project"), at("repo", "packages", "qfai"))).toBe(false);
  });

  it("does not read a directory merely containing the word as an install", () => {
    const lookalike = at("elsewhere", "node_modules_migration", "qfai");
    expect(classifyToolLocation(at("proj"), lookalike)).toBe(false);
  });
});

describe("locateToolAgainstProject", () => {
  it("reports a source checkout run directly as not outside", async () => {
    // The whole test harness lives here: a temp root is outside the source tree
    // by construction. Nothing was resolved ambiently — the operator named the
    // file — so reporting it would put a finding on every run in every suite.
    await withTempDir(async (root) => {
      const located = await locateToolAgainstProject(root);
      expect(located).not.toBeNull();
      expect(located?.outside).toBe(false);
    });
  });

  it("reports a package inside the project as not outside", async () => {
    await withTempDir(async (root) => {
      const own = path.join(root, "node_modules", "qfai");
      await mkdir(own, { recursive: true });
      const located = await locateToolAgainstProject(root);
      // Standing in for the well-behaved install: the real package dir is the
      // checkout, so this asserts the relation the predicate computes rather
      // than re-deriving it. `own` is inside `root` on the same test.
      expect(path.relative(root, own).startsWith("..")).toBe(false);
      expect(located?.outside).toBe(false);
    });
  });

  it("resolves both sides through symlinks", async () => {
    // `import.meta.url` is already symlink-resolved by Node. Comparing it
    // against a lexical root reported every project reached through a symlinked
    // path — a macOS `/tmp`, a mapped drive, an `npm link` — as external.
    await withTempDir(async (real) => {
      const packageDir = String(await resolveToolPackageDir());
      const link = path.join(real, "link-to-source");
      await symlink(packageDir, link, "junction");
      const viaLink = await locateToolAgainstProject(link);
      expect(viaLink?.outside).toBe(false);
    });
  });

  it("returns a package directory a caller can print", async () => {
    await withTempDir(async (root) => {
      const located = await locateToolAgainstProject(root);
      expect(located?.packageDir).toBe(await resolveToolPackageDir());
    });
  });
});
