/**
 * Integration: under `qfai init --force`, the withdrawn work-log schema is removed only while it
 * still holds the content its record names. An edited copy stays, and init says why.
 *
 * Each case builds its own tree with `qfai init` in a fresh temporary directory, writes the schema
 * and its `.assets.lock.json` record with the exported provenance helpers, and runs init in-process
 * from `src`.
 */
// QFAI:SPEC-0003:TC-0003-0061

import { lstat, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import {
  hashAssistantAssetText,
  readAssistantAssetsLock,
  writeAssistantAssetsLock,
} from "../../src/core/assistantAssetProvenance.js";
import { removeTempTree } from "../helpers/tempTree.js";

const ASSISTANT_DIR = ".qfai/assistant";
const SCHEMA_KEY = "catalog/worklog-entry.schema.md";

/** The schema as a project holds it, recorded in `.assets.lock.json`. */
const SCHEMA_TEXT = [
  "# Work-log entry schema",
  "",
  "Every entry under `.qfai/steering/` carries `id`, `kind`, `status`, `created` and `updated`.",
  "",
].join("\n");

/** The same file after the project edited it, so it no longer matches its record. */
const EDITED_TEXT = `${SCHEMA_TEXT}\nProject rule: entries older than one release are archived.\n`;

/** A report line naming a path that ends in `catalog/worklog-entry.schema.md`. */
const NAMES_SCHEMA = /(?:^|\s)\S*catalog\/worklog-entry\.schema\.md(?=\s|$)/;

/** Runs `action` with stdout captured, and returns what it printed, one entry per line. */
async function captureReport(action: () => Promise<void>): Promise<string[]> {
  const chunks: string[] = [];
  const stdout = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    chunks.push(typeof chunk === "string" ? chunk : String(chunk));
    return true;
  });
  try {
    await action();
  } finally {
    stdout.mockRestore();
  }
  return chunks
    .join("")
    .split(/\r?\n/)
    .map((line) => line.replace(/\\/g, "/"));
}

function init(root: string, force: boolean): Promise<string[]> {
  return captureReport(() => runInit({ dir: root, force, dryRun: false, yes: true }));
}

/** The `lstat` outcome: `exists`, or the error code it failed with. */
async function lstatOutcome(target: string): Promise<string> {
  return lstat(target).then(
    () => "exists",
    (error: unknown) =>
      error instanceof Error && "code" in error ? String(error.code) : "unknown",
  );
}

/**
 * An initialised tree holding `catalog/worklog-entry.schema.md` with a record that matches it,
 * whatever this release's init wrote there.
 */
async function recordedSchema(root: string): Promise<{ assistantRoot: string; schema: string }> {
  await init(root, false);
  const assistantRoot = path.join(root, ASSISTANT_DIR);
  const schema = path.join(assistantRoot, ...SCHEMA_KEY.split("/"));
  await writeFile(schema, SCHEMA_TEXT, "utf-8");
  const lock = await readAssistantAssetsLock(assistantRoot);
  if (lock === null) throw new Error("qfai init wrote no .assets.lock.json");
  await writeAssistantAssetsLock(assistantRoot, {
    files: { ...lock.files, [SCHEMA_KEY]: hashAssistantAssetText(SCHEMA_TEXT) },
  });
  return { assistantRoot, schema };
}

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec0003-withdrawn-schema-"));
});

afterEach(async () => {
  await removeTempTree(root);
});

describe("TC-0003-0061: withdrawn schema: unedited copy retired, edited copy kept", () => {
  it("TC-0003-0061: init --force retires an unedited recorded copy of catalog/worklog-entry.schema.md", async () => {
    const { assistantRoot, schema } = await recordedSchema(root);

    await init(root, true);
    const lock = await readAssistantAssetsLock(assistantRoot);
    const files = lock?.files ?? {};

    expect(
      Object.keys(files).length,
      "init --force rewrote a readable record of the other governed files",
    ).toBeGreaterThan(0);

    expect({
      schema: await lstatOutcome(schema),
      record: files[SCHEMA_KEY] ?? null,
    }).toEqual({ schema: "ENOENT", record: null });
  });

  it("TC-0003-0061: init --force keeps an edited copy of catalog/worklog-entry.schema.md and notes it", async () => {
    const { schema } = await recordedSchema(root);
    await writeFile(schema, EDITED_TEXT, "utf-8");

    const report = await init(root, true);

    expect(
      report.filter((line) => line.startsWith("qfai init: dest=")),
      "the captured report is the one init printed",
    ).toHaveLength(1);

    const notes = report.filter(
      (line) =>
        line.includes("NOTE:") &&
        NAMES_SCHEMA.test(line) &&
        line.includes("no longer shipped") &&
        line.includes("content has been edited") &&
        line.includes("was not removed"),
    );
    expect({ content: await readFile(schema, "utf-8"), noted: notes.length > 0 }).toEqual({
      content: EDITED_TEXT,
      noted: true,
    });
  });
});
