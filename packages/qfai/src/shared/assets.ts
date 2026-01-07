import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function getInitAssetsDir(): string {
  const base = import.meta.url;
  const basePath = base.startsWith("file:") ? fileURLToPath(base) : base;
  const baseDir = path.dirname(basePath);
  // src/shared/ または dist/shared/ からの相対パスで assets/init を解決する。
  const candidates = [
    path.resolve(baseDir, "../../../assets/init"),
    path.resolve(baseDir, "../../assets/init"),
  ];

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
