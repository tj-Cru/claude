/*
 * Class Name: flEventRecordSharingAction
 * Description: Invocable action called from Flow to share child records 
 * (Registration__c and Survey_Response__c) with a Public Group 
 * defined on the Event_Details__c parent.
 * * Updates:
 * - Populates 'Share_Id__c' field on the child records with the created Share ID.
 * - Returns the count of created shares to the Flow.
 */
public without sharing class flEventRecordSharingAction {

    // Input wrapper for the Flow
    public class Request {
        @InvocableVariable(label='Event Record ID' description='The ID of the Event Details record' required=true)
        public Id eventId;
    }

    // Output wrapper for the Flow
    public class Response {
        @InvocableVariable(label='Registration Shares Created' description='Count of new Registration Share records created')
        public Integer registrationShareCount;

        @InvocableVariable(label='Survey Response Shares Created' description='Count of new Survey Response Share records created')
        public Integer surveyShareCount;
    }

    @InvocableMethod(label='Share Event Related Records' description='Creates Edit/Manual shares, populates Share_Id__c, and returns counts.')
    public static List<Response> shareRecords(List<Request> requests) {
        
        // Initialize maps to track counts per Event ID
        Map<Id, Integer> eventToRegShareCount = new Map<Id, Integer>();
        Map<Id, Integer> eventToSurveyShareCount = new Map<Id, Integer>();
        
        Set<Id> eventIds = new Set<Id>();
        for (Request req : requests) {
            if (req.eventId != null) {
                eventIds.add(req.eventId);
                // Initialize counts to 0
                eventToRegShareCount.put(req.eventId, 0);
                eventToSurveyShareCount.put(req.eventId, 0);
            }
        }

        // If no valid inputs, return empty list (or list of empty responses)
        if (eventIds.isEmpty()) return new List<Response>();

        // 1. Query the Event Details to get the Public Group ID
        Map<Id, Event_Details__c> eventMap = new Map<Id, Event_Details__c>(
            [SELECT Id, Public_Group__c FROM Event_Details__c WHERE Id IN :eventIds]
        );

        // --- PROCESS REGISTRATIONS ---
        List<Registration__c> regsToUpdate = new List<Registration__c>();
        List<Registration__Share> regSharesToInsert = new List<Registration__Share>();
        // Map to track which event a specific registration belongs to (for counting)
        Map<Id, Id> regIdToEventId = new Map<Id, Id>();

        List<Registration__c> registrations = [
            SELECT Id, Event_Detail__c 
            FROM Registration__c 
            WHERE Event_Detail__c IN :eventIds
            LIMIT 5000 
        ];

        for (Registration__c reg : registrations) {
            regIdToEventId.put(reg.Id, reg.Event_Detail__c);
            String groupId = eventMap.get(reg.Event_Detail__c)?.Public_Group__c;
            
            if (String.isNotBlank(groupId)) {
                Registration__Share regShare = new Registration__Share();
                regShare.ParentId = reg.Id;
                regShare.UserOrGroupId = groupId;
                regShare.AccessLevel = 'Edit';
                regShare.RowCause = Schema.Registration__Share.RowCause.Manual;
                regSharesToInsert.add(regShare);
            }
        }

        if (!regSharesToInsert.isEmpty()) {
            // Partial success allowed
            Database.SaveResult[] results = Database.insert(regSharesToInsert, false);
            
            for (Integer i = 0; i < results.size(); i++) {
                if (results[i].isSuccess()) {
                    Registration__Share insertedShare = regSharesToInsert[i];

                    // Increment count for the specific Event
                    Id regId = insertedShare.ParentId;
                    Id evtId = regIdToEventId.get(regId);
                    if (evtId != null && eventToRegShareCount.containsKey(evtId)) {
                        eventToRegShareCount.put(evtId, eventToRegShareCount.get(evtId) + 1);
                    }

                    // Prepare update for Share_Id__c
                    Registration__c regUpdate = new Registration__c(
                        Id = regId,
                        Share_Id__c = insertedShare.Id
                    );
                    regsToUpdate.add(regUpdate);
                }
            }
        }
        
        if (!regsToUpdate.isEmpty()) {
            Database.update(regsToUpdate, false);
        }

        // --- PROCESS SURVEY RESPONSES ---
        List<Survey_Response__c> surveysToUpdate = new List<Survey_Response__c>();
        List<Survey_Response__Share> surveySharesToInsert = new List<Survey_Response__Share>();
        Map<Id, Id> surveyIdToEventId = new Map<Id, Id>();

        List<Survey_Response__c> surveys = [
            SELECT Id, Event_Detail__c 
            FROM Survey_Response__c 
            WHERE Event_Detail__c IN :eventIds
            LIMIT 5000 
        ];

        for (Survey_Response__c survey : surveys) {
            surveyIdToEventId.put(survey.Id, survey.Event_Detail__c);
            String groupId = eventMap.get(survey.Event_Detail__c)?.Public_Group__c;
            
            if (String.isNotBlank(groupId)) {
                Survey_Response__Share surveyShare = new Survey_Response__Share();
                surveyShare.ParentId = survey.Id;
                surveyShare.UserOrGroupId = groupId;
                surveyShare.AccessLevel = 'Edit';
                surveyShare.RowCause = Schema.Survey_Response__Share.RowCause.Manual;
                surveySharesToInsert.add(surveyShare);
            }
        }

        if (!surveySharesToInsert.isEmpty()) {
            Database.SaveResult[] results = Database.insert(surveySharesToInsert, false);
            
            for (Integer i = 0; i < results.size(); i++) {
                if (results[i].isSuccess()) {
                    Survey_Response__Share insertedShare = surveySharesToInsert[i];

                    // Increment count for the specific Event
                    Id surveyId = insertedShare.ParentId;
                    Id evtId = surveyIdToEventId.get(surveyId);
                    if (evtId != null && eventToSurveyShareCount.containsKey(evtId)) {
                        eventToSurveyShareCount.put(evtId, eventToSurveyShareCount.get(evtId) + 1);
                    }

                    // Prepare update for Share_Id__c
                    Survey_Response__c surveyUpdate = new Survey_Response__c(
                        Id = surveyId,
                        Share_Id__c = insertedShare.Id
                    );
                    surveysToUpdate.add(surveyUpdate);
                }
            }
        }

        if (!surveysToUpdate.isEmpty()) {
            Database.update(surveysToUpdate, false);
        }

        // --- BUILD RESPONSE LIST ---
        // We must return the responses in the exact same order as the input requests
        List<Response> responses = new List<Response>();
        for (Request req : requests) {
            Response res = new Response();
            if (req.eventId != null) {
                res.registrationShareCount = eventToRegShareCount.get(req.eventId);
                res.surveyShareCount = eventToSurveyShareCount.get(req.eventId);
            } else {
                res.registrationShareCount = 0;
                res.surveyShareCount = 0;
            }
            responses.add(res);
        }

        return responses;
    }
}