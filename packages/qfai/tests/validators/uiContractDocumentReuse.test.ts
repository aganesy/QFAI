/**
 * The UI contract folder a contract validation walks once for its screen checks.
 *
 * The entry, surface, omitted, completeness and pattern checks read the same UI
 * contract files. `validateContracts` walks and parses the folder once and hands
 * the list to each, and each check still walks the folder itself when it is
 * called alone. Either way it reports the same findings.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type FastGlobModule from "fast-glob";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { readUiContractDocuments } from "../../src/core/contracts/screenContracts.js";
import { validateContracts } from "../../src/core/validators/contracts.js";
import { validateUiScreenCompleteness } from "../../src/core/validators/uiScreenCompleteness.js";
import { validateUiScreenEntries } from "../../src/core/validators/uiScreenEntries.js";
import { validateUiScreenOmitted } from "../../src/core/validators/uiScreenOmitted.js";
import { validateUiScreenPattern } from "../../src/core/validators/uiScreenPattern.js";
import { validateUiScreenSurface } from "../../src/core/validators/uiScreenSurface.js";

/** The `cwd` of every walk for UI contract files, in call order. */
const walks = vi.hoisted(() => {
  const cwds: string[] = [];
  return { cwds };
});

vi.mock("fast-glob", async (importOriginal) => {
  const actual = await importOriginal<{ default: typeof FastGlobModule }>();
  const glob = actual.default;
  const counted = Object.assign(
    (patterns: Parameters<typeof glob>[0], options?: Parameters<typeof glob>[1]) => {
      if (patterns === "**/*.{yaml,yml}" && typeof options?.cwd === "string") {
        walks.cwds.push(path.resolve(options.cwd));
      }
      return glob(patterns, options);
    },
    glob,
  );
  return { ...actual, default: counted };
});

const tempDirs: string[] = [];
const UI_DIR = path.join(".qfai", "spec", "03_contract", "ui");

/** A project whose two UI contracts each draw a finding from every screen check. */
async function projectWithFindings(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ui-reuse-"));
  tempDirs.push(root);
  const uiDir = path.join(root, UI_DIR);
  await mkdir(uiDir, { recursive: true });
  for (const name of ["ui-0002-beta.yaml", "ui-0001-alpha.yaml"]) {
    const stem = path.basename(name, ".yaml");
    await writeFile(
      path.join(uiDir, name),
      [
        "screens:",
        `  - id: ${stem}-home`,
        "    route: /home",
        "    surface: landing",
        "    pattern: unknown-type",
        "    omitted:",
        "      - part: header",
        `  - id: ${stem}-orphan`,
        "",
      ].join("\n"),
      "utf-8",
    );
  }
  return root;
}

const SCREEN_CODES = new Set([
  "QFAI-CONTRACT-042",
  "QFAI-CONTRACT-051",
  "QFAI-CONTRACT-052",
  "QFAI-CONTRACT-053",
  "QFAI-CONTRACT-054",
  "QFAI-CONTRACT-055",
  "QFAI-CONTRACT-056",
]);

beforeEach(() => {
  walks.cwds.length = 0;
});

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

// Mutation: packages/qfai/src/core/validators/contracts.ts `validateUiScreenSurface(root, config, uiDocuments)` -> `validateUiScreenSurface(root, config)` fails "walks the UI contract folder once for every screen check of a contract validation"
it("walks the UI contract folder once for every screen check of a contract validation", async () => {
  const root = await projectWithFindings();
  const issues = await validateContracts(root, defaultConfig);

  expect(issues.some((found) => SCREEN_CODES.has(found.code))).toBe(true);
  const uiDir = path.resolve(root, UI_DIR);
  expect(walks.cwds.filter((cwd) => cwd === uiDir)).toHaveLength(1);
});

// Mutation: packages/qfai/src/core/validators/uiScreenSurface.ts `(uiDocuments ?? (await readUiContractDocuments(uiDir, root)))` -> `(uiDocuments ?? [])` fails "reports the same screen findings from a shared walk as from each check called alone"
it("reports the same screen findings from a shared walk as from each check called alone", async () => {
  const root = await projectWithFindings();
  const checks = [
    validateUiScreenEntries,
    validateUiScreenSurface,
    validateUiScreenOmitted,
    validateUiScreenCompleteness,
    validateUiScreenPattern,
  ];

  const alone = [];
  for (const check of checks) alone.push(...(await check(root, defaultConfig)));
  const uiDir = path.resolve(root, UI_DIR);
  expect(walks.cwds.filter((cwd) => cwd === uiDir)).toHaveLength(checks.length);
  // Every check reports something, so an equal list below compares real findings.
  for (const code of SCREEN_CODES) {
    if (code === "QFAI-CONTRACT-055") continue;
    expect(alone.some((found) => found.code === code)).toBe(true);
  }

  const fromValidation = (await validateContracts(root, defaultConfig)).filter((found) =>
    SCREEN_CODES.has(found.code),
  );
  expect(fromValidation).toEqual(alone);

  const documents = await readUiContractDocuments(uiDir, root);
  const shared = [];
  for (const check of checks) shared.push(...(await check(root, defaultConfig, documents)));
  expect(shared).toEqual(alone);
});
