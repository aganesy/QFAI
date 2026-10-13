import { expect, it } from "vitest";
import {
  inspectGraphHostProtection,
  verifyGraphHostProtection,
  type GraphHostFacts,
  type GraphHostRuntimeObservation,
} from "../../../src/core/graph/hosts.js";
import { renderGraphPreparation } from "../../../src/core/graph/presentation.js";

const facts: GraphHostFacts[] = [
  {
    host: "claude",
    version: "fixture-claude",
    configuration: "configured",
    denialEvent: "PreToolUse",
    failureProtocol: "supported",
    trust: "required",
  },
  {
    host: "codex",
    version: "fixture-codex",
    configuration: "configured",
    denialEvent: "PreToolUse",
    failureProtocol: "supported",
    trust: "required",
  },
  {
    host: "copilot",
    version: "fixture-copilot",
    configuration: "configured",
    denialEvent: "preToolUse",
    failureProtocol: "supported",
    trust: "not-required",
  },
  {
    host: "vscode",
    version: "fixture-vscode-local",
    configuration: "configured",
    denialEvent: "PreToolUse",
    failureProtocol: "supported",
    trust: "required",
  },
];

// QFAI:EX-0001-0235-19
// Mutation: packages/qfai/src/core/graph/hosts.ts `fact.trust === "required" || fact.trust === "unknown"` -> `false` fails "reports separate host versions trust and configuration without verification claims"
it("reports separate host versions trust and configuration without verification claims", () => {
  const reports = inspectGraphHostProtection(facts);
  expect(reports.map((report) => [report.host, report.version, report.state])).toEqual([
    ["claude", "fixture-claude", "trust-required"],
    ["codex", "fixture-codex", "trust-required"],
    ["copilot", "fixture-copilot", "configured"],
    ["vscode", "fixture-vscode-local", "trust-required"],
  ]);
  const output = renderGraphPreparation(
    { runtime: "installed", code: "code-not-ready", documents: "documents-not-ready" },
    reports,
  );
  for (const report of reports) {
    expect(output).toContain(report.host);
    expect(output).toContain(report.version);
    expect(output).toContain(report.state);
  }
  expect(output).toContain("Configuration alone does not verify search protection.");
  expect(output).not.toContain("runtime-verified");
});

// QFAI:EX-0001-0235-21
// Mutation: packages/qfai/src/core/graph/hosts.ts `fact.failureProtocol === "supported"` -> `fact.failureProtocol !== "supported"` fails "reports an unsupported host event without claiming protection or running a probe"
it("reports an unsupported host event without claiming protection or running a probe", async () => {
  const fact: GraphHostFacts = {
    host: "vscode",
    version: "fixture-unsupported",
    configuration: "configured",
    trust: "granted",
    denialEvent: "PreToolUse",
    failureProtocol: "unsupported",
  };
  let probes = 0;
  const result = await verifyGraphHostProtection(fact, () => {
    probes += 1;
    return Promise.reject(new Error("This protocol must not be probed"));
  });
  expect(result.state).toBe("unsupported");
  expect(result.events).toEqual([]);
  expect(result.recovery).toContain("cannot enforce");
  expect(probes).toBe(0);
  const output = renderGraphPreparation(
    { runtime: "installed", code: "code-not-ready", documents: "documents-not-ready" },
    [result],
  );
  expect(output).toContain("unsupported");
  expect(output).toContain("This host cannot enforce the required search denial.");
  expect(output).not.toContain("runtime-verified");
});

// QFAI:EX-0001-0235-20
// Mutation: packages/qfai/src/core/graph/hosts.ts `observed.version !== fact.version` -> `false` fails "binds runtime verification to the observed trusted host version and event effects"
it("binds runtime verification to the observed trusted host version and event effects", async () => {
  const fact: GraphHostFacts = {
    host: "codex",
    version: "fixture-codex",
    configuration: "configured",
    denialEvent: "PreToolUse",
    failureProtocol: "supported",
    trust: "required",
  };
  const observed: GraphHostRuntimeObservation = {
    host: "codex",
    version: "fixture-codex",
    events: ["PreToolUse:Bash"],
    trustGranted: true,
    deniedDecision: "deny",
    permittedDecision: "allow",
    deniedSearchExecuted: false,
    permittedEventExecuted: true,
  };
  let probes = 0;
  const verified = await verifyGraphHostProtection(fact, () => {
    probes += 1;
    return Promise.resolve(observed);
  });
  expect(verified.state).toBe("runtime-verified");
  expect(verified.host).toBe("codex");
  expect(verified.version).toBe("fixture-codex");
  expect(verified.events).toEqual(["PreToolUse:Bash"]);
  expect(probes).toBe(1);
  for (const invalid of [
    { ...observed, trustGranted: false },
    { ...observed, host: "claude" as const },
    { ...observed, version: "another-version" },
    { ...observed, deniedSearchExecuted: true },
    { ...observed, permittedEventExecuted: false },
    { ...observed, events: [] },
    { ...observed, events: ["PreToolUse:*"] },
    { ...observed, deniedDecision: "missing" as const },
    { ...observed, permittedDecision: "deny" as const },
  ])
    expect((await verifyGraphHostProtection(fact, () => Promise.resolve(invalid))).state).not.toBe(
      "runtime-verified",
    );
});
