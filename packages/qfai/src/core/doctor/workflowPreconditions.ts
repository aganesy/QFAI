import { getHashes } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import { isRecord } from "../workflow/parse.js";

/**
 * The Node the shipped workflows use when the project has no `.nvmrc` or `.node-version`. It is the
 * value of `fallback` in the workflow templates.
 */
const FALLBACK_NODE = "20";

/** Lockfiles in the order the shipped workflows try them: the first one present decides. */
const LOCKFILES = [
  { file: "pnpm-lock.yaml", manager: "pnpm" },
  { file: "yarn.lock", manager: "yarn" },
  { file: "package-lock.json", manager: "npm" },
] as const;

const WORKFLOWS_DIR = [".github", "workflows"] as const;

export type WorkflowPreconditionCheck = {
  id: string;
  severity: "warning";
  title: string;
  message: string;
  details: Record<string, unknown>;
};

const NUMERIC = "(?:0|[1-9]\\d*)";
const PRERELEASE_ID = "(?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*)";
/** `pnpm@MAJOR.MINOR.PATCH`, then an optional `-prerelease` and an optional `+<algorithm>.<hex>`. */
const PNPM_FIELD = new RegExp(
  `^pnpm@${NUMERIC}\\.${NUMERIC}\\.${NUMERIC}` +
    `(?:-${PRERELEASE_ID}(?:\\.${PRERELEASE_ID})*)?` +
    `(?:\\+([0-9A-Za-z-]+)\\.[0-9a-fA-F]+)?$`,
  "u",
);

/**
 * A repository-controlled value as one short printable line. Findings reach a terminal and a
 * workflow log, so control characters and line breaks in a manifest or a file name are replaced.
 */
function printable(text: string): string {
  return text
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu, " ")
    .trim()
    .slice(0, 80);
}

async function readText(target: string): Promise<string | undefined> {
  try {
    return await readFile(target, "utf-8");
  } catch {
    return undefined;
  }
}

async function readPackageJson(root: string): Promise<Record<string, unknown> | undefined> {
  const text = await readText(path.join(root, "package.json"));
  if (text === undefined) return undefined;
  try {
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

async function presentLockfiles(root: string): Promise<(typeof LOCKFILES)[number][]> {
  const present: (typeof LOCKFILES)[number][] = [];
  for (const lockfile of LOCKFILES) {
    if ((await readText(path.join(root, lockfile.file))) !== undefined) present.push(lockfile);
  }
  return present;
}

/** The `packageManager` string the workflows read, trimmed the way they trim it. */
function declaredPackageManager(manifest: Record<string, unknown> | undefined): string {
  const field = manifest?.["packageManager"];
  return typeof field === "string" ? field.trim().replace(/\s+/gu, " ") : "";
}

/** Whether the workflows accept the value: a pnpm version, with a hash algorithm this runtime knows. */
function namesPnpmVersion(declared: string): boolean {
  const match = PNPM_FIELD.exec(declared);
  if (match === null) return false;
  const algorithm = match[1];
  if (algorithm === undefined) return true;
  return getHashes().some((name) => name.toLowerCase() === algorithm.toLowerCase());
}

function packageManagerCheck(
  manifest: Record<string, unknown> | undefined,
  lockfiles: readonly (typeof LOCKFILES)[number][],
): WorkflowPreconditionCheck | undefined {
  if (!lockfiles.some((lockfile) => lockfile.manager === "pnpm")) return undefined;
  const declared = declaredPackageManager(manifest);
  if (namesPnpmVersion(declared)) return undefined;
  const found = declared === "" ? "it is missing" : `it is "${printable(declared)}"`;
  return {
    id: "workflows.packageManager",
    severity: "warning",
    title: "Package manager the shipped workflows install with",
    message:
      `pnpm-lock.yaml is present but the "packageManager" field of package.json does not name a pnpm version (${found}), ` +
      `so the shipped workflows stop before they install anything. ` +
      `Set "packageManager" to "pnpm@<the pnpm version you use>".`,
    details: { path: "package.json", packageManager: declared === "" ? null : printable(declared) },
  };
}

function lockfilesCheck(
  lockfiles: readonly (typeof LOCKFILES)[number][],
): WorkflowPreconditionCheck | undefined {
  const [used, ...ignored] = lockfiles;
  if (used === undefined || ignored.length === 0) return undefined;
  const names = lockfiles.map((lockfile) => lockfile.file);
  const ignoredNames = ignored.map((lockfile) => lockfile.file);
  return {
    id: "workflows.lockfiles",
    severity: "warning",
    title: "Lockfiles the shipped workflows choose between",
    message:
      `${names.join(" and ")} are present together. The shipped workflows install with ${used.manager} ` +
      `and ignore ${ignoredNames.join(" and ")}. Keep the lockfile of the package manager you use and delete the others.`,
    details: { lockfiles: names, used: used.file, ignored: ignoredNames },
  };
}

function engineRange(manifest: Record<string, unknown> | undefined): string | undefined {
  const engines = manifest?.["engines"];
  if (!isRecord(engines)) return undefined;
  const node = engines["node"];
  const range = typeof node === "string" ? printable(node) : "";
  return range === "" ? undefined : range;
}

async function hasNodeVersionFile(root: string): Promise<boolean> {
  for (const name of [".nvmrc", ".node-version"]) {
    const text = await readText(path.join(root, name));
    const firstLine = text?.split("\n")[0] ?? "";
    if (firstLine.replace(/\s+/gu, "") !== "") return true;
  }
  return false;
}

async function nodeVersionFileCheck(
  root: string,
  range: string | undefined,
): Promise<WorkflowPreconditionCheck | undefined> {
  if (range === undefined || (await hasNodeVersionFile(root))) return undefined;
  return {
    id: "workflows.nodeVersionFile",
    severity: "warning",
    title: "Node version the shipped workflows run on",
    message:
      `package.json declares engines.node "${range}" but the project has no .nvmrc or .node-version, ` +
      `so the shipped workflows run on Node ${FALLBACK_NODE}. Add a .nvmrc naming the Node version your project runs on.`,
    details: { enginesNode: range, fallback: FALLBACK_NODE },
  };
}

/** The leading numeric parts of a version or range: `20.11` gives `[20, 11]`; `lts/*` gives none. */
function numericParts(text: string): number[] {
  const match = /^\D*?(\d+(?:\.\d+){0,2})/u.exec(text.trim());
  return match === null ? [] : (match[1] ?? "").split(".").map(Number);
}

/** The first lower-bound comparator of a range alternative, wherever it stands; `<` and `<=` are skipped. */
function lowerBound(alternative: string): number[] | undefined {
  for (const match of alternative.matchAll(/(<=?|>=?|\^|~|=)?\s*v?(\d+(?:\.\d+){0,2})/gu)) {
    if (!(match[1] ?? "").startsWith("<")) return numericParts(match[2] ?? "");
  }
  return undefined;
}

/** The lowest version an `engines.node` range allows, as three numbers. */
function lowestAllowed(range: string): number[] | undefined {
  let lowest: number[] | undefined;
  for (const alternative of range.split("||")) {
    const parts = lowerBound(alternative);
    if (parts === undefined) continue;
    const padded = [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
    if (lowest === undefined || compare(padded, lowest, 3) < 0) lowest = padded;
  }
  return lowest;
}

/** Compares the first `length` parts; a part a pin leaves out is not compared. */
function compare(left: number[], right: number[], length: number): number {
  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

/** Every string under a `node-version` key, at any depth. A list yields each of its items. */
function collectPins(node: unknown, pins: string[]): void {
  if (Array.isArray(node)) {
    for (const item of node) collectPins(item, pins);
  } else if (isRecord(node)) {
    for (const [key, value] of Object.entries(node)) {
      if (key !== "node-version") {
        collectPins(value, pins);
      } else if (typeof value === "string") {
        pins.push(value);
      } else if (Array.isArray(value)) {
        for (const item of value) if (typeof item === "string") pins.push(item);
      }
    }
  }
}

/**
 * The versions a workflow pins under `node-version`, as written. The failsafe schema keeps every
 * scalar a string, so `20.10` is not read as the number 20.1, and a script body that mentions the
 * key is one string, not a pin.
 *
 * SIMPLIFIED: a version reached through a matrix variable or an expression is not followed.
 * Lift when: a project reports a pin below `engines.node` that this read missed.
 */
function pinnedVersions(workflow: string): string[] {
  const pins: string[] = [];
  try {
    collectPins(parseYaml(workflow, { schema: "failsafe" }), pins);
  } catch {
    return [];
  }
  return pins.map((pin) => pin.trim().replace(/^v/u, "")).filter((pin) => /^\d/u.test(pin));
}

async function workflowFiles(root: string): Promise<string[]> {
  try {
    const names = await readdir(path.join(root, ...WORKFLOWS_DIR));
    return names.filter((name) => /\.ya?ml$/iu.test(name)).sort();
  } catch {
    return [];
  }
}

async function nodePinCheck(
  root: string,
  range: string | undefined,
): Promise<WorkflowPreconditionCheck | undefined> {
  const lowest = range === undefined ? undefined : lowestAllowed(range);
  if (range === undefined || lowest === undefined) return undefined;
  const below: { file: string; version: string }[] = [];
  for (const name of await workflowFiles(root)) {
    const text = await readText(path.join(root, ...WORKFLOWS_DIR, name));
    for (const version of pinnedVersions(text ?? "")) {
      const parts = numericParts(version);
      if (parts.length > 0 && compare(parts, lowest, parts.length) < 0) {
        below.push({
          file: printable([...WORKFLOWS_DIR, name].join("/")),
          version: printable(version),
        });
      }
    }
  }
  if (below.length === 0) return undefined;
  const pins = below.map((pin) => `${pin.file} pins Node ${pin.version}`).join("; ");
  return {
    id: "workflows.nodePin",
    severity: "warning",
    title: "Node pinned in the project's workflows",
    message: `${pins}, below engines.node "${range}". Raise the pin or lower engines.node.`,
    details: { enginesNode: range, pins: below },
  };
}

/**
 * The repository facts the shipped workflows rely on and do not check for you. Each unmet one is a
 * warning, never an error: a project without CI is not blocked by them. Met facts report nothing.
 */
export async function checkWorkflowPreconditions(
  root: string,
): Promise<WorkflowPreconditionCheck[]> {
  const manifest = await readPackageJson(root);
  const lockfiles = await presentLockfiles(root);
  const range = engineRange(manifest);
  const checks = [
    packageManagerCheck(manifest, lockfiles),
    lockfilesCheck(lockfiles),
    await nodeVersionFileCheck(root, range),
    await nodePinCheck(root, range),
  ];
  return checks.filter((check) => check !== undefined);
}
