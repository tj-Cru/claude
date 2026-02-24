@isTest
private class flRegistrationsControllerTest {

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

        // 3. Create Event
        Event_Details__c evt = new Event_Details__c(
            Name = 'Test Event',
            EventCode__c = 'WTR26REG',
            Stage__c = 'Planning',
            Conference_Location__c = venue.Id,
            Hotel_Location__c = venue.Id,
            Start_Date__c = Date.today(),
            End_Date__c = Date.today().addDays(3),
            Public_Group__c = testGroup.Id // Assign Group
        );
        insert evt;


        // 4. Create Contacts
        List<Contact> contacts = new List<Contact>();
        contacts.add(new Contact(FirstName = 'John', LastName = 'Doe', MailingPostalCode = '12345'));
        contacts.add(new Contact(FirstName = 'Jane', LastName = 'Doe', MailingPostalCode = '12345'));
        contacts.add(new Contact(FirstName = 'Aaron', LastName = 'Anderson', MailingPostalCode = '99999'));
        insert contacts;

        // Reg 1: Primary (Husband)
        Registration__c reg1 = new Registration__c(
            Event_Detail__c = evt.Id,
            Contact__c = contacts[0].Id, 
            Registration_Status__c = 'C - Confirmed',
            Registrant_Type__c = 'Couple',
            Registration_Type__c = 'Attendee'
        );
        insert reg1;

        List<Registration__c> additionalRegs = new List<Registration__c>();

        // Reg 2: Spouse (Wife)
        additionalRegs.add(new Registration__c(
            Event_Detail__c = evt.Id,
            Contact__c = contacts[1].Id, 
            Registration_Status__c = 'C - Confirmed',
            Registrant_Type__c = 'Couple',
            Registration_Type__c = 'Attendee'
        ));

        // Reg 3: Single
        // FIX: Changed status to 'C - Confirmed' so it is included in the controller results
        additionalRegs.add(new Registration__c(
            Event_Detail__c = evt.Id,
            Contact__c = contacts[2].Id, 
            Registration_Status__c = 'C - Confirmed', 
            Registration_Type__c = 'Attendee',
            Registrant_Type__c = 'Couple' 
        ));

        insert additionalRegs;
    }

    @isTest
    static void testGetRegistrations() {
        Event_Details__c evt = [SELECT Id FROM Event_Details__c LIMIT 1];

        Test.startTest();
        List<Registration__c> results = flRegistrationsController.getRegistrations(evt.Id);
        Test.stopTest();

        // 1. Assertion: Count
        // Now that the 3rd reg is 'Confirmed', this should return 3
        System.assertEquals(3, results.size(), 'Should return all 3 registrations linked to the event');

        // 2. Assertion: Sorting
        System.assertEquals('Anderson', results[0].Last_Name__c, 'First record should be Anderson (Alphabetical)');
        
        System.assertEquals('Doe', results[1].Last_Name__c);
        System.assertEquals('Jane', results[1].First_Name__c, 'Jane Doe should come before John Doe');
        
        System.assertEquals('Doe', results[2].Last_Name__c);
        System.assertEquals('John', results[2].First_Name__c);
    }

    @isTest
    static void testGetRegistrations_NullId() {
        Test.startTest();
        List<Registration__c> results = flRegistrationsController.getRegistrations(null);
        Test.stopTest();

        System.assertEquals(0, results.size(), 'Should return empty list for null event ID');
    }
}