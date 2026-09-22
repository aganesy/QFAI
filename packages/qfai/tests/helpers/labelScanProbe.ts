/**
 * The unmatched-HTML-label table, measured in one `pwsh` run.
 *
 * `pr-body-policy.ps1` scans a body for an HTML label and must not walk the
 * remaining tail once per character. The table below drives that scan with an
 * opener it never closes, under both line endings and three boundaries after
 * it, and counts how many times the matcher is entered.
 *
 * The subject is the policy function rather than the script, so a process per
 * row buys nothing: a `pwsh` start is about 622 ms around a call of about
 * 25 ms. Measured over the two suites that carry this table, it was 18 of
 * `prMergePlan.test.ts`'s 234 spawns and 18 of `prFixMonitor.test.ts`'s 277,
 * and one run answers every row of both.
 *
 * The rows are shared because the table is: the two files carried it verbatim,
 * and a second copy is one that drifts.
 */
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { EXIT_ZERO, outputContext, spawnCaptured } from "./spawnCaptured.js";
import { removeTempTree } from "./tempTree.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");

/** One row: the opener's name, the opener, its closer, and the boundary after it. */
export const HTML_LABEL_ROWS = (
  [
    ["instruction", "<?aaaa", "?>"],
    ["CDATA", "<![CDATA[aaaa", "]]>"],
    ["declaration", "<!DOCTYPE aaaa ", ">"],
  ] as const
).flatMap(([name, opener, closer]) =>
  ["absent", "blank", "table"].map((boundary) => [name, opener, closer, boundary] as const),
);

/** The two line endings every row is measured under. */
export const HTML_LABEL_ENDINGS = ["\n", "\r\n"] as const;

/** A body carrying an unmatched opener, and whatever the boundary case puts after it. */
function htmlLabelBody(opener: string, closer: string, boundary: string, end: string): string {
  const suffix =
    boundary === "absent"
      ? ""
      : boundary === "blank"
        ? `${end}prefix ${opener}closed${closer}${end}`
        : `head | detail${end}--- | ---${end}prefix ${opener}closed${closer}${end}`;
  return `\uFEFF## What this change made unnecessary${end}${end}prefix ${opener.repeat(256)}${end}${suffix}Nothing removed.${end}`;
}

/** What the instrumented policy reports for one body. */
export interface LabelScanMeasurement {
  readonly Attempts: number;
  readonly KeepsAnswer: boolean;
}

/** Where a row's two measurements sit in the shared result. */
export function labelScanIndex(row: number, ending: number): number {
  return row * HTML_LABEL_ENDINGS.length + ending;
}

async function measure(): Promise<readonly LabelScanMeasurement[]> {
  const policyPath = path.join(repoRoot, ".agents/skills/pr-fix/scripts/pr-body-policy.ps1");
  const bodies = HTML_LABEL_ROWS.flatMap(([, opener, closer, boundary]) =>
    HTML_LABEL_ENDINGS.map((end) => htmlLabelBody(opener, closer, boundary, end)),
  );
  // Through a file rather than the environment. Each body repeats its opener
  // 256 times, so the set runs to tens of kilobytes and a single environment
  // variable is capped well below that on Windows.
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-label-scan-"));
  const bodiesPath = path.join(dir, "bodies.json");
  await writeFile(bodiesPath, JSON.stringify(bodies), "utf-8");
  try {
    const result = await spawnCaptured(
      "pwsh",
      [
        "-NoProfile",
        "-Command",
        [
          "$ErrorActionPreference = 'Stop'",
          "$policy = [IO.File]::ReadAllText($env:QFAI_TEST_HTML_POLICY)",
          "$marker = '$html = $labelHtml.Match($Body, $labelIndex)'",
          "if (($policy.Split($marker).Length - 1) -ne 1) { throw 'Expected one label matcher' }",
          "$instrumented = $policy.Replace($marker, '$script:labelHtmlAttempts += 1; ' + $marker)",
          ". ([scriptblock]::Create($instrumented))",
          "$bodies = [IO.File]::ReadAllText($env:QFAI_TEST_HTML_BODIES) | ConvertFrom-Json",
          "$measured = foreach ($body in $bodies) { $script:labelHtmlAttempts = 0; $masked = MaskBodyExamples (NormalizeBody $body); [pscustomobject]@{ Attempts = $script:labelHtmlAttempts; KeepsAnswer = $masked.Contains('Nothing removed.') } }",
          "ConvertTo-Json -Compress -Depth 3 -InputObject @($measured)",
        ].join("; "),
      ],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          QFAI_TEST_HTML_POLICY: policyPath,
          QFAI_TEST_HTML_BODIES: bodiesPath,
        },
      },
    );
    if (result.outcome !== EXIT_ZERO) {
      throw new Error(`the label-scan probe did not exit cleanly: ${outputContext(result)}`);
    }
    // Before the parse, because `JSON.parse("")` raises `Unexpected end of JSON
    // input` and that names neither the child nor the stream it did not write to.
    if (result.stdout === "") {
      throw new Error(`the label-scan probe wrote nothing: ${outputContext(result)}`);
    }
    const measured = JSON.parse(result.stdout) as LabelScanMeasurement[];
    if (measured.length !== bodies.length) {
      throw new Error(
        `the label-scan probe answered ${String(measured.length)} of ${String(bodies.length)} rows`,
      );
    }
    return measured;
  } finally {
    await removeTempTree(dir);
  }
}

let pending: Promise<readonly LabelScanMeasurement[]> | null = null;

/**
 * Every row's measurement, from one run shared by every case that asks.
 *
 * The first case to ask starts it and the rest await the same promise, so a
 * `describe.concurrent` block of eighteen rows starts one process rather than
 * eighteen. Each row keeps its own `it` and its own failure.
 */
export async function labelScanMeasurements(): Promise<readonly LabelScanMeasurement[]> {
  return await (pending ??= measure());
}
