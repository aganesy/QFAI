#!/usr/bin/env node
/* global console, process */
/**
 * Recompute `scripts/always-loaded-footprint-pins.json` from the shipped init tree.
 *
 * The package's always-loaded budget test holds the pin equal to a fresh measurement, so a change
 * to any text an adopter's agent loads every session, or to a skill body, fails until this has
 * run. The new figures then sit in the diff, where a reviewer reads them. The pin records what the
 * tree is; the budgets that bound it live in the test.
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

export const PIN_REL = "scripts/always-loaded-footprint-pins.json";

/** Writes the pin for the default init tree under `root`. */
export async function pinFootprint(root) {
  const footprint = computeFootprint(fsSource(path.join(root, DEFAULT_TREE)));
  await writeFormattedJson(path.join(root, PIN_REL), pinView(footprint));
  console.log(`wrote ${PIN_REL}`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await pinFootprint(repoRoot);
}
