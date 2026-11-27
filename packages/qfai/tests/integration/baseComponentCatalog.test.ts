/**
 * Acceptance of the base component catalogue: the shipped file of the parts most products need,
 * its closed entry shape, its installation by `qfai init`, and the guidance that sends an
 * implementer to it.
 */

import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";
import { parse } from "yaml";

import { runInit } from "../helpers/legacyInit.js";
import { captureStdout } from "../helpers/stdout.js";

const assistantAssets = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
);
const BASE_CATALOGUE = path.join("rule", "references", "base-components.yaml");
const BASE_CATALOGUE_PATH = ".qfai/assistant/rule/references/base-components.yaml";

const STARTER_IDS = [
  "error-summary",
  "field-with-error",
  "step-indicator",
  "confirm-step",
  "skip-link",
  "sticky-action-bar",
  "status-message",
  "empty-state",
];
const ENTRY_KEYS = [
  "id",
  "purpose",
  "anatomy",
  "role",
  "accessibleName",
  "keyboard",
  "focus",
  "states",
  "content",
  "runtime",
  "sources",
];
const RUNTIME_KEYS = ["serverRendering", "csp", "noScript"];

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (text: string): string => text.replace(/\s*\n\s*/g, " ");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isTextList = (value: unknown): boolean =>
  Array.isArray(value) && value.length > 0 && value.every(isText);

/** Every way one entry departs from the closed shape, each naming the entry. */
function entryProblems(entry: unknown, index: number): string[] {
  if (!isRecord(entry)) return [`entry ${index} is not a mapping`];
  const label = isText(entry.id) ? entry.id : `entry ${index}`;
  const problems: string[] = [];
  const keys = Object.keys(entry);
  if (keys.join(",") !== ENTRY_KEYS.join(",")) problems.push(`${label}: keys ${keys.join(", ")}`);
  if (!isText(entry.id) || !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(entry.id)) {
    problems.push(`${label}: id is not kebab-case`);
  }
  for (const key of ["purpose", "role", "accessibleName", "focus"]) {
    if (!isText(entry[key])) problems.push(`${label}: ${key} is not text`);
  }
  for (const key of ["anatomy", "keyboard", "content"]) {
    if (!isTextList(entry[key])) problems.push(`${label}: ${key} is not a list of text`);
  }
  const states = entry.states;
  if (!isRecord(states) || Object.keys(states).length === 0) {
    problems.push(`${label}: states is not a mapping of state to rendering`);
  } else {
    for (const [state, renders] of Object.entries(states)) {
      if (!isText(renders)) problems.push(`${label}: state ${state} says nothing on rendering`);
    }
  }
  const runtime = entry.runtime;
  if (!isRecord(runtime) || Object.keys(runtime).join(",") !== RUNTIME_KEYS.join(",")) {
    problems.push(`${label}: runtime keys are not ${RUNTIME_KEYS.join(", ")}`);
  } else {
    for (const key of RUNTIME_KEYS) {
      if (!isText(runtime[key])) problems.push(`${label}: runtime ${key} is not text`);
    }
  }
  const sources = entry.sources;
  if (!Array.isArray(sources) || !isTextList(sources)) {
    problems.push(`${label}: sources is not a list of text`);
  } else {
    for (const source of sources) {
      if (!/^(native <[a-z][a-z0-9]*>|https:\/\/\S+)$/.test(String(source))) {
        problems.push(`${label}: source ${String(source)} is neither a native element nor a URL`);
      }
    }
  }
  return problems;
}

describe("QFAI ships a base catalogue of the parts most products need", () => {
  // QFAI:AC-0001-0307-14
  // QFAI:EX-0001-0307-41
  it("holds one closed-shape entry per starter part, with unique kebab-case ids", async () => {
    const doc: unknown = parse(await readFile(path.join(assistantAssets, BASE_CATALOGUE), "utf-8"));
    expect(isRecord(doc) ? Object.keys(doc) : doc).toEqual(["components"]);
    const entries: unknown[] = isRecord(doc) && Array.isArray(doc.components) ? doc.components : [];
    expect(entries.map((entry) => (isRecord(entry) ? entry.id : entry))).toEqual(STARTER_IDS);
    expect(entries.flatMap((entry, index) => entryProblems(entry, index))).toEqual([]);
  });

  // QFAI:EX-0001-0307-42
  it("is written by qfai init into the project's assistant tree as shipped", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-base-catalogue-"));
    roots.push(root);
    await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
    expect(await readFile(path.join(root, ...BASE_CATALOGUE_PATH.split("/")), "utf-8")).toBe(
      await readFile(path.join(assistantAssets, BASE_CATALOGUE), "utf-8"),
    );
  });

  // QFAI:EX-0001-0307-43
  it("sends the implementer to the entry, one shared component and the entry id in @pattern", async () => {
    const guidance = flat(
      await readFile(
        path.join(assistantAssets, "skill", "qfai-implement", "references", "ui-affecting.md"),
        "utf-8",
      ),
    );
    const section = guidance.slice(
      guidance.indexOf("## Component catalogue"),
      guidance.indexOf(" ## ", guidance.indexOf("## Component catalogue") + 1),
    );
    expect(section).toContain(`\`${BASE_CATALOGUE_PATH}\``);
    expect(section).toContain("Build it once as a shared component");
    expect(section).toContain("name the entry's `id` in its `@pattern`");

    const rule = flat(
      await readFile(path.join(assistantAssets, "rule", "ui-procurement.md"), "utf-8"),
    );
    const reuseRung = rule.slice(
      rule.indexOf("1. **Does the project already have a component for it?**"),
      rule.indexOf("2. **Does a native platform element do it?**"),
    );
    expect(reuseRung).toContain(`\`${BASE_CATALOGUE_PATH}\``);
    expect(reuseRung).toContain("`@pattern`");
  });
});
