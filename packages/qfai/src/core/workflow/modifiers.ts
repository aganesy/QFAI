// The default modifiers a plan may declare. They never change a plan's steps.

export const WORKFLOW_MODIFIERS = ["review:heavy", "gate:user", "gate:release"] as const;

export type WorkflowModifier = (typeof WORKFLOW_MODIFIERS)[number];

export function isModifier(value: unknown): value is WorkflowModifier {
  return WORKFLOW_MODIFIERS.some((modifier) => modifier === value);
}

// The modifiers a route's plan declares by default, read from the plan.
export function defaultModifiersOf(defaults: readonly string[] | undefined): WorkflowModifier[] {
  return (defaults ?? []).filter(isModifier);
}
