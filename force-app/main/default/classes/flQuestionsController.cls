public without sharing class flQuestionsController {
    
    @AuraEnabled(cacheable=true)
    public static List<Survey_Response__c> getQuestions(Id eventId) {
        if (eventId == null) {
            return new List<Survey_Response__c>();
        }

        return [
            SELECT Id, Name, Question__c, CreatedDate, Status__c, Owner.Name, OwnerId
            FROM Survey_Response__c 
            WHERE Event_Detail__c = :eventId
            AND Type__c = 'Question'
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
                SELECT Id, Name, Type__c, Attendee__c, Attendee__r.Name, 
                    Household__c, Household__r.Name, CreatedDate, Status__c
                FROM Survey_Response__c 
                WHERE Event_Detail__c = :eventId
                ORDER BY CreatedDate DESC
                LIMIT 2000
            ];
        }

    @AuraEnabled
    public static void claimQuestion(Id recordId) {
        try {
            // Updated Status to 'Completed' based on standard conventions.
            Survey_Response__c resp = new Survey_Response__c(
                Id = recordId,
                OwnerId = UserInfo.getUserId(),
                Status__c = 'Completed' 
            );
            
            // Removed isUpdateable check for Community User compatibility
            update resp;

        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}