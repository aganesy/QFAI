Feature: Order registration
  @SC-0001 @BR-0001 @SPEC-0001 @UI-0001 @API-0001 @DATA-0001
  Scenario: Register a new order
    Given no order exists for the customer
    When the user submits a new order
    Then the order is created as pending approval
