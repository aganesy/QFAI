/* global URL */
/**
 * A `resolve` hook that maps `./x.js` onto `./x.ts` when only the TypeScript
 * file exists.
 *
 * The sources under `packages/qfai/src/**` follow the TypeScript ESM
 * convention of importing a sibling as `./x.js`. Node's type stripping runs the
 * `.ts` file happily but does not rewrite the specifier, so a script that
 * imports from `src/` directly fails on the first relative import with
 * `ERR_MODULE_NOT_FOUND` for a `.js` that was never emitted.
 *
 * Narrow on purpose: only relative specifiers, only when the `.js` is absent
 * and the `.ts` is present. Anything else goes to the default resolver, so a
 * genuinely missing module still reports itself as missing rather than being
 * silently redirected.
 *
 * Registered by the generator that needs it, not globally — see
 * `scripts/gen-codex-agents.mjs`.
 */
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function resolve(specifier, context, next) {
  const relative = specifier.startsWith("./") || specifier.startsWith("../");
  if (relative && specifier.endsWith(".js")) {
    try {
      const asJs = fileURLToPath(new URL(specifier, context.parentURL));
      if (!existsSync(asJs)) {
        const asTs = `${asJs.slice(0, -3)}.ts`;
        if (existsSync(asTs)) return next(pathToFileURL(asTs).href, context);
      }
    } catch {
      // Not a file URL we can reason about; let the default resolver answer.
    }
  }
  return next(specifier, context);
}
