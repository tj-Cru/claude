@isTest
private class flWTRGuestLocationControllerTest {

    @testSetup
    static void setup() {
        // 1. Setup Venue Account
        Id businessAccountRtId = Schema.SObjectType.Account.getRecordTypeInfosByDeveloperName()
            .get('Business_Account').getRecordTypeId();

        Account loc = new Account(
            Name = 'Test Location',
            RecordTypeId = businessAccountRtId
        );
        insert loc;

        // 2. Setup Event
        Event_Details__c event = new Event_Details__c(
            Name = 'Test Event',
            Event_Geo__Latitude__s = 37.7749,
            Event_Geo__Longitude__s = -122.4194,
            Stage__c = 'Planning', 
            Conference_Location__c = loc.Id, 
            Start_Date__c = Date.today().addDays(-1),
            End_Date__c = Date.today().addDays(1)
        );
        insert event;

        // 3. Setup Contacts
        List<Contact> contacts = new List<Contact>();
        contacts.add(new Contact(FirstName = 'John', LastName = 'Doe', MailingPostalCode = '12345'));
        contacts.add(new Contact(FirstName = 'Jane', LastName = 'Doe', MailingPostalCode = '12345'));
        contacts.add(new Contact(FirstName = 'Sam',  LastName = 'Smith', MailingPostalCode = '99999'));
        insert contacts;

        // 4. Setup Registrations
        List<Registration__c> regs = new List<Registration__c>();
        regs.add(new Registration__c(Event_Detail__c = event.Id, Contact__c = contacts[0].Id));
        regs.add(new Registration__c(Event_Detail__c = event.Id, Contact__c = contacts[1].Id));
        regs.add(new Registration__c(Event_Detail__c = event.Id, Contact__c = contacts[2].Id));
        insert regs;
    }

    @isTest
    static void testGetOpenSurveyEvents() {
        Test.startTest();
        List<Event_Details__c> results = flWTRGuestLocationController.getOpenSurveyEvents();
        Test.stopTest();
        
        System.assert(!results.isEmpty(), 'Should return at least one open event');
        System.assertEquals('Test Event', results[0].Name);
        System.assertNotEquals(null, results[0].Event_Geo__Latitude__s, 'Latitude should be returned');
        System.assertNotEquals(null, results[0].Event_Geo__Longitude__s, 'Longitude should be returned');
    }

    @isTest
    static void testCreateQuestionSurvey() {
        Event_Details__c evt = [SELECT Id FROM Event_Details__c LIMIT 1];

        // 1. Positive Test
        String res = flWTRGuestLocationController.createQuestionSurvey(evt.Id, 'What time is lunch?', 'Male');
        System.assertEquals('success', res, 'Should return success');

        Staging_Survey__c survey = [SELECT Question__c, Type__c, Gender__c FROM Staging_Survey__c WHERE Type__c = 'Question' LIMIT 1];
        System.assertEquals('What time is lunch?', survey.Question__c);
        System.assertEquals('Male', survey.Gender__c);

        // 2. Validation Test (Missing Params)
        res = flWTRGuestLocationController.createQuestionSurvey(null, 'Question', null);
        System.assert(res.startsWith('Error'), 'Should fail when EventId is missing');
    }

    @isTest
    static void testCreateQuestionSurvey_Exception() {
        // Exception Test: Pass a string that is too long for the ID field to force DML error
        Test.startTest();
        String longId = 'a'.repeat(300); 
        String res = flWTRGuestLocationController.createQuestionSurvey(longId, 'Question text', 'Male');
        Test.stopTest();
        
        System.assert(res.startsWith('Error'), 'Should return generic error from catch block due to invalid ID');
    }

    @isTest
    static void testCreatePrayerSurvey() {
        Event_Details__c evt = [SELECT Id FROM Event_Details__c LIMIT 1];

        // 1. Positive Test
        String res = flWTRGuestLocationController.createPrayerSurvey(evt.Id, 'Pray for peace');
        System.assertEquals('success', res, 'Should return success');

        Staging_Survey__c survey = [SELECT Prayer_Request__c, Type__c FROM Staging_Survey__c WHERE Type__c = 'Prayer' LIMIT 1];
        System.assertEquals('Pray for peace', survey.Prayer_Request__c);

        // 2. Validation Test
        res = flWTRGuestLocationController.createPrayerSurvey(evt.Id, null);
        System.assert(res.startsWith('Error'), 'Should fail when text is missing');
    }

    @isTest
    static void testCreatePrayerSurvey_Exception() {
        // Exception Test: Pass a string that is too long
        Test.startTest();
        String longId = 'a'.repeat(300); 
        String res = flWTRGuestLocationController.createPrayerSurvey(longId, 'Prayer text');
        Test.stopTest();
        
        System.assert(res.startsWith('Error'), 'Should return generic error from catch block due to invalid ID');
    }

    @isTest
    static void testFindRegistrations() {
        Event_Details__c evt = [SELECT Id FROM Event_Details__c LIMIT 1];

        // 1. Multi Match
        flWTRGuestLocationController.RegFindResult result = flWTRGuestLocationController.findRegistrations(evt.Id, 'Doe', '12345');
        System.assertEquals('MULTI', result.status);
        System.assert(result.choices.size() >= 2);

        // 2. Single Match
        result = flWTRGuestLocationController.findRegistrations(evt.Id, 'Smith', '99999');
        System.assertEquals('SINGLE', result.status);
        
        // 3. No Match
        result = flWTRGuestLocationController.findRegistrations(evt.Id, 'Nobody', '00000');
        System.assertEquals('NONE', result.status);

        // 4. Missing Params
        result = flWTRGuestLocationController.findRegistrations(null, 'Doe', '12345');
        System.assertEquals('NONE', result.status);
    }

    @isTest
    static void testGetRegistrationFirstName() {
        Registration__c reg = [SELECT Id, First_Name__c FROM Registration__c LIMIT 1];
        
        // Positive
        String firstName = flWTRGuestLocationController.getRegistrationFirstName(reg.Id);
        System.assertEquals(reg.First_Name__c, firstName);
        
        // Null Check (Missing Param)
        String nullRes = flWTRGuestLocationController.getRegistrationFirstName(null);
        System.assertEquals(null, nullRes);
    }

    @isTest
    static void testGetRegistrationFirstName_Exception() {
        // Exception Test: Pass an invalid ID format to force QueryException in the catch block
        Test.startTest();
        String res = flWTRGuestLocationController.getRegistrationFirstName('INVALID_ID');
        Test.stopTest();

        System.assertEquals(null, res, 'Should return null when Exception is caught');
    }

    @isTest
    static void testCreateOnenessSurvey() {
        Event_Details__c evt = [SELECT Id FROM Event_Details__c LIMIT 1];
        Registration__c reg = [SELECT Id FROM Registration__c WHERE Contact__r.LastName = 'Doe' LIMIT 1];

        // Positive
        String res = flWTRGuestLocationController.createOnenessSurvey(evt.Id, reg.Id, true, false, false);
        System.assertEquals('success', res);
        
        Staging_Survey__c survey = [SELECT Salvation__c, Attendee_Id__c FROM Staging_Survey__c WHERE Type__c = 'Oneness' AND Salvation__c = true LIMIT 1];
        System.assertEquals(reg.Id, survey.Attendee_Id__c);
    }

    @isTest
    static void testCreateOnenessSurvey_Validation() {
        // Validation Test (Missing Params)
        Test.startTest();
        String res = flWTRGuestLocationController.createOnenessSurvey(null, null, true, false, false);
        Test.stopTest();

        System.assertEquals('Error: Event or Registration is missing.', res);
    }

    @isTest
    static void testCreateOnenessSurvey_Exception() {
        Event_Details__c evt = [SELECT Id FROM Event_Details__c LIMIT 1];
        
        Test.startTest();
        // Exception Test: Invalid ID format forces Exception in SOQL
        String res = flWTRGuestLocationController.createOnenessSurvey(evt.Id, 'INVALID_ID', true, false, false);
        Test.stopTest();
        
        System.assert(res.startsWith('Error'), 'Should catch exception');
    }

    @isTest
    static void testCreateMissionSurvey() {
        Event_Details__c evt = [SELECT Id FROM Event_Details__c LIMIT 1];
        Registration__c reg = [SELECT Id FROM Registration__c WHERE Contact__r.LastName = 'Doe' LIMIT 1];

        // Positive
        String res = flWTRGuestLocationController.createMissionSurvey(evt.Id, reg.Id, true, false, true, true);
        System.assertEquals('success', res);

        Staging_Survey__c survey = [SELECT Invite__c, Mission_Other__c FROM Staging_Survey__c WHERE Type__c = 'Mission' LIMIT 1];
        System.assertEquals(true, survey.Invite__c);
        System.assertEquals(true, survey.Mission_Other__c);
    }

    @isTest
    static void testCreateMissionSurvey_Validation() {
        Event_Details__c evt = [SELECT Id FROM Event_Details__c LIMIT 1];
        // Validation Error
        String res = flWTRGuestLocationController.createMissionSurvey(evt.Id, null, true, false, true, true);
        System.assert(res.startsWith('Error'));
    }

    @isTest
    static void testCreateMissionSurvey_Exception() {
        Event_Details__c evt = [SELECT Id FROM Event_Details__c LIMIT 1];
        
        Test.startTest();
        // Exception Test: Invalid ID format forces Exception in SOQL
        String res = flWTRGuestLocationController.createMissionSurvey(evt.Id, 'INVALID_ID', true, false, true, true);
        Test.stopTest();
        
        System.assert(res.startsWith('Error'), 'Should return generic error from catch block');
    }
}