import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** The `name` in this package's own `package.json`. */
const PACKAGE_NAME = "qfai";

/**
 * Files a real `assets/init` tree always has: both halves of the tree `runInit`
 * copies. A directory that lacks either is an incomplete installation, not a
 * template root.
 */
const INIT_ASSETS_SENTINELS = [
  path.join(".qfai", "assistant"),
  path.join("root", "qfai.config.yaml"),
];

function readPackageName(manifestPath: string): unknown {
  try {
    const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
    return typeof manifest === "object" && manifest !== null
      ? Reflect.get(manifest, "name")
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The directory of the package this module belongs to: the nearest directory
 * at or above `baseDir` that holds a `package.json`.
 *
 * The nearest manifest is the package boundary. This module is loaded from
 * `src/shared/`, `dist/shared/`, `dist/cli/` and the bundled `dist/index.mjs`,
 * and none of those directories has a manifest of its own, so each reaches the
 * package root. A manifest naming another package means this code was copied
 * or bundled out of QFAI, and nothing found from there is QFAI's.
 */
function findPackageRoot(baseDir: string): string {
  let current = path.resolve(baseDir);
  for (;;) {
    const manifestPath = path.join(current, "package.json");
    if (existsSync(manifestPath)) {
      if (readPackageName(manifestPath) === PACKAGE_NAME) return current;
      throw new Error(
        `Template assets for init were not found: ${manifestPath} is not the ${PACKAGE_NAME} package. Reinstall ${PACKAGE_NAME}.`,
      );
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(
        `Template assets for init were not found: no ${PACKAGE_NAME} package.json above ${baseDir}. Reinstall ${PACKAGE_NAME}.`,
      );
    }
    current = parent;
  }
}

/**
 * The `assets/init` of the package that contains `baseDir`.
 *
 * The search never leaves the package. An earlier version tried
 * `assets/init` one, two and three levels above `baseDir` and took the first
 * that looked complete. Installed at `<project>/node_modules/qfai`, the outer
 * candidates are `<project>/node_modules/assets/init` and
 * `<project>/assets/init`, so an installation missing its own templates
 * rooted the whole template system in a directory the project, or another
 * dependency, controls. Now the package's own templates are the only answer,
 * and a package without them is reported as incomplete.
 *
 * Exported for the test that pins that boundary; `getInitAssetsDir` is the API.
 */
export function resolveInitAssetsDir(baseDir: string): string {
  const packageRoot = findPackageRoot(baseDir);
  const assetsDir = path.join(packageRoot, "assets", "init");
  const missing = INIT_ASSETS_SENTINELS.map((sentinel) => path.join(assetsDir, sentinel)).filter(
    (sentinel) => !existsSync(sentinel),
  );
  if (missing.length > 0) {
    throw new Error(
      [
        `Template assets for init were not found: the ${PACKAGE_NAME} installation at ${packageRoot} is incomplete. Reinstall ${PACKAGE_NAME}.`,
        "Missing:",
        ...missing.map((entry) => `- ${entry}`),
      ].join("\n"),
    );
  }
  return assetsDir;
}

export function getInitAssetsDir(): string {
  const base = import.meta.url;
  const basePath = base.startsWith("file:") ? fileURLToPath(base) : base;
  return resolveInitAssetsDir(path.dirname(basePath));
}
