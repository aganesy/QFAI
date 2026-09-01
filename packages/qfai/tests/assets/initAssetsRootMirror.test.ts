/**
 * The root `.qfai/` tree is a generated mirror of
 * `packages/qfai/assets/init/.qfai/`, produced by
 * `scripts/sync-init-to-root.mjs` (`pnpm sync:ssot`).
 *
 * Until now the only thing holding the two halves together was `pnpm ci:gate`,
 * which runs `sync:ssot` and then `git diff --exit-code .qfai/`. CI does not run
 * `ci:gate` — it runs `ci:lint`, the type checks, the test projects,
 * `ci:coverage`, `ci:build-verify` and `qfai validate`. So a change that edited
 * one half and forgot the other reached main with the trees diverged, and the
 * next contributor to run `sync:ssot` picked up an unrelated diff.
 *
 * This test applies the same rule the sync script does: every file under the
 * init assets must exist at the mirrored root path with identical bytes. Root-
 * only files are ignored, exactly as `sync-init-to-root.mjs` ignores them — it
 * copies init -> root and never deletes.
 *
 * `qfai.config.yaml` is the one exception, and the script says so: it is seeded
 * when absent, never overwritten. See the second case.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { defaultConfig } from "../../src/core/config.js";
import { validateTestTodoStubs } from "../../src/core/validators/testTodoStubs.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const initQfaiDir = path.join(repoRoot, "packages", "qfai", "assets", "init", ".qfai");
const rootQfaiDir = path.join(repoRoot, ".qfai");
const initRootConfig = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  "root",
  "qfai.config.yaml",
);
const rootConfig = path.join(repoRoot, "qfai.config.yaml");

/**
 * `validation.testStrategy` keys kept on the public type and on
 * `defaultConfig` only so existing TypeScript consumers keep compiling. No
 * validator reads them; they must never reappear in a shipped
 * `qfai.config.yaml`.
 */
const DEPRECATED_TEST_STRATEGY_KEYS = new Set(["requireLayerTags", "requireSizeTags"]);

/** Every file under `dir`, as paths relative to `dir`, with `/` separators. */
async function collectFiles(dir: string, base: string = dir): Promise<string[]> {
  const collected: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return collected;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collected.push(...(await collectFiles(full, base)));
    } else {
      collected.push(path.relative(base, full).replace(/\\/g, "/"));
    }
  }
  return collected;
}

/** Narrow an unknown YAML node to a plain object, or null when it is not one. */
function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const record: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    record[key] = entry;
  }
  return record;
}

async function readOrNull(filePath: string): Promise<Buffer | null> {
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}

describe("init assets root mirror", () => {
  it("mirrors every init .qfai file to the repo root byte-for-byte", async () => {
    const initFiles = await collectFiles(initQfaiDir);
    expect(initFiles.length).toBeGreaterThan(0);

    const missing: string[] = [];
    const differing: string[] = [];
    for (const relative of initFiles) {
      const [source, mirrored] = await Promise.all([
        readOrNull(path.join(initQfaiDir, relative)),
        readOrNull(path.join(rootQfaiDir, relative)),
      ]);
      if (mirrored === null) {
        missing.push(`.qfai/${relative}`);
      } else if (source !== null && !source.equals(mirrored)) {
        differing.push(`.qfai/${relative}`);
      }
    }

    expect(
      { missing, differing },
      "root .qfai/ is out of sync with packages/qfai/assets/init/.qfai/ — run `pnpm sync:ssot`",
    ).toEqual({ missing: [], differing: [] });
  });

  // `qfai.config.yaml` is SEEDED, not mirrored: `sync-init-to-root.mjs` writes
  // it only when the root copy is missing. The init asset is what a fresh
  // project starts from and deliberately leaves `testFileGlobs` empty, while
  // the root copy is this repository's own tuned config. Asserting byte
  // equality would forbid this repo from ever configuring itself.
  it("seeds qfai.config.yaml from an init asset that exists and parses", async () => {
    const [source, seeded] = await Promise.all([
      readOrNull(initRootConfig),
      readOrNull(rootConfig),
    ]);
    expect(source, "packages/qfai/assets/init/root/qfai.config.yaml is missing").not.toBeNull();
    expect(seeded, "qfai.config.yaml is missing at the repo root").not.toBeNull();
    if (source === null || seeded === null) {
      return;
    }
    // Both are real configs, not placeholders: each declares the two keys the
    // seed exists to establish. A truncated asset would seed a project with a
    // file `qfai validate` cannot use.
    for (const [label, buffer] of [
      ["init asset", source],
      ["repo root", seeded],
    ] as const) {
      const text = buffer.toString("utf-8");
      expect(text, `${label} qfai.config.yaml has no validation block`).toMatch(/^validation:/m);
      expect(text, `${label} qfai.config.yaml has no paths block`).toMatch(/^paths:/m);
    }
  });

  // The shipped `testStrategy` block used to declare `requireLayerTags` and
  // `requireSizeTags`, which nothing outside `config.ts` ever read, and to omit
  // `forbidTestTodoStubs`, the one key a validator actually gates on. Hold the
  // shipped surface equal to the LIVE surface the loader resolves, so every key
  // an operator can see in the file is a key that can change an outcome. The
  // two retired knobs stay on `defaultConfig` purely as a deprecated compat
  // shim for TypeScript consumers of the public `QfaiValidationConfig` type
  // (same treatment as `paths.promptsDir`, which is likewise unshipped), so
  // they are excluded here rather than seeded back into a fresh project.
  //
  // The name is about the SHIPPED surface, not about what `loadConfig` returns:
  // the loader resolves the two deprecated compat keys as well, and always has.
  // What this case holds is narrower — the file an operator opens lists exactly
  // the keys that can still change an outcome.
  it("ships exactly the testStrategy keys that can change an outcome", async () => {
    const liveKeys = Object.keys(defaultConfig.validation.testStrategy)
      .filter((key) => !DEPRECATED_TEST_STRATEGY_KEYS.has(key))
      .sort();
    expect(liveKeys, "forbidTestTodoStubs is the live gate and must stay resolvable").toContain(
      "forbidTestTodoStubs",
    );
    for (const key of DEPRECATED_TEST_STRATEGY_KEYS) {
      expect(liveKeys, `${key} is deprecated and must not be advertised as live`).not.toContain(
        key,
      );
    }

    for (const [label, filePath] of [
      ["init asset", initRootConfig],
      ["repo root", rootConfig],
    ] as const) {
      const buffer = await readOrNull(filePath);
      expect(buffer, `${label} qfai.config.yaml is missing`).not.toBeNull();
      if (buffer === null) {
        continue;
      }
      const validation = asRecord(asRecord(parseYaml(buffer.toString("utf-8")))?.validation);
      const testStrategy = asRecord(validation?.testStrategy);
      expect(
        testStrategy,
        `${label} qfai.config.yaml has no validation.testStrategy block`,
      ).not.toBeNull();
      if (testStrategy === null) {
        continue;
      }
      expect(
        Object.keys(testStrategy).sort(),
        `${label} testStrategy keys drifted from the live, non-deprecated key set`,
      ).toEqual(liveKeys);
    }
  });

  // The shipped comment used to say the `forbidTestTodoStubs` opt-out "needs an
  // accompanying waiver DR-ID", which reads as a requirement something enforces.
  // Nothing does: `validateTestTodoStubs` returns an empty array the moment the
  // flag is false, and no field on `QfaiValidationConfig` carries a DR-ID to
  // associate. A project could therefore follow the shipped instruction, write
  // no waiver at all, and still see `qfai validate` succeed. Pin the two halves
  // together — the behaviour AND the sentence describing it — so that whichever
  // one moves next, the other is forced to move with it.
  //
  // Only the init asset is read. `qfai.config.yaml` is seeded, not mirrored
  // (`scripts/sync-init-to-root.mjs`): the repo root copy is this repository's
  // own live config and diverges on purpose, so its comments are not the text a
  // fresh `qfai init` hands a new project. The instruction under review is the
  // shipped one.
  it("does not promise enforcement of the stub opt-out that no validator performs", async () => {
    const optedOut = structuredClone(defaultConfig);
    optedOut.validation.testStrategy.forbidTestTodoStubs = false;
    optedOut.validation.traceability.testFileGlobs = ["tests/**/*.test.ts"];
    expect(
      await validateTestTodoStubs(repoRoot, optedOut),
      "opting out silences the stub check entirely; if this ever reports, the shipped comment must say so",
    ).toEqual([]);

    const buffer = await readOrNull(initRootConfig);
    expect(buffer, "init asset qfai.config.yaml is missing").not.toBeNull();
    if (buffer === null) {
      return;
    }
    const text = buffer.toString("utf-8");
    expect(
      text,
      "shipped qfai.config.yaml still states the waiver as a requirement something checks",
    ).not.toMatch(/needs an accompanying waiver DR-ID/);
    expect(text, "shipped qfai.config.yaml must say the opt-out is not machine-checked").toMatch(
      /not machine-checked/,
    );
  });
});
