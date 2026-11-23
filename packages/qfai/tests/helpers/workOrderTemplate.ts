/**
 * The work order template a delegated sub-agent receives, read the way every
 * asset test reads it: the delegation baseline must point at the template, and
 * the template is the fenced `text` block under `## Work order template`.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect } from "vitest";

// tests/helpers/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const DELEGATION = "assistant/rule/shared-skill-delegation-baseline.md";
const WORK_ORDER = "assistant/rule/references/worker-edit-boundary.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

/** The fenced `text` block under `## Work order template` in `tree`. */
export async function workOrderBlock(tree: string): Promise<string> {
  const baseline = await read(tree, DELEGATION);
  const pointer = baseline.split("\n## Work order template\n")[1]?.split("\n## ")[0];
  expect(pointer).toBeDefined();
  expect(flat(pointer ?? "")).toContain("When preparing a delegation");
  expect(pointer).toContain(
    ".qfai/assistant/rule/references/worker-edit-boundary.md#work-order-template",
  );
  const source = await read(tree, WORK_ORDER);
  const body = source.split("\n## Work order template\n")[1]?.split("\n## ")[0];
  expect(body).toBeDefined();
  const block = /```text\n([\s\S]*?)```/.exec(body ?? "");
  expect(block).not.toBeNull();
  return block?.[1] ?? "";
}
