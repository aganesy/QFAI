# 04 Business Rules

## BR-0005-0001: Report Reads Validate Output

- AC-Refs: AC-0005-0001, AC-0005-0002, AC-0005-0003, AC-0005-0004, AC-0005-0005, AC-0005-0006, AC-0005-0007, AC-0005-0008
- `qfai report` reads validate output and renders Markdown or JSON summaries.

## BR-0005-0002: Prototyping Section Reflects Current Posture

- AC-Refs: AC-0005-0009, AC-0005-0010
- The report may include a prototyping section.
- That section must describe screenshot / HTML evidence readiness, validator findings, and rerun guidance.
- It must not instruct users to run `qfai prototyping`.

## BR-0005-0003: Recover Guidance

- AC-Refs: AC-0005-0009, AC-0005-0010
- When prototyping evidence is incomplete, recover guidance points to rerunning `/qfai-prototyping`.
- Missing screenshot/HTML evidence is treated as a rerun condition, not as an optional note.

## BR-0005-0004: Legacy Artifact Reading

- AC-Refs: AC-0005-0009
- If legacy prototyping artifacts are present, report may summarize them.
- Legacy artifact support must not change the public interface posture.
