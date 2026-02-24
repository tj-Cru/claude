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
            .get('Business_Account').getRecordTypeId();
            
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
        responses.add(new Survey_Response__c(
            Event_Detail__c = evt.Id,
            Type__c = 'Question',
            Question__c = 'Test Question?',
            Status__c = 'New',
            OwnerId = testUser.Id
        ));

        // Record 2: Prayer Request
        responses.add(new Survey_Response__c(
            Event_Detail__c = evt.Id,
            Type__c = 'Prayer',
            Prayer_Request__c = 'Test Prayer',
            Status__c = 'New'
        ));

        insert responses;
    }

    @isTest
    static void testGetQuestions() {
        Event_Details__c evt = [SELECT Id FROM Event_Details__c LIMIT 1];

        Test.startTest();
        List<Survey_Response__c> results = flQuestionsController.getQuestions(evt.Id);
        List<Survey_Response__c> emptyResults = flQuestionsController.getQuestions(null);
        Test.stopTest();

        System.assertEquals(1, results.size(), 'Should return exactly 1 record of type Question');
        System.assertEquals('Test Question?', results[0].Question__c, 'Should retrieve the correct question text');
        System.assertEquals(0, emptyResults.size(), 'Should return empty list for null input');
    }

    @isTest
    static void testGetFeedback() {
        Event_Details__c evt = [SELECT Id FROM Event_Details__c LIMIT 1];

        Test.startTest();
        // This method queries ALL survey response types (Question, Prayer, etc.)
        List<Survey_Response__c> results = flQuestionsController.getFeedback(evt.Id);
        List<Survey_Response__c> emptyResults = flQuestionsController.getFeedback(null);
        Test.stopTest();

        // Assertion: We created 2 records in makeData (1 Question, 1 Prayer)
        // getFeedback does not filter by type, so it should return both.
        System.assertEquals(2, results.size(), 'Should return all survey responses (Questions + Prayer) for the event');
        System.assertEquals(0, emptyResults.size(), 'Should return empty list for null input');
    }

    @isTest
    static void testClaimQuestionSuccess() {
        Survey_Response__c q = [SELECT Id, Status__c, OwnerId FROM Survey_Response__c WHERE Type__c = 'Question' LIMIT 1];
        
        Test.startTest();
        flQuestionsController.claimQuestion(q.Id);
        Test.stopTest();

        Survey_Response__c updatedQ = [SELECT Id, Status__c, OwnerId FROM Survey_Response__c WHERE Id = :q.Id];
        
        System.assertEquals('Completed', updatedQ.Status__c, 'Status should be updated to Completed');
        System.assertEquals(UserInfo.getUserId(), updatedQ.OwnerId, 'Owner should be the current user');
    }

    @isTest
    static void testClaimQuestionException() {
        Test.startTest();
        try {
            flQuestionsController.claimQuestion(null);
            System.assert(false, 'Should have thrown an AuraHandledException');
        } catch (Exception e) {
            System.assert(e instanceof AuraHandledException, 'Should throw AuraHandledException');
        }
        Test.stopTest();
    }
}