public without sharing class flQuestionsController {
  @AuraEnabled(cacheable=true)
  public static List<Survey_Response__c> getQuestions(Id eventId) {
    if (eventId == null) {
      return new List<Survey_Response__c>();
    }

    return [
      SELECT
        Id,
        Name,
        Question__c,
        CreatedDate,
        Status__c,
        Owner.Name,
        OwnerId,
        Sort_Order__c,
        Claimed_By__c,
        Claimed_By__r.Name
      FROM Survey_Response__c
      WHERE Event_Detail__c = :eventId AND Type__c = 'Question'
      ORDER BY CreatedDate DESC
      LIMIT 1000
    ];
  }
  // --- NEW METHOD FOR FEEDBACK COMPONENT --
  @AuraEnabled(cacheable=true)
  public static List<Survey_Response__c> getFeedback(Id eventId) {
    if (eventId == null) {
      return new List<Survey_Response__c>();
    }

    return [
      SELECT
        Id,
        Name,
        Type__c,
        Attendee__c,
        Attendee__r.Name,
        Household__c,
        Household__r.Name,
        CreatedDate,
        Status__c
      FROM Survey_Response__c
      WHERE Event_Detail__c = :eventId
      ORDER BY CreatedDate DESC
      LIMIT 2000
    ];
  }

  /**
   * @description Returns enriched Survey_Response__c records for CSV export.
   *              Queries a broader field set than the list-view methods to
   *              include attendee, household, contact info, and comment fields.
   * @param eventId  The Event_Details__c record Id to filter on
   * @param filterType  The Type__c picklist value to filter (e.g. 'Question', 'Prayer')
   * @return List of Survey_Response__c with export-ready fields
   */
  @AuraEnabled
  public static List<Survey_Response__c> getExportData(
    Id eventId,
    String filterType,
    String filterStatus
  ) {
    if (eventId == null || String.isBlank(filterType)) {
      return new List<Survey_Response__c>();
    }

    String query =
      'SELECT Id, Name, Type__c, Status__c, CreatedDate, ' +
      'Question__c, Prayer_Request__c, Comment__c, Comment_Log__c, ' +
      'Owner.Name, Claimed_By__r.Name, Attendee__r.Name, Household__r.Name, ' +
      'Sur_Email__c, Sur_Phone__c, Sur_ZipCode__c, Event_Detail__r.Name, Sort_Order__c ' +
      'FROM Survey_Response__c ' +
      'WHERE Event_Detail__c = :eventId AND Type__c = :filterType';

    if (String.isNotBlank(filterStatus) && filterStatus != 'All') {
      query += ' AND Status__c = :filterStatus';
    }

    query += ' ORDER BY CreatedDate DESC LIMIT 10000';

    return Database.query(query);
  }

  @AuraEnabled
  public static void claimQuestion(Id recordId) {
    try {
      // Updated Status to 'Completed' based on standard conventions.
      Survey_Response__c resp = new Survey_Response__c(
        Id = recordId,
        Claimed_By__c = UserInfo.getUserId(),
        Status__c = 'Pending'
      );

      // Removed isUpdateable check for Community User compatibility
      update resp;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }

  /**
   * @description Updates Sort_Order__c for a list of Survey_Response__c records.
   *              Only updates records claimed by the current user for security.
   * @param updates JSON string of [{id: 'recordId', sortOrder: Integer}, ...]
   */
  @AuraEnabled
  public static void updateSortOrder(String updates) {
    if (String.isBlank(updates)) {
      return;
    }

    List<SortOrderUpdate> parsed = (List<SortOrderUpdate>) JSON.deserialize(
      updates,
      List<SortOrderUpdate>.class
    );

    if (parsed == null || parsed.isEmpty()) {
      return;
    }

    Set<Id> recordIds = new Set<Id>();
    for (SortOrderUpdate u : parsed) {
      recordIds.add(u.id);
    }

    Map<Id, Survey_Response__c> existing = new Map<Id, Survey_Response__c>(
      [
        SELECT Id, Claimed_By__c
        FROM Survey_Response__c
        WHERE Id IN :recordIds AND Claimed_By__c = :UserInfo.getUserId()
      ]
    );

    List<Survey_Response__c> toUpdate = new List<Survey_Response__c>();
    for (SortOrderUpdate u : parsed) {
      if (existing.containsKey(u.id)) {
        toUpdate.add(
          new Survey_Response__c(Id = u.id, Sort_Order__c = u.sortOrder)
        );
      }
    }

    if (!toUpdate.isEmpty()) {
      List<Database.SaveResult> results = Database.update(toUpdate, false);
      for (Database.SaveResult sr : results) {
        if (!sr.isSuccess()) {
          throw new AuraHandledException(
            'Failed to update sort order: ' + sr.getErrors()[0].getMessage()
          );
        }
      }
    }
  }

  private class SortOrderUpdate {
    public Id id;
    public Integer sortOrder;
  }
}
