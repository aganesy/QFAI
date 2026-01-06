import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function getInitAssetsDir(): string {
  const base = import.meta.url;
  const basePath = base.startsWith("file:") ? fileURLToPath(base) : base;
  const baseDir = path.dirname(basePath);
  // src/shared/** と dist/shared/** からの解決を想定する。
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
