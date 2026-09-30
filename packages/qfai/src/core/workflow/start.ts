import { keyedDigest } from "./answer.js";
import type {
  InputRefusal,
  WorkflowDecision,
  WorkflowFacts,
  WorkflowHarness,
  WorkflowInput,
  WorkflowVerdict,
} from "./types.js";

const SUPPORTED_HOSTS = ["claude-code", "codex"];

export const REQUIRED_CAPABILITIES = [
  "fetchSkillBody",
  "invokeStage",
  "delegateSubAgent",
  "relayQuestion",
  "runShellAndTests",
  "writeProjectRoot",
  "keepRunRecord",
  "resume",
];

type StartRefusal = Extract<NonNullable<WorkflowVerdict["error"]>, { code: "fail-closed" }>;

// The refusal for a host the core cannot run on. Its subjects are the host, or each capability the
// host does not report as available; undefined when the host and every capability are supported.
function unsupportedHarness(harness: WorkflowHarness): StartRefusal | undefined {
  const code = "fail-closed";
  const cause = "unsupported-capability";
  if (!SUPPORTED_HOSTS.includes(harness.host)) {
    const message = `No run was created: ${harness.host} is not a supported host. Invoke a stage skill by name instead.`;
    return { code, message, cause, subjects: [harness.host] };
  }
  const missing = REQUIRED_CAPABILITIES.filter((name) => harness.capabilities[name] !== true);
  if (missing.length === 0) return undefined;
  const message = `No run was created: the host reports no ${missing.join(", ")}. Invoke a stage skill by name instead.`;
  return { code, message, cause, subjects: missing };
}

// The refusal message for a cause an observer found, naming the override a dropped reviewer
// came from.
function causeMessage(facts: WorkflowFacts): string | undefined {
  if (!facts.cause) return undefined;
  const subjects = facts.causeSubjects ?? [];
  if (facts.cause === "reviewer-missing" && subjects.length > 0) {
    return `No run was created: the qfai.config.yaml routing override drops a required reviewer (${subjects.join(", ")}). Restore it, or invoke a stage skill by name instead.`;
  }
  return `No run was created: the fail-closed cause ${facts.cause} holds. Invoke a stage skill by name instead.`;
}

// A start input holds exactly these; the scope and everything else come from routing.
const START_INPUT_KEYS: readonly string[] = ["operation", "request", "completionTarget", "harness"];

function startInputRefusal(input: WorkflowInput): WorkflowDecision | undefined {
  const extra = Object.keys(input).filter((key) => !START_INPUT_KEYS.includes(key));
  if (extra.length === 0) return undefined;
  const reasons = extra.map((subject): InputRefusal => ({ reason: "schema", subject }));
  const message = "The start input holds a field it may not carry. Remove it and try again.";
  return {
    verdict: { ok: false, run: null, error: { code: "invalid-input", message, reasons } },
    events: [],
  };
}

// `start`: the run's execution context from its three inputs, or the refusal that leaves no run.
export function decideStart(input: WorkflowInput, facts: WorkflowFacts): WorkflowDecision {
  const refused = startInputRefusal(input);
  if (refused) return refused;
  const start = facts.start;
  const text = input.request?.text ?? "";
  const requestDigest = text.trim() ? keyedDigest(text, start?.digestKey) : undefined;
  if (input.operation !== "start" || !start || !requestDigest || !input.harness) {
    const message = "The run could not be started. Check the request and try again.";
    return {
      verdict: { ok: false, run: null, error: { code: "invalid-input", message } },
      events: [],
    };
  }
  const causeText = causeMessage(facts);
  const error: StartRefusal | undefined =
    causeText && facts.cause
      ? { code: "fail-closed", message: causeText, cause: facts.cause }
      : unsupportedHarness(input.harness);
  if (error) return { verdict: { ok: false, run: null, error }, events: [] };
  const { digestKey: _key, ...fixed } = start;
  const executionContext = { ...fixed, harness: input.harness, requestDigest };
  const events = [{ type: "run-created", executionContext }, { type: "capture-request" }];
  const run = { id: start.runId, state: "routing", sequence: events.length };
  return { verdict: { ok: true, run }, events };
}
