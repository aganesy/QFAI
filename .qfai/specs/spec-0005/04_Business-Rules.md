# 04 Business Rules

## BR-0005-0001: Report Reads Validate Output

- `qfai report` reads validate output and renders Markdown or JSON summaries.

## BR-0005-0002: Prototyping Section Reflects Current Posture

- The report may include a prototyping section.
- That section must describe screenshot / HTML evidence readiness, validator findings, and rerun guidance.
- It must not instruct users to run `qfai prototyping`.

## BR-0005-0003: Recover Guidance

- When prototyping evidence is incomplete, recover guidance points to rerunning `/qfai-prototyping`.
- Missing screenshot/HTML evidence is treated as a rerun condition, not as an optional note.

## BR-0005-0004: Legacy Artifact Reading

- If legacy prototyping artifacts are present, report may summarize them.
- Legacy artifact support must not change the public interface posture.
