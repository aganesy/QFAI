---
id: agent-selection
category: project
update_frequency: occasional
---

# Agent Selection

Each card in `.qfai/assistant/agent/` defines one agent. Its frontmatter is the
source for its identity, mission, domain, artifacts, tools, permissions, and
specializations. Read the card before assigning work. Do not keep another copy
of its definition in a routing file.

The installed QFAI package supplies routing and review-profile defaults from
`assets/defaults/agent-routing.yml` and
`assets/defaults/review-profiles.yml`. Find that directory beside the package's
`assets/init/` directory. A `qfai.config.yaml` `routing:` or `reviewProfiles:`
entry replaces the matching default entry as a whole; a new key adds an entry.
Resolve defaults and project overrides before selecting agents. The project
does not own copies of these default files.

A local installation of QFAI is required in an adopting project. If it is
unavailable, stop and ask for a local install with `npm install -D qfai`.
In the QFAI source repository, read the files directly from
`packages/qfai/assets/defaults/`; that repository must not depend on its own
package. Do not infer routing from a skill body or continue without the defaults.

## Selection

| Work                       | Primary agent                  | Review or support          |
| -------------------------- | ------------------------------ | -------------------------- |
| Initial discovery          | `discovery-analyst`            | `delivery-planner`         |
| Requirements and options   | `requirements-analyst`         | `requirements-reviewer`    |
| Architecture and contracts | `solution-architect`           | `architecture-reviewer`    |
| UX and screen behavior     | `product-experience-architect` | `product-surface-reviewer` |
| Backend implementation     | `backend-engineer`             | `implementation-reviewer`  |
| Frontend implementation    | `frontend-engineer`            | `product-surface-reviewer` |
| Acceptance tests           | `acceptance-test-engineer`     | `test-design-analyst`      |
| CI and runtime proof       | `devops-ci-engineer`           | `qa-gatekeeper`            |
| Documentation              | `doc-steward`                  | `delivery-planner`         |
| Completion audit           | `completion-reviewer`          | `qa-gatekeeper`            |

The resolved routing entry, not this table, decides mandatory agents,
blocking reviewers, phase order, and rerun policy. The table helps identify a
domain when no skill phase is being routed.

For MCP search and retrieval choices, see the MCP Integration section of
`.qfai/assistant/skill/web-research/SKILL.md`.
