/**
 * Integration: how a run writes its deliberation record, as the shipped record reference, record
 * template, operating baseline, grilling rule and stage steps state it. When a record is written,
 * where, what each row holds, and how a committed record is corrected.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { getInitAssetsDir } from "../../../src/shared/assets.js";
import { flat, readShipped, sectionOf } from "../../helpers/shippedAssistant.js";

const REFERENCE = "rule/references/deliberation-record.md";
const TEMPLATE = "rule/references/deliberation-record-template.md";
const OPERATING = "rule/shared-skill-operating-baseline.md";
const COLUMNS =
  "| Background | Option 1 | Option 2 | Option 3 | Option 4 (other) | Chosen option number |";

async function writing(): Promise<string> {
  const text = flat(sectionOf(await readShipped(REFERENCE), "## Writing a record"));
  expect(text).not.toBe("");
  return text;
}

describe("when and where a run writes its record", () => {
  // QFAI:EX-0001-0298-01
  it("writes one timestamped, slugged file under the default deliberation directory when the run asks a question", async () => {
    expect(defaultConfig.paths.deliberationDir).toBe(".qfai/deliberation");
    const text = await writing();
    expect(text).toMatch(
      /one Markdown file directly under `paths\.deliberationDir` \(default `\.qfai\/deliberation`\), named `<YYYYMMDDhhmmss>-<slug>\.md`: the time in UTC and a slug naming the subject/i,
    );
    expect(text).toMatch(/a run writes one only when it asks the user a question/i);
    expect(flat(sectionOf(await readShipped(OPERATING), "## Deliberation Record"))).toMatch(
      /read `\.qfai\/assistant\/rule\/references\/deliberation-record\.md` before the run asks the user a question or takes an agent decision/i,
    );
  });

  // QFAI:EX-0001-0298-02
  it("writes no record for a run that asks nothing and takes only choices a convention settles", async () => {
    const text = await writing();
    expect(text).toMatch(
      /a run writes one only when it asks the user a question or takes an Agent decisions row/i,
    );
    expect(text).toMatch(
      /a choice a convention settles, a formatting choice and a choice with one possible answer are not rows/i,
    );
  });

  // QFAI:EX-0001-0298-03
  it("keeps every stage of one run in one record, each under a subheading of its own", async () => {
    expect(await writing()).toMatch(
      /each stage of the run writes under a subheading of its own in the same file/i,
    );
    const template = await readShipped(TEMPLATE);
    expect(template).toMatch(/^## <stage>$/m);
    expect(template).toMatch(/^### Interview$/m);
    expect(template).toMatch(/^### Agent decisions$/m);
  });

  // QFAI:EX-0001-0301-01
  it("holds a question and agent decisions of the specification and implement stages in one file", async () => {
    const text = await writing();
    expect(text).toMatch(/named `<YYYYMMDDhhmmss>-<slug>\.md`/);
    expect(text).toMatch(
      /each stage of the run writes under a subheading of its own in the same file/i,
    );
    expect(flat(await readShipped("step/implement-diagnose/STEP.md"))).toMatch(
      /as an Agent decisions row of the run's deliberation record/i,
    );
  });
});

describe("what an Interview row holds", () => {
  // QFAI:EX-0001-0298-05
  it("puts the offered options in Options 1 to 3 and the picked one's number in the chosen cell", async () => {
    expect(await writing()).toMatch(
      /the options offered go into Options 1 to 3 in the order offered, and `Chosen option number` holds the number of the one picked/i,
    );
    expect(await readShipped(TEMPLATE)).toContain(COLUMNS);
  });

  // QFAI:EX-0001-0298-06
  it("quotes a free answer word for word in Option 4 and chooses 4", async () => {
    expect(await writing()).toMatch(
      /quote a free answer word for word in `Option 4 \(other\)` and choose `4`/i,
    );
  });

  // QFAI:EX-0001-0298-07
  it("leaves Options 1 to 3 empty for a question with no candidate values", async () => {
    expect(await writing()).toMatch(
      /a question with no candidate values leaves Options 1 to 3 empty, holds the answer in Option 4 and chooses `4`/i,
    );
  });

  // QFAI:EX-0001-0298-08
  it("puts the URL of a source the options rest on in Background", async () => {
    expect(await writing()).toMatch(/a source the options rest on goes into Background as a URL/i);
  });
});

describe("what an Agent decisions row holds", () => {
  // QFAI:EX-0001-0298-09
  it("writes a row with at least three options for a choice no contract settles", async () => {
    const text = await writing();
    expect(text).toMatch(
      /one row per choice that no specification, contract, rule or convention settles and whose answer changes an artifact's meaning, behaviour, structure or policy/i,
    );
    expect(text).toMatch(/consider at least three options for each row/i);
  });

  // QFAI:EX-0001-0298-10
  it("writes no row for a naming convention or a formatting choice", async () => {
    expect(await writing()).toMatch(
      /a choice a convention settles, a formatting choice and a choice with one possible answer are not rows/i,
    );
  });

  // QFAI:EX-0001-0298-11
  it("writes a row with at least three options for each decision settled between agents", async () => {
    expect(await writing()).toMatch(/and one per decision settled between agents/i);
    const grilling = flat(
      await readFile(
        path.join(getInitAssetsDir(), "root", ".agents", "rules", "grilling.md"),
        "utf-8",
      ),
    );
    expect(grilling).toMatch(
      /an Agent decisions row\*{0,2} of the run's deliberation record: at least three options/i,
    );
  });
});

describe("a record is a memo", () => {
  // QFAI:EX-0001-0298-12
  it("cites no ID, and nothing cites it", async () => {
    expect(await writing()).toMatch(/a record has no ID, cites no ID, and nothing cites it/i);
  });

  // QFAI:EX-0001-0298-13
  it("is corrected by a new record, and the register by a Supersedes row", async () => {
    expect(await writing()).toMatch(/never its content: a correction is a new record/i);
    expect(flat(await readShipped("step/sdd-triage/STEP.md"))).toMatch(/`Supersedes DEC-…`/);
  });

  // QFAI:EX-0001-0301-05
  it("keeps a committed record unchanged when a later request corrects one of its rows", async () => {
    expect(await writing()).toMatch(
      /once committed, it may be edited only to repair its table layout.*never its content: a correction is a new record/i,
    );
  });

  // QFAI:EX-0001-0298-14
  it("adds a revisiting row whose Background says so, and keeps the earlier row", async () => {
    expect(await writing()).toMatch(
      /a later row that overturns an earlier row of the same record says so in its Background, and the earlier row stays/i,
    );
  });

  // QFAI:EX-0001-0298-15
  it("is written in the project's stated document language, otherwise in the user's", async () => {
    expect(await writing()).toMatch(
      /the language the project states it keeps its documents in, otherwise the language the user works in/i,
    );
    const agents = await readFile(
      fileURLToPath(new URL("../../../../../AGENTS.md", import.meta.url)),
      "utf-8",
    );
    expect(flat(agents)).toMatch(/what the repository stores is English/i);
  });

  // QFAI:EX-0001-0301-03
  it("leaves a closed run's record unchanged when the request is re-routed to a run of its own", async () => {
    const close = flat(sectionOf(await readShipped("step/triage-close/STEP.md"), "## Re-routing"));
    expect(close).toMatch(/report the outcome `adopted`, naming the route that builds it/i);
    expect(close).toMatch(
      /the run that route starts writes a record of its own; this run's record stays as this step committed it/i,
    );
  });
});
