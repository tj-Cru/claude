public without sharing class flPrayerRequestsController {
  @AuraEnabled(cacheable=true)
  public static List<Survey_Response__c> getPrayerRequests(Id eventId) {
    if (eventId == null) {
      return new List<Survey_Response__c>();
    }

    return [
      SELECT
        Id,
        Name,
        Prayer_Request__c,
        CreatedDate,
        Status__c,
        Owner.Name,
        OwnerId,
        Sort_Order__c,
        Claimed_By__c,
        Claimed_By__r.Name
      FROM Survey_Response__c
      WHERE Event_Detail__c = :eventId AND Type__c = 'Prayer'
      ORDER BY CreatedDate DESC
      LIMIT 1000
    ];
  }

  @AuraEnabled
  public static void claimPrayerRequest(Id recordId) {
    try {
      // Set Claimed_By__c to the current User and Status to 'Pending'
      Survey_Response__c resp = new Survey_Response__c(
        Id = recordId,
        Claimed_By__c = UserInfo.getUserId(),
        Status__c = 'Pending'
      );

      // Removed isUpdateable check for Community User compatibility
      update resp;
    } catch (Exception e) {
      // Log the actual error to the Debug Log so you can see it
      System.debug('Error in claimPrayerRequest: ' + e.getMessage());

      // Construct the AuraHandledException correctly to expose the message
      AuraHandledException ae = new AuraHandledException(e.getMessage());
      ae.setMessage(e.getMessage()); // Required for the message to appear in LWC/Tests
      throw ae;
    }
  }
}
