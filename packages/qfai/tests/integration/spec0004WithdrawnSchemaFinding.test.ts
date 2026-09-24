/**
 * Integration: the withdrawn work-log schema is a file the installed release does not ship.
 *
 * The case builds its own tree with `qfai init` in a fresh temporary directory and runs
 * validate in-process from `src`. A control addition beside the schema shows the provenance
 * check read this tree and reports an unshipped file, so the schema's outcome is the schema's.
 */
// QFAI:SPEC-0004:TC-0004-0075

import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { runValidate } from "../../src/cli/commands/validate.js";
import {
  readAssistantAssetsLock,
  writeAssistantAssetsLock,
} from "../../src/core/assistantAssetProvenance.js";
import { removeTempTree } from "../helpers/tempTree.js";

const ASSISTANT_DIR = ".qfai/assistant";
const SCHEMA_KEY = "catalog/worklog-entry.schema.md";
const SCHEMA = `${ASSISTANT_DIR}/${SCHEMA_KEY}`;
/** An addition no release ships, so the provenance check must name it `QFAI-ASSETS-006`. */
const CONTROL = `${ASSISTANT_DIR}/catalog/unshipped-control.md`;

/** A work-log schema written back by hand after the release stopped shipping it. */
const SCHEMA_TEXT = [
  "# Work-log entry schema",
  "",
  "Every entry under `.qfai/steering/` carries `id`, `kind`, `status`, `created` and `updated`.",
  "",
].join("\n");

type ReportedIssue = {
  readonly code: string;
  readonly severity: string;
  /** Every field that can name a path, with `\` normalised to `/`. */
  readonly texts: readonly string[];
};

function stringsOf(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return [];
}

async function reportedIssues(root: string): Promise<ReportedIssue[]> {
  const text = await readFile(path.join(root, ".qfai", "report", "validate-full.json"), "utf-8");
  const report: unknown = JSON.parse(text);
  if (report === null || typeof report !== "object" || !("issues" in report)) {
    throw new Error("validate-full.json carries no issues array");
  }
  const { issues } = report;
  if (!Array.isArray(issues)) throw new Error("validate-full.json issues is not an array");
  return issues.map((raw: unknown) => {
    const record: Record<string, unknown> =
      raw !== null && typeof raw === "object" ? { ...raw } : {};
    const texts = [
      ...stringsOf(record.file),
      ...stringsOf(record.relatedFiles),
      ...stringsOf(record.refs),
      ...stringsOf(record.message),
      ...stringsOf(record.suggested_action),
    ].map((value) => value.replace(/\\/g, "/"));
    return {
      code: typeof record.code === "string" ? record.code : "",
      severity: typeof record.severity === "string" ? record.severity : "",
      texts,
    };
  });
}

/** `<severity> <code>` of every finding that names `relative`. */
function findingsNaming(issues: readonly ReportedIssue[], relative: string): string[] {
  return issues
    .filter((issue) => issue.texts.some((text) => text.includes(relative)))
    .map((issue) => `${issue.severity} ${issue.code}`);
}

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec0004-withdrawn-schema-"));
});

afterEach(async () => {
  await removeTempTree(root);
});

describe("TC-0004-0075: a remaining work-log schema is an unshipped file", () => {
  it("TC-0004-0075: validate --profile full reports a remaining catalog/worklog-entry.schema.md as an error QFAI-ASSETS-006", async () => {
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    // No provenance record for the schema, whether or not this release's init wrote one.
    const assistantRoot = path.join(root, ASSISTANT_DIR);
    const lock = await readAssistantAssetsLock(assistantRoot);
    if (lock === null) throw new Error("qfai init wrote no .assets.lock.json");
    const files = Object.fromEntries(
      Object.entries(lock.files).filter(([key]) => key !== SCHEMA_KEY),
    );
    await writeAssistantAssetsLock(assistantRoot, { files });

    await writeFile(path.join(root, SCHEMA), SCHEMA_TEXT, "utf-8");
    await writeFile(path.join(root, CONTROL), "# Not shipped\n", "utf-8");

    await runValidate({ root, strict: false, profile: "full" });
    const issues = await reportedIssues(root);

    expect(findingsNaming(issues, CONTROL), "the provenance check read this tree").toContain(
      "error QFAI-ASSETS-006",
    );
    expect(findingsNaming(issues, SCHEMA)).toContain("error QFAI-ASSETS-006");
  });
});
