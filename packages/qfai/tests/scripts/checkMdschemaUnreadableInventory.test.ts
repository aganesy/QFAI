/**
 * A document directory the Markdown-schema lane cannot list is a finding, not
 * an absence.
 *
 * `readdirSync` is mocked to refuse one directory, because a permission failure
 * cannot be made portably on every platform the suite runs on (a mode change
 * does not restrict a directory on Windows, nor for a privileged user).
 * `vi.mock` is hoisted to module scope, so these cases live in their own file.
 * The failure travels through the real traversal; only the operating system's
 * refusal is replaced.
 */
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import type * as fs from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

type Fs = typeof fs;

const refusal = vi.hoisted(() => ({ dir: "", code: "EACCES", stat: "" }));

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
    statSync: (...args: Parameters<Fs["statSync"]>) => {
      if (refusal.stat !== "" && path.resolve(String(args[0])) === refusal.stat) {
        throw Object.assign(new Error(`EACCES: permission denied, stat '${refusal.stat}'`), {
          code: "EACCES",
        });
      }
      return Reflect.apply(actual.statSync, actual, args) as unknown;
    },
  };
});

const { checkDocuments, main } = await import("../../assets/scripts/check-mdschema.mjs");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../../..");

const CONFORMING_FLOW = readFileSync(
  path.join(
    REPO_ROOT,
    "packages/qfai/assets/init/.qfai/assistant/skill/qfai-sdd/templates/spec/02_business-flow/business-flow-NNNN/business-flow.md",
  ),
  "utf-8",
).replace(/\r\n/g, "\n");

const FLOWS = ".qfai/spec/02_business-flow";
const READABLE = `${FLOWS}/business-flow-0001`;
const HIDDEN = `${FLOWS}/business-flow-0002`;

const tempDirs: string[] = [];

/** A tree with one conforming flow and a second flow directory the lane will be refused. */
async function newTree(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-mdschema-inventory-"));
  tempDirs.push(root);
  await mkdir(path.join(root, READABLE), { recursive: true });
  await writeFile(path.join(root, READABLE, "business-flow.md"), CONFORMING_FLOW, "utf-8");
  await mkdir(path.join(root, HIDDEN), { recursive: true });
  refusal.dir = path.join(root, HIDDEN);
  return root;
}

afterEach(async () => {
  refusal.dir = "";
  refusal.code = "EACCES";
  refusal.stat = "";
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined) await rm(dir, { recursive: true, force: true });
  }
});

/** Runs the lane's entry point over `root`, capturing what it prints. */
function runMain(root: string): { status: number; stdout: string; stderr: string } {
  const argv = process.argv;
  const out: string[] = [];
  const err: string[] = [];
  const log = vi.spyOn(console, "log").mockImplementation((...parts: unknown[]) => {
    out.push(parts.join(" "));
  });
  const error = vi.spyOn(console, "error").mockImplementation((...parts: unknown[]) => {
    err.push(parts.join(" "));
  });
  process.argv = [argv[0] ?? "node", "check-mdschema", "--root", root, "--scope", "all"];
  try {
    const status = main();
    return { status, stdout: out.join("\n"), stderr: err.join("\n") };
  } finally {
    process.argv = argv;
    log.mockRestore();
    error.mockRestore();
  }
}

describe("a document directory the lane cannot list", () => {
  it.each(["EACCES", "EIO", "EMFILE"])(
    "returns it as a violation that keeps the %s cause",
    async (code) => {
      const root = await newTree();
      refusal.code = code;

      const result = checkDocuments(root);

      expect(result).toEqual({
        ok: true,
        checked: 1,
        violations: [
          expect.objectContaining({
            file: HIDDEN,
            rule: "inventory",
            line: 1,
            message: expect.stringContaining(code) as unknown,
          }),
        ],
      });
      expect(JSON.stringify(checkDocuments(root))).not.toContain(path.basename(root));
    },
  );

  it("fails the command and names the directory and the cause", async () => {
    const root = await newTree();

    const result = runMain(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(HIDDEN);
    expect(result.stderr).toContain("EACCES");
    expect(result.stderr).toContain("[inventory]");
  });

  it("keeps a directory that vanished during the walk as a tolerated absence", async () => {
    const root = await newTree();
    refusal.code = "ENOENT";

    expect(checkDocuments(root)).toEqual({ ok: true, checked: 1, violations: [] });
    const result = runMain(root);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
  });

  it("passes a tree whose every directory lists", async () => {
    const root = await newTree();
    refusal.dir = "";

    expect(checkDocuments(root)).toEqual({ ok: true, checked: 1, violations: [] });
  });
});

describe("a configured document root the lane cannot walk", () => {
  const CONTRACTS = ".qfai/spec/03_contract";

  it("reports a configured root that is a file, and fails the command", async () => {
    const root = await newTree();
    refusal.dir = "";
    await writeFile(path.join(root, CONTRACTS), "not a directory", "utf-8");

    expect(checkDocuments(root)).toEqual({
      ok: true,
      checked: 1,
      violations: [
        expect.objectContaining({
          file: CONTRACTS,
          rule: "inventory",
          message: expect.stringContaining("is not a directory") as unknown,
        }),
      ],
    });
    const result = runMain(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(CONTRACTS);
  });

  it("reports a configured root that cannot be inspected, keeping its cause", async () => {
    const root = await newTree();
    refusal.dir = "";
    await mkdir(path.join(root, CONTRACTS), { recursive: true });
    refusal.stat = path.join(root, CONTRACTS);

    expect(checkDocuments(root)).toEqual({
      ok: true,
      checked: 1,
      violations: [
        expect.objectContaining({
          file: CONTRACTS,
          rule: "inventory",
          message: expect.stringContaining("could not be inspected (EACCES") as unknown,
        }),
      ],
    });
    const result = runMain(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(CONTRACTS);
    expect(result.stderr).toContain("EACCES");
  });

  it("keeps an absent configured root a tolerated absence", async () => {
    const root = await newTree();
    refusal.dir = "";

    expect(checkDocuments(root)).toEqual({ ok: true, checked: 1, violations: [] });
  });
});
