/**
 * The capitalised `MANDATORY`, `CRITICAL` and `MUST` that the shipped
 * assistant tree and the shipped root rules are allowed to keep.
 *
 * Capitals used for emphasis make a model act before it has understood the
 * instruction, so the shipped text states an obligation in plain words. A
 * capitalised word stays only where a validator, a gate or a test reads the
 * exact phrase, because rewriting it there would break that reader.
 *
 * Keyed by path under `packages/qfai/assets/init/`. Each entry names the exact
 * phrase, whitespace-collapsed, and the file that reads it. One entry covers
 * one occurrence, so a file that keeps a phrase twice lists it twice.
 *
 * **The list may only shrink.** `emphasisWords.test.ts` fails on a capitalised
 * word no entry covers, and on an entry whose phrase is gone. When a reader
 * stops reading a phrase, rewrite the phrase and delete its entry in the same
 * change. Never add an entry.
 */
export interface KeptEmphasis {
  /** The phrase as the file holds it, with each whitespace run read as one space. */
  readonly phrase: string;
  /** The validator, gate or test that reads the phrase, relative to `packages/qfai/`. */
  readonly readBy: string;
}

const DRIFT_MARKER: KeptEmphasis = {
  phrase: "[DRIFT-PROTOCOL:MANDATORY]",
  readBy: "src/core/validators/assistantAssets.ts",
};

const DELEGATION_HEADING: KeptEmphasis = {
  phrase: "## Sub-agent Delegation (MANDATORY)",
  readBy: "tests/assets/skillDelegationTool.test.ts",
};

const ABSOLUTE_RULE: KeptEmphasis = {
  phrase: "**All outputs MUST be written in the user’s working language for this session.**",
  readBy: "tests/assets/outputLanguageSingleSource.test.ts",
};

const ANSWERED_DEMANDS = "tests/assets/answeredReviewDemandHome.test.ts";
const DELEGATION_SPEC = "tests/integration/agentDelegationSpec0015.test.ts";

export const KEPT_EMPHASIS: Readonly<Record<string, readonly KeptEmphasis[]>> = {
  ".qfai/assistant/rule/communication.md": [
    {
      phrase: "Every SKILL.md MUST cite that anchor",
      readBy: "tests/assets/skillUserQuestionsSection.test.ts",
    },
  ],
  ".qfai/assistant/rule/constitution.md": [
    ABSOLUTE_RULE,
    {
      phrase: "`tmp/` MUST be listed in `.gitignore` so temporary files are never committed.",
      readBy: "tests/core/gitignoreArticleXiTmp.test.ts",
    },
  ],
  ".qfai/assistant/rule/review-convergence.md": [
    { phrase: "## Answered demands (MUST)", readBy: ANSWERED_DEMANDS },
    { phrase: "MUST NOT be re-raised under another wording", readBy: ANSWERED_DEMANDS },
    {
      phrase: "## Agent-to-agent grilling (MUST)",
      readBy: "tests/assets/agentGrillingConvergence.test.ts",
    },
  ],
  ".qfai/assistant/rule/shared-skill-delegation-baseline.md": [
    DELEGATION_HEADING,
    { phrase: "### Capability Probe (MUST)", readBy: DELEGATION_SPEC },
    { phrase: "### Delegation Failure Taxonomy (MUST)", readBy: DELEGATION_SPEC },
    {
      phrase: "`record:*` and `none` MUST be recorded as `advisory`",
      readBy: "tests/integration/reviewerFindingProvenance.test.ts",
    },
    {
      phrase: "### What a reviewer may demand more of (MUST)",
      readBy: "tests/assets/reviewerDemandBound.test.ts",
    },
  ],
  ".qfai/assistant/rule/workflow.md": [ABSOLUTE_RULE],
  ".qfai/assistant/skill/qfai-configure/SKILL.md": [DRIFT_MARKER, DELEGATION_HEADING],
  ".qfai/assistant/skill/qfai-discussion/SKILL.md": [
    DRIFT_MARKER,
    {
      phrase: "## Completion Message & Next Actions (MUST)",
      readBy: "tests/assets/assets.test.ts",
    },
  ],
  ".qfai/assistant/skill/qfai-grill/SKILL.md": [DRIFT_MARKER, DELEGATION_HEADING],
  ".qfai/assistant/skill/qfai-grilling/SKILL.md": [DRIFT_MARKER, DELEGATION_HEADING],
  ".qfai/assistant/skill/qfai-implement/SKILL.md": [DRIFT_MARKER],
  ".qfai/assistant/skill/qfai-maintain/SKILL.md": [DRIFT_MARKER],
  ".qfai/assistant/skill/qfai-migration-v1-to-v2/SKILL.md": [DRIFT_MARKER],
  ".qfai/assistant/skill/qfai-prototyping/SKILL.md": [DRIFT_MARKER],
  ".qfai/assistant/skill/qfai-run/SKILL.md": [DRIFT_MARKER, DELEGATION_HEADING],
  ".qfai/assistant/skill/qfai-sdd/SKILL.md": [DRIFT_MARKER],
  ".qfai/assistant/skill/qfai-sdd/references/ui-design-contract-normalization.md": [
    { phrase: "MUST NOT be generated", readBy: "tests/integration/sddUiTemplate.test.ts" },
  ],
  ".qfai/assistant/skill/qfai-triage/SKILL.md": [DRIFT_MARKER],
  ".qfai/assistant/skill/qfai-verify/SKILL.md": [DRIFT_MARKER],
  ".qfai/assistant/skill/qfai-verify/references/verify-output-contract.md": [
    {
      phrase: "`/qfai-verify` MUST write `.qfai/report/verify.json`",
      readBy: "tests/assets/verifyJsonWritePath.test.ts",
    },
  ],
  ".qfai/assistant/skill/web-research/SKILL.md": [DRIFT_MARKER, DELEGATION_HEADING],
};
