// QFAI:AC-0001-0192-12
// QFAI:AC-0001-0192-16
// QFAI:EX-0001-0192-47
// QFAI:EX-0001-0192-49
// QFAI:EX-0001-0192-50

import { afterEach, expect, it } from "vitest";

import {
  accepted,
  CONTRACT,
  DECISIONS,
  decisions,
  EXAMPLE_ROWS,
  EXAMPLES,
  examples,
  issued,
  read,
  readySnapshot,
  removeStoryProjects,
  STORY,
  storyProject,
  write,
} from "./storyTreeFixture.js";

afterEach(removeStoryProjects);

const SEEDED = "| EX-0001-0001-03 | AC-0001-0001-01 | A cancelled line | No row |";
const ROW = "| BR-0001 | One row per order line | EX-0001-0001-01, EX-0001-0001-02 |";

it("The sdd_append work order after a missing-test diagnosis matching AC-0001-0001-01", async () => {
  const root = await storyProject();
  const { workOrder } = await issued(root, readySnapshot("sdd_append"));

  expect(workOrder?.recordAreas).toEqual([
    EXAMPLES,
    CONTRACT,
    DECISIONS,
    ".qfai/evidence/sdd-BF-0001.md",
  ]);
});

it("A seeding result that also changes the story's criteria", async () => {
  const root = await storyProject();
  const { snapshot } = await issued(root, readySnapshot("sdd_append"));
  const criteria = `${STORY}/02_Acceptance-Criteria.md`;

  expect(
    await accepted(root, snapshot, { changedFiles: [{ path: criteria, digest: "x" }] }),
  ).toEqual({
    state: "running",
    reasons: [
      { reason: "write-scope", subject: criteria },
      { reason: "record-unauthorized", subject: criteria },
    ],
  });
});

// A seeding result that wrote the new example and changed the contract with `edit`, under no
// change request, and what `accept` says of the contract.
async function seedWith(edit: (text: string) => string) {
  const root = await storyProject();
  const { snapshot } = await issued(root, readySnapshot("sdd_append"));
  await write(root, EXAMPLES, examples([...EXAMPLE_ROWS, SEEDED]));
  await write(root, CONTRACT, edit(await read(root, CONTRACT)));
  const verdict = await accepted(root, snapshot);
  return (verdict.reasons ?? []).filter((each) => each.reason === "rule-changed");
}

const CITED = "EX-0001-0001-01, EX-0001-0001-02, EX-0001-0001-03";

it("Seeding that adds the new example's ID to the rule's Examples cell", async () => {
  const cited = `| BR-0001 | One row per order line | ${CITED} |`;

  expect(await seedWith((text) => text.replace(ROW, cited))).toEqual([]);
});

it("Seeding that also rewords the rule's Statement", async () => {
  const reworded = `| BR-0001 | One row for each order line | ${CITED} |`;

  expect(await seedWith((text) => text.replace(ROW, reworded))).toEqual([
    { reason: "rule-changed", subject: CONTRACT },
  ]);
});

it("An sdd_delta result editing the Content of a row present at issue", async () => {
  const root = await storyProject();
  const { snapshot } = await issued(root, readySnapshot("sdd_delta"));
  await write(root, DECISIONS, decisions(["| DEC-0001 | Export as TSV | Settled | DONE |"]));

  expect(await accepted(root, snapshot)).toEqual({
    state: "running",
    reasons: [{ reason: "record-rewritten", subject: "DEC-0001" }],
  });
});
