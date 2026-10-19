import { loadConfig } from "../../core/config.js";
import { error, info } from "../../core/logger.js";
import type { StoryTreeIdKind } from "../../core/storyTree/ids.js";
import { resolveStoryTreeRoots } from "../../core/storyTree/layout.js";
import { readStoryTreeAtRef } from "../../core/storyTree/renumberDecision.js";
import { nextStoryTreeId, readStoryTreeModel } from "../../core/storyTree/tree.js";

/**
 * Prints the ID after the highest one of the kind that the working tree or the base ref's commit
 * names, so a branch that allocates before merging its base does not reuse the base's numbers.
 * Read-only: it writes no file and reserves nothing.
 */
export async function runSddNextIdCommand(options: {
  root: string;
  kind: StoryTreeIdKind;
  parent?: string;
  base: string;
}): Promise<number> {
  try {
    const loaded = await loadConfig(options.root);
    if (loaded.issues.length) throw new Error("Correct qfai.config.yaml before allocating an ID.");
    const roots = resolveStoryTreeRoots(options.root, loaded.config);
    const working = await readStoryTreeModel(options.root, loaded.config);
    const atBase = await readStoryTreeAtRef({ root: options.root, ref: options.base, ...roots });
    // Both IDs share the kind's prefix and fixed width, so the later one in text order is higher.
    const [id] = [working, atBase.model]
      .map((model) => nextStoryTreeId(model, options.kind, options.parent))
      .sort()
      .reverse();
    info(id ?? "");
    return 0;
  } catch (failure) {
    error(
      `qfai sdd next-id (${options.kind}; base ${options.base}): ${failure instanceof Error ? failure.message : String(failure)}`,
    );
    return 2;
  }
}
