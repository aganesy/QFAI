import { loadConfig, resolvePath } from "../../core/config.js";
import { error, info } from "../../core/logger.js";
import {
  applyDecisionRenumberPlan,
  buildDecisionRenumberPlan,
} from "../../core/storyTree/renumberDecision.js";

export async function runSddRenumberDecisionCommand(options: {
  root: string;
  from: string;
  to: string;
  base: string;
  apply: boolean;
}): Promise<number> {
  try {
    const loaded = await loadConfig(options.root);
    if (loaded.issues.length)
      throw new Error("Correct qfai.config.yaml before renumbering decisions.");
    const plan = await buildDecisionRenumberPlan({
      ...options,
      specsDir: resolvePath(options.root, loaded.config, "specsDir"),
    });
    if (options.apply) await applyDecisionRenumberPlan(plan);
    info(
      [
        `qfai sdd renumber-decision: ${options.apply ? "applied" : "preview; no files changed"}`,
        `${plan.from} -> ${plan.to}`,
        `HEAD: ${plan.headSha}`,
        `Base: ${plan.baseSha}`,
        `Common ancestor: ${plan.ancestorSha}`,
        ...plan.changes.map((change) => `${change.file}: ${change.count} replacement(s)`),
      ].join("\n"),
    );
    return 0;
  } catch (failure) {
    error(
      `qfai sdd renumber-decision (${options.from} -> ${options.to}; base ${options.base}): ${failure instanceof Error ? failure.message : String(failure)}`,
    );
    return 2;
  }
}
