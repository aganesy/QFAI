/**
 * Stage results built from the routing example of the `qfai-run` payload reference, each changed
 * in one place, for the cases the parser and the stage-result schema must judge alike.
 */
function fields(result: unknown): Record<string, unknown> {
  return typeof result === "object" && result !== null ? { ...result } : {};
}

const debt = {
  findingCode: "maintain-semantic-effect",
  path: "src/orders.ts",
  cause: "The corrected string is compared by the code",
  owningFlow: null,
  detectingCommand: "the maintenance edit's review",
  resolvingOwner: "qfai-implement",
  blockingExtent: "run",
};

const nulls = {
  inputTokens: null,
  outputTokens: null,
  cachedTokens: null,
  subAgentTokens: null,
  toolDefinitionBytes: null,
  referenceBytesRead: null,
  wallClockMs: null,
  questionsPut: null,
  reworkCount: null,
};

export function stageResultVariants(result: unknown): { name: string; payload: unknown }[] {
  const base = fields(result);
  const { actor: _dropped, ...withoutActor } = base;
  return [
    { name: "routing result", payload: base },
    { name: "stage result with no actor", payload: withoutActor },
    { name: "stage result with an unknown key", payload: { ...base, note: "added by hand" } },
    { name: "stage result with an unknown outcome", payload: { ...base, outcome: "done" } },
    { name: "stage result with a flowless debt", payload: { ...base, debts: [debt] } },
    {
      name: "stage result whose fact question carries a recommendation",
      payload: {
        ...base,
        questions: [{ kind: "fact", text: "Which region?", recommendation: "eu" }],
      },
    },
    {
      name: "stage result binding a malformed flow ID",
      payload: { ...base, bindings: [{ slotId: "slot-1", flowId: "BF-dddd", storyIds: [] }] },
    },
    { name: "stage result measured with nulls", payload: { ...base, measurement: nulls } },
    {
      name: "stage result with a debt missing its owner",
      payload: { ...base, debts: [{ ...debt, resolvingOwner: undefined }] },
    },
  ].map(({ name, payload }) => ({ name, payload: JSON.parse(JSON.stringify(payload)) }));
}
