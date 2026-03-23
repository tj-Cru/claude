@isTest
private class flEventRecordSharingActionTest {
  @testSetup
  static void setupData() {
    // Create a Public Group
    Group testGroup = new Group(Name = 'Test Event Group', Type = 'Regular');
    insert testGroup;
  }

  @isTest
  static void testShareRecords() {
    Group g = [SELECT Id FROM Group WHERE Name = 'Test Event Group' LIMIT 1];

    // Create Venue Account
    Id businessAccountRtId = Schema.SObjectType.Account.getRecordTypeInfosByDeveloperName()
      .get('Business_Account')
      .getRecordTypeId();
    Account venue = new Account(
      Name = 'Test Venue',
      RecordTypeId = businessAccountRtId
    );
    insert venue;

    // Create Event with Public Group ID
    Event_Details__c evt = new Event_Details__c(
      Name = 'Test Sharing Event',
      Stage__c = 'Planning',
      Conference_Location__c = venue.Id,
      Public_Group__c = g.Id
    );
    insert evt;

    // Create Registration (Share_Id__c should be null initially)
    Registration__c reg = new Registration__c(
      Event_Detail__c = evt.Id,
      Registration_Status__c = 'C - Confirmed',
      Share_Id__c = null
    );
    insert reg;

    // Create Survey Response (Share_Id__c should be null initially)
    Survey_Response__c survey = new Survey_Response__c(
      Event_Detail__c = evt.Id,
      Type__c = 'Question',
      Question__c = 'Test?',
      Share_Id__c = null
    );
    insert survey;

    // Prepare Request
    flEventRecordSharingAction.Request req = new flEventRecordSharingAction.Request();
    req.eventId = evt.Id;
    List<flEventRecordSharingAction.Request> reqList = new List<flEventRecordSharingAction.Request>();
    reqList.add(req);

    Test.startTest();
    // Run Action and Capture Response
    List<flEventRecordSharingAction.Response> results = flEventRecordSharingAction.shareRecords(
      reqList
    );
    Test.stopTest();

    // --- VERIFICATIONS ---

    // 1. Verify Output Counts
    System.assertEquals(1, results.size(), 'Should return one response object');
    System.assertEquals(
      1,
      results[0].registrationShareCount,
      'Should report 1 Registration share created'
    );
    System.assertEquals(
      1,
      results[0].surveyShareCount,
      'Should report 1 Survey share created'
    );

    // 2. Verify Registration Share and Field Update
    Registration__c updatedReg = [
      SELECT Id, Share_Id__c
      FROM Registration__c
      WHERE Id = :reg.Id
    ];
    System.assertNotEquals(
      null,
      updatedReg.Share_Id__c,
      'Registration Share_Id__c should be populated'
    );

    List<Registration__Share> regShares = [
      SELECT Id
      FROM Registration__Share
      WHERE ParentId = :reg.Id AND UserOrGroupId = :g.Id AND RowCause = 'Manual'
    ];
    System.assertEquals(
      1,
      regShares.size(),
      'Should have 1 Registration share with Manual reason'
    );

    // 3. Verify Survey Share and Field Update
    Survey_Response__c updatedSurvey = [
      SELECT Id, Share_Id__c
      FROM Survey_Response__c
      WHERE Id = :survey.Id
    ];
    System.assertNotEquals(
      null,
      updatedSurvey.Share_Id__c,
      'Survey Share_Id__c should be populated'
    );

    List<Survey_Response__Share> surveyShares = [
      SELECT Id
      FROM Survey_Response__Share
      WHERE
        ParentId = :survey.Id
        AND UserOrGroupId = :g.Id
        AND RowCause = 'Manual'
    ];
    System.assertEquals(
      1,
      surveyShares.size(),
      'Should have 1 Survey share with Manual reason'
    );
  }
}
