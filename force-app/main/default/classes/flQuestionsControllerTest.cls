@isTest
private class flQuestionsControllerTest {
  @TestSetup
  static void makeData() {
    // 1. Create Public Group (Setup Object) - Run as current user to avoid Mixed DML
    Group testGroup = new Group(Name = 'Test Event Group', Type = 'Regular');
    System.runAs(new User(Id = UserInfo.getUserId())) {
      insert testGroup;
    }

    // 2 Create Account (Venue)
    Id businessAccountRtId = Schema.SObjectType.Account.getRecordTypeInfosByDeveloperName()
      .get('Business_Account')
      .getRecordTypeId();

    Account venue = new Account(
      Name = 'Test Venue',
      RecordTypeId = businessAccountRtId,
      Type = 'WTR Venue'
    );
    insert venue;

    // 3. Create Event Area
    Event_Area_Code__c area = new Event_Area_Code__c(
      Name = 'A-TTT',
      Event_Area_ID__c = 'A-TET',
      Type__c = 'Area'
    );
    insert area;

    // 4. Create Event
    Event_Details__c evt = new Event_Details__c(
      Name = 'Test Event',
      EventCode__c = 'WTR26TES1',
      Stage__c = 'Planning',
      Conference_Location__c = venue.Id,
      Hotel_Location__c = venue.Id,
      Public_Group__c = testGroup.Id // Assign Group
    );
    insert evt;

    // 5. Create User context (Current User)
    User testUser = [SELECT Id FROM User WHERE Id = :UserInfo.getUserId()];

    // 6. Create Survey Responses
    List<Survey_Response__c> responses = new List<Survey_Response__c>();

    // Record 1: Target Question
    responses.add(
      new Survey_Response__c(
        Event_Detail__c = evt.Id,
        Type__c = 'Question',
        Question__c = 'Test Question?',
        Status__c = 'New',
        OwnerId = testUser.Id
      )
    );

    // Record 2: Prayer Request
    responses.add(
      new Survey_Response__c(
        Event_Detail__c = evt.Id,
        Type__c = 'Prayer',
        Prayer_Request__c = 'Test Prayer',
        Status__c = 'New'
      )
    );

    insert responses;
  }

  @isTest
  static void testGetQuestions() {
    Event_Details__c evt = [SELECT Id FROM Event_Details__c LIMIT 1];

    Test.startTest();
    List<Survey_Response__c> results = flQuestionsController.getQuestions(
      evt.Id
    );
    List<Survey_Response__c> emptyResults = flQuestionsController.getQuestions(
      null
    );
    Test.stopTest();

    System.assertEquals(
      1,
      results.size(),
      'Should return exactly 1 record of type Question'
    );
    System.assertEquals(
      'Test Question?',
      results[0].Question__c,
      'Should retrieve the correct question text'
    );
    System.assertEquals(
      0,
      emptyResults.size(),
      'Should return empty list for null input'
    );
  }

  @isTest
  static void testGetFeedback() {
    Event_Details__c evt = [SELECT Id FROM Event_Details__c LIMIT 1];

    Test.startTest();
    // This method queries ALL survey response types (Question, Prayer, etc.)
    List<Survey_Response__c> results = flQuestionsController.getFeedback(
      evt.Id
    );
    List<Survey_Response__c> emptyResults = flQuestionsController.getFeedback(
      null
    );
    Test.stopTest();

    // Assertion: We created 2 records in makeData (1 Question, 1 Prayer)
    // getFeedback does not filter by type, so it should return both.
    System.assertEquals(
      2,
      results.size(),
      'Should return all survey responses (Questions + Prayer) for the event'
    );
    System.assertEquals(
      0,
      emptyResults.size(),
      'Should return empty list for null input'
    );
  }

  @isTest
  static void testClaimQuestionSuccess() {
    Survey_Response__c q = [
      SELECT Id, Status__c, Claimed_By__c
      FROM Survey_Response__c
      WHERE Type__c = 'Question'
      LIMIT 1
    ];

    Test.startTest();
    flQuestionsController.claimQuestion(q.Id);
    Test.stopTest();

    Survey_Response__c updatedQ = [
      SELECT Id, Status__c, Claimed_By__c
      FROM Survey_Response__c
      WHERE Id = :q.Id
    ];

    System.assertEquals(
      'Pending',
      updatedQ.Status__c,
      'Status should be updated to Pending'
    );
    System.assertEquals(
      UserInfo.getUserId(),
      updatedQ.Claimed_By__c,
      'Claimed_By__c should be the current user'
    );
  }

  @isTest
  static void testGetExportDataQuestions() {
    Event_Details__c evt = [SELECT Id FROM Event_Details__c LIMIT 1];

    Test.startTest();
    List<Survey_Response__c> results = flQuestionsController.getExportData(
      evt.Id,
      'Question',
      'All'
    );
    Test.stopTest();

    System.assertEquals(
      1,
      results.size(),
      'Should return exactly 1 Question record for export'
    );
    System.assertEquals(
      'Question',
      results[0].Type__c,
      'Returned record should be of type Question'
    );
    // Verify enriched fields are queryable (non-null access)
    System.assertNotEquals(
      null,
      results[0].Name,
      'Name field should be populated'
    );
  }

  @isTest
  static void testGetExportDataPrayer() {
    Event_Details__c evt = [SELECT Id FROM Event_Details__c LIMIT 1];

    Test.startTest();
    List<Survey_Response__c> results = flQuestionsController.getExportData(
      evt.Id,
      'Prayer',
      'All'
    );
    Test.stopTest();

    System.assertEquals(
      1,
      results.size(),
      'Should return exactly 1 Prayer record for export'
    );
    System.assertEquals(
      'Prayer',
      results[0].Type__c,
      'Returned record should be of type Prayer'
    );
  }

  @isTest
  static void testGetExportDataWithStatusFilter() {
    Event_Details__c evt = [SELECT Id FROM Event_Details__c LIMIT 1];

    Test.startTest();
    // Filter by 'New' status — test data has Status__c = 'New'
    List<Survey_Response__c> results = flQuestionsController.getExportData(
      evt.Id,
      'Question',
      'New'
    );
    // Filter by a status that has no records
    List<Survey_Response__c> noResults = flQuestionsController.getExportData(
      evt.Id,
      'Question',
      'Responded'
    );
    Test.stopTest();

    System.assertEquals(
      1,
      results.size(),
      'Should return 1 Question with New status'
    );
    System.assertEquals(
      0,
      noResults.size(),
      'Should return 0 for non-matching status'
    );
  }

  @isTest
  static void testGetExportDataNullEventId() {
    Test.startTest();
    List<Survey_Response__c> results = flQuestionsController.getExportData(
      null,
      'Question',
      'All'
    );
    Test.stopTest();

    System.assertEquals(
      0,
      results.size(),
      'Should return empty list for null event ID'
    );
  }

  @isTest
  static void testGetExportDataNullFilterType() {
    Event_Details__c evt = [SELECT Id FROM Event_Details__c LIMIT 1];

    Test.startTest();
    List<Survey_Response__c> results = flQuestionsController.getExportData(
      evt.Id,
      null,
      'All'
    );
    Test.stopTest();

    System.assertEquals(
      0,
      results.size(),
      'Should return empty list for null filter type'
    );
  }

  @isTest
  static void testClaimQuestionException() {
    Test.startTest();
    try {
      flQuestionsController.claimQuestion(null);
      System.assert(false, 'Should have thrown an AuraHandledException');
    } catch (Exception e) {
      System.assert(
        e instanceof AuraHandledException,
        'Should throw AuraHandledException'
      );
    }
    Test.stopTest();
  }

  @isTest
  static void testGetQuestionsIncludesSortOrder() {
    Event_Details__c evt = [SELECT Id FROM Event_Details__c LIMIT 1];
    Survey_Response__c q = [
      SELECT Id
      FROM Survey_Response__c
      WHERE Type__c = 'Question'
      LIMIT 1
    ];
    q.Sort_Order__c = 5;
    update q;

    Test.startTest();
    List<Survey_Response__c> results = flQuestionsController.getQuestions(
      evt.Id
    );
    Test.stopTest();

    System.assertEquals(1, results.size(), 'Should return 1 question');
    System.assertEquals(
      5,
      results[0].Sort_Order__c,
      'Sort_Order__c should be returned by query'
    );
  }

  @isTest
  static void testUpdateSortOrderSuccess() {
    // The test data question is owned by current user AND needs to be claimed
    Survey_Response__c rec = [
      SELECT Id
      FROM Survey_Response__c
      WHERE Type__c = 'Question'
      LIMIT 1
    ];
    rec.Claimed_By__c = UserInfo.getUserId();
    update rec;

    String updates = JSON.serialize(
      new List<Map<String, Object>>{
        new Map<String, Object>{ 'id' => rec.Id, 'sortOrder' => 10 }
      }
    );

    Test.startTest();
    flQuestionsController.updateSortOrder(updates);
    Test.stopTest();

    Survey_Response__c updated = [
      SELECT Sort_Order__c
      FROM Survey_Response__c
      WHERE Id = :rec.Id
    ];
    System.assertEquals(
      10,
      updated.Sort_Order__c,
      'Sort order should be updated to 10'
    );
  }

  @isTest
  static void testUpdateSortOrderSecurityCheck() {
    // Record NOT claimed by running user should not be reorderable
    Survey_Response__c otherRecord = [
      SELECT Id, Claimed_By__c
      FROM Survey_Response__c
      WHERE Type__c = 'Prayer'
      LIMIT 1
    ];
    // Claimed_By__c is null — running user did not claim it
    System.assertEquals(
      null,
      otherRecord.Claimed_By__c,
      'Record should not be claimed'
    );

    String updates = JSON.serialize(
      new List<Map<String, Object>>{
        new Map<String, Object>{ 'id' => otherRecord.Id, 'sortOrder' => 99 }
      }
    );

    Test.startTest();
    flQuestionsController.updateSortOrder(updates);
    Test.stopTest();

    Survey_Response__c unchanged = [
      SELECT Sort_Order__c
      FROM Survey_Response__c
      WHERE Id = :otherRecord.Id
    ];
    System.assertEquals(
      null,
      unchanged.Sort_Order__c,
      'Should not update record not claimed by current user'
    );
  }

  @isTest
  static void testUpdateSortOrderNullInput() {
    Test.startTest();
    flQuestionsController.updateSortOrder(null);
    flQuestionsController.updateSortOrder('');
    Test.stopTest();
    // No exception means pass
  }
}
