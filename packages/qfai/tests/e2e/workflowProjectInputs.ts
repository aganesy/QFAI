/**
 * What a project holds before its first feature run: the discussion that led to the feature, the
 * objective it serves, and the technology and structure records `qfai-configure` fills in. A
 * project past its first flow needs all of them for `validate` to pass, so `finish` can judge the
 * run on what the run changed and nothing else.
 */
import { initProject, publish, write } from "./workflowJourney.js";

const DISCUSSION = ".qfai/discussion/discussion-20260101000000000";

const DISCUSSION_FILES = [
  "01_Context.md",
  "02_Inception-Deck.md",
  "03_Story-Workshop.md",
  "04_Sources.md",
  "05_Scope.md",
  "06_REQ.md",
  "07_NFR.md",
  "08_Glossary.md",
  "09_Constraints.md",
  "10_Policy.md",
  "11_OQ-Register.md",
  "12_OQ-Resolution-Log.md",
  "13_Deferred.md",
  "14_Review-Request.md",
  "99_delta.md",
] as const;

const BODY =
  "A customer registers up to five notification addresses, each once. Sending the notifications is outside this discussion.\n";

const SOURCES = [
  "## Source Registry",
  "",
  "| SRC-ID | Title | Type | URL / Path | Retrieved | Notes |",
  "| --- | --- | --- | --- | --- | --- |",
  "| SRC-0001 | Notification requirements | primary | docs/notifications.md | 2026-01-01 | Owner request |",
  "",
  "## Research Summary",
  "",
  "```yaml",
  "research_summary:",
  "  sources:",
  "    - id: SRC-0001",
  "      title: Notification requirements",
  "      url: https://example.com/notifications",
  "      published: 2026-01-01",
  "  best_practices:",
  "    - id: BP-0001",
  "      category: validation",
  "      title: Compare addresses case-insensitively",
  "      description: Two spellings of one address are one address.",
  "      source_id: SRC-0001",
  "  anti_patterns:",
  "    - id: AP-0001",
  "      category: validation",
  "      title: Counting duplicates toward the limit",
  "      description: A repeated address takes a slot it does not need.",
  "      source_id: SRC-0001",
  "  reflection:",
  "    - source_id: SRC-0001",
  "      finding: The limit counts distinct addresses.",
  "      action: apply",
  "      reason: It is the whole of the requirement.",
  "```",
  "",
].join("\n");

function discussionFile(name: (typeof DISCUSSION_FILES)[number]): string {
  const heading = `# ${name.slice(3, -3).replace(/-/g, " ")}\n\n`;
  switch (name) {
    case "01_Context.md":
      return `${heading}## UI-bearing Classification\n\n- ui_bearing: false\n- primary_surface: non-ui\n- secondary_surfaces: []\n- classification_rationale: Addresses are kept by a service with no screen.\n\n## Goal and Completion Criteria\n\n- Goal: ${BODY}`;
    case "03_Story-Workshop.md":
      return `${heading}${BODY}\n\`\`\`mermaid\nflowchart TD\n  Register[Register an address] --> Notify[Receive notifications]\n\`\`\`\n`;
    case "04_Sources.md":
      return `${heading}${SOURCES}`;
    default:
      return `${heading}${BODY}`;
  }
}

const RECORDS: Record<string, string> = {
  ".qfai/spec/01_policy/objective.md":
    "# Objective\n\n## Objective\n\n- Outcome: Customers choose where notifications go.\n- Evidence: Project need recorded by the owner.\n\n## Users\n\n- Primary user: Customer receiving notifications.\n\n## Success criteria\n\n- Measure: No customer holds more than five distinct addresses.\n\n## Non-goals\n\n- Outside this initiative: Sending the notifications.\n",
  ".qfai/spec/03_contract/tech.md":
    "# Technology\n\n## Runtime / platform\n\n- Runtime: `Node.js 20`\n- Platform: `Linux, macOS and Windows`\n\n## Stack\n\n| Component | Choice |\n| --------- | ------ |\n| Test runner | vitest |\n\n## Dependencies\n\n- Runtime dependency: `none; the address rules use the standard library`\n\n## Standard commands (copy-paste)\n\n- Install: `npm install`\n- Format: `npm run format:check`\n- Test: `npm test`\n- Lint: `npm run lint`\n- Typecheck: `npm run typecheck`\n- Build: `npm run build`\n- Skeleton: `node src/notification-addresses.js`\n- Validate: `npx qfai validate`\n",
  ".qfai/spec/03_contract/structure.md":
    "# Structure\n\n## Structure\n\n- Repository layout: `src/ holds the address rules; tests/ holds their tests by layer`\n- Production roots: `src/`\n\n## Entry points\n\n- Entry point: `src/notification-addresses.ts keeps a customer's addresses`\n\n## Key packages / entrypoints\n\n- Package or entrypoint: `src/notification-addresses.ts applies the limit`\n\n## Architecture constraints\n\n- Boundary: `tests import src; src imports nothing from tests`\n\n## UI surface paths (SSOT)\n\n- UI surface: `none`\n",
};

/** A `qfai init` project holding its discussion and its configured records, published. */
export async function discussedProject(): Promise<string> {
  const root = await initProject();
  for (const name of DISCUSSION_FILES) {
    await write(root, `${DISCUSSION}/${name}`, discussionFile(name));
  }
  for (const [rel, text] of Object.entries(RECORDS)) await write(root, rel, text);
  publish(root);
  return root;
}
