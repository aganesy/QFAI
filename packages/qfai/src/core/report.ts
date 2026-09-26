import { lstat, readFile } from "node:fs/promises";
import path from "node:path";

import type { ConfigLoadResult } from "./config.js";
import { resolvePath } from "./config.js";
import { loadDecisionGuardrails, normalizeDecisionGuardrails } from "./decisionGuardrails.js";
import { resolveFlowScope } from "./flowScope.js";
import {
  buildEvidenceRefs,
  iterationConverged,
  type EvidenceRef,
} from "./prototyping/iteration.js";
import { PROTOTYPING_EVIDENCE_REL, PROTOTYPING_JSON_REL } from "./prototyping/paths.js";
import { readUiContractInventory } from "./prototyping/specResolution.js";
import { readStoryTreeModel } from "./storyTree/tree.js";
import type { Issue, ValidationCounts, ValidationProfile, ValidationResult } from "./types.js";

type PrototypingSummary = {
  status: "no-pack" | "invalid" | "in-progress" | "incomplete" | "complete";
  roundLifecycle: { iterations: number };
  mode: {
    effective: "single-thread-loop";
    posture: "convergence" | "exploration";
    source: string;
    rationale: string;
    surface: string;
  };
  obligations: {
    profile: "single-thread-loop";
    acceptedEvidenceRequired: boolean;
    screens: number;
  };
  evidence: {
    uiContractCoverageStatus: "complete" | "incomplete";
    uiContractCoverage: {
      expectedUiContractIds: string[];
      observedUiContractIds: string[];
      missingUiContractIds: string[];
      unexpectedUiContractIds: string[];
    };
    acceptedIterationIndex: number | null;
    accepted: EvidenceArtifact[];
  };
  calibration: { path: string | null; status: "present" | "not available" };
  findings: Issue[];
  warnings: string[];
};

type EvidenceArtifact = {
  kind: EvidenceRef["kind"];
  path: string;
  status: "present" | "missing" | "not-declared";
};

export type ReportData = {
  tool: "qfai";
  version: string;
  generatedAt?: string;
  profile?: ValidationProfile;
  summary: {
    flows: number;
    stories: number;
    acceptanceCriteria: number;
    examples: number;
    rules: number;
    contracts: number;
    counts: ValidationCounts;
  };
  flows: Array<{
    id: string;
    stories: string[];
    acceptanceCriteria: string[];
    examples: string[];
    rules: string[];
  }>;
  prototyping: PrototypingSummary;
  guardrails: {
    total: number;
    items: Array<{
      id: string;
      type: string;
      guardrail: string;
      source: { file: string; line: number };
    }>;
    scanErrors: Array<{ file: string; message: string }>;
  };
  waivers?: ValidationResult["waivers"];
  issues: Issue[];
};

async function readPrototypingSummary(
  root: string,
  config: ConfigLoadResult["config"],
  issues: readonly Issue[],
): Promise<PrototypingSummary> {
  let parsed: unknown;
  let state: "no-pack" | "invalid" | "readable" = "readable";
  try {
    parsed = JSON.parse(await readFile(path.join(root, PROTOTYPING_JSON_REL), "utf8"));
  } catch {
    try {
      await lstat(path.join(root, PROTOTYPING_JSON_REL));
      state = "invalid";
    } catch {
      state = "no-pack";
    }
  }
  if (!isRecord(parsed)) state = state === "readable" ? "invalid" : state;
  const doc = isRecord(parsed) ? parsed : {};
  const observedUiContractIds = Array.isArray(doc.uiContractsCovered)
    ? doc.uiContractsCovered.filter((value): value is string => typeof value === "string").sort()
    : [];
  const inventory = await readUiContractInventory(root, config);
  const expectedUiContractIds = [
    ...new Set(inventory.filter((entry) => entry.hasScreens).map((entry) => entry.uiContractId)),
  ].sort();
  const missingUiContractIds = expectedUiContractIds.filter(
    (id) => !observedUiContractIds.includes(id),
  );
  const unexpectedUiContractIds = observedUiContractIds.filter(
    (id) => !expectedUiContractIds.includes(id),
  );
  const iterations = Array.isArray(doc.iterations) ? doc.iterations.length : 0;
  const acceptedIterationIndex =
    typeof doc.acceptedIterationIndex === "number" &&
    Number.isInteger(doc.acceptedIterationIndex) &&
    doc.acceptedIterationIndex >= 0 &&
    doc.acceptedIterationIndex < iterations
      ? doc.acceptedIterationIndex
      : null;
  const acceptedIteration: unknown =
    acceptedIterationIndex !== null && Array.isArray(doc.iterations)
      ? (doc.iterations as unknown[])[acceptedIterationIndex]
      : undefined;
  const recordedMode = isRecord(acceptedIteration) ? acceptedIteration.mode : undefined;
  const posture =
    recordedMode === "convergence" || recordedMode === "exploration"
      ? recordedMode
      : (config.prototyping?.mode ?? "convergence");
  const postureSource =
    recordedMode === "convergence" || recordedMode === "exploration"
      ? `${PROTOTYPING_JSON_REL}#iterations[${acceptedIterationIndex}].mode`
      : "qfai.config.yaml#prototyping.mode";
  const acceptedRefs = isRecord(acceptedIteration) ? acceptedIteration.evidenceRefs : undefined;
  const declaredRefs: EvidenceRef[] = Array.isArray(acceptedRefs)
    ? acceptedRefs.flatMap((value: unknown) =>
        isRecord(value) &&
        (value.kind === "screenshot" || value.kind === "html") &&
        typeof value.path === "string"
          ? [{ kind: value.kind, path: value.path }]
          : [],
      )
    : [];
  const screenIds = [...new Set(inventory.flatMap((entry) => entry.screenIds))].sort();
  const expectedRefs =
    acceptedIterationIndex === null ? [] : buildEvidenceRefs(acceptedIterationIndex, screenIds);
  const evidenceKeys = new Set(expectedRefs.map((ref) => `${ref.kind}:${ref.path}`));
  const refsToShow = [
    ...expectedRefs,
    ...declaredRefs.filter((ref) => !evidenceKeys.has(`${ref.kind}:${ref.path}`)),
  ];
  const accepted = await Promise.all(
    refsToShow.map(async (ref): Promise<EvidenceArtifact> => {
      if (!declaredRefs.some((item) => item.kind === ref.kind && item.path === ref.path)) {
        return { ...ref, status: "not-declared" };
      }
      const present = await existsWithinRoot(
        path.join(root, PROTOTYPING_EVIDENCE_REL),
        ref.path,
        true,
      );
      return { ...ref, status: present ? "present" : "missing" };
    }),
  );
  const calibrationPath = config.prototyping?.calibration?.packPath ?? null;
  const calibration = calibrationPath
    ? {
        path: calibrationPath,
        status: (await existsWithinRoot(root, calibrationPath))
          ? ("present" as const)
          : ("not available" as const),
      }
    : { path: null, status: "not available" as const };
  const prototypingFindings = issues.filter(
    (item) =>
      item.code.startsWith("QFAI-PROT-") ||
      item.code.startsWith("QFAI-CRIT-") ||
      item.file?.includes("prototyping") === true,
  );
  const declaredConverged = doc.stopReason === "converged";
  const isConverged = declaredConverged && iterationConverged(acceptedIteration);
  const missingAcceptedEvidence =
    (isConverged && screenIds.length > 0 && acceptedIterationIndex === null) ||
    accepted.some((ref) => ref.status !== "present");
  return {
    status:
      state === "no-pack" || state === "invalid"
        ? state
        : declaredConverged && !isConverged
          ? "incomplete"
          : !isConverged
            ? "in-progress"
            : missingAcceptedEvidence ||
                missingUiContractIds.length > 0 ||
                prototypingFindings.some((item) => item.severity === "error")
              ? "incomplete"
              : "complete",
    roundLifecycle: { iterations },
    mode: {
      effective: "single-thread-loop",
      posture,
      source: postureSource,
      rationale: "the single-thread iteration loop is fixed.",
      surface: config.uiux?.platform ?? "unknown",
    },
    obligations: {
      profile: "single-thread-loop",
      acceptedEvidenceRequired: declaredConverged && screenIds.length > 0,
      screens: screenIds.length,
    },
    evidence: {
      uiContractCoverageStatus:
        expectedUiContractIds.length > 0 && missingUiContractIds.length === 0
          ? "complete"
          : "incomplete",
      uiContractCoverage: {
        expectedUiContractIds,
        observedUiContractIds,
        missingUiContractIds,
        unexpectedUiContractIds,
      },
      acceptedIterationIndex,
      accepted,
    },
    calibration,
    findings: prototypingFindings,
    warnings:
      state === "readable" && iterations === 0 ? ["prototyping.json has no iterations."] : [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function existsWithinRoot(
  root: string,
  relative: string,
  fileOnly = false,
): Promise<boolean> {
  if (path.isAbsolute(relative)) return false;
  const absolute = path.resolve(root, relative);
  const fromRoot = path.relative(root, absolute);
  if (fromRoot === ".." || fromRoot.startsWith(`..${path.sep}`)) return false;
  try {
    const entry = await lstat(absolute);
    return entry.isFile() || (!fileOnly && entry.isDirectory());
  } catch {
    return false;
  }
}

/** Build a report from the validated story tree and its unmodified findings. */
export async function createReportData(
  root: string,
  config: ConfigLoadResult["config"],
  validation: ValidationResult,
  flowIds?: readonly string[],
): Promise<ReportData> {
  const model = await readStoryTreeModel(root, config);
  const scope = flowIds?.length ? resolveFlowScope(flowIds, model) : null;
  if (scope?.invalidValues.length) {
    throw new Error(`Unknown business flow: ${scope.invalidValues.join(", ")}`);
  }
  const selected = scope ? new Set(scope.flowIds) : null;
  const flows = model.flows
    .filter((flow) => !selected || selected.has(flow.id))
    .map((flow) => {
      const scope = resolveFlowScope([flow.id], model);
      return {
        id: flow.id,
        stories: scope.storyIds,
        acceptanceCriteria: scope.acceptanceCriteriaIds,
        examples: scope.exampleIds,
        rules: scope.ruleIds,
      };
    });
  const stories = new Set(flows.flatMap((flow) => flow.stories));
  const criteria = new Set(flows.flatMap((flow) => flow.acceptanceCriteria));
  const examples = new Set(flows.flatMap((flow) => flow.examples));
  const rules = new Set(flows.flatMap((flow) => flow.rules));
  const contracts = new Set(
    model.rules.filter((rule) => rules.has(rule.id)).map((rule) => rule.file),
  );
  const prototyping = await readPrototypingSummary(root, config, validation.issues);
  const guardrailsLoad = await loadDecisionGuardrails(root, {
    specsRoot: path.join(resolvePath(root, config, "specsDir"), "01_policy"),
    contractsRoot: resolvePath(root, config, "contractsDir"),
  });
  const guardrailItems = normalizeDecisionGuardrails(guardrailsLoad.entries);
  return {
    tool: "qfai",
    version: validation.toolVersion,
    ...(validation.generatedAt ? { generatedAt: validation.generatedAt } : {}),
    ...(validation.profile ? { profile: validation.profile } : {}),
    summary: {
      flows: flows.length,
      stories: stories.size,
      acceptanceCriteria: criteria.size,
      examples: examples.size,
      rules: rules.size,
      contracts: contracts.size,
      counts: validation.counts,
    },
    flows,
    prototyping,
    guardrails: {
      total: guardrailItems.length,
      items: guardrailItems.map((item) => ({
        id: item.id,
        type: item.type,
        guardrail: item.guardrail,
        source: {
          file: path.relative(root, item.source.file).replace(/\\/g, "/"),
          line: item.source.line,
        },
      })),
      scanErrors: guardrailsLoad.errors.map((item) => ({
        file: path.relative(root, item.path).replace(/\\/g, "/"),
        message: item.message,
      })),
    },
    ...(validation.waivers ? { waivers: validation.waivers } : {}),
    issues: validation.issues,
  };
}

export function formatReportMarkdown(data: ReportData, options: { baseUrl?: string } = {}): string {
  const lines = [
    "# QFAI Report",
    "",
    ...(data.profile ? [`- Profile: ${data.profile}`] : []),
    `- Business flows: ${data.summary.flows}`,
    `- User stories: ${data.summary.stories}`,
    `- Acceptance criteria: ${data.summary.acceptanceCriteria}`,
    `- Examples: ${data.summary.examples}`,
    `- Business rules: ${data.summary.rules}`,
    `- Contracts: ${data.summary.contracts}`,
    `- Findings: info=${data.summary.counts.info} warning=${data.summary.counts.warning} error=${data.summary.counts.error}`,
    "",
    "## Business flows",
    "",
  ];
  for (const flow of data.flows) {
    lines.push(`### ${flow.id}`, "", `- Stories: ${flow.stories.join(", ") || "none"}`);
    lines.push(`- Acceptance criteria: ${flow.acceptanceCriteria.join(", ") || "none"}`);
    lines.push(`- Examples: ${flow.examples.join(", ") || "none"}`);
    lines.push(`- Business rules: ${flow.rules.join(", ") || "none"}`, "");
  }
  const prototyping = data.prototyping;
  lines.push("## Prototyping", "", `- Status: ${prototyping.status}`);
  lines.push(`- Iterations: ${prototyping.roundLifecycle.iterations}`, "");
  lines.push("### Mode", "", `- Loop: ${prototyping.mode.effective}`);
  lines.push(`- Posture: ${prototyping.mode.posture}`);
  lines.push(`- Source: ${prototyping.mode.source}`);
  lines.push(`- Surface: ${prototyping.mode.surface}`, "");
  lines.push("### Obligations", "", `- Profile: ${prototyping.obligations.profile}`);
  lines.push("- Convergence: all four UX scores exceptional and blocker arrays empty");
  lines.push(
    `- Accepted screenshot and HTML: ${prototyping.obligations.acceptedEvidenceRequired ? "required" : "pending convergence"}`,
    `- Screens: ${prototyping.obligations.screens}`,
    "",
  );
  lines.push("### Evidence coverage", "");
  lines.push(`- UI contract coverage: ${prototyping.evidence.uiContractCoverageStatus}`);
  lines.push(
    `- Expected UI contracts: ${prototyping.evidence.uiContractCoverage.expectedUiContractIds.join(", ") || "none"}`,
  );
  lines.push(
    `- Missing UI contracts: ${prototyping.evidence.uiContractCoverage.missingUiContractIds.join(", ") || "none"}`,
  );
  lines.push(
    `- Accepted iteration: ${prototyping.evidence.acceptedIterationIndex ?? "not available"}`,
    "",
  );
  lines.push("### Render", "");
  if (prototyping.evidence.accepted.length === 0) lines.push("- Status: not available");
  for (const artifact of prototyping.evidence.accepted) {
    lines.push(`- ${artifact.kind}: ${artifact.status} (${artifact.path})`);
  }
  lines.push("", "### Browser QA", "", "- Status: not available", "");
  lines.push("### Calibration", "");
  lines.push(
    `- Pack: ${prototyping.calibration.status}${prototyping.calibration.path ? ` (${prototyping.calibration.path})` : ""}`,
    "",
  );
  if (prototyping.findings.length > 0) {
    lines.push("### Validation findings", "");
    for (const issue of prototyping.findings) {
      lines.push(`- ${issue.severity.toUpperCase()} ${issue.code}: ${issue.message}`);
    }
    lines.push("");
  }
  if (prototyping.status !== "complete") {
    lines.push("- Rerun /qfai-prototyping after addressing the missing evidence or findings.", "");
  }
  lines.push("## Decision Guardrails", "", `- Total: ${data.guardrails.total}`);
  for (const item of data.guardrails.items) {
    lines.push(`- ${item.id} (${item.type}): ${item.guardrail}`);
  }
  for (const failure of data.guardrails.scanErrors) {
    lines.push(`- Scan error: ${failure.file}: ${failure.message}`);
  }
  lines.push("");
  if (data.waivers) {
    lines.push("## Waivers", "", `- Active: ${data.waivers.active.length}`);
    lines.push(`- Suppressed findings: ${data.waivers.suppressed.total}`, "");
  }
  lines.push("## Findings", "");
  if (data.issues.length === 0) lines.push("No findings.");
  for (const issue of data.issues) {
    const source = issue.file
      ? options.baseUrl
        ? ` ([${issue.file}](${options.baseUrl.replace(/\/$/, "")}/${issue.file.replace(/\\/g, "/").replace(/^\//, "")}))`
        : ` (${issue.file})`
      : "";
    lines.push(`- ${issue.severity.toUpperCase()} ${issue.code}: ${issue.message}${source}`);
  }
  return lines.join("\n");
}

export function formatReportJson(data: ReportData): string {
  return JSON.stringify(data, null, 2);
}
