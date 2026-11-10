#!/usr/bin/env node
/* global console, process */
/**
 * Recompute the always-loaded footprint pin from the shipped init tree.
 *
 * The package's always-loaded budget test holds the pin equal to a fresh measurement, so a change
 * to any text init makes an adopter's agent load in every session fails until this has run. The
 * new figures then sit in the diff, where a reviewer reads them. The pin records what the tree is;
 * the ceilings that bound it live in the test.
 *
 * The pin is test data, so it sits beside the test that reads it rather than under `scripts/`,
 * whose files are byte-pinned as guard programs.
 *
 * Usage: node scripts/pin-always-loaded-footprint.mjs
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  computeFootprint,
  DEFAULT_TREE,
  fsSource,
  pinView,
} from "./lib/always-loaded-footprint.mjs";
import { writeFormattedJson } from "./lib/write-declaration.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Where the pin lives, relative to the repository root, POSIX-separated. */
export const PIN_REL = "packages/qfai/tests/integration/always-loaded-footprint.pins.json";

/** Writes the pin for the default init tree under `root`. */
export async function pinFootprint(root) {
  const footprint = computeFootprint(fsSource(path.join(root, ...DEFAULT_TREE.split("/"))));
  await writeFormattedJson(path.join(root, ...PIN_REL.split("/")), pinView(footprint));
  console.log(`wrote ${PIN_REL}`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await pinFootprint(repoRoot);
}
