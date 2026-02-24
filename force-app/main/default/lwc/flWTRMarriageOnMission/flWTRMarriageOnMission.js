import { LightningElement, api, track } from "lwc";
// Import the updated Apex method
import createMissionSurvey from "@salesforce/apex/flWTRGuestLocationController.createMissionSurvey";

export default class FlWTRMarriageOnMission extends LightningElement {
  @api eventId;
  @api registrationId;

  @track selectedValues = [];
  isLoading = false;
  error;
  showSuccess = false;

  // Updated options as requested
  get options() {
    return [
      { label: "Tell me how to invite others to a getaway", value: "invite" },
      {
        label: "Tell me how easy it is to lead a small group",
        value: "smallgroup"
      },
      { label: "Tell me about FamilyLife Local in my area", value: "local" },
      { label: "I’d like to get involved in some other way", value: "other" }
    ];
  }

  get isSubmitDisabled() {
    // Require at least one selection
    return (
      this.isLoading || !this.registrationId || this.selectedValues.length === 0
    );
  }

  get showForm() {
    return !this.showSuccess;
  }

  handleOptionChange(event) {
    this.selectedValues = event.detail.value;
    this.error = undefined;
  }

  handleSubmit() {
    if (this.isSubmitDisabled) {
      return;
    }

    this.isLoading = true;
    this.error = undefined;

    // Convert the array of values into booleans
    const inviteOthers = this.selectedValues.includes("invite");
    const leadSmallGroup = this.selectedValues.includes("smallgroup");
    const impactLocal = this.selectedValues.includes("local");
    const otherMission = this.selectedValues.includes("other");

    // Call the updated Apex method
    createMissionSurvey({
      eventId: this.eventId,
      registrationId: this.registrationId,
      inviteOthers: inviteOthers,
      impactLocal: impactLocal,
      leadSmallGroup: leadSmallGroup,
      otherMission: otherMission
    })
      .then((result) => {
        if (result === "success") {
          this.showSuccess = true;
          this.isLoading = false;

          // Automatically close after 2.5 seconds
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