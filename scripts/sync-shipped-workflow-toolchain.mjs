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
const SETUP_STEP_PREFIXES = [
  "      - name: Resolve the package manager (pnpm route fails closed)",
  "      - name: Set up pnpm via pnpm/action-setup ",
  "      - name: Resolve the Node version (adopter file wins, else fall open)",
  "      - name: Choose a package-manager cache setup-node can actually resolve",
  "      - name: Set up Node via actions/setup-node ",
  "      - name: Install dependencies (lockfile-aware)",
];

/** @param {string} text @param {string} name */
function readBlock(text, name) {
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(newline);
  if (lines.some((line) => /[\r\n]/u.test(line))) {
    throw new Error(`mixed or unsupported line endings in ${name}. Use LF or CRLF consistently.`);
  }
  const startMarker = SETUP_STEP_PREFIXES[0];
  const first = lines.indexOf(startMarker);
  if (first < 0) {
    throw new Error(`missing toolchain start marker in ${name}. Expected ${startMarker.trim()}.`);
  }
  if (lines.lastIndexOf(startMarker) !== first) {
    throw new Error(
      `duplicate toolchain start marker in ${name}. Keep a single ${startMarker.trim()} step.`,
    );
  }
  // A de-dented mapping key or comment ends the current sequence just as a
  // following list item does. In particular, the install step can end a job.
  const boundaries = lines.flatMap((line, index) =>
    index >= first && /^ {0,7}\S/u.test(line) ? [{ line, index }] : [],
  );
  for (const [index, prefix] of SETUP_STEP_PREFIXES.entries()) {
    const observed = boundaries[index];
    if (observed?.line.startsWith(prefix)) continue;
    const mismatch =
      observed === undefined
        ? "reached the end of the file"
        : `found ${JSON.stringify(observed.line.trim())} on line ${observed.index + 1}`;
    throw new Error(
      `interrupted toolchain sequence in ${name}. Expected ${JSON.stringify(prefix.trim())}, ${mismatch}. ` +
        "To fix this, keep the six setup steps together and put lane-specific steps after them.",
    );
  }
  let end = boundaries[SETUP_STEP_PREFIXES.length]?.index ?? lines.length;
  // Leave trailing separators and YAML comments with the destination.
  while (end > first && /^(?:\s*$| {0,8}#)/u.test(lines[end - 1])) end -= 1;
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

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
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
