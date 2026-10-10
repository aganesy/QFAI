import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, link, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import {
  collectJobSteps,
  findWorkflowJob,
  isRecord,
  useTempDirPool,
} from "../helpers/shippedWorkflowFixtures.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const SCRIPT = path.join(REPO_ROOT, "scripts", "sync-mdschema-version.mjs");
const PACKAGE = "@jackchuka/mdschema";
const ROOT_MANIFEST = "package.json";
const PACKAGE_MANIFEST = "packages/qfai/package.json";
const LOCK = "pnpm-lock.yaml";
const WORKSPACE = "pnpm-workspace.yaml";
const BUILDS = ".github/actions/setup/dependency-builds.txt";
const WORKFLOW = "packages/qfai/assets/init/root/.github/workflows/qfai-docs.yml";
const HELPER = "packages/qfai/tests/helpers/shippedLaneCommands.ts";
const RULE = ".agents/rules/document-schema.local.md";
const INSTALLED = [
  "node_modules/@jackchuka/mdschema/package.json",
  "packages/qfai/node_modules/@jackchuka/mdschema/package.json",
];
const INPUTS = [ROOT_MANIFEST, PACKAGE_MANIFEST, LOCK, WORKSPACE, BUILDS, WORKFLOW, HELPER, RULE];
const TARGETS = [WORKFLOW, HELPER, RULE];
const NEXT_VERSION = "0.16.123";
const INSTALL_NAME = "Install the document-shape and diagram checkers";
const TOOL_SUFFIX = " mermaid@11.17.2 jsdom@29.1.1";
const FILE_PIN = /\["qfai-docs\.yml", "([a-f0-9]{64})"\]/;
const BODY_PIN =
  /"name":"Install the document-shape and diagram checkers","shell":"bash","run":"<body ([a-f0-9]{64})>"/;
const HEADING = /^## Writing a schema for mdschema \d+\.\d+\.\d+$/m;
const ANCHORS: Array<[string, RegExp]> = [
  [WORKFLOW, /@jackchuka\/mdschema@\d+\.\d+\.\d+/],
  [HELPER, /@jackchuka\/mdschema@\d+\.\d+\.\d+/],
  [RULE, HEADING],
  [HELPER, FILE_PIN],
  [HELPER, BODY_PIN],
];
const tempDir = useTempDirPool("qfai-sync-mdschema-");

async function text(root: string, file: string): Promise<string> {
  return readFile(path.join(root, file), "utf-8");
}

async function put(root: string, file: string, value: string): Promise<void> {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await writeFile(path.join(root, file), value, "utf-8");
}

function git(root: string, args: string[]): string {
  const result = spawnSync("git", ["-c", "core.autocrlf=false", ...args], {
    cwd: root,
    encoding: "utf-8",
    timeout: 10_000,
  });
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
  return result.stdout;
}

async function setManifestVersion(
  root: string,
  file: string,
  section: string,
  version: unknown,
): Promise<void> {
  const parsed: unknown = JSON.parse(await text(root, file));
  if (!isRecord(parsed)) throw new Error(`Invalid fixture: ${file}`);
  const dependencies = parsed[section];
  if (!isRecord(dependencies)) throw new Error(`Invalid fixture section: ${file}`);
  dependencies[PACKAGE] = version;
  await put(root, file, `${JSON.stringify(parsed, null, 2)}\n`);
}

async function fixture(version = NEXT_VERSION): Promise<string> {
  const root = await tempDir();
  for (const file of INPUTS.filter((file) => file !== LOCK)) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await cp(path.join(REPO_ROOT, file), path.join(root, file));
  }
  await setManifestVersion(root, ROOT_MANIFEST, "devDependencies", version);
  await setManifestVersion(root, PACKAGE_MANIFEST, "dependencies", version);
  await put(
    root,
    LOCK,
    stringifyYaml({
      lockfileVersion: "9.0",
      importers: {
        ".": { devDependencies: { [PACKAGE]: { specifier: version, version } } },
        "packages/qfai": { dependencies: { [PACKAGE]: { specifier: version, version } } },
      },
    }),
  );
  for (const file of INSTALLED) {
    await put(root, file, `${JSON.stringify({ name: PACKAGE, version })}\n`);
  }
  git(root, ["init", "--quiet"]);
  git(root, ["add", "--all"]);
  git(root, [
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "fixture",
  ]);
  return root;
}

function run(root: string) {
  const source =
    `import { syncMdschemaVersion } from ${JSON.stringify(pathToFileURL(SCRIPT).href)};` +
    "process.exit(syncMdschemaVersion(process.argv[1]));";
  return spawnSync(process.execPath, ["--input-type=module", "--eval", source, root], {
    cwd: root,
    encoding: "utf-8",
    timeout: 10_000,
  });
}

async function snapshot(root: string): Promise<Array<[string, string | null]>> {
  return Promise.all(
    [...INPUTS, ...INSTALLED].map(async (file): Promise<[string, string | null]> => {
      try {
        return [file, (await readFile(path.join(root, file))).toString("base64")];
      } catch (error) {
        if (isRecord(error) && error["code"] === "ENOENT") return [file, null];
        throw error;
      }
    }),
  );
}

async function refusesWithoutWrites(root: string, diagnostic: string): Promise<void> {
  const before = await snapshot(root);
  const status = git(root, ["status", "--porcelain"]);
  const result = run(root);
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr).toBe(1);
  expect(result.stderr).toContain(diagnostic);
  expect(await snapshot(root)).toEqual(before);
  expect(git(root, ["status", "--porcelain"])).toBe(status);
}

function digest(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function installBody(workflow: string): string {
  const parsed: unknown = parseYaml(workflow);
  const job = findWorkflowJob(parsed, "checks");
  if (job === undefined) throw new Error("Fixture has no checks job");
  const matches = collectJobSteps(job).filter((step) => step["name"] === INSTALL_NAME);
  expect(matches).toHaveLength(1);
  const body = matches[0]?.["run"];
  if (typeof body !== "string") throw new Error("Fixture has no install body");
  return body;
}

describe("syncing the schema checker's declared version", () => {
  it.each(["^0.16.123", "latest", "0.16", "00.16.123", "0.16.123-beta.1", 123])(
    "refuses the non-exact package version %s before writing",
    async (version) => {
      const root = await fixture();
      await setManifestVersion(root, PACKAGE_MANIFEST, "dependencies", version);
      await refusesWithoutWrites(root, PACKAGE_MANIFEST);
    },
  );

  it("refuses malformed JSON before writing", async () => {
    const root = await fixture();
    await put(root, PACKAGE_MANIFEST, "{\n");
    await refusesWithoutWrites(root, PACKAGE_MANIFEST);
  });

  it("refuses disagreement between the root and package versions", async () => {
    const root = await fixture();
    await setManifestVersion(root, ROOT_MANIFEST, "devDependencies", "0.16.124");
    await refusesWithoutWrites(root, ROOT_MANIFEST);
  });

  it.each([
    [".", "devDependencies", "specifier"],
    [".", "devDependencies", "version"],
    ["packages/qfai", "dependencies", "specifier"],
    ["packages/qfai", "dependencies", "version"],
  ])("refuses lock importer %s %s %s disagreement", async (importer, section, key) => {
    const root = await fixture();
    const lock: unknown = parseYaml(await text(root, LOCK));
    if (!isRecord(lock) || !isRecord(lock["importers"])) throw new Error("Invalid lock fixture");
    const entry = lock["importers"][importer];
    if (!isRecord(entry)) throw new Error("Invalid importer fixture");
    const dependencies = entry[section];
    if (!isRecord(dependencies)) throw new Error("Invalid dependency section fixture");
    const dependency = dependencies[PACKAGE];
    if (!isRecord(dependency)) throw new Error("Invalid dependency fixture");
    dependency[key] = "0.16.124";
    await put(root, LOCK, stringifyYaml(lock));
    await refusesWithoutWrites(root, LOCK);
  });

  it.each(INSTALLED)("refuses a stale installed checker at %s", async (file) => {
    const root = await fixture();
    await put(root, file, JSON.stringify({ name: PACKAGE, version: "0.16.124" }));
    await refusesWithoutWrites(root, file);
  });

  it.each(INSTALLED)("refuses a different installed package at %s", async (file) => {
    const root = await fixture();
    await put(root, file, JSON.stringify({ name: "other-package", version: NEXT_VERSION }));
    await refusesWithoutWrites(root, file);
  });

  it.each([...INPUTS, ...INSTALLED])(
    "refuses a missing input %s before writing any derived copy",
    async (file) => {
      const root = await fixture();
      await rm(path.join(root, file));
      await refusesWithoutWrites(root, file);
    },
  );

  it.each(ANCHORS)("refuses a duplicate anchor in %s (%s)", async (file, pattern) => {
    const root = await fixture();
    const original = await text(root, file);
    const lines = original.split("\n").filter((line) => pattern.test(line));
    expect(lines).toHaveLength(1);
    await put(root, file, `${original}\n${lines[0]}\n`);
    await refusesWithoutWrites(root, file);
  });

  it.each(ANCHORS)("refuses a missing anchor in %s (%s)", async (file, pattern) => {
    const root = await fixture();
    const original = await text(root, file);
    expect(original).toMatch(pattern);
    await put(root, file, original.replace(pattern, ""));
    await refusesWithoutWrites(root, file);
  });

  it("refuses a checker permission that would enable install scripts", async () => {
    const root = await fixture();
    const workspace = await text(root, WORKSPACE);
    expect(workspace).toContain('"@jackchuka/mdschema": false');
    await put(
      root,
      WORKSPACE,
      workspace.replace('"@jackchuka/mdschema": false', '"@jackchuka/mdschema": true'),
    );
    await refusesWithoutWrites(root, WORKSPACE);
  });

  it("refuses a rebuild list that permits the schema checker", async () => {
    const root = await fixture();
    await put(root, BUILDS, `${await text(root, BUILDS)}\n${PACKAGE}\n`);
    await refusesWithoutWrites(root, BUILDS);
  });

  it("refuses disagreement between existing derived versions", async () => {
    const root = await fixture();
    await put(
      root,
      RULE,
      (await text(root, RULE)).replace(HEADING, "## Writing a schema for mdschema 0.16.124"),
    );
    await refusesWithoutWrites(root, RULE);
  });

  it("refuses a hard-linked target before changing either link", async () => {
    const root = await fixture();
    const alias = path.join(root, "linked-rule.md");
    await link(path.join(root, RULE), alias);
    const before = await readFile(alias);
    await refusesWithoutWrites(root, RULE);
    expect(await readFile(alias)).toEqual(before);
  });

  it.each([FILE_PIN, BODY_PIN])("refuses a stale reviewed pin %s", async (pattern) => {
    const root = await fixture();
    const original = await text(root, HELPER);
    const pin = pattern.exec(original)?.[1];
    if (pin === undefined) throw new Error("Missing fixture pin");
    await put(root, HELPER, original.replace(pin, "0".repeat(64)));
    await refusesWithoutWrites(root, HELPER);
  });

  it("refuses an unrelated workflow edit even when the version anchor still exists", async () => {
    const root = await fixture();
    await put(root, WORKFLOW, `${await text(root, WORKFLOW)}\n# unrelated edit\n`);
    await refusesWithoutWrites(root, HELPER);
  });

  // QFAI:EX-0002-0003-07 QFAI:EX-0002-0003-09
  it("updates only the checker version, its two reviewed pins and the schema heading", async () => {
    const root = await fixture();
    const before = await snapshot(root);
    const originalWorkflow = await text(root, WORKFLOW);
    const originalHelper = await text(root, HELPER);
    const originalRule = await text(root, RULE);
    const oldToken = /@jackchuka\/mdschema@\d+\.\d+\.\d+/.exec(originalWorkflow)?.[0];
    const oldFilePin = FILE_PIN.exec(originalHelper)?.[1];
    const oldBodyPin = BODY_PIN.exec(originalHelper)?.[1];
    if (oldToken === undefined || oldFilePin === undefined || oldBodyPin === undefined) {
      throw new Error("Missing fixture version or pin");
    }
    const expectedWorkflow = originalWorkflow.replace(oldToken, `${PACKAGE}@${NEXT_VERSION}`);
    const expectedHelper = originalHelper
      .replace(oldToken, `${PACKAGE}@${NEXT_VERSION}`)
      .replace(oldFilePin, digest(Buffer.from(expectedWorkflow)))
      .replace(oldBodyPin, digest(installBody(expectedWorkflow)));

    const result = run(root);
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    expect(await text(root, WORKFLOW)).toBe(expectedWorkflow);
    expect(await text(root, HELPER)).toBe(expectedHelper);
    expect(await text(root, RULE)).toBe(
      originalRule.replace(HEADING, `## Writing a schema for mdschema ${NEXT_VERSION}`),
    );
    const body = installBody(await text(root, WORKFLOW));
    expect(body).toContain(`${PACKAGE}@${NEXT_VERSION}${TOOL_SUFFIX}`);
    expect(body).toContain("--ignore-scripts --include=optional");
    expect(body).toContain("--prefix=tmp/qfai-docs-tools");
    expect(body).toContain("--no-save");
    expect(body).toContain("mermaid@11.17.2 jsdom@29.1.1 qfai");
    expect((await snapshot(root)).filter(([file]) => !TARGETS.includes(file))).toEqual(
      before.filter(([file]) => !TARGETS.includes(file)),
    );
    expect(git(root, ["diff", "--name-only"]).trim().split("\n").sort()).toEqual(
      [...TARGETS].sort(),
    );

    git(root, ["add", "--all"]);
    git(root, [
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "--quiet",
      "-m",
      "synchronized",
    ]);
    const once = await snapshot(root);
    const again = run(root);
    expect(again.status, again.stderr).toBe(0);
    expect(await snapshot(root)).toEqual(once);
    expect(git(root, ["status", "--porcelain"])).toBe("");
  });

  it("runs the sync before both resealers in Renovate's push step", async () => {
    const parsed: unknown = parseYaml(await text(REPO_ROOT, ".github/workflows/renovate.yml"));
    const job = findWorkflowJob(parsed, "repin");
    if (job === undefined) throw new Error("Renovate has no repin job");
    const step = collectJobSteps(job).find((candidate) => candidate["id"] === "repin");
    const body = step?.["run"];
    if (typeof body !== "string") throw new Error("Renovate has no repin body");
    const commands = body
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("node scripts/"));
    expect(commands.slice(0, 3)).toEqual([
      "node scripts/sync-mdschema-version.mjs",
      "node scripts/pin-guard-bytes.mjs",
      "node scripts/pin-verification-bodies.mjs",
    ]);
    expect(body).toMatch(/set -euo pipefail/);
  });
});
