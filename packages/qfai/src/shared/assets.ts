import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * `assets/init` candidates for a module sitting at `baseDir`.
 *
 * Three depths, because this module is loaded from three: `src/shared/` and
 * `dist/shared/` are two levels below the package root, and `dist/index.mjs` —
 * the package's public entry, which `tsup` produces with `splitting: false`, so
 * this code is bundled into it — is one. Without the one-level candidate every
 * caller that reaches `validateProject` through the library entry rather than
 * the CLI got `Template assets not found` before any validator ran.
 *
 * **Ordered nearest-first**, because the shallower depths are not the
 * package's own directory once QFAI is installed: from
 * `<project>/node_modules/qfai/dist`, the three-level candidate is
 * `<project>/assets/init`. A consuming project with an unrelated `assets/init`
 * would otherwise be picked as the template root, and a wrong-but-present
 * directory is worse than a missing one — `canonicalSkillIds` would read an
 * empty shipped roster and `QFAI-LINK-001` would pass every broken wrapper
 * without looking at it.
 *
 * Exported for the test that pins those depths; `getInitAssetsDir` is the API.
 */
export function initAssetsCandidates(baseDir: string): string[] {
  return [
    path.resolve(baseDir, "../assets/init"),
    path.resolve(baseDir, "../../assets/init"),
    path.resolve(baseDir, "../../../assets/init"),
  ];
}

/**
 * Files a real `assets/init` tree always has.
 *
 * Existence alone does not identify the directory — the name is generic enough
 * that a consuming project can have one. Both halves of the tree `runInit`
 * copies are required, so an unrelated `assets/init` is rejected and the search
 * continues instead of silently rooting the whole template system somewhere
 * arbitrary.
 */
const INIT_ASSETS_SENTINELS = [path.join(".qfai", "assistant"), path.join("root", "DESIGN.md")];

function isInitAssetsDir(candidate: string): boolean {
  return INIT_ASSETS_SENTINELS.every((sentinel) => existsSync(path.join(candidate, sentinel)));
}

export function getInitAssetsDir(): string {
  const base = import.meta.url;
  const basePath = base.startsWith("file:") ? fileURLToPath(base) : base;
  const baseDir = path.dirname(basePath);
  const candidates = initAssetsCandidates(baseDir);

  for (const candidate of candidates) {
    if (isInitAssetsDir(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    [
      "init 用テンプレートが見つかりません。Template assets not found.",
      "確認したパス / Checked paths:",
      ...candidates.map((candidate) => `- ${candidate}`),
    ].join("\n"),
  );
}
