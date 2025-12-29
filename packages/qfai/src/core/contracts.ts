import path from "node:path";

import { parse as parseYaml } from "yaml";

import { extractIds } from "./ids.js";

export function parseStructuredContract(
  file: string,
  text: string,
): Record<string, unknown> {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".json") {
    return JSON.parse(text) as Record<string, unknown>;
  }
  return parseYaml(text) as Record<string, unknown>;
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
