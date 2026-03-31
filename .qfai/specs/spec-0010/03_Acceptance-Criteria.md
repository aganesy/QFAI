# 03 Acceptance Criteria

## AC-0010-0001: 15-File Pack Completeness

Given a discussion run, when it completes, then all 15 mandatory files (01_Context..14_Review-Request, 99_delta) exist and are populated.

## AC-0010-0002: Inception Deck Mermaid Diagram

Given the Inception Deck, when `02_Inception-Deck.md` is produced, then it contains at least one Mermaid diagram in fenced blocks.

## AC-0010-0003: Story Workshop Mermaid and HTML Mock

Given the Story Workshop, when `03_Story-Workshop.md` is produced, then it contains at least one Mermaid diagram and HTML+CSS mock section for UI stories.

## AC-0010-0004: Example Mapping 6-Perspective Coverage

Given a BR/AC candidate, when Example Mapping runs, then all 6 mandatory perspectives are covered or intentionally skipped with reason.

## AC-0010-0005: OQ Register Zero Open Count

Given discussion completion, when `11_OQ-Register.md` is checked, then `Disposition: open` count is zero.

## AC-0010-0006: OQ Register 11-Column Schema

Given `11_OQ-Register.md`, when it is checked, then all 11 mandatory columns are present (OQ-ID, Title, Gate, Disposition, Owner, Rationale, Options, Recommendation, Next-Decision-Point, Due, Evidence).

## AC-0010-0007: Deferred Metadata 11-Column Schema

Given `13_Deferred.md`, when it is checked, then all 11 mandatory columns are present.

## AC-0010-0008: DDP Design Direction Summary

Given a UI-bearing pack, when `03_Story-Workshop.md` is checked, then it includes Design Direction Summary with all 6 subsections.

## AC-0010-0009: UI-Bearing Sidecar Generation

Given a UI-bearing project, when discussion completes, then all 11 uiux/ sidecar files are generated (partial generation is forbidden).

## AC-0010-0010: RCP Full Roster Execution

Given a review cycle, when RCP runs, then all 12 reviewers execute in order (1-10, then devils-advocate, then pattern-doubler).

## AC-0010-0011: Competitive Reference Registry

Given a UI-bearing pack, when `04_Sources.md` is checked, then it includes 3+ competitive references with adopted_points, rejected_points, and local_translation fields (no placeholders).
