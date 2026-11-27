# UI-0001: Graph exploration in the terminal

## Responsibility

Help the person preparing or querying a project graph determine what evidence is available, how far it can be trusted and how to recover when preparation or a query fails.

## Inputs

- The project checkout, its graph tool and analysis readiness, and the intent to prepare or preview preparation.
- For a query, the question, requested scope and available source evidence or reported failure.

## Outcomes

- The person can distinguish planned actions, installed tools and verified analysis, and identify what remains to be configured in this checkout.
- The person can assess the sources and limitations of an answer and identify the next action after a failure.

## Business rules

| BR-ID | Statement | Examples |
| --- | --- | --- |
| BR-UI-0001-0001 | The preparation summary names each tool, runtime readiness and analysis readiness separately; installation is never presented as verified analysis. | EX-0001-0237-01, EX-0001-0237-20, EX-0001-0237-21 |
| BR-UI-0001-0002 | A preparation failure names the failed step and a recovery action and states whether a prior usable installation was retained; an absent document backend is shown as documents-not-ready with the configuration action. | EX-0001-0237-05, EX-0001-0237-14, EX-0001-0237-20, EX-0001-0234-07 |
| BR-UI-0001-0003 | A dry-run displays the proposed tool actions and observed states under a preview title with an explicit no-changes notice; it does not label planned installation as completed. | EX-0001-0237-17 |
| BR-UI-0001-0005 | Graph-query results show the requested scope, its readiness and coverage limits alongside source references, and label inferred relationships separately from facts. Invalid or incomplete arguments and failed queries show the failure cause and concrete recovery; lock contention shows retry and an abandoned lock shows manual recovery without automatic deletion. | EX-0001-0234-13, EX-0001-0234-14, EX-0001-0234-16, EX-0001-0236-15, EX-0001-0236-20 |
