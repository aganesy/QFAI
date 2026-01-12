
# agents/
Subagent definitions (general job roles).

These files are SSOT "role cards".
A QFAI custom prompt may delegate work to multiple roles and then consolidate results.

Role set (recommended initial):
- Facilitator
- Interviewer
- Requirements Analyst
- Planner
- Architect
- Contract Designer
- QA Engineer
- Test Engineer
- Front-end Engineer
- Back-end Engineer
- DevOps/CI Engineer
- Code Reviewer

## Metadata (for tool integration)
Each role card includes YAML frontmatter:
- `trigger_terms`: keywords that suggest when the role is relevant
- `use_when`: brief activation condition
- `allowed_tools`: expected tool surface
- `output_format`: default response format

## Response contract
All subagents must use the "Findings / Recommendations / Proposed edits / Open Questions / Confidence" structure.
