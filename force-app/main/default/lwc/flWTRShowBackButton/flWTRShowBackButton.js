import { LightningElement, wire, api } from "lwc";
import { publish, MessageContext } from "lightning/messageService";
import BUTTONCHANNEL from "@salesforce/messageChannel/FamilyLife_WTR_Button__c";
// comment for deploy
export default class FlWTRShowBackButton extends LightningElement {
  @wire(MessageContext)
  messageContext;
  @api
  showButton;
  connectedCallback() {
    const payload = {
      showButton: this.showButton
    };
    console.log(`Publishing message: ${JSON.stringify(payload)}`);
    publish(this.messageContext, BUTTONCHANNEL, payload);
  }
}