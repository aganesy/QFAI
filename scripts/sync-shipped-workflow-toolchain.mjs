#!/usr/bin/env node

import console from "node:console";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL, URL } from "node:url";

// Edit the setup steps in qfai-validate.yml, then run pnpm sync:ssot. Each
// generated workflow keeps its own diagnostics and runs without this script.
const SOURCE = "qfai-validate.yml";
const DESTINATIONS = [
  { name: "qfai-tests.yml", lane: "tests", result: "test" },
  { name: "qfai-docs.yml", lane: "docs", result: "validate" },
];
const FIRST_STEP = "      - name: Resolve the package manager (pnpm route fails closed)";
const LAST_STEP = "      - name: Install dependencies (lockfile-aware)";

/** @param {string} text @param {string} name */
function readBlock(text, name) {
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(newline);
  const first = lines.indexOf(FIRST_STEP);
  const last = lines.indexOf(LAST_STEP);
  const end = lines.findIndex((line, index) => index > last && /^ {6}- \S/u.test(line));
  if (
    first < 0 ||
    last <= first ||
    end <= last ||
    lines.lastIndexOf(FIRST_STEP) !== first ||
    lines.lastIndexOf(LAST_STEP) !== last
  ) {
    throw new Error(`toolchain step boundaries are missing or ambiguous in ${name}`);
  }
  return { newline, lines, first, end };
}

/** @param {string} directory */
export function syncShippedWorkflowToolchain(directory, checkOnly = false) {
  const canonical = readBlock(readFileSync(join(directory, SOURCE), "utf8"), SOURCE);
  const block = canonical.lines.slice(canonical.first, canonical.end);
  const changes = [];
  for (const { name, lane, result } of DESTINATIONS) {
    const target = join(directory, name);
    const current = readFileSync(target, "utf8");
    const { lines, newline, first, end } = readBlock(current, name);
    const rendered = block.map((line) =>
      line
        .replaceAll("qfai validate:", `qfai ${lane}:`)
        .replaceAll("a validate result", `a ${result} result`),
    );
    const updated = [...lines.slice(0, first), ...rendered, ...lines.slice(end)].join(newline);
    if (updated !== current) changes.push({ name, target, updated });
  }
  if (!checkOnly) {
    for (const { target, updated } of changes) writeFileSync(target, updated, "utf8");
  }
  return changes.map(({ name }) => name);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [option, extra] = process.argv.slice(2);
  if (extra !== undefined || (option !== undefined && option !== "--check")) {
    console.error("Usage: node scripts/sync-shipped-workflow-toolchain.mjs [--check]");
    process.exitCode = 2;
  } else {
    try {
      const directory = fileURLToPath(
        new URL("../packages/qfai/assets/init/root/.github/workflows/", import.meta.url),
      );
      const changed = syncShippedWorkflowToolchain(directory, option === "--check");
      if (changed.length > 0 && option === "--check") {
        console.error(`Stale toolchain steps in ${changed.join(", ")}. Run pnpm sync:ssot.`);
        process.exitCode = 1;
      } else if (changed.length > 0) {
        console.log(`Updated toolchain steps in ${changed.join(", ")} from ${SOURCE}.`);
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  }
}
