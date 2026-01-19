# prompts/

SSOT prompt bodies used by tool-specific custom prompt definitions.

Rule:

- Tool-specific wrappers should be thin.
- They should instruct the agent to read the corresponding file here and follow it.

Files:

- qfai-discuss.md (optional)
- qfai-configure.md (run after init; updates steering + qfai.config.yaml testFileGlobs; outputs updated YAML + validation checklist)
- qfai-require.md
- qfai-spec.md
- qfai-scenario-test.md
- qfai-unit-test.md
- qfai-implement.md
- qfai-verify.md
