import type { GraphHookHost } from "./hooks.js";

export interface GraphHostFacts {
  host: GraphHookHost;
  version?: string;
  configuration: "configured" | "not-configured" | "failed";
  denialEvent?: string;
  failureProtocol?: "supported" | "unsupported" | "unverified";
  trust: "required" | "granted" | "not-required" | "unknown";
}

export interface GraphHostProtection {
  host: GraphHookHost;
  version?: string;
  state: "configured" | "trust-required" | "runtime-verified" | "unsupported" | "failed";
  events: readonly string[];
  recovery: string;
  configuration?: GraphHostFacts["configuration"];
  trust?: GraphHostFacts["trust"];
}

export interface GraphHostRuntimeObservation {
  host: GraphHookHost;
  version: string;
  events: readonly string[];
  trustGranted: boolean;
  deniedDecision: "deny" | "allow" | "missing";
  permittedDecision: "deny" | "allow" | "missing";
  deniedSearchExecuted: boolean;
  permittedEventExecuted: boolean;
}

export type GraphHostRuntimeProbe = () => Promise<GraphHostRuntimeObservation>;

export async function verifyGraphHostProtection(
  fact: GraphHostFacts,
  probe: GraphHostRuntimeProbe,
): Promise<GraphHostProtection> {
  const report = reportHost(fact);
  if (report.state === "unsupported" || report.state === "failed") return report;
  try {
    const observed = await probe();
    if (!observed.trustGranted) return { ...report, state: "trust-required" };
    if (
      observed.host !== fact.host ||
      observed.version !== fact.version ||
      observed.deniedDecision !== "deny" ||
      observed.permittedDecision !== "allow" ||
      observed.deniedSearchExecuted ||
      !observed.permittedEventExecuted ||
      observed.events.length === 0 ||
      observed.events.some(
        (event) => !event.startsWith(`${fact.denialEvent}:`) || event.includes("*"),
      )
    ) {
      return {
        ...report,
        state: "failed",
        recovery:
          "Search protection failed. Repair the host configuration and repeat both event checks.",
      };
    }
    return {
      ...report,
      state: "runtime-verified",
      events: Object.freeze([...observed.events]),
      recovery: "Verification covers only this host, version and exercised event set.",
    };
  } catch {
    return {
      ...report,
      state: "failed",
      recovery: "Search protection failed. Repair the host probe and repeat both event checks.",
    };
  }
}

export function inspectGraphHostProtection(
  facts: readonly GraphHostFacts[],
): GraphHostProtection[] {
  return facts.map(reportHost);
}

function reportHost(fact: GraphHostFacts): GraphHostProtection {
  const supported = Boolean(
    fact.version && fact.denialEvent && fact.failureProtocol === "supported",
  );
  return {
    host: fact.host,
    ...(fact.version ? { version: fact.version } : {}),
    state: !supported
      ? "unsupported"
      : fact.configuration === "failed"
        ? "failed"
        : fact.configuration !== "configured"
          ? "failed"
          : fact.trust === "required" || fact.trust === "unknown"
            ? "trust-required"
            : "configured",
    configuration: fact.configuration,
    trust: fact.trust,
    events: supported && fact.denialEvent ? [fact.denialEvent] : [],
    recovery: !supported
      ? "This host cannot enforce the required search denial. Verify host version, event support and failure-blocking behavior before enabling protection."
      : fact.trust === "required"
        ? "Review and trust the project's graph hooks in the selected host."
        : "Exercise denied search and permitted events in this host before claiming verification.",
  };
}
