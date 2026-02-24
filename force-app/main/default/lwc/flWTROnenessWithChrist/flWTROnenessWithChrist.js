// ERT8.2/force-app/main/default/lwc/flWTROnenessWithChrist/flWTROnenessWithChrist.js
import { LightningElement, api, track } from "lwc";
import createOnenessSurvey from "@salesforce/apex/flWTRGuestLocationController.createOnenessSurvey";

export default class FlWTROnenessWithChrist extends LightningElement {
  @api eventId;
  @api registrationId;

  @track selectedValues = []; // Changed to array for checkboxes
  isLoading = false;
  error;
  showSuccess = false;

  get options() {
    return [
      {
        label:
          "I started a new relationship with God by saying “yes” to Jesus.",
        value: "salvation"
      },
      {
        label:
          "I recognized I need to submit myself more to the Spirit rather than my flesh.",
        value: "recommitment"
      },
      {
        // !!! PLEASE UPDATE THIS LABEL WITH YOUR SPECIFIC TEXT !!!
        label:
          "I committed to being connected and vulnerable with God's people.",
        value: "community"
      }
    ];
  }

  get isSubmitDisabled() {
    // Disabled if loading, no registration, or NOTHING selected
    return (
      this.isLoading || !this.registrationId || this.selectedValues.length === 0
    );
  }

  get showForm() {
    return !this.showSuccess;
  }

  handleOptionChange(event) {
    this.selectedValues = event.detail.value; // Checkbox group returns an array
    this.error = undefined;
  }

  handleSubmit() {
    if (this.isSubmitDisabled) {
      return;
    }

    this.isLoading = true;
    this.error = undefined;

    // Parse the selected values array into booleans
    const isSalvation = this.selectedValues.includes("salvation");
    const isRecommitment = this.selectedValues.includes("recommitment");
    const isCommunity = this.selectedValues.includes("community");

    createOnenessSurvey({
      eventId: this.eventId,
      registrationId: this.registrationId,
      isSalvation: isSalvation,
      isRecommitment: isRecommitment,
      isCommunity: isCommunity
    })
      .then((result) => {
        if (result === "success") {
          this.showSuccess = true;
          this.isLoading = false;

          setTimeout(() => {
            this.dispatchCloseEvent();
          }, 2500);
        } else {
          this.handleError(result);
        }
      })
      .catch((error) => {
        this.handleError(error.body ? error.body.message : error.message);
      });
  }

  handleError(errorMessage) {
    this.error = errorMessage;
    this.isLoading = false;
  }

  handleBack() {
    this.dispatchCloseEvent();
  }

  dispatchCloseEvent() {
    this.dispatchEvent(new CustomEvent("close"));
  }
}