# US-0001-0235: Redirect observable exploratory searches through hooks

## User Story

As a project maintainer, I want hooks to redirect exploration to graph CLIs and allow scoped ordinary search when the AI judges that a graph cannot answer, so that agents can continue without human search approval while known reads and quality checks remain usable.

## Non-goals

- Complete detection inside arbitrary scripts, aliases or continuing shell input.
- Changing a notification reminder into a denial hook.
- Graph queries or preparation inside denial hooks.
