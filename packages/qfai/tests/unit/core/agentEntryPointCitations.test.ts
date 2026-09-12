import { describe, expect, it } from "vitest";

import {
  missingRuleCitations,
  needsManagedRulesSection,
  QFAI_AGENT_RULES_BEGIN,
  QFAI_AGENT_RULES_END,
  ruleCitationLines,
} from "../../../src/core/agentEntryPoints.js";

/** A shipped section carrying three rules, in the shape the templates use. */
const SECTION = [
  QFAI_AGENT_RULES_BEGIN,
  "",
  "## Cross-AI rules (master)",
  "",
  "- `.agents/rules/temporary-files.md` — scratch files go under `tmp/`.",
  "- `.agents/rules/grilling.md` — interview the decision tree in rounds.",
  "- `.agents/rules/user-questions.md` — every question arrives as a choice.",
  "",
  QFAI_AGENT_RULES_END,
].join("\n");

/** What a project installed before the last two rules shipped still holds. */
const OLDER_INSTALL = [
  "# Agent Instructions",
  "",
  "Our own preamble, which no run may rewrite.",
  "",
  QFAI_AGENT_RULES_BEGIN,
  "",
  "## Cross-AI rules (master)",
  "",
  "- `.agents/rules/temporary-files.md` — scratch files go under `tmp/`.",
  "",
  QFAI_AGENT_RULES_END,
  "",
  "## Project rules",
  "",
  "Ours, and outside the markers.",
].join("\n");

describe("a rule that shipped after the section was written", () => {
  it("is not reached by the append path", () => {
    // The marker is present, so appending a second section would duplicate the
    // heading and re-assert bullets the project may have trimmed. That branch
    // is why the citation gap existed at all.
    expect(needsManagedRulesSection(OLDER_INSTALL, SECTION)).toBe(false);
  });

  it("is named as missing", () => {
    expect(missingRuleCitations(OLDER_INSTALL, SECTION)).toEqual([
      ".agents/rules/grilling.md",
      ".agents/rules/user-questions.md",
    ]);
  });

  it("is not missing once the file names it anywhere", () => {
    // The whole file is searched, not the managed block. A project that removed
    // a bullet and said why in its own prose still names the master, so the line
    // does not come back — which is the promise the marker branch protects.
    const trimmedWithReason = OLDER_INSTALL.replace(
      "Ours, and outside the markers.",
      "We do not follow `.agents/rules/grilling.md`; our design review covers it.",
    );
    expect(missingRuleCitations(trimmedWithReason, SECTION)).toEqual([
      ".agents/rules/user-questions.md",
    ]);
  });

  it("is cited with the template's own line, not a composed one", () => {
    // A second spelling of the bullet drifts from the template that ships it,
    // and the template is the copy an author reviews.
    expect(ruleCitationLines(SECTION, [".agents/rules/grilling.md"])).toEqual([
      "- `.agents/rules/grilling.md` — interview the decision tree in rounds.",
    ]);
  });

  it("finds nothing to add when the section and the file agree", () => {
    const current = OLDER_INSTALL.replace(
      "- `.agents/rules/temporary-files.md` — scratch files go under `tmp/`.",
      [
        "- `.agents/rules/temporary-files.md` — scratch files go under `tmp/`.",
        "- `.agents/rules/grilling.md` — interview the decision tree in rounds.",
        "- `.agents/rules/user-questions.md` — every question arrives as a choice.",
      ].join("\n"),
    );
    expect(missingRuleCitations(current, SECTION)).toEqual([]);
  });
});
