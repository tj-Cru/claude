import { LightningElement, api, track } from 'lwc';
// Import the new Apex method
import findRegistrations from '@salesforce/apex/flWTRGuestLocationController.findRegistrations';

export default class FlWTRRegistrationLookup extends LightningElement {
    @api eventId;

    // Form input
    lastName = '';
    zipCode = '';

    // State management
    isLoading = false;
    error;
    lookupStatus = 'form'; // 'form', 'multi-choice'
    @track choices = [];
    selectedRegId;

    // Getters for HTML
    get showForm() {
        return this.lookupStatus === 'form';
    }
    get showMultiChoice() {
        return this.lookupStatus === 'multi-choice';
    }
    get isFindDisabled() {
        return this.isLoading || this.lastName.trim().length === 0 || this.zipCode.trim().length === 0;
    }
    get isConfirmDisabled() {
        return this.isLoading || !this.selectedRegId;
    }

    // --- INPUT HANDLERS ---
    handleLastNameChange(event) {
        this.lastName = event.target.value;
        this.error = undefined;
    }
    handleZipChange(event) {
        this.zipCode = event.target.value;
        this.error = undefined;
    }
    handleChoiceChange(event) {
        this.selectedRegId = event.detail.value;
    }

    // --- BUTTON HANDLERS ---

    // 1. User clicks "Find Me"
    handleFind() {
        if (this.isFindDisabled) return;

        this.isLoading = true;
        this.error = undefined;

        findRegistrations({
            eventId: this.eventId,
            lastName: this.lastName,
            zipCode: this.zipCode
        })
        .then(result => {
            this.isLoading = false;
            
            if (result.status === 'SINGLE') {
                // --- 1. Success: One match found ---
                this.dispatchSuccess(result.registrationId);

            } else if (result.status === 'MULTI') {
                // --- 2. Multiple matches: Show radio list ---
                this.choices = result.choices;
                this.lookupStatus = 'multi-choice';

            } else {
                // --- 3. No match found ---
                this.error = 'No registration was found. Please check your details and try again.';
            }
        })
        .catch(error => {
            this.isLoading = false;
            this.error = error.body ? error.body.message : error.message;
        });
    }

    // 2. User clicks "Confirm Selection" from radio list
    handleConfirm() {
        if (this.isConfirmDisabled) return;
        
        // Success: User selected from list
        this.dispatchSuccess(this.selectedRegId);
    }

    // 3. User clicks "Back"
    handleBack() {
        // Tell the parent to go back to the 5-button menu
        this.dispatchEvent(new CustomEvent('close'));
    }

    // --- EVENT DISPATCHERS ---
    dispatchSuccess(regId) {
        // Send the found Registration ID to the parent
        this.dispatchEvent(new CustomEvent('success', {
            detail: regId
        }));
    }
}