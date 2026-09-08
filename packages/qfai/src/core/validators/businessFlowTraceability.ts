/**
 * The gate that makes `_policies/04_Business-Flow.md` a document something
 * reads.
 *
 * It ships as the SSOT for the end-to-end flow, and until a flow had an ID no
 * rule could name one, so the file was written, reviewed and then consulted by
 * nothing. Two things are checked here, and both are about the ID being usable
 * as a reference rather than about the prose being right:
 *
 * | finding          | condition                                          |
 * | ---------------- | -------------------------------------------------- |
 * | `QFAI-BFLOW-005` | a `- Flow:` names a flow the document does not declare |
 * | `QFAI-BFLOW-006` | the document declares the same flow twice          |
 *
 * A spec set with no flow IDs at all is silent here. The edge is additive: a
 * project on the story-grain obligation is the state every project starts in,
 * and adopting flows is a decision its author makes, not one an upgrade makes
 * for them.
 */
import type { QfaiConfig } from "../config.js";
import { scanBusinessFlows } from "../businessFlow.js";
import { RULE_PROMOTIONS, newRuleSeverity } from "../sunset.js";
import type { Issue } from "../types.js";
import { resolveToolVersion } from "../version.js";
import { issue } from "./utils.js";

export async function validateBusinessFlowTraceability(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const scan = await scanBusinessFlows(root, config);
  if (scan.definitions.length === 0 && scan.storyRefs.length === 0) {
    return [];
  }

  // A window, and it is doing real work in both directions. The IDs are new, so
  // no project has them yet; the first tree to adopt them is also the first to
  // meet these rules, and a typo made while adding the very first edge should
  // not be the thing that fails an upgrade.
  const promoteAt = RULE_PROMOTIONS.businessFlowReferenceUnknown.promoteAt;
  const severity = newRuleSeverity(await resolveToolVersion(), promoteAt);
  const windowNote =
    severity === "warning" ? ` Reported as a warning until ${promoteAt}, an error from it.` : "";

  const issues: Issue[] = [];
  issues.push(...duplicateDefinitionIssues(scan, severity, windowNote));
  issues.push(...unknownReferenceIssues(scan, severity, windowNote));
  return issues;
}

function duplicateDefinitionIssues(
  scan: Awaited<ReturnType<typeof scanBusinessFlows>>,
  severity: "warning" | "error",
  windowNote: string,
): Issue[] {
  return scan.duplicateIds.map((id) =>
    issue(
      "QFAI-BFLOW-006",
      `${id} is declared more than once in the business-flow document, so a story citing it names two flows.${windowNote}`,
      severity,
      scan.flowPath,
      "businessFlow.definition.duplicate",
      [id],
      "canonical",
      "Give each flow its own id. A flow described in two places is one flow with a second heading, not two — merge them, or number the second one.",
      { loc: { line: lineOfSecondDefinition(scan, id) } },
    ),
  );
}

function unknownReferenceIssues(
  scan: Awaited<ReturnType<typeof scanBusinessFlows>>,
  severity: "warning" | "error",
  windowNote: string,
): Issue[] {
  const declared = new Set(scan.definitions.map((entry) => entry.id));
  return scan.storyRefs
    .filter((ref) => !declared.has(ref.flowId))
    .map((ref) =>
      issue(
        "QFAI-BFLOW-005",
        `${ref.usId} cites ${ref.flowId}, which the business-flow document does not declare.${windowNote}`,
        severity,
        ref.file,
        "businessFlow.reference.unknown",
        [`SPEC-${ref.specId}:${ref.usId}`, ref.flowId],
        "canonical",
        "Declare the flow in `_policies/04_Business-Flow.md` — its id opens the list item or heading that describes it — or correct the citation. A story may cite several flows on one `- Flow:` line, and a story that cites none is not in error.",
        { loc: { line: ref.line } },
      ),
    );
}

/**
 * The line of the repeat, not of the first declaration.
 *
 * The first one is the flow; the second is the thing to look at. Pointing at
 * the first would open the document at a line that reads correctly.
 */
function lineOfSecondDefinition(
  scan: Awaited<ReturnType<typeof scanBusinessFlows>>,
  id: string,
): number {
  const lines = scan.definitions.filter((entry) => entry.id === id).map((entry) => entry.line);
  return lines[1] ?? lines[0] ?? 1;
}
