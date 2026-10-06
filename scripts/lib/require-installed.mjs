/**
 * Whether the dependencies the pin scripts load are installed.
 *
 * A checkout with no `node_modules` makes those loads fail with a module-not-found stack that
 * says nothing about the cause. The pin scripts call this before loading them, so the run stops
 * on one line that names what is missing and the fix.
 */
import { createRequire } from "node:module";
import { stderr } from "node:process";

const require = createRequire(import.meta.url);

/** Each dependency and the specifier it resolves by from this directory. */
const DEPENDENCIES = [
  ["yaml", "../../packages/qfai/node_modules/yaml"],
  ["prettier", "prettier"],
];

/** The names of the dependencies that cannot be resolved, empty when all can. */
export function missingDependencies() {
  return DEPENDENCIES.filter(([, specifier]) => {
    try {
      require.resolve(specifier);
      return false;
    } catch {
      return true;
    }
  }).map(([name]) => name);
}

/** Returns 0 when every dependency is installed. Otherwise prints the fix and returns 1. */
export function checkInstalled() {
  const missing = missingDependencies();
  if (missing.length === 0) return 0;
  stderr.write(
    `Dependencies are not installed (missing: ${missing.join(", ")}). Run \`pnpm install\`, then run this script again.\n`,
  );
  return 1;
}
