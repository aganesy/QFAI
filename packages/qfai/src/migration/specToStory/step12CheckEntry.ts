import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  extractManagedBlock,
  planEntryDirective,
  SKILL_INTEGRATION_DIRS,
} from "../../cli/commands/init.js";
import { AGENT_ENTRY_POINT_FILES } from "../../core/agentEntryPoints.js";
import { loadConfig, readWorkflowMode } from "../../core/config.js";
import { isEnoent } from "../../core/fs/errno.js";
import { QFAI_RUN_STATE_IGNORE } from "../../core/gitignore.js";
import { allPlanRefusals, type PlanRefusal } from "../../core/workflow/plans.js";
import { isRecord } from "../../core/workflow/parse.js";
import type { MigrationContext, MigrationStep } from "./harness.js";
import { linksToSkill } from "./step11InstallEntry.js";

const WORKFLOW_EVIDENCE_NEGATION = "!.qfai/evidence/workflow/";
const RUN_SKILL = "qfai-run";

function skillPath(skill: string, ...rest: string[]): string {
  return [".qfai/assistant/skill", skill, ...rest].join("/");
}

/** One `## For a person` item, named by its check as `workflow start` names the cause. */
function refusalItem(refusal: PlanRefusal): string {
  const [skill = refusal.subject, detail = ""] = refusal.subject.split(":");
  switch (refusal.reason) {
    case "reviewer-missing":
      return `reviewer-missing: qfai.config.yaml: the \`routing:\` override for \`${skill}\` drops \`${detail}\`, which the package's default routing requires`;
    case "skill-missing":
      return `contract-undeclared: ${skillPath(skill)}: the ${refusal.route} plan names this skill and it is not installed`;
    case "operations-pair-omitted":
      return `contract-undeclared: ${skillPath(skill, "references/orchestrated-mode.md")}: the Operations table of \`${skill}\` lacks \`${detail}\`, which the ${refusal.route} plan dispatches to it`;
    case "operations-table-missing":
    case "operations-first-column":
    case "operations-cell-not-id":
      return `contract-undeclared: ${skillPath(skill, "references/orchestrated-mode.md")}: the Operations table of \`${skill}\` cannot be read (${refusal.reason})`;
    default:
      return `contract-undeclared: the built-in ${refusal.route} plan: it does not load (${refusal.reason} at ${refusal.subject}); reinstall the qfai package`;
  }
}

async function modeItems(context: MigrationContext): Promise<string[]> {
  const { document } = await loadConfig(context.root);
  if (readWorkflowMode(document) !== null) return [];
  const workflow = isRecord(document) ? document.workflow : undefined;
  const value = isRecord(workflow)
    ? `workflow.mode is ${JSON.stringify(workflow.mode)}`
    : "workflow is not a mapping";
  return [`invalid-mode: qfai.config.yaml: ${value}, not active, shadow or off`];
}

async function entryDirectiveItems(context: MigrationContext): Promise<string[]> {
  const items: string[] = [];
  for (const name of AGENT_ENTRY_POINT_FILES) {
    const entry = await planEntryDirective(context.root, name);
    if (entry.kind === "current") continue;
    let reason = "it carries no operative entry directive";
    if (entry.kind === "create") reason = "the file does not exist";
    if (entry.kind === "refused") reason += `, and step 11 cannot add one. ${entry.reason}`;
    items.push(`entry-directive: ${name}: ${reason}`);
  }
  return items;
}

async function gitignoreItems(context: MigrationContext): Promise<string[]> {
  let content: string;
  try {
    content = await readFile(path.join(context.root, ".gitignore"), "utf8");
  } catch (error) {
    if (isEnoent(error)) return ["gitignore: .gitignore: the file does not exist"];
    throw error;
  }
  const block = new Set(
    extractManagedBlock(content)
      .split("\n")
      .map((line) => line.trimEnd()),
  );
  return [QFAI_RUN_STATE_IGNORE, WORKFLOW_EVIDENCE_NEGATION]
    .filter((line) => !block.has(line))
    .map((line) => `gitignore: .gitignore: the QFAI managed block lacks \`${line}\``);
}

async function runLinkItems(context: MigrationContext): Promise<string[]> {
  const skillDir = path.join(context.root, ".qfai", "assistant", "skill", RUN_SKILL);
  const items: string[] = [];
  for (const dir of SKILL_INTEGRATION_DIRS) {
    if (await linksToSkill(path.join(context.root, dir, RUN_SKILL), skillDir)) continue;
    items.push(
      `qfai-run-link: ${dir}/${RUN_SKILL}: no link here resolves to ${skillPath(RUN_SKILL)}/`,
    );
  }
  return items;
}

/**
 * Makes the project checks `npx qfai workflow start` makes before it creates a
 * run, and checks what step 11 installs. It writes nothing and repairs nothing.
 */
export const step12: MigrationStep = {
  number: 12,
  writeSet: [],
  sections: ["For a person"],
  async plan(context) {
    const refusals = await allPlanRefusals(context.root, context.config);
    return {
      operations: [],
      forAPerson: [
        ...refusals.map(refusalItem),
        ...(await modeItems(context)),
        ...(await entryDirectiveItems(context)),
        ...(await gitignoreItems(context)),
        ...(await runLinkItems(context)),
      ],
    };
  },
};
