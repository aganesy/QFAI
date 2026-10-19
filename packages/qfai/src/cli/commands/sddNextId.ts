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
    const { parent } = options;
    if (
      parent !== undefined &&
      ![working, atBase.model].some((model) =>
        [...model.declarations, ...model.contracts].some(({ id }) => id === parent),
      )
    )
      throw new Error(`Neither the working tree nor the base declares ${parent}.`);
    const fromWorking = nextStoryTreeId(working, options.kind, parent);
    const fromBase = nextStoryTreeId(atBase.model, options.kind, parent);
    // Both IDs share the kind's prefix and fixed width, so the later one in text order is higher.
    info(fromWorking > fromBase ? fromWorking : fromBase);
    return 0;
  } catch (failure) {
    error(
      `qfai sdd next-id (${options.kind}; base ${options.base}): ${failure instanceof Error ? failure.message : String(failure)}`,
    );
    return 2;
  }
}
