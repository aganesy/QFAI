/**
 * `--format github` writes workflow commands, and a workflow command is a line protocol.
 *
 * Review finding [40]. Every field in `::error file=...::message` is parsed by position and by
 * separator, so any value interpolated into it that carries a newline, a `%`, a `:` or a `,` is not
 * data — it is syntax. The message half was escaped from the start; the location metadata was not.
 *
 * What made that reachable rather than theoretical: the reviewer-justification gate ingests findings
 * from any `*.json` under `.qfai/review/**`, which is a directory a pull request writes, and passes
 * the lane's `file` through to `Issue.file`. A fork's pull request could therefore put
 * `x\n::stop-commands::<token>` there and have `qfai validate --format github` emit it — splitting
 * the command in two and suppressing or forging every annotation that followed.
 *
 * The run is a real one against a temp project, not a call to the formatter, because the property is
 * about the whole path from the artifact to stdout: escaping the formatter while the ingestion built
 * the string, or the reverse, would each pass a narrower test.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { runValidate } from "../../src/cli/commands/validate.js";

/** A code the gate ingests without demanding a justification, so the payload reaches `Issue`. */
const INGESTED_CODE = "R-WORKFLOW-HYGIENE-DRIFT";

/** The command a hostile `file` would open if the metadata were interpolated raw. */
const INJECTED_COMMAND = "::stop-commands::7f3a9c";

async function withProject(
  finding: Record<string, unknown>,
  task: (lines: string[]) => void,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-gh-annot-"));
  const chunks: string[] = [];
  const writeSpy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation((chunk: string | Uint8Array) => {
      chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8"));
      return true;
    });
  try {
    const reviewDir = path.join(root, ".qfai", "review", "review-20260825000000000");
    await mkdir(reviewDir, { recursive: true });
    await writeFile(
      path.join(reviewDir, "reviewer-completion.json"),
      JSON.stringify({ findings: [finding] }, null, 2),
      "utf-8",
    );

    await runValidate({ root, strict: false, format: "github", failOn: "error" });
    task(chunks.join("").split(/\r?\n/));
  } finally {
    writeSpy.mockRestore();
    await rm(root, { recursive: true, force: true });
  }
}

/** Every workflow command in the captured output: a line whose first two characters are `::`. */
const commandsIn = (lines: readonly string[]): string[] =>
  lines.filter((line) => line.startsWith("::"));

describe("a workflow command's location metadata is escaped, not interpolated", () => {
  it("does not let an ingested finding's `file` open a command of its own", async () => {
    await withProject(
      {
        code: INGESTED_CODE,
        file: `x\n${INJECTED_COMMAND}`,
        job: "ci-pass",
        rule: "job-guardrails",
      },
      (lines) => {
        // Non-vacuity first: the finding really did reach an annotation. Without this the
        // assertions below hold for a run that emitted nothing at all.
        const commands = commandsIn(lines);
        expect(
          commands.filter((line) => line.includes(INGESTED_CODE)),
          "the ingested finding produced no annotation, so this row proves nothing",
        ).toHaveLength(1);

        // The injected command must not appear as a command. It may appear escaped inside one.
        expect(
          commands.filter((line) => line.startsWith(INJECTED_COMMAND)),
          "an ingested `file` opened a workflow command of its own",
        ).toEqual([]);

        // …and no line at all is the injected command, which is the same claim made without
        // relying on how the annotation happens to be ordered.
        expect(lines, "the injected command reached stdout on a line of its own").not.toContain(
          INJECTED_COMMAND,
        );
      },
    );
  });

  it("escapes the separators a property value is parsed with, and keeps the path readable", async () => {
    // `:` and `,` are how GitHub splits the metadata block into properties, so a `file` carrying
    // either one changes which properties the command appears to set — `file=a,line=9` names a
    // line the finding never reported. They are escaped by the property rules rather than the
    // message ones, which is the distinction this row pins.
    await withProject(
      { code: INGESTED_CODE, file: "pkg:one,two/ci.yml", rule: "job-guardrails" },
      (lines) => {
        const annotation = commandsIn(lines).find((line) => line.includes(INGESTED_CODE));
        expect(annotation, "the ingested finding produced no annotation").toBeDefined();

        const metadata = (annotation ?? "").slice(0, (annotation ?? "").indexOf("::", 2));
        expect(metadata, "the metadata block must carry the file").toContain("file=");
        expect(metadata, "a raw `:` in the metadata is a property separator").not.toContain(
          "pkg:one",
        );
        expect(metadata, "a raw `,` in the metadata starts a property of its own").not.toContain(
          "one,two",
        );
        expect(metadata, "and the path must still be recoverable from the escaped form").toContain(
          "pkg%3Aone%2Ctwo/ci.yml",
        );
      },
    );
  });

  it("drops a lane field carrying a control character rather than passing it on", async () => {
    // The other half, at ingestion. The formatter's escaping is what protects every producer; this
    // is the statement that a payload carrying a newline is corrupt whoever renders it, so the
    // field is not passed through at all — and the finding is still surfaced, because dropping the
    // field must not drop the finding.
    await withProject(
      { code: INGESTED_CODE, file: `x\n${INJECTED_COMMAND}`, job: "ci-pass" },
      (lines) => {
        const annotation = commandsIn(lines).find((line) => line.includes(INGESTED_CODE));
        expect(annotation, "the ingested finding produced no annotation").toBeDefined();
        expect(
          annotation ?? "",
          "a `file` this gate refused must not appear in the annotation in any form",
        ).not.toContain("stop-commands");
        expect(annotation ?? "", "and the fields it did accept must still be there").toContain(
          "ci-pass",
        );
      },
    );
  });
});
