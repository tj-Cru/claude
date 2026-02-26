import { LightningElement, api, wire } from "lwc";
import { getRecord, notifyRecordUpdateAvailable } from "lightning/uiRecordApi";

export default class FlRecordDetail extends LightningElement {
  @api recordId;
  @api objectApiName;
  @api fieldList;
  @api title;
  @api columns = 2;
  @api showBackButton = false;
  @api editFlowName;

  // Refresh key to force re-render of record form after edit.
  refreshKey = 0;
  showEditModal = false;

  // Fetch record for the Header Title only (Compact layout usually contains the Name)
  @wire(getRecord, { recordId: "$recordId", layoutTypes: ["Compact"] })
  record;

  get fields() {
    if (!this.fieldList) {
      return [];
    }
    return this.fieldList.split(",").map((field) => field.trim());
  }

  // Logic to determine the Header Title
  get headerTitle() {
    const data = this.record.data;

    // 1. If we have record data, try to find the Name
    if (data) {
      // Try standard 'Name' field
      if (data.fields && data.fields.Name && data.fields.Name.value) {
        return data.fields.Name.value;
      }
    }

    // 2. Default to the Title property set in Builder, or "Record Detail"
    return this.title || "Record Detail";
  }

  get hasRecordContext() {
    return this.recordId && this.objectApiName && this.fields.length > 0;
  }

  // --- Edit Flow Logic ----

  get flowInputVariables() {
    return [
      {
        name: "recordId",
        type: "String",
        value: this.recordId
      }
    ];
  }

  handleEdit() {
    if (this.editFlowName) {
      this.showEditModal = true;
    }
  }

  closeEditModal() {
    this.showEditModal = false;
  }

  async handleFlowStatusChange(event) {
    if (event.detail.status === "FINISHED") {
      this.closeEditModal();

      // 1. Force the internal form to refresh
      this.refreshKey++;

      // 2. Notify LDS that the record has changed to refresh the rest of the page
      try {
        await notifyRecordUpdateAvailable([{ recordId: this.recordId }]);
      } catch (error) {
        console.error("Error refreshing record:", error);
      }
    }
  }

  handleBack() {
    this.dispatchEvent(new CustomEvent("back"));
  }
}
