/**
 * The BP/AP rule database validator emits 12 codes, 11 of them at `error`, and
 * it runs on every `uiux` pass. Its only previous test pointed it at an empty
 * directory, where the glob matches nothing and the early return fires before a
 * single rule is reached — so a drift in `paths.contractsDir`, in the filename
 * pattern, in the required-field lists or in the enum lists would have turned
 * every finding into a clean report and no test would have moved.
 *
 * Silent under-reporting is the failure mode here, not a crash: "nothing owed"
 * and "nothing scanned" are indistinguishable from the outside. So this file
 * drives one fixture per code, plus the two cases the empty-directory test
 * structurally cannot provide — a fully valid pair that must stay silent, and a
 * file at the configured path that must demonstrably be read.
 *
 * `vi.mock` is hoisted to module scope, so the `readFile` seam that produces
 * QFAI-BPAP-001 is installed as a pass-through and only made to fail inside the
 * one case that needs it.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type * as fsPromises from "node:fs/promises";
import { stringify } from "yaml";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../src/core/config.js";

type FsPromises = typeof fsPromises;

const { readFileSpy } = vi.hoisted(() => ({ readFileSpy: vi.fn() }));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    readFile: (...args: unknown[]) => readFileSpy(actual, ...args),
  };
});

const { validateBpApDb } = await import("../../src/core/validators/bpApDb.js");

const tempDirs: string[] = [];

beforeEach(() => {
  readFileSpy.mockReset();
  readFileSpy.mockImplementation((actual: FsPromises, ...args: unknown[]) =>
    Reflect.apply(actual.readFile, actual, args),
  );
});

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-bpapdb-"));
  tempDirs.push(dir);
  return dir;
}

/** Writes rule files into `<root>/<contractsDir>/design/` and returns the root. */
async function seedRules(
  files: Record<string, string>,
  config: QfaiConfig = defaultConfig,
): Promise<string> {
  const root = await newTempDir();
  const designDir = path.join(root, config.paths.contractsDir, "design");
  await mkdir(designDir, { recursive: true });
  for (const [name, body] of Object.entries(files)) {
    await writeFile(path.join(designDir, name), body, "utf-8");
  }
  return root;
}

function bpEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "BP-0001",
    category: "layout",
    title: "Use the spacing scale",
    description: "Every gap comes from the spacing scale.",
    severity: "major",
    auto_check: true,
    validation_method: "token-scan",
    platform: "web",
    ...overrides,
  };
}

function apEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "AP-0001",
    category: "layout",
    title: "Hard-coded gaps",
    description: "Pixel gaps bypass the spacing scale.",
    severity: "minor",
    detection_method: "auto",
    fix_guidance: "Replace the literal with a spacing token.",
    platform: "common",
    ...overrides,
  };
}

function without(entry: Record<string, unknown>, field: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(entry).filter(([key]) => key !== field));
}

function codesOf(issues: readonly { code: string }[]): string[] {
  return issues.map((item) => item.code);
}

describe("validateBpApDb", () => {
  it("stays silent on a fully valid BP/AP pair", async () => {
    const root = await seedRules({
      "best-practices.yaml": stringify([bpEntry(), bpEntry({ id: "BP-0002" })]),
      "anti-patterns.yaml": stringify([apEntry(), apEntry({ id: "AP-0002" })]),
    });

    const issues = await validateBpApDb(root, defaultConfig);

    expect(issues).toEqual([]);
  });

  it("reads rule files from the configured contractsDir, not a hard-coded path", async () => {
    const config: QfaiConfig = {
      ...defaultConfig,
      paths: { ...defaultConfig.paths, contractsDir: "docs/contracts" },
    };
    const root = await seedRules(
      { "best-practices.yaml": stringify([bpEntry({ severity: "catastrophic" })]) },
      config,
    );

    const found = await validateBpApDb(root, config);
    const missed = await validateBpApDb(root, defaultConfig);

    expect(codesOf(found)).toContain("QFAI-BPAP-011");
    expect(found[0]?.file).toBe("docs/contracts/design/best-practices.yaml");
    expect(missed).toEqual([]);
  });

  it("matches suffixed rule filenames and skips schema files", async () => {
    const root = await seedRules({
      "best-practices-web.yaml": stringify([bpEntry({ id: "BP-9" })]),
      "anti-patterns-web.yaml": stringify([apEntry({ id: "AP-9" })]),
      "best-practices.schema.yaml": stringify({ type: "array" }),
    });

    const issues = await validateBpApDb(root, defaultConfig);

    expect(codesOf(issues).sort()).toEqual(["QFAI-BPAP-004", "QFAI-BPAP-007"]);
    expect(issues.map((item) => item.file)).not.toContain(
      ".qfai/contracts/design/best-practices.schema.yaml",
    );
  });

  it("reports QFAI-BPAP-001 when a matched rule file cannot be read", async () => {
    const root = await seedRules({ "best-practices.yaml": stringify([bpEntry()]) });
    readFileSpy.mockRejectedValue(new Error("EACCES: permission denied"));

    const issues = await validateBpApDb(root, defaultConfig);

    expect(codesOf(issues)).toEqual(["QFAI-BPAP-001"]);
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.rule).toBe("bpApDb.readFile");
  });

  it("reports QFAI-BPAP-002 when a rule file is not parseable YAML", async () => {
    const root = await seedRules({ "best-practices.yaml": "- [unterminated\n" });

    const issues = await validateBpApDb(root, defaultConfig);

    expect(codesOf(issues)).toEqual(["QFAI-BPAP-002"]);
    expect(issues[0]?.severity).toBe("error");
  });

  it("reports QFAI-BPAP-003 when a rule file is a mapping instead of an array", async () => {
    const root = await seedRules({
      "best-practices.yaml": stringify({ best_practices: [bpEntry()] }),
    });

    const issues = await validateBpApDb(root, defaultConfig);

    expect(codesOf(issues)).toEqual(["QFAI-BPAP-003"]);
    expect(issues[0]?.severity).toBe("error");
  });

  it("reports QFAI-BPAP-004 for a malformed BP ID", async () => {
    const root = await seedRules({
      "best-practices.yaml": stringify([bpEntry({ id: "BP-1" })]),
    });

    const issues = await validateBpApDb(root, defaultConfig);

    expect(codesOf(issues)).toEqual(["QFAI-BPAP-004"]);
    expect(issues[0]?.refs).toEqual(["BP-1"]);
  });

  it("reports QFAI-BPAP-005 for a duplicated BP ID", async () => {
    const root = await seedRules({
      "best-practices.yaml": stringify([bpEntry(), bpEntry()]),
    });

    const issues = await validateBpApDb(root, defaultConfig);

    expect(codesOf(issues)).toEqual(["QFAI-BPAP-005"]);
    expect(issues[0]?.refs).toEqual(["BP-0001"]);
  });

  it("reports QFAI-BPAP-006 once per missing required BP field", async () => {
    const root = await seedRules({
      "best-practices.yaml": stringify([without(bpEntry(), "validation_method")]),
    });

    const issues = await validateBpApDb(root, defaultConfig);

    expect(codesOf(issues)).toEqual(["QFAI-BPAP-006"]);
    expect(issues[0]?.message).toContain("validation_method");
  });

  it("reports QFAI-BPAP-007 for a malformed AP ID", async () => {
    const root = await seedRules({
      "anti-patterns.yaml": stringify([apEntry({ id: "AP-01" })]),
    });

    const issues = await validateBpApDb(root, defaultConfig);

    expect(codesOf(issues)).toEqual(["QFAI-BPAP-007"]);
    expect(issues[0]?.refs).toEqual(["AP-01"]);
  });

  it("reports QFAI-BPAP-008 for a duplicated AP ID", async () => {
    const root = await seedRules({
      "anti-patterns.yaml": stringify([apEntry(), apEntry()]),
    });

    const issues = await validateBpApDb(root, defaultConfig);

    expect(codesOf(issues)).toEqual(["QFAI-BPAP-008"]);
    expect(issues[0]?.refs).toEqual(["AP-0001"]);
  });

  it("reports QFAI-BPAP-009 once per missing required AP field", async () => {
    const root = await seedRules({
      "anti-patterns.yaml": stringify([without(apEntry(), "fix_guidance")]),
    });

    const issues = await validateBpApDb(root, defaultConfig);

    expect(codesOf(issues)).toEqual(["QFAI-BPAP-009"]);
    expect(issues[0]?.message).toContain("fix_guidance");
  });

  it("reports QFAI-BPAP-010 for an unknown detection_method", async () => {
    const root = await seedRules({
      "anti-patterns.yaml": stringify([apEntry({ detection_method: "semi-auto" })]),
    });

    const issues = await validateBpApDb(root, defaultConfig);

    expect(codesOf(issues)).toEqual(["QFAI-BPAP-010"]);
    expect(issues[0]?.message).toContain("auto, manual");
  });

  it("reports QFAI-BPAP-011 for an out-of-range severity on either side", async () => {
    const root = await seedRules({
      "best-practices.yaml": stringify([bpEntry({ severity: "catastrophic" })]),
      "anti-patterns.yaml": stringify([apEntry({ severity: "catastrophic" })]),
    });

    const issues = await validateBpApDb(root, defaultConfig);

    expect(codesOf(issues)).toEqual(["QFAI-BPAP-011", "QFAI-BPAP-011"]);
    expect(issues.every((item) => item.severity === "error")).toBe(true);
  });

  it("reports QFAI-BPAP-012 as a warning for an unknown platform", async () => {
    const root = await seedRules({
      "best-practices.yaml": stringify([bpEntry({ platform: "smartwatch" })]),
    });

    const issues = await validateBpApDb(root, defaultConfig);

    expect(codesOf(issues)).toEqual(["QFAI-BPAP-012"]);
    expect(issues[0]?.severity).toBe("warning");
  });

  it("returns no issues when no rule file exists", async () => {
    const root = await newTempDir();

    const issues = await validateBpApDb(root, defaultConfig);

    expect(issues).toEqual([]);
  });
});
