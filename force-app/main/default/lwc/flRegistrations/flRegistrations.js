import { LightningElement, api, wire, track } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { getObjectInfo, getPicklistValues } from 'lightning/uiObjectInfoApi';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getRegistrations from '@salesforce/apex/flRegistrationsController.getRegistrations';

import REGISTRATION_OBJECT from '@salesforce/schema/Registration__c';
import STATUS_FIELD from '@salesforce/schema/Registration__c.Registration_Status__c';

export default class FlRegistrations extends NavigationMixin(LightningElement) {
    @api eventId;
    @api eventName; // NEW Input

    wiredRegistrationsResult; 
    
    @track allRegistrations = [];
    @track filteredRegistrations = [];
    
    // Filter State
    filterFirstName = '';
    filterLastName = '';
    filterZip = '';
    filterStatus = '';

    // Sort State
    sortedBy;
    sortDirection = 'asc';

    // Flow Modal State
    showCheckInModal = false;
    selectedExternalId;

    isLoading = true;
    error;
    
    // Debounce Timer..
    searchTimeout;

    @wire(getObjectInfo, { objectApiName: REGISTRATION_OBJECT })
    objectInfo;

    @wire(getPicklistValues, { 
        recordTypeId: '$objectInfo.data.defaultRecordTypeId', 
        fieldApiName: STATUS_FIELD 
    })
    statusPicklistValues;

    @wire(getRegistrations, { eventId: '$eventId' })
    wiredRegistrations(result) {
        this.wiredRegistrationsResult = result;
        const { data, error } = result;

        if (data) {
            this.allRegistrations = data.map(reg => {
                const rawStatus = reg.Registration_Status__c || '';
                const statusLower = rawStatus.toLowerCase();
                const isAttended = statusLower.includes('attended');

                return {
                    ...reg,
                    CoupleName: reg.Couple_Registration__r ? reg.Couple_Registration__r.Name : null,
                    CoupleId: reg.Couple_Registration__c,
                    isCheckedIn: isAttended
                };
            });
            
            this.applyFilters();
            this.error = undefined;
            this.isLoading = false;
        } else if (error) {
            this.error = error;
            this.allRegistrations = [];
            this.filteredRegistrations = [];
            this.isLoading = false;
            console.error('Error fetching registrations:', error);
        }
    }

    async handleRefresh() {
        this.isLoading = true;
        try {
            await refreshApex(this.wiredRegistrationsResult);
        } catch(e) {
            console.error('Refresh failed', e);
        } finally {
            this.isLoading = false;
        }
    }

    handleNameClick(event) {
        event.preventDefault();
        const recordId = event.target.dataset.recordId;
        this.navigateToRecord(recordId, 'Registration__c');
    }

    handleCoupleClick(event) {
        event.preventDefault();
        const recordId = event.target.dataset.recordId;
        if (recordId) {
            this.navigateToRecord(recordId, 'Couple_Registration__c');
        }
    }

    handleCheckInClick(event) {
        const extId = event.currentTarget.dataset.externalId;
        if (extId) {
            this.selectedExternalId = extId;
            this.showCheckInModal = true;
        } else {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Cannot check in: No External Registration ID found on this record.',
                    variant: 'error'
                })
            );
        }
    }

    closeCheckInModal() {
        this.showCheckInModal = false;
        this.selectedExternalId = null;
    }

    handleFlowStatusChange(event) {
        if (event.detail.status === 'FINISHED') {
            this.closeCheckInModal();
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Check-in processed successfully.',
                    variant: 'success'
                })
            );
            setTimeout(() => {
                this.handleRefresh();
            }, 500);
        }
    }

    get checkInFlowInputs() {
        return [{ name: 'extRecordId', type: 'String', value: this.selectedExternalId }];
    }

    navigateToRecord(recordId, objectApiName) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: recordId,
                objectApiName: objectApiName,
                actionName: 'view'
            }
        });
    }

    handleFilterChange(event) {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        const field = event.target.dataset.filter;
        const rawValue = event.detail.value;

        if (field === 'firstName') this.filterFirstName = rawValue;
        if (field === 'lastName') this.filterLastName = rawValue;
        if (field === 'zip') this.filterZip = rawValue;
        if (field === 'status') this.filterStatus = rawValue;

        this.searchTimeout = setTimeout(() => {
            this.applyFilters();
        }, 300);
    }

    applyFilters() {
        if (!this.allRegistrations) {
            this.filteredRegistrations = [];
            return;
        }

        const termFirst = (this.filterFirstName || '').trim().toLowerCase();
        const termLast = (this.filterLastName || '').trim().toLowerCase();
        const termZip = (this.filterZip || '').trim().toLowerCase();
        const termStatus = this.filterStatus;

        let tempResults = this.allRegistrations.filter(reg => {
            const valFirst = reg.First_Name__c ? reg.First_Name__c.toLowerCase() : '';
            const matchFirst = !termFirst || valFirst.includes(termFirst);

            const valLast = reg.Last_Name__c ? reg.Last_Name__c.toLowerCase() : '';
            const matchLast = !termLast || valLast.includes(termLast);

            const valZip = reg.Contact_Zip__c ? reg.Contact_Zip__c.toLowerCase() : '';
            const matchZip = !termZip || valZip.includes(termZip);

            const matchStatus = !termStatus || (reg.Registration_Status__c === termStatus);

            return matchFirst && matchLast && matchZip && matchStatus;
        });

        if (this.sortedBy) {
            this.sortData(tempResults);
        } else {
            this.filteredRegistrations = tempResults;
        }
    }

    handleSort(event) {
        event.preventDefault(); 

        const fieldName = event.currentTarget.dataset.id;
        const isReverse = this.sortedBy === fieldName && this.sortDirection === 'asc';
        
        this.sortedBy = fieldName;
        this.sortDirection = isReverse ? 'desc' : 'asc';
        
        this.sortData(this.filteredRegistrations);
    }

    sortData(incomingData) {
        const cloneData = [...incomingData];
        const reverse = this.sortDirection === 'desc' ? -1 : 1;
        const key = this.sortedBy;

        cloneData.sort((a, b) => {
            let valA = a[key] ? String(a[key]).toLowerCase() : '';
            let valB = b[key] ? String(b[key]).toLowerCase() : '';
            return reverse * ((valA > valB) - (valB > valA));
        });

        this.filteredRegistrations = cloneData;
    }

    handleBack() {
        this.dispatchEvent(new CustomEvent('back'));
    }

    get hasResults() {
        return this.filteredRegistrations && this.filteredRegistrations.length > 0;
    }

    get statusOptions() {
        if (!this.statusPicklistValues || !this.statusPicklistValues.data) {
            return [];
        }
        return [
            { label: 'All Statuses', value: '' },
            ...this.statusPicklistValues.data.values
        ];
    }

    get sortIconName() {
        return this.sortDirection === 'asc' ? 'utility:arrowup' : 'utility:arrowdown';
    }

    get isNameSort() { return this.sortedBy === 'Name'; }
    get isRegistrantTypeSort() { return this.sortedBy === 'Registrant_Type__c'; }
    get isRegistrationTypeSort() { return this.sortedBy === 'Registration_Type__c'; }
    get isStatusSort() { return this.sortedBy === 'Registration_Status__c'; }
    get isGroupOwnerSort() { return this.sortedBy === 'Contact_GC__c'; }
    get isWaiverSort() { return this.sortedBy === 'Waiver__c'; }
    get isLastEventSort() { return this.sortedBy === 'Last_Event__c'; }
}