#!/usr/bin/env node
/** Synchronize the schema checker copies after a manifest and frozen-lockfile update. */
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const PACKAGE = "@jackchuka/mdschema";
const EXACT_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const WORKFLOW = "packages/qfai/assets/init/root/.github/workflows/qfai-docs.yml";
const HELPER = "packages/qfai/tests/helpers/shippedLaneCommands.ts";
const RULE = ".agents/rules/document-schema.local.md";
const INSTALL_NAME = "Install the document-shape and diagram checkers";
const TOKEN =
  /@jackchuka\/mdschema@((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)) mermaid@11\.17\.2 jsdom@29\.1\.1/g;

/** The helper uses the same raw-byte hash, without text decoding or normalization. */
export function fileDigest(raw) {
  return createHash("sha256").update(raw).digest("hex");
}

/** YAML parses the body; the helper hashes that exact string without normalization. */
export function bodyDigest(body) {
  return createHash("sha256").update(body).digest("hex");
}

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function unique(text, expression, label) {
  const matches = [...text.matchAll(expression)];
  requireCondition(matches.length === 1, `${label} must occur exactly once`);
  return matches[0];
}

/** Returns 0 after a complete update or no-op, and 1 on a refusal or failed write. */
export function syncMdschemaVersion(root) {
  const originals = new Map();
  const changed = [];
  try {
    root = path.resolve(root);
    function read(relative) {
      const file = path.join(root, relative);
      let raw;
      try {
        raw = readFileSync(file);
      } catch {
        throw new Error(`cannot read ${relative}`);
      }
      const text = raw.toString("utf8");
      requireCondition(Buffer.from(text, "utf8").equals(raw), `${relative} is not UTF-8`);
      originals.set(relative, raw);
      return text;
    }
    function json(relative) {
      try {
        return JSON.parse(read(relative));
      } catch {
        throw new Error(`cannot read JSON from ${relative}`);
      }
    }
    let parseYaml;
    try {
      ({ parse: parseYaml } = createRequire(import.meta.url)("../packages/qfai/node_modules/yaml"));
    } catch {
      throw new Error("yaml is not installed in this checkout; install dependencies first");
    }
    function yaml(relative) {
      try {
        return parseYaml(read(relative));
      } catch {
        throw new Error(`cannot read YAML from ${relative}`);
      }
    }

    const canonical = json("packages/qfai/package.json")?.dependencies?.[PACKAGE];
    requireCondition(
      typeof canonical === "string" && EXACT_VERSION.test(canonical),
      "packages/qfai/package.json must declare an exact schema checker version",
    );
    requireCondition(
      json("package.json")?.devDependencies?.[PACKAGE] === canonical,
      "package.json and packages/qfai/package.json checker versions disagree",
    );
    const lock = yaml("pnpm-lock.yaml");
    for (const [importer, kind] of [
      [".", "devDependencies"],
      ["packages/qfai", "dependencies"],
    ]) {
      const resolved = lock?.importers?.[importer]?.[kind]?.[PACKAGE];
      requireCondition(
        resolved?.specifier === canonical && resolved?.version === canonical,
        `pnpm-lock.yaml: the ${importer} entry disagrees with the manifests`,
      );
    }
    for (const relative of [
      "node_modules/@jackchuka/mdschema/package.json",
      "packages/qfai/node_modules/@jackchuka/mdschema/package.json",
    ]) {
      const installed = json(relative);
      requireCondition(
        installed?.name === PACKAGE && installed?.version === canonical,
        `the installed schema checker disagrees at ${relative}`,
      );
    }
    const permissions = yaml("pnpm-workspace.yaml")?.allowBuilds;
    requireCondition(
      permissions?.[PACKAGE] === false,
      "pnpm-workspace.yaml must keep the checker excluded from install scripts",
    );
    const permitted = Object.keys(permissions).filter((name) => permissions[name] === true);
    const rebuild = read(".github/actions/setup/dependency-builds.txt")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#"));
    requireCondition(
      permitted.length === 1 &&
        permitted[0] === "esbuild" &&
        rebuild.length === 1 &&
        rebuild[0] === "esbuild",
      "pnpm-workspace.yaml and .github/actions/setup/dependency-builds.txt must keep the esbuild-only permission",
    );

    const workflow = read(WORKFLOW);
    const helper = read(HELPER);
    const rule = read(RULE);
    const workflowToken = unique(workflow, TOKEN, `${WORKFLOW}: the checker install`);
    const helperToken = unique(
      helper,
      new RegExp(`"${TOKEN.source}"`, "g"),
      `${HELPER}: the explicit tool-install allowlist`,
    );
    const heading = unique(
      rule,
      /^## Writing a schema for mdschema ((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/gm,
      `${RULE}: the checker heading`,
    );
    requireCondition(
      workflowToken[1] === helperToken[1] && workflowToken[1] === heading[1],
      `${WORKFLOW}, ${HELPER} and ${RULE}: derived checker versions disagree`,
    );
    const filePin = unique(
      helper,
      /\["qfai-docs\.yml", "([a-f0-9]{64})"\]/g,
      `${HELPER}: the workflow file pin`,
    );
    const bodyPin = unique(
      helper,
      /\{"name":"Install the document-shape and diagram checkers","shell":"bash","run":"<body ([a-f0-9]{64})>"\}/g,
      `${HELPER}: the install-step body pin`,
    );
    function installBody(text) {
      let document;
      try {
        document = parseYaml(text);
      } catch {
        throw new Error(`${WORKFLOW} is not valid YAML`);
      }
      const steps = document?.jobs?.checks?.steps;
      requireCondition(Array.isArray(steps), `${WORKFLOW}: the check steps are missing`);
      const installs = steps.filter((step) => step?.name === INSTALL_NAME);
      requireCondition(
        installs.length === 1 && typeof installs[0]?.run === "string",
        `${WORKFLOW}: the install step must occur exactly once`,
      );
      return installs[0].run;
    }
    requireCondition(
      filePin[1] === fileDigest(originals.get(WORKFLOW)) &&
        bodyPin[1] === bodyDigest(installBody(workflow)),
      `${HELPER}: pins do not match ${WORKFLOW}; unrelated edits cannot be resealed here`,
    );

    const packageList = `${PACKAGE}@${canonical} mermaid@11.17.2 jsdom@29.1.1`;
    const nextWorkflow = workflow.replace(TOKEN, packageList);
    let nextHelper = helper.replace(new RegExp(`"${TOKEN.source}"`, "g"), `"${packageList}"`);
    nextHelper = nextHelper.replace(
      filePin[0],
      `["qfai-docs.yml", "${fileDigest(Buffer.from(nextWorkflow, "utf8"))}"]`,
    );
    nextHelper = nextHelper.replace(
      bodyPin[0],
      bodyPin[0].replace(bodyPin[1], bodyDigest(installBody(nextWorkflow))),
    );
    const nextRule = rule.replace(heading[0], `## Writing a schema for mdschema ${canonical}`);
    const updates = new Map([
      [WORKFLOW, nextWorkflow],
      [HELPER, nextHelper],
      [RULE, nextRule],
    ]);
    for (const relative of updates.keys()) {
      const stat = lstatSync(path.join(root, relative));
      requireCondition(
        stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1,
        `the write target is not a regular owned file: ${relative}`,
      );
    }
    function unchanged() {
      for (const [relative, raw] of originals) {
        requireCondition(
          readFileSync(path.join(root, relative)).equals(raw),
          `the observed input changed: ${relative}`,
        );
      }
    }
    unchanged();
    for (const [relative, text] of updates) {
      const next = Buffer.from(text, "utf8");
      if (originals.get(relative).equals(next)) continue;
      unchanged();
      const stat = lstatSync(path.join(root, relative));
      requireCondition(
        stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1,
        `the write target changed: ${relative}`,
      );
      writeFileSync(path.join(root, relative), next);
      originals.set(relative, next);
      changed.push(relative);
    }
    process.stdout.write(
      changed.length === 0
        ? "sync-mdschema-version: already synchronized\n"
        : changed.map((relative) => `sync-mdschema-version: updated ${relative}\n`).join(""),
    );
    return 0;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "synchronization failed";
    process.stderr.write(`sync-mdschema-version: ${reason}\n`);
    if (changed.length > 0)
      process.stderr.write(`Partial changes retained: ${changed.join(", ")}\n`);
    return 1;
  }
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) {
    process.stderr.write("Usage: node scripts/sync-mdschema-version.mjs\n");
    process.exitCode = 1;
  } else {
    process.exitCode = syncMdschemaVersion(fileURLToPath(new URL("..", import.meta.url)));
  }
}
