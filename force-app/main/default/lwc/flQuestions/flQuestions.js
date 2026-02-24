import { LightningElement, api, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getObjectInfo, getPicklistValues } from 'lightning/uiObjectInfoApi';
import getQuestions from '@salesforce/apex/flQuestionsController.getQuestions';
import claimQuestion from '@salesforce/apex/flQuestionsController.claimQuestion';
import USER_ID from '@salesforce/user/Id';

// Schema Imports.
import SURVEY_RESPONSE_OBJECT from '@salesforce/schema/Survey_Response__c';
import STATUS_FIELD from '@salesforce/schema/Survey_Response__c.Status__c';

export default class FlQuestions extends NavigationMixin(LightningElement) {
    @api eventId;
    @api eventName; // NEW

    @track questions = [];
    wiredQuestionsResult;
    isLoading = true;
    error;
    
    // Filter State
    currentUserId = USER_ID;
    filterStatus = 'New'; 
    filterMine = false;

    // Schema Wires
    @wire(getObjectInfo, { objectApiName: SURVEY_RESPONSE_OBJECT })
    objectInfo;

    @wire(getPicklistValues, { 
        recordTypeId: '$objectInfo.data.defaultRecordTypeId', 
        fieldApiName: STATUS_FIELD 
    })
    statusPicklistValues;

    @wire(getQuestions, { eventId: '$eventId' })
    wiredQuestions(result) {
        this.wiredQuestionsResult = result;
        const { data, error } = result;

        if (data) {
            this.questions = data;
            this.error = undefined;
            this.isLoading = false;
        } else if (error) {
            this.error = error;
            this.questions = [];
            this.isLoading = false;
            console.error('Error fetching questions:', error);
        }
    }

    async handleRefresh() {
        this.isLoading = true;
        try {
            await refreshApex(this.wiredQuestionsResult);
        } catch(e) {
            console.error('Refresh failed', e);
        } finally {
            this.isLoading = false;
        }
    }

    async handleClaim(event) {
        const recordId = event.target.dataset.id;
        this.isLoading = true;

        try {
            await claimQuestion({ recordId: recordId });
            
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Question claimed successfully',
                    variant: 'success'
                })
            );

            await refreshApex(this.wiredQuestionsResult);

        } catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: error.body ? error.body.message : error.message,
                    variant: 'error'
                })
            );
        } finally {
            this.isLoading = false;
        }
    }

    // --- Filter Handlers ---

    handleStatusChange(event) {
        this.filterStatus = event.detail.value;
    }

    // UPDATED: Toggles the boolean directly on click (for stateful button)
    handleMyFilterChange(event) {
        this.filterMine = !this.filterMine;
    }

    get filteredQuestions() {
        if (!this.questions) return [];

        return this.questions.filter(q => {
            // 1. Status Filter
            const matchesStatus = this.filterStatus === 'All' || q.Status__c === this.filterStatus;
            
            // 2. "My" Filter
            const matchesOwner = !this.filterMine || (q.OwnerId === this.currentUserId);

            return matchesStatus && matchesOwner;
        });
    }

    get hasResults() {
        return this.filteredQuestions && this.filteredQuestions.length > 0;
    }

    get statusOptions() {
        if (!this.statusPicklistValues || !this.statusPicklistValues.data) {
            return [{ label: 'All Statuses', value: 'All' }];
        }
        
        return [
            { label: 'All Statuses', value: 'All' },
            ...this.statusPicklistValues.data.values
        ];
    }

    // --- Navigation ---

    handleNameClick(event) {
        event.preventDefault();
        const recordId = event.target.dataset.recordId;
        
        if (recordId) {
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: recordId,
                    objectApiName: 'Survey_Response__c',
                    actionName: 'view'
                }
            });
        }
    }

    handleBack() {
        this.dispatchEvent(new CustomEvent('back'));
    }
}