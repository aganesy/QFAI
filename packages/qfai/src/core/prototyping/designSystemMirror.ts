/**
 * `<contractsDir>/design/design-system.yaml`: the token tables of root
 * DESIGN.md, copied for `/qfai-implement`. It is never read back from a
 * prototype, so it cannot drift from the file the loop was frozen against.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { stringify } from "yaml";

import { DESIGN_MD_KEYS, type DesignMd } from "../design/designMd.js";

export const DESIGN_SYSTEM_MIRROR_BASENAME = "design-system.yaml";

/** Copies the keys `order` names that `source` holds, in that order. */
function pick<T>(source: Readonly<Record<string, T>>, order: readonly string[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const key of order) {
    const value = source[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}

/**
 * The file's text. Keys follow the DESIGN.md schema's order rather than the
 * author's, every string is double-quoted and no line is folded, so the same
 * tokens always give the same bytes. An optional section DESIGN.md leaves out
 * is left out here too.
 */
export function renderDesignSystemMirror(designMd: DesignMd, designMdSha256: string): string {
  const { colors, typography, spacing, radius, shadow } = designMd.visual;
  const mirroredTypography: Record<string, unknown> = {
    family_sans: typography.family_sans,
    family_display: typography.family_display,
    family_mono: typography.family_mono,
  };
  if (typography.scale !== undefined) {
    mirroredTypography.scale = pick(typography.scale, DESIGN_MD_KEYS["visual.typography.scale"]);
  }
  if (typography.weight !== undefined) {
    mirroredTypography.weight = pick(typography.weight, DESIGN_MD_KEYS["visual.typography.weight"]);
  }
  const visual: Record<string, unknown> = {
    colors: pick(colors, DESIGN_MD_KEYS["visual.colors"]),
    typography: mirroredTypography,
    radius: pick(radius, DESIGN_MD_KEYS["visual.radius"]),
    shadow: pick(shadow, DESIGN_MD_KEYS["visual.shadow"]),
  };
  if (spacing !== undefined) {
    visual.spacing = pick<unknown>(spacing, DESIGN_MD_KEYS["visual.spacing"]);
  }
  const document: Record<string, unknown> = { source: "DESIGN.md", designMdSha256 };
  if (designMd.brand.theme !== undefined) {
    document.brand = { theme: designMd.brand.theme };
  }
  document.visual = visual;
  return stringify(document, {
    defaultStringType: "QUOTE_DOUBLE",
    defaultKeyType: "PLAIN",
    lineWidth: 0,
  });
}

/** Writes the mirror and returns its path relative to `root`, POSIX form. */
export async function writeDesignSystemMirror(
  root: string,
  contractsDir: string,
  designMd: DesignMd,
  designMdSha256: string,
): Promise<string> {
  const designDir = path.join(root, contractsDir, "design");
  await mkdir(designDir, { recursive: true });
  const target = path.join(designDir, DESIGN_SYSTEM_MIRROR_BASENAME);
  await writeFile(target, renderDesignSystemMirror(designMd, designMdSha256), "utf-8");
  return path.relative(root, target).replace(/\\/g, "/");
}
