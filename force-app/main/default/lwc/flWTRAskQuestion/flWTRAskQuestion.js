import { LightningElement, api } from "lwc";
import createQuestionSurvey from "@salesforce/apex/flWTRGuestLocationController.createQuestionSurvey";

export default class FlWTRAskQuestion extends LightningElement {
  @api eventId;

  questionText = "";
  gender = ""; // Track the gender selection
  isLoading = false;
  error;
  showSuccess = false;

  // Define options for the radio group
  get genderOptions() {
    return [
      { label: "Male", value: "Male" },
      { label: "Female", value: "Female" }
    ];
  }

  // Helper to disable the submit button
  get isSubmitDisabled() {
    // Now checks if gender is empty
    return (
      this.isLoading || this.questionText.trim().length === 0 || !this.gender
    );
  }

  get showForm() {
    return !this.showSuccess;
  }

  handleQuestionChange(event) {
    this.questionText = event.target.value;
    this.error = undefined;
  }

  // NEW: Handle gender change
  handleGenderChange(event) {
    this.gender = event.detail.value;
  }

  handleSubmit() {
    if (this.isSubmitDisabled) {
      return;
    }

    this.isLoading = true;
    this.error = undefined;

    // Call the updated Apex method including gender
    createQuestionSurvey({
      eventId: this.eventId,
      questionText: this.questionText,
      gender: this.gender
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