# Test Cases

## Case Table

| TC-ID        | AC-Refs      | EX-Ref       | Steps                             | Expected                               |
| ------------ | ------------ | ------------ | --------------------------------- | -------------------------------------- |
| TC-0001-0001 | AC-0001-0001 | EX-0001-0001 | Submit a valid order              | Receipt contains the order ID          |
| TC-0001-0002 | AC-0001-0002 | EX-0001-0002 | Submit an empty order             | Receipt is absent                      |
| TC-0001-0003 | AC-0001-0001 | EX-0001-0003 | Submit the same valid order twice | Both receipts identify accepted orders |
