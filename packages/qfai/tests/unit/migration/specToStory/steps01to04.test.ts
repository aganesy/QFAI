import { describe, expect, it } from "vitest";

import { mapDecisionStatus } from "../../../../src/migration/specToStory/step02MergeTables.js";
import {
  numberPlannedItems,
  parseOldCriteria,
  parseOldStories,
} from "../../../../src/migration/specToStory/step04RenumberIds.js";

describe("migration record status", () => {
  it("maps current, superseded and absent statuses", () => {
    // QFAI:EX-0004-0005-03
    // QFAI:EX-0004-0005-04
    expect([
      mapDecisionStatus("proposed"),
      mapDecisionStatus("accepted"),
      mapDecisionStatus("rejected"),
      mapDecisionStatus("re-open"),
      mapDecisionStatus("superseded", "DEC-0007"),
      mapDecisionStatus(undefined),
      mapDecisionStatus("on-hold"),
    ]).toEqual(["TODO", "DONE", "REJECTED", "WIP", "SUPERSEDED (by DEC-0007)", "DONE", "TODO"]);
  });
});

describe("migration numbering", () => {
  it("numbers flows, stories, criteria, examples and rules in their specified order", () => {
    expect(
      numberPlannedItems({
        flows: [
          {
            name: "F1",
            stories: [
              { id: "S2", criteria: ["a1", "a2"], examples: ["e1", "e2"] },
              { id: "S1", criteria: [], examples: [] },
            ],
          },
          { name: "F2", stories: [] },
        ],
        rules: ["r1", "r2"],
      }),
    ).toEqual({
      flows: { F1: "BF-0001", F2: "BF-0002" },
      stories: { S2: "US-0001-0001", S1: "US-0001-0002" },
      criteria: { a1: "AC-0001-0001-01", a2: "AC-0001-0001-02" },
      examples: { e1: "EX-0001-0001-01", e2: "EX-0001-0001-02" },
      rules: { r1: "BR-0001", r2: "BR-0002" },
    });
  });
});

describe("mixed legacy criterion sections", () => {
  it("keeps fenced markers and headed scenarios in document order without counting a matching marker twice", () => {
    const criteria = parseOldCriteria(
      "# Criteria\n\n## Scenarios\n\n```gherkin\n# AC-0003-0001\nScenario: First\n Given an item\n When it runs\n Then it passes\n```\n\n## AC-0003-0002: Second\n\n```gherkin\n# AC-0003-0002\nScenario: Second\n Given another item\n When it runs\n Then it passes\n```\n",
    );
    expect(criteria.map((criterion) => criterion.id)).toEqual(["AC-0003-0001", "AC-0003-0002"]);
    expect(criteria.every((criterion) => criterion.text.includes("Scenario:"))).toBe(true);
  });

  it("stops each marker-only criterion before the next marker in one Gherkin fence", () => {
    const criteria = parseOldCriteria(
      "# Criteria\n\n## AC Gherkin\n\n```gherkin\n# AC-0018-0001\nScenario: First\n Given an item\n When it runs\n Then it passes\n\n# AC-0018-0002\nScenario: Second\n Given another item\n When it runs\n Then it passes\n```\n",
    );
    expect(criteria.map((criterion) => criterion.id)).toEqual(["AC-0018-0001", "AC-0018-0002"]);
    expect(criteria[0]?.text).toContain("Scenario: First");
    expect(criteria[0]?.text).not.toContain("AC-0018-0002");
    expect(criteria[0]?.text).not.toContain("Scenario: Second");
    expect(criteria[1]?.text).not.toContain("AC-0018-0001");
  });

  it("stops a headed criterion before a non-criterion H2", () => {
    const criteria = parseOldCriteria(
      "# Criteria\n\n## AC-0012-0001: First\n\n```gherkin\nScenario: First\n Given an item\n When checked\n Then accepted\n```\n\n## Completion Gate\n\nHistorical gate text.\n",
    );
    expect(criteria).toHaveLength(1);
    expect(criteria[0]?.text).not.toContain("Completion Gate");
  });
});

describe("legacy story section boundaries", () => {
  it("uses the matching catalog title when a story H2 has only its ID", () => {
    const stories = parseOldStories(
      "# Stories\n\n## US Catalog\n\n- US-0004-0001: `qfai validate` remains deterministic\n\n## US-0004-0001\n\n- Goal: Validate.\n",
    );
    expect(stories).toHaveLength(1);
    expect(stories[0]?.title).toBe("`qfai validate` remains deterministic");
    expect(stories[0]?.body).toContain("- Goal: Validate.");
  });

  it("leaves a blank title unresolved when catalog rows are missing or repeated", () => {
    const missing = parseOldStories("# Stories\n\n## US-0004-0001\n\n- Goal: Validate.\n");
    const repeated = parseOldStories(
      "# Stories\n\n## US Catalog\n\n- US-0004-0001: First title\n- US-0004-0001: Second title\n\n## US-0004-0001\n\n- Goal: Validate.\n",
    );
    expect(missing[0]?.title).toBe("");
    expect(repeated[0]?.title).toBe("");
  });

  it("stops a story at the next H2 even when it is not another story", () => {
    const stories = parseOldStories(
      "# Stories\n\n## US-0012-0118: Review\n\n- Goal: Review.\n\n## v1.9.1 Defect Remediation User Stories\n\nContext outside the story.\n\n## US-0012-0142: Finish\n\n- Goal: Finish.\n\n## Legacy Coverage Continuity\n\nArchived context.\n",
    );
    expect(stories.map((story) => story.id)).toEqual(["US-0012-0118", "US-0012-0142"]);
    expect(stories[0]?.body).not.toContain("Defect Remediation");
    expect(stories[1]?.body).not.toContain("Legacy Coverage Continuity");
  });
});
