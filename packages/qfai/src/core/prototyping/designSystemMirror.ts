/**
 * Post-handoff writer for `<contractsDir>/design/design-system.yaml`.
 *
 * The file is a deterministic mirror of the tokens in the frozen root
 * `DESIGN.md`, as `qfai-prototyping/references/handoff.md` describes it. The
 * writer copies the tokens from the parsed front matter and nothing else: no
 * value is read from the prototype HTML, so the mirror cannot drift from the
 * brand SSOT.
 *
 * It writes only from a frozen `DESIGN.md`. The lock's `designMdSha256` has to
 * match the file's current digest, because the mirror records that digest and
 * a mirror of an unfrozen file would carry a digest nothing else agrees with.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { stringify as stringifyYaml } from "yaml";

import { type DesignMd, hashDesignMd, parseDesignMd } from "../design/designMd.js";
import { readDesignMdLockSha } from "../design/designMdLock.js";

export type DesignSystemMirrorResult =
  { readonly ok: true; readonly path: string } | { readonly ok: false; readonly reason: string };

/**
 * The mirror document for a parsed `DESIGN.md`. Keys follow the order the
 * front matter declares them in, and an optional section appears only when
 * `DESIGN.md` authors it, so the same input always yields the same bytes.
 */
export function renderDesignSystemMirror(designMd: DesignMd, designMdSha256: string): string {
  const { colors, typography, spacing, radius, shadow } = designMd.visual;
  const mirror = {
    source: "DESIGN.md",
    designMdSha256,
    ...(designMd.brand.theme === undefined ? {} : { brand: { theme: designMd.brand.theme } }),
    visual: {
      colors,
      typography: {
        family_sans: typography.family_sans,
        family_display: typography.family_display,
        family_mono: typography.family_mono,
        ...(typography.scale === undefined ? {} : { scale: typography.scale }),
        ...(typography.weight === undefined ? {} : { weight: typography.weight }),
      },
      ...(spacing === undefined ? {} : { spacing }),
      radius,
      shadow,
    },
  };
  return stringifyYaml(mirror);
}

/**
 * Reads the root `DESIGN.md` and its lock, and writes the mirror beside the
 * lock. Refuses without writing when `DESIGN.md` does not parse, the lock
 * carries no digest, or the digest is not the file's own.
 */
export async function writeDesignSystemMirror(
  root: string,
  contractsDir: string,
): Promise<DesignSystemMirrorResult> {
  const designDir = path.join(root, contractsDir, "design");
  const designMdText = await readFile(path.join(root, "DESIGN.md"), "utf-8");
  const lockSha = readDesignMdLockSha(
    await readFile(path.join(designDir, "DESIGN.md.lock.yaml"), "utf-8"),
  );
  if (lockSha === null) {
    return { ok: false, reason: "DESIGN.md.lock.yaml carries no valid designMdSha256." };
  }
  if (hashDesignMd(designMdText) !== lockSha) {
    return {
      ok: false,
      reason: "DESIGN.md does not match DESIGN.md.lock.yaml; refreeze it before the handoff.",
    };
  }
  const parsed = parseDesignMd(designMdText);
  if ("error" in parsed) {
    return { ok: false, reason: `DESIGN.md does not parse: ${parsed.error.message}` };
  }
  const outPath = path.join(designDir, "design-system.yaml");
  await writeFile(outPath, renderDesignSystemMirror(parsed.data, lockSha), "utf-8");
  return { ok: true, path: outPath };
}
