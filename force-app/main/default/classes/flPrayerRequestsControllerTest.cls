@isTest
private class flPrayerRequestsControllerTest {

    @TestSetup
    static void makeData() {
        // 1 Create Account (Venue)
        Id businessAccountRtId = Schema.SObjectType.Account.getRecordTypeInfosByDeveloperName()
            .get('Business_Account').getRecordTypeId();
            
        Account venue = new Account(
            Name = 'Test Venue',
            RecordTypeId = businessAccountRtId,
            Type = 'WTR Venue'
        );
        insert venue;

        // 2. Create Event
        Event_Details__c evt = new Event_Details__c(
            Name = 'Test Event',
            EventCode__c = 'WTR26PRAY',
            Stage__c = 'Planning',
            Conference_Location__c = venue.Id,
            Hotel_Location__c = venue.Id,
            Start_Date__c = Date.today(),
            End_Date__c = Date.today().addDays(3)
        );
        insert evt;

        // 3. Create User context (Current User)
        User testUser = [SELECT Id FROM User WHERE Id = :UserInfo.getUserId()];

        // 4. Create Survey Responses
        List<Survey_Response__c> responses = new List<Survey_Response__c>();
        
        // Record 1: Valid Prayer Request
        responses.add(new Survey_Response__c(
            Event_Detail__c = evt.Id,
            Type__c = 'Prayer',
            Prayer_Request__c = 'Please pray for my family.',
            Status__c = 'New',
            OwnerId = testUser.Id
        ));

        // Record 2: Question (Should be ignored by getPrayerRequests)
        responses.add(new Survey_Response__c(
            Event_Detail__c = evt.Id,
            Type__c = 'Question',
            Question__c = 'Where is the bathroom?',
            Status__c = 'New'
        ));

        insert responses;
    }

    @isTest
    static void testGetPrayerRequests() {
        Event_Details__c evt = [SELECT Id FROM Event_Details__c LIMIT 1];

        Test.startTest();
        // Positive Case: Valid Event ID
        List<Survey_Response__c> results = flPrayerRequestsController.getPrayerRequests(evt.Id);
        
        // Negative Case: Null Event ID
        List<Survey_Response__c> emptyResults = flPrayerRequestsController.getPrayerRequests(null);
        Test.stopTest();

        // Assertions
        System.assertEquals(1, results.size(), 'Should return exactly 1 record of type Prayer');
        System.assertEquals('Please pray for my family.', results[0].Prayer_Request__c, 'Should retrieve the correct prayer text');
        System.assertEquals(0, emptyResults.size(), 'Should return empty list for null input');
    }

    @isTest
    static void testClaimPrayerRequestSuccess() {
        // Fetch the prayer request created in setup
        Survey_Response__c req = [SELECT Id, Status__c, OwnerId FROM Survey_Response__c WHERE Type__c = 'Prayer' LIMIT 1];
        
        Test.startTest();
        flPrayerRequestsController.claimPrayerRequest(req.Id);
        Test.stopTest();

        // Verify Update
        Survey_Response__c updatedReq = [SELECT Id, Status__c, OwnerId FROM Survey_Response__c WHERE Id = :req.Id];
        
        System.assertEquals('Pending', updatedReq.Status__c, 'Status should be updated to Pending');
        System.assertEquals(UserInfo.getUserId(), updatedReq.OwnerId, 'Owner should be the current user');
    }

    @isTest
    static void testClaimPrayerRequestException() {
        Test.startTest();
        try {
            // Passing NULL causes an error when 'update' is called in the controller
            flPrayerRequestsController.claimPrayerRequest(null);
            
            // If we get here, the exception wasn't thrown/handled as expected
            System.assert(false, 'Should have thrown an AuraHandledException');
        } catch (Exception e) {
            // Verify we caught the specific type of exception the controller throws
            System.assert(e instanceof AuraHandledException, 'Should throw AuraHandledException');
        }
        Test.stopTest();
    }
}