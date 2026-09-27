# Structure

## Architecture constraints

| ID    | Constraint                                         | Rationale                     | Impact                                         |
| ----- | -------------------------------------------------- | ----------------------------- | ---------------------------------------------- |
| TC-02 | Order records are stored behind the order service. | The service owns its records. | Other modules read orders through the service. |
