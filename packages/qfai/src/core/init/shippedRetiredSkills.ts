import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * The files a retired skill's directory held in the releases that shipped it.
 * Each path in the skill lists the SHA-256 digest of its content, with line
 * endings read as LF, in every release that shipped it.
 */
export type ShippedSkillFiles = Readonly<Record<string, readonly string[]>>;

export const SHIPPED_RETIRED_SKILLS: Readonly<Record<string, ShippedSkillFiles>> = {
  "qfai-atdd": {
    "SKILL.md": [
      "9bd73f111befa643b7c704b997ab1bfce1b934ce73fa2f1eec5e5c1f55614f7e",
      "681ada7ed8db0125e44b5f45f7fcf999025a76c6e239aacf0ea0f29147e3ae65",
    ],
    "references/credential-reuse.md": [
      "862aca0ce1503d47d08be84b2e156ab7c4345e9f0251cc8234b7688ba1a9644e",
    ],
    "references/cross-spec-obligations.md": [
      "258e85c716ac565487660de8a4a450339f50122a85f007c2de18f1943b9b402e",
    ],
    "references/red-provenance.md": [
      "b6be453331ea4fa37a78526455e0b3fb0310b81e3224a947ea7865faa56e406d",
    ],
    "references/scaffolding.md": [
      "bf2a44f37c9e99b4ab6331e97edea2b13f91deebdb7e0d1a2e8f94bd8495c2d6",
    ],
    "references/shared-test-artifacts.md": [
      "42cb65675684d2e120240da9477bd852a356a3b207e0cb6f88760ad66a5eed0a",
    ],
    "references/stage-handover.md": [
      "84889d8574a00c468eb55663ece7301493eaa1e80efb47db27905124f46659dc",
    ],
    "references/stale-manifest.md": [
      "729de7ff60e2c0c7b4231e86ce3c1460b6c3958db82adcdb04d5026264babb6f",
    ],
    "references/volume-signals.md": [
      "c54f4fb8117e8d32282c942f59cf46d89ad9c5d45c77582a57e0fd45e4e33e77",
    ],
  },
};

export function digestOfText(content: string): string {
  return createHash("sha256").update(content.replace(/\r\n/g, "\n")).digest("hex");
}

/**
 * Lists the regular files under `dir` as `/`-separated paths relative to it.
 * Returns `null` when anything else is there, a link included.
 */
async function listRegularFiles(dir: string, prefix = ""): Promise<string[] | null> {
  const files: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) {
      const nested = await listRegularFiles(path.join(dir, entry.name), `${relative}/`);
      if (nested === null) return null;
      files.push(...nested);
    } else if (entry.isFile()) {
      files.push(relative);
    } else {
      return null;
    }
  }
  return files;
}

/**
 * Whether `dir` holds exactly the files `shipped` names, each with the content
 * of a release that shipped it. A file the project added, edited or removed
 * makes the answer no.
 */
export async function isShippedSkillCopy(
  dir: string,
  shipped: ShippedSkillFiles,
): Promise<boolean> {
  const present = await listRegularFiles(dir);
  if (present === null || present.length !== Object.keys(shipped).length) return false;
  for (const relative of present) {
    const accepted = shipped[relative];
    if (accepted === undefined) return false;
    const text = await readFile(path.join(dir, ...relative.split("/")), "utf-8");
    if (!accepted.includes(digestOfText(text))) return false;
  }
  return true;
}
