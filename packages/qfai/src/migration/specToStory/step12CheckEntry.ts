import { lstat } from "node:fs/promises";
import path from "node:path";

import { loadConfig, readWorkflowMode } from "../../core/config.js";
import { isEnoent } from "../../core/fs/errno.js";
import { SKILL_INTEGRATION_DIRS } from "../../core/init/integrationDirs.js";
import { ensureRootGitignoreEntries } from "../../core/init/rootGitignore.js";
import { allPlanRefusals, type PlanRefusal } from "../../core/workflow/plans.js";
import { isRecord } from "../../core/workflow/parse.js";
import type { MigrationContext, MigrationStep } from "./harness.js";
import { scanOldPaths } from "./step12OldPaths.js";
import { linksToSkill } from "./step11InstallEntry.js";

const RUN_SKILL = "qfai-run";

function skillPath(skill: string, ...rest: string[]): string {
  return [".qfai/assistant/skill", skill, ...rest].join("/");
}

/** One `## For a person` item, named by its check as `workflow plan` names the reason. */
function refusalItem(refusal: PlanRefusal): string {
  const [skill = refusal.subject, detail = ""] = refusal.subject.split(":");
  switch (refusal.reason) {
    case "reviewer-missing":
      return `reviewer-missing: qfai.config.yaml: the \`routing:\` override for \`${skill}\` drops \`${detail}\`, which the package's default routing requires`;
    case "step-missing":
      return `plan-invalid: .qfai/assistant/step/${skill}/STEP.md: the ${refusal.route} plan runs this step and it is not installed`;
    default:
      return `plan-invalid: the built-in ${refusal.route} plan: it does not load (${refusal.reason} at ${refusal.subject}); reinstall the qfai package`;
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

async function gitignoreItems(context: MigrationContext): Promise<string[]> {
  try {
    await lstat(path.join(context.root, ".gitignore"));
  } catch (error) {
    if (isEnoent(error)) return ["gitignore: .gitignore: the file does not exist"];
    throw error;
  }
  const preview = await ensureRootGitignoreEntries(context.root, true, () => {});
  return preview.copied.length === 0
    ? []
    : [
        "gitignore: .gitignore: the QFAI managed block differs from the one the installed package writes",
      ];
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
 * Makes the project checks a shipped plan needs, checks what step 11
 * installs, and lists each line of a tracked project file that still names a
 * 1.x path. It writes nothing and repairs
 * nothing.
 */
export const step12: MigrationStep = {
  number: 12,
  writeSet: [],
  sections: ["Files scanned", "For a person"],
  async plan(context) {
    // Read git first: a git failure ends the step before any other check reads the index.
    const scan = await scanOldPaths(context);
    const refusals = await allPlanRefusals(context.root, context.config);
    return {
      operations: [],
      filesScanned: [scan.scanned],
      forAPerson: [
        ...refusals.map(refusalItem),
        ...(await modeItems(context)),
        ...(await gitignoreItems(context)),
        ...(await runLinkItems(context)),
        ...scan.items,
      ],
    };
  },
};
