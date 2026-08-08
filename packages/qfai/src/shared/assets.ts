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
 * Exported for the test that pins those depths; `getInitAssetsDir` is the API.
 */
export function initAssetsCandidates(baseDir: string): string[] {
  return [
    path.resolve(baseDir, "../../../assets/init"),
    path.resolve(baseDir, "../../assets/init"),
    path.resolve(baseDir, "../assets/init"),
  ];
}

export function getInitAssetsDir(): string {
  const base = import.meta.url;
  const basePath = base.startsWith("file:") ? fileURLToPath(base) : base;
  const baseDir = path.dirname(basePath);
  const candidates = initAssetsCandidates(baseDir);

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
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
