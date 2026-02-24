public without sharing class flWTRLiveEventController {

    @AuraEnabled
    public static List<Event_Details__c> getRelevantEvents(Decimal userLat, Decimal userLong) {
        List<Event_Details__c> events = new List<Event_Details__c>();

        // 1. Attempt to find a SINGLE event within 2 miles if coordinates are provided
        if (userLat != null && userLong != null) {
            events = [
                SELECT Id, Name 
                FROM Event_Details__c 
                WHERE Surveys_Open__c = TRUE 
                AND DISTANCE(Event_Geo__c, GEOLOCATION(:userLat, :userLong), 'mi') < 2
                WITH SECURITY_ENFORCED
                LIMIT 2 
            ];
        }

        // 2. Logic Evaluation
        // If we found exactly 1 nearby event, return it (This triggers auto-select in LWC)
        if (events.size() == 1) {
            return events;
        }

        // 3. Fallback: If 0 found nearby, OR >1 found nearby (ambiguous location), 
        // return ALL open events for the user to pick from the list.
        return [
            SELECT Id, Name 
            FROM Event_Details__c 
            WHERE Surveys_Open__c = TRUE 
            ORDER BY Name ASC
            LIMIT 20
        ];
    }
}