# 03 Initiative

## Initiative ID

- INIT-0001

## Scope Boundary

### In Scope

- Create order drafts.
- Prevent duplicate customer plus item draft submissions.
- Return user-visible error details for duplicates.

### Out of Scope

- Final order confirmation.
- Payment and fulfillment workflows.

## Assumptions

- Customer identity is already available in the UI.
- Item code catalog validation is handled by upstream systems.

## Risks

| Risk                     | Impact                | Mitigation                              |
| ------------------------ | --------------------- | --------------------------------------- |
| Duplicate race condition | inconsistent outcomes | DB uniqueness and API conflict handling |
| Unclear duplicate error  | support load          | explicit error code and message         |
