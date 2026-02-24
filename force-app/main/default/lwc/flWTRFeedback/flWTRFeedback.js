/* ERT8.2/force-app/main/default/lwc/flWTRFeedback/flWTRFeedback.js */
import { LightningElement, api, wire } from "lwc";
import { subscribe, MessageContext } from "lightning/messageService";
import BUTTONCHANNEL from "@salesforce/messageChannel/FamilyLife_WTR_Button__c";

export default class FlWTRFeedback extends LightningElement {
  @api eventId;
  @api registrationId;
  @wire(MessageContext)
  messageContext;
  isLoading = false;
  showButton = true;

  connectedCallback() {
    this.subscribeToMessageChannel();
  }

  subscribeToMessageChannel() {
    this.subscription = subscribe(
      this.messageContext,
      BUTTONCHANNEL,
      (message) => this.handleMessage(message)
    );
  }

  handleMessage(message) {
    console.log(`Received message: ${JSON.stringify(message)}`);
    this.showButton = message.showButton;
  }

  get flowInputVariables() {
    if (this.eventId && this.registrationId) {
      return [
        { name: "varT_EventId", type: "String", value: this.eventId },
        {
          name: "varT_RegistrationId",
          type: "String",
          value: this.registrationId
        }
      ];
    }
    return undefined;
  }

  handleFlowStatusChange(event) {
    if (event.detail.status !== "STARTED" && this.showButton) {
      this.showButton = false;
    }
    if (
      event.detail.status === "FINISHED" ||
      event.detail.status === "FINISHED_SCREEN"
    ) {
      this.dispatchCloseEvent();
    }
  }

  // --- NEW: Handle Back Button Click ---
  handleBack() {
    // Triggers the same close event as finishing the flow
    this.dispatchCloseEvent();
  }

  dispatchCloseEvent() {
    this.dispatchEvent(new CustomEvent("close"));
  }
}