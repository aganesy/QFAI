import { readFileSync } from "node:fs";
import path from "node:path";

/** The helper that holds every aggregate lane's check list, repo-relative. */
export const AGGREGATE_HELPER_REL = "scripts/run-aggregate-checks.sh";

/** How a manifest entry hands its lane to the helper. */
const ENTRY_PREFIX = `bash ./${AGGREGATE_HELPER_REL} `;

/** How a check records its failure, so the checks after it still run. */
const CHECK_LINK = " || status=1";

/** The argument the root manifest entry `script` passes to the aggregate helper. */
export function aggregateArgument(repoRoot: string, script: string): string {
  const manifest: unknown = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf-8"));
  const scripts: unknown =
    typeof manifest === "object" && manifest !== null && "scripts" in manifest
      ? manifest.scripts
      : undefined;
  const body: unknown =
    typeof scripts === "object" && scripts !== null && script in scripts
      ? Reflect.get(scripts, script)
      : undefined;
  if (typeof body !== "string") throw new Error(`the root manifest declares no ${script}`);
  if (!body.startsWith(ENTRY_PREFIX)) {
    throw new Error(`${script} does not hand its checks to ${AGGREGATE_HELPER_REL}: ${body}`);
  }
  return body.slice(ENTRY_PREFIX.length).trim();
}

/**
 * The checks one aggregate lane runs, in order.
 *
 * Read through the manifest entry into the helper's `case` arm, so a check
 * moved to the wrong arm, or an entry pointed at the wrong arm, both fail the
 * reader. A line in the arm without its failure link is refused, because a
 * check written that way is one whose failure no exit status carries.
 */
export function aggregateChecks(repoRoot: string, script: string): string[] {
  const argument = aggregateArgument(repoRoot, script);
  const lines = readFileSync(path.join(repoRoot, AGGREGATE_HELPER_REL), "utf-8")
    .replace(/\r\n/g, "\n")
    .split("\n");
  const start = lines.findIndex((line) => line.trim() === `${argument})`);
  if (start < 0) throw new Error(`${AGGREGATE_HELPER_REL} declares no \`${argument}\` arm`);
  const end = lines.findIndex((line, index) => index > start && line.trim() === ";;");
  if (end < 0) throw new Error(`${AGGREGATE_HELPER_REL}'s \`${argument}\` arm is not terminated`);
  return lines
    .slice(start + 1, end)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => {
      if (!line.endsWith(CHECK_LINK)) {
        throw new Error(`${script} runs \`${line}\` without recording its failure`);
      }
      return line.slice(0, -CHECK_LINK.length);
    });
}
