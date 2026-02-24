@isTest
private class flWTRLiveEventControllerTest {

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

        List<Event_Details__c> eventsToInsert = new List<Event_Details__c>();

        // 2. Create "Nearby" Open .Event (Target for Geo Match)
        // Set dates so Surveys_Open__c evaluates to TRUE
        eventsToInsert.add(new Event_Details__c(
            Name = 'SF Bay Event',
            EventCode__c = 'WTR26SF',
            Stage__c = 'Planning',
            Conference_Location__c = venue.Id,
            Hotel_Location__c = venue.Id,
            Start_Date__c = Date.today(),           // Active
            End_Date__c = Date.today().addDays(3),  // Active
            Event_Geo__Latitude__s = 37.7749, 
            Event_Geo__Longitude__s = -122.4194
        ));

        // 3. Create "Far Away" Open Event (NY)
        // Set dates so Surveys_Open__c evaluates to TRUE
        eventsToInsert.add(new Event_Details__c(
            Name = 'NY Event',
            EventCode__c = 'WTR26NY',
            Stage__c = 'Planning',
            Conference_Location__c = venue.Id,
            Hotel_Location__c = venue.Id,
            Start_Date__c = Date.today(),           // Active
            End_Date__c = Date.today().addDays(3),  // Active
            Event_Geo__Latitude__s = 40.7128, 
            Event_Geo__Longitude__s = -74.0060
        ));

        // 4. Create Closed Event (Nearby)
        // Set dates so Surveys_Open__c evaluates to FALSE (Dates in the past)
        eventsToInsert.add(new Event_Details__c(
            Name = 'Closed SF Event',
            EventCode__c = 'WTR26SFOLD',
            Stage__c = 'Complete',
            Conference_Location__c = venue.Id,
            Hotel_Location__c = venue.Id,
            Start_Date__c = Date.today().addDays(-10), // Past
            End_Date__c = Date.today().addDays(-1),    // Past
            Event_Geo__Latitude__s = 37.7749, 
            Event_Geo__Longitude__s = -122.4194
        ));

        insert eventsToInsert;
    }

    @isTest
    static void testGetRelevantEvents_GeoMatch() {
        // Test Logic: User is very close to the SF Event
        Decimal userLat = 37.7750; // Slightly different but within 1 mile of 37.7749
        Decimal userLong = -122.4195;

        Test.startTest();
        List<Event_Details__c> results = flWTRLiveEventController.getRelevantEvents(userLat, userLong);
        Test.stopTest();

        // Assertion: Should find exactly 1 record (The SF Event)
        // It should filter out the NY event (too far) and the Closed SF event (dates in past)
        System.assertEquals(1, results.size(), 'Should return exactly 1 event found via Geolocation');
        System.assertEquals('SF Bay Event', results[0].Name, 'Should identify the correct nearby event');
    }

    @isTest
    static void testGetRelevantEvents_NullCoordinates() {
        // Test Logic: User provides no location data (fallback to list)
        Test.startTest();
        List<Event_Details__c> results = flWTRLiveEventController.getRelevantEvents(null, null);
        Test.stopTest();

        // Assertion: Should return ALL Open events (SF + NY)
        System.assertEquals(2, results.size(), 'Should return all open events when coordinates are null');
        
        // Ensure the closed event is NOT included
        for(Event_Details__c evt : results) {
            System.assertNotEquals('Closed SF Event', evt.Name, 'Closed events should not be returned');
        }
    }

    @isTest
    static void testGetRelevantEvents_NoMatchNearby() {
        // Test Logic: User is in a location with no events (e.g., London)
        Decimal userLat = 51.5072;
        Decimal userLong = 0.1276;

        Test.startTest();
        List<Event_Details__c> results = flWTRLiveEventController.getRelevantEvents(userLat, userLong);
        Test.stopTest();

        // Assertion: Should fallback to returning ALL Open events
        System.assertEquals(2, results.size(), 'Should return fallback list when no single event is found nearby');
    }
}