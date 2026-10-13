#!/usr/bin/env node
/* global console */
/**
 * Regenerate what pins the shipped entry-point text, after an edit to it.
 *
 * Two places hold the bytes of what `qfai init` writes as the entry points an agent loads:
 *
 * - `packages/qfai/tests/fixtures/shipped-entry/agents.txt`, an independent copy of the shipped
 *   `AGENTS.md` that `ALLOWED_INIT_CONTENT` takes its digest from;
 * - the digest of the generated `.github/copilot-instructions.md` in
 *   `packages/qfai/tests/helpers/shippedLaneCommands.ts`, which is the file init writes after a
 *   run in an empty directory.
 *
 * This tool rewrites both from the shipped sources. The copy of `AGENTS.md` is taken from the
 * template, and the Copilot digest is the hash of what the built CLI writes into an empty
 * temporary directory. The result is a diff a reviewer reads; the tool never reads a value out of
 * a failing test. Run `pnpm build` first so the CLI it runs is the one for this checkout, and
 * `pnpm pins:reseal` after it when a file under `scripts/` or a pinned path also changed.
 *
 * Usage:
 *
 *   node scripts/regen-shipped-entry.mjs [--root <dir>] [--cli <path>]
 *
 * `--root` is the repository root (default: the parent of this script's directory) and `--cli` is
 * the built CLI entry (default: `packages/qfai/dist/cli/index.mjs` under the root). Exits non-zero,
 * writing nothing, when a source file or the digest line cannot be found or init fails.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const TEMPLATE_REL = "packages/qfai/assets/init/root/AGENTS.md";
const FIXTURE_REL = "packages/qfai/tests/fixtures/shipped-entry/agents.txt";
const HELPER_REL = "packages/qfai/tests/helpers/shippedLaneCommands.ts";
const CLI_REL = "packages/qfai/dist/cli/index.mjs";
const COPILOT_REL = ".github/copilot-instructions.md";

/** The digest literal that follows the Copilot file's name in `ALLOWED_INIT_CONTENT`. */
const DIGEST_LINE = /(\n\s*"\.github\/copilot-instructions\.md",\n\s*")([0-9a-f]{64})(")/g;

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

function optionValue(args, name) {
  const at = args.indexOf(name);
  if (at === -1) return undefined;
  const value = args[at + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`${name} needs a value`);
  return path.resolve(value);
}

function readRequired(file, hint) {
  if (!existsSync(file)) throw new Error(`${file} does not exist${hint ? `; ${hint}` : ""}`);
  return readFileSync(file);
}

/** The bytes `qfai init` writes for the Copilot file into an empty directory. */
function generatedCopilotBytes(cli) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "qfai-regen-entry-"));
  try {
    const run = spawnSync(process.execPath, [cli, "init", "--dir", dir, "--yes"], {
      encoding: "utf-8",
      maxBuffer: 64 * 1024 * 1024,
    });
    if (run.error !== undefined) throw new Error(`qfai init did not run: ${run.error.message}`);
    if (run.status !== 0) {
      throw new Error(`qfai init exited ${run.status}:\n${run.stdout ?? ""}${run.stderr ?? ""}`);
    }
    return readRequired(path.join(dir, ...COPILOT_REL.split("/")), "init did not write it");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function regenerate(root, cli) {
  const template = readRequired(path.join(root, ...TEMPLATE_REL.split("/")));
  const fixturePath = path.join(root, ...FIXTURE_REL.split("/"));
  const helperPath = path.join(root, ...HELPER_REL.split("/"));
  const helper = readRequired(helperPath).toString("utf8");
  const matches = [...helper.matchAll(DIGEST_LINE)];
  if (matches.length !== 1) {
    throw new Error(
      `${HELPER_REL}: expected one digest after "${COPILOT_REL}", found ${matches.length}`,
    );
  }
  if (!existsSync(cli))
    throw new Error(`${cli} does not exist; run \`pnpm build\` so the CLI exists`);
  const digest = sha256(generatedCopilotBytes(cli));

  const report = [];
  const fixture = existsSync(fixturePath) ? readFileSync(fixturePath) : undefined;
  if (fixture === undefined || !fixture.equals(template)) {
    writeFileSync(fixturePath, template);
    report.push(`${FIXTURE_REL}: updated from ${TEMPLATE_REL}`);
  } else {
    report.push(`${FIXTURE_REL}: unchanged`);
  }
  if (matches[0][2] !== digest) {
    writeFileSync(helperPath, helper.replace(DIGEST_LINE, `$1${digest}$3`));
    report.push(`${HELPER_REL}: ${COPILOT_REL} digest ${matches[0][2]} -> ${digest}`);
  } else {
    report.push(`${HELPER_REL}: ${COPILOT_REL} digest unchanged`);
  }
  return report;
}

const invokedDirectly = fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "");
if (invokedDirectly) {
  try {
    const args = process.argv.slice(2);
    const root =
      optionValue(args, "--root") ??
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const cli = optionValue(args, "--cli") ?? path.join(root, ...CLI_REL.split("/"));
    for (const line of regenerate(root, cli)) console.log(line);
  } catch (error) {
    console.error(`regen-shipped-entry: ${error.message}`);
    process.exitCode = 1;
  }
}
