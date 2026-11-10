# US-0001-0294: Review a finished session from its local transcript

## User Story

As an adopter maintainer, I want QFAI to count what my agent's own transcript of a finished session shows, and the session review to turn those counts into itemised changes I approve one by one, so that the rules this project runs with improve from evidence and nothing changes without my yes.

## Non-goals

- Sending a transcript, or anything read from one, anywhere: the command reads local files only.
- Quoting message text, a snippet or a tool output in the report.
- A change applied without my approval, or a change to a file QFAI ships made in my project.
- A hook, a schedule or a background process that runs the review.
