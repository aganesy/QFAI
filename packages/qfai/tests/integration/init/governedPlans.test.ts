/**
 * Integration: the installed workflow plans are a governed layer of the provenance lock, while
 * the migration memos beside them stay ungoverned.
 */
// QFAI:SPEC-0003:TC-0003-0074
// QFAI:SPEC-0003:TC-0003-0075
// QFAI:SPEC-0003:TC-0003-0077
import { createHash } from "node:crypto";
import { readFile, readdir, readlink } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getInitAssetsDir } from "../../../src/cli/lib/assets.js";
import {
  EDITED_MEMO,
  EDITED_PLAN,
  OLDER_PLAN,
  assistantFile,
  initQuietly,
  readLock,
  withEmptyRepo,
  withInstall,
} from "./upgradeStates.js";

const SHIPPED_ASSISTANT = path.join(getInitAssetsDir(), ".qfai", "assistant");

async function shippedPlans(): Promise<string[]> {
  const names = await readdir(path.join(SHIPPED_ASSISTANT, "process", "workflows"));
  return names.map((name) => `process/workflows/${name}`).sort();
}

async function shippedBytes(relative: string): Promise<Buffer> {
  return readFile(path.join(SHIPPED_ASSISTANT, ...relative.split("/")));
}

/** One digest over every path and its bytes (a link's target), `.git/` excluded. */
async function treeDigest(root: string): Promise<string> {
  const entries = await readdir(root, { withFileTypes: true, recursive: true });
  const hash = createHash("sha256");
  const rows = entries
    .map((entry) => ({ entry, full: path.join(entry.parentPath, entry.name) }))
    .filter(({ full }) => !path.relative(root, full).split(path.sep).includes(".git"))
    .sort((a, b) => a.full.localeCompare(b.full));
  for (const { entry, full } of rows) {
    hash.update(path.relative(root, full));
    if (entry.isSymbolicLink()) hash.update(await readlink(full));
    else if (entry.isFile()) hash.update(await readFile(full));
  }
  return hash.digest("hex");
}

describe("the plans are a governed layer", () => {
  it("TC-0003-0074: Fresh init records every plan in the lock, and no memo", async () => {
    await withEmptyRepo(async (root) => {
      await initQuietly(root);
      const keys = Object.keys((await readLock(root)).files);
      expect(keys.filter((key) => key.startsWith("process/workflows/")).sort()).toEqual(
        await shippedPlans(),
      );
      expect(keys.filter((key) => key.startsWith("process/migrations/"))).toEqual([]);
    });
  });

  it("TC-0003-0075: Upgrade refreshes an older plan, keeps edited plan and memo", async () => {
    await withInstall(["older-plan", "edited-plan", "edited-memo"], async (root) => {
      const editedPlan = await readFile(assistantFile(root, EDITED_PLAN));
      const editedMemo = await readFile(assistantFile(root, EDITED_MEMO));
      await initQuietly(root);

      expect(await readFile(assistantFile(root, OLDER_PLAN))).toEqual(
        await shippedBytes(OLDER_PLAN),
      );
      expect(await readFile(assistantFile(root, EDITED_PLAN))).toEqual(editedPlan);
      expect(await readFile(assistantFile(root, EDITED_MEMO))).toEqual(editedMemo);
    });
  });

  it("TC-0003-0077: A rerun writes nothing and leaves the tree byte-identical", async () => {
    await withInstall([], async (root) => {
      await initQuietly(root);
      const before = await treeDigest(root);
      const report = await initQuietly(root);

      expect(report, "the run's summary was captured").toContain("qfai init: done");
      expect(report).not.toMatch(/\bwritten:/);
      expect(await treeDigest(root)).toBe(before);
    });
  });
});
