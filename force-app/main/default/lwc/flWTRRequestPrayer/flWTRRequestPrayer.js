import { LightningElement, api } from "lwc";
// Import the new Apex method
import createPrayerSurvey from "@salesforce/apex/flWTRGuestLocationController.createPrayerSurvey";

export default class FlWTRRequestPrayer extends LightningElement {
  @api eventId;

  prayerText = ""; // Changed from questionText
  isLoading = false;
  error;
  showSuccess = false;

  // Helper to disable the submit button
  get isSubmitDisabled() {
    return this.isLoading || this.prayerText.trim().length === 0;
  }

  // This getter handles the '!' operator for the HTML
  get showForm() {
    return !this.showSuccess;
  }

  // Handles typing in the text area
  handlePrayerChange(event) {
    this.prayerText = event.target.value;
    this.error = undefined; // Clear error on new input
  }

  // Handles clicking the 'Submit' button
  handleSubmit() {
    if (this.isSubmitDisabled) {
      return;
    }

    this.isLoading = true;
    this.error = undefined;

    // Call the new Apex method
    createPrayerSurvey({
      eventId: this.eventId,
      prayerText: this.prayerText // Pass the correct variable
    })
      .then((result) => {
        if (result === "success") {
          // --- Success ---
          this.showSuccess = true;
          this.isLoading = false;

          // Automatically return to the parent after 2.5 seconds
          setTimeout(() => {
            this.dispatchCloseEvent();
          }, 2500);
        } else {
          // --- Apex returned an error message ---
          this.handleError(result);
        }
      })
      .catch((error) => {
        // --- Network/System error ---
        this.handleError(error.body ? error.body.message : error.message);
      });
  }

  handleError(errorMessage) {
    this.error = errorMessage;
    this.isLoading = false;
  }

  // Handles clicking the 'Back' button
  handleBack() {
    this.dispatchCloseEvent();
  }

  // Fires the 'close' event for the parent to catch
  dispatchCloseEvent() {
    this.dispatchEvent(new CustomEvent("close"));
  }
}