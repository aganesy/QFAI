// The modifiers a run carries. They raise what a run asks of the operator, never change its
// steps, and only grow.

import type { WorkflowExtraction } from "./extraction.js";

export const WORKFLOW_MODIFIERS = ["gate:user", "gate:release"] as const;

export type WorkflowModifier = (typeof WORKFLOW_MODIFIERS)[number];

// Where a modifier came from: the extraction's signals, the route's defaults, another candidate
// route under a no-question mode, or a result that raised it.
export type ModifierSource = "extraction" | "default" | "candidate" | "raised";

export interface WorkflowModifierEntry {
  modifier: WorkflowModifier;
  source: ModifierSource;
  reason?: string;
}

export function isModifier(value: unknown): value is WorkflowModifier {
  return WORKFLOW_MODIFIERS.some((modifier) => modifier === value);
}

// The modifiers the extraction's own signals attach, each when any one of its signals holds.
export function extractionModifiers(extraction: WorkflowExtraction): WorkflowModifier[] {
  const low = extraction.confidence === "low";
  const breaking =
    extraction.risks.includes("breaking") && !extraction.entryFlags.includes("upstream");
  const user =
    low ||
    breaking ||
    extraction.gate === "decide" ||
    extraction.gate === "external" ||
    extraction.qualifiers.includes("contradicts-record");
  return [
    ...(user ? (["gate:user"] as const) : []),
    ...(extraction.gate === "approve" ? (["gate:release"] as const) : []),
  ];
}

// The modifiers a route's plan declares by default, read from the plan.
export function defaultModifiersOf(defaults: readonly string[] | undefined): WorkflowModifier[] {
  return (defaults ?? []).filter(isModifier);
}

// The entries with each modifier added that they do not hold yet. Nothing is ever removed.
export function withModifiers(
  entries: readonly WorkflowModifierEntry[] | undefined,
  added: readonly WorkflowModifierEntry[],
): WorkflowModifierEntry[] {
  const merged = [...(entries ?? [])];
  for (const entry of added) {
    if (!merged.some((held) => held.modifier === entry.modifier)) merged.push(entry);
  }
  return merged;
}

// The entries a set of modifiers adds from one source.
export function entriesOf(
  modifiers: readonly WorkflowModifier[],
  source: ModifierSource,
): WorkflowModifierEntry[] {
  return modifiers.map((modifier) => ({ modifier, source }));
}

// The modifiers a set of entries holds, in the order of the closed set.
export function modifierNames(entries: readonly WorkflowModifierEntry[] | undefined) {
  return WORKFLOW_MODIFIERS.filter((modifier) =>
    (entries ?? []).some((entry) => entry.modifier === modifier),
  );
}

export function carries(
  snapshot: { modifiers?: readonly WorkflowModifierEntry[] },
  modifier: WorkflowModifier,
): boolean {
  return (snapshot.modifiers ?? []).some((entry) => entry.modifier === modifier);
}
