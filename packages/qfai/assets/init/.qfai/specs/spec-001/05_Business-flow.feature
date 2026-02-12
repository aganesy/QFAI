Feature: Business flow for order draft creation

  Scenario: Create draft in normal case
    Given an operator opens the order draft form
    When the operator submits customer and item values
    Then the system stores a new draft and returns success

  Scenario: Duplicate submission
    Given an order draft already exists for the same customer and item
    When the operator submits the same values again
    Then the system rejects the request with duplicate feedback

