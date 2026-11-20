/**
 * A contract directory the declared-ID scan cannot list stops the scan rather
 * than dropping that directory's declarations from every distributed-surface
 * guard.
 *
 * `readdirSync` is mocked to refuse one directory, because a permission failure
 * cannot be made portably on every platform the suite runs on (a mode change
 * does not restrict a directory on Windows, nor for a privileged user).
 * `vi.mock` is hoisted to module scope, so these cases live in their own file.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type * as fs from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

type Fs = typeof fs;

const refusal = vi.hoisted(() => ({ dir: "", code: "EACCES" }));

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<Fs>("node:fs");
  return {
    ...actual,
    readdirSync: (...args: Parameters<Fs["readdirSync"]>) => {
      if (refusal.dir !== "" && path.resolve(String(args[0])) === refusal.dir) {
        throw Object.assign(
          new Error(`${refusal.code}: operation failed, scandir '${refusal.dir}'`),
          { code: refusal.code },
        );
      }
      return Reflect.apply(actual.readdirSync, actual, args) as unknown;
    },
  };
});

const { declaredSampleBandIds, declaredSampleBandPattern } =
  await import("../../scripts/lib/declared-sample-band-ids.mjs");

const CONTRACTS = path.join(".qfai", "spec", "03_contract");
const tempDirs: string[] = [];

/** A tree with one declared rule in `cli/` and a second contract directory `api/`. */
async function newTree(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-declared-band-"));
  tempDirs.push(root);
  await mkdir(path.join(root, CONTRACTS, "cli"), { recursive: true });
  await writeFile(
    path.join(root, CONTRACTS, "cli", "cli-0001-sample.md"),
    "| BR-CLI-0001-0001 | A rule. | EX-0001-0001-01 |\n",
    "utf-8",
  );
  await mkdir(path.join(root, CONTRACTS, "api"), { recursive: true });
  await writeFile(
    path.join(root, CONTRACTS, "api", "api-0002-sample.md"),
    "| BR-API-0002-0003 | A rule. | EX-0001-0001-02 |\n",
    "utf-8",
  );
  return root;
}

afterEach(async () => {
  refusal.dir = "";
  refusal.code = "EACCES";
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined) await rm(dir, { recursive: true, force: true });
  }
});

describe("a contract directory the declared-ID scan cannot list", () => {
  it.each(["EACCES", "EIO", "ENOENT"])(
    "throws naming a nested directory refused with %s, keeping the cause",
    async (code) => {
      const root = await newTree();
      const refused = path.join(root, CONTRACTS, "api");
      refusal.dir = refused;
      refusal.code = code;

      let thrown: unknown;
      try {
        declaredSampleBandIds(root);
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(Error);
      expect(String(thrown)).toContain(refused);
      expect(thrown).toMatchObject({ cause: { code } });
      expect(() => declaredSampleBandPattern(root)).toThrow(refused);
    },
  );

  it("throws for a contract root that exists but cannot be listed", async () => {
    const root = await newTree();
    const refused = path.join(root, CONTRACTS);
    refusal.dir = refused;

    expect(() => declaredSampleBandIds(root)).toThrow(refused);
  });

  it("finds nothing for an absent contract root", async () => {
    const root = await newTree();
    await rm(path.join(root, ".qfai"), { recursive: true, force: true });

    expect(declaredSampleBandIds(root)).toEqual({ businessRules: [], contractNames: [] });
  });

  it("lists every declaration when every directory lists", async () => {
    const root = await newTree();

    expect(declaredSampleBandIds(root)).toEqual({
      businessRules: ["BR-API-0002-0003", "BR-CLI-0001-0001"],
      contractNames: ["api-0002-sample", "cli-0001-sample"],
    });
  });
});
