public without sharing class flWTRGuestLocationController {

    // --- INNER CLASS: Wrapper for Registration choices.. ---
    public class RegChoice {
        @AuraEnabled public String label { get; set; } 
        @AuraEnabled public String value { get; set; } 

        public RegChoice(String label, String value) {
            this.label = label;
            this.value = value;
        }
    }

    // --- INNER CLASS: Wrapper for Registration lookup results ---
    public class RegFindResult {
        @AuraEnabled public String status { get; set; } // 'NONE', 'SINGLE', 'MULTI'
        @AuraEnabled public String registrationId { get; set; } // The ID, if status is 'SINGLE'
        @AuraEnabled public List<RegChoice> choices { get; set; } // The list, if status is 'MULTI'

        public RegFindResult() {
            this.status = 'NONE';
        }
    }

    // Updated to include Geolocation fields so the Client (LWC) can calculate distance.
    // This is cacheable because it returns the same list for everyone.
    @AuraEnabled(cacheable=true)
    public static List<Event_Details__c> getOpenSurveyEvents() {
        return [
            SELECT Id, Name, Event_Geo__Latitude__s, Event_Geo__Longitude__s
            FROM Event_Details__c
            WHERE Surveys_Open__c = TRUE
            ORDER BY Name ASC
        ];
    }

    @AuraEnabled
    public static String createQuestionSurvey(String eventId, String questionText, String gender) {
        if (String.isBlank(eventId) || String.isBlank(questionText)) {
            return 'Error: Event ID or question text is missing.';
        }
        try {
            Staging_Survey__c newSurvey = new Staging_Survey__c();
            newSurvey.Event_Id__c = eventId;
            newSurvey.Question__c = questionText;
            newSurvey.Type__c = 'Question';
            newSurvey.Gender__c = gender; 
            insert newSurvey;
            return 'success';
        } catch (Exception e) {
            return 'Error: Could not submit your question. ' + e.getMessage();
        }
    }

    @AuraEnabled
    public static String createPrayerSurvey(String eventId, String prayerText) {
        if (String.isBlank(eventId) || String.isBlank(prayerText)) {
            return 'Error: Event ID or prayer request text is missing.';
        }
        try {
            Staging_Survey__c newSurvey = new Staging_Survey__c();
            newSurvey.Event_Id__c = eventId;
            newSurvey.Prayer_Request__c = prayerText;
            newSurvey.Type__c = 'Prayer';
            insert newSurvey;
            return 'success';
        } catch (Exception e) {
            return 'Error: Could not submit your prayer request. ' + e.getMessage();
        }
    }

    @AuraEnabled(cacheable=true)
    public static RegFindResult findRegistrations(String eventId, String lastName, String zipCode) {
        RegFindResult result = new RegFindResult();
        
        if (String.isBlank(eventId) || String.isBlank(lastName) || String.isBlank(zipCode)) {
            return result; 
        }

        List<Registration__c> regs = [
            SELECT Id, Flow_Choice__c 
            FROM Registration__c 
            WHERE Event_Detail__c = :eventId 
              AND Last_Name__c = :lastName 
              AND Contact_Zip__c = :zipCode
            ORDER BY Flow_Choice__c ASC 
        ];

        if (regs.size() == 0) {
            result.status = 'NONE';
        } else if (regs.size() == 1) {
            result.status = 'SINGLE';
            result.registrationId = regs[0].Id;
        } else {
            result.status = 'MULTI';
            result.choices = new List<RegChoice>();
            for (Registration__c reg : regs) {
                result.choices.add(new RegChoice(reg.Flow_Choice__c, reg.Id));
            }
        }
        return result;
    }

    @AuraEnabled(cacheable=true)
    public static String getRegistrationFirstName(String registrationId) {
        if (String.isBlank(registrationId)) {
            return null;
        }
        try {
            Registration__c reg = [SELECT First_Name__c FROM Registration__c WHERE Id = :registrationId LIMIT 1];
            return reg.First_Name__c;
        } catch (Exception e) {
            return null;
        }
    }

    @AuraEnabled
    public static String createOnenessSurvey(String eventId, String registrationId, 
                                             Boolean isSalvation, Boolean isRecommitment, Boolean isCommunity) {
        
        if (String.isBlank(eventId) || String.isBlank(registrationId)) {
            return 'Error: Event or Registration is missing.';
        }
        
        try {
            Registration__c reg = [
                SELECT Id, Contact__c, Household__c 
                FROM Registration__c 
                WHERE Id = :registrationId
                LIMIT 1
            ];

            Staging_Survey__c newSurvey = new Staging_Survey__c();
            newSurvey.Event_Id__c = eventId;
            newSurvey.Type__c = 'Oneness';
            
            newSurvey.Contact_Id__c = reg.Contact__c;
            newSurvey.Household_Id__c = reg.Household__c;
            newSurvey.Attendee_Id__c = registrationId; 

            newSurvey.Salvation__c = isSalvation;
            newSurvey.Recommitment__c = isRecommitment;
            newSurvey.Community__c = isCommunity; 
            
            insert newSurvey;
            
            return 'success';

        } catch (Exception e) {
            return 'Error: Could not submit your response. ' + e.getMessage();
        }
    }

    @AURAENABLED
    public static String createMissionSurvey(String eventId, String registrationId, 
                                             Boolean inviteOthers, Boolean impactLocal, 
                                             Boolean leadSmallGroup, Boolean otherMission) { 
        
        if (String.isBlank(eventId) || String.isBlank(registrationId)) {
            return 'Error: Event or Registration is missing.';
        }

        try {
            Registration__c reg = [
                SELECT Id, Contact__c, Household__c 
                FROM Registration__c 
                WHERE Id = :registrationId
                LIMIT 1
            ];

            Staging_Survey__c newSurvey = new Staging_Survey__c();
            newSurvey.Event_Id__c = eventId;
            newSurvey.Type__c = 'Mission'; 
            
            newSurvey.Contact_Id__c = reg.Contact__c;
            newSurvey.Household_Id__c = reg.Household__c;
            newSurvey.Attendee_Id__c = registrationId; 
            
            newSurvey.Invite__c = inviteOthers;
            newSurvey.Local__c = impactLocal;
            newSurvey.Small_Group__c = leadSmallGroup;
            newSurvey.Mission_Other__c = otherMission; 
            
            insert newSurvey;
            
            return 'success';

        } catch (Exception e) {
            return 'Error: Could not submit your response. ' + e.getMessage();
        }
    }
}