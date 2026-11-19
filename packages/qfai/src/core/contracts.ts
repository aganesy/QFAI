import path from "node:path";

import { parse as parseYaml } from "yaml";

import { extractIds } from "./ids.js";
import { isRecord } from "./workflow/parse.js";

/**
 * A YAML or JSON contract's top-level mapping.
 *
 * Throws when the text does not parse, and when its top level is no mapping: a
 * YAML file holding only its declaration line parses to `null`, and a body can
 * hold a list or a scalar. Every caller reads keys from the result, so such a
 * root is refused here, where callers already handle a contract that cannot be read.
 */
export function parseStructuredContract(file: string, text: string): Record<string, unknown> {
  const ext = path.extname(file).toLowerCase();
  const root: unknown = ext === ".json" ? JSON.parse(text) : parseYaml(text);
  if (!isRecord(root)) {
    throw new Error(`the top level is ${describeRoot(root)}, not a mapping of keys`);
  }
  return root;
}

function describeRoot(root: unknown): string {
  if (root === null || root === undefined) return "empty";
  if (Array.isArray(root)) return "a list";
  return `a ${typeof root} value`;
}

export function extractUiContractIds(doc: Record<string, unknown>): string[] {
  const id = typeof doc.id === "string" ? doc.id : "";
  return extractIds(id, "UI");
}

export function extractApiContractIds(doc: Record<string, unknown>): string[] {
  const operationIds = new Set<string>();
  collectOperationIds(doc, operationIds);

  const ids = new Set<string>();
  for (const operationId of operationIds) {
    extractIds(operationId, "API").forEach((id) => ids.add(id));
  }
  return Array.from(ids);
}

export function collectOperationIds(value: unknown, out: Set<string>): void {
  if (!value || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectOperationIds(item, out);
    }
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (key === "operationId" && typeof entry === "string") {
      out.add(entry);
      continue;
    }
    collectOperationIds(entry, out);
  }
}
