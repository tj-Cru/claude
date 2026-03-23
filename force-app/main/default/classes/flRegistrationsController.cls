public with sharing class flRegistrationsController {
  @AuraEnabled(cacheable=true)
  public static List<Registration__c> getRegistrations(Id eventId) {
    if (eventId == null) {
      return new List<Registration__c>();
    }

    // MODIFIED:
    // - Added Contact_GC__c (Group Owner replacement)
    // - Added Last_Event__c (New Column)
    // - Kept Waiver__c..
    // - Removed Contact__r.Is_Group_Leader__c
    return [
      SELECT
        Id,
        Name,
        First_Name__c,
        Last_Name__c,
        Contact_Zip__c,
        Registration_Status__c,
        Registrant_Type__c,
        Registration_Type__c,
        Contact_GC__c,
        Waiver__c,
        Last_Event__c,
        External_Registration_Id__c
      FROM Registration__c
      WHERE
        Event_Detail__c = :eventId
        AND Registration_Status__c != 'X - Cancelled'
      ORDER BY Last_Name__c ASC, First_Name__c ASC
      LIMIT 2000
    ];
  }
}
