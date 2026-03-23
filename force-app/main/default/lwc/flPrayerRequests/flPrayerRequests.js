import { LightningElement, api, wire, track } from "lwc";
import { NavigationMixin } from "lightning/navigation";
import { refreshApex } from "@salesforce/apex";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { getObjectInfo, getPicklistValues } from "lightning/uiObjectInfoApi";
import getPrayerRequests from "@salesforce/apex/flPrayerRequestsController.getPrayerRequests";
import claimPrayerRequest from "@salesforce/apex/flPrayerRequestsController.claimPrayerRequest";
import USER_ID from "@salesforce/user/Id";

// Schema Imports
import SURVEY_RESPONSE_OBJECT from "@salesforce/schema/Survey_Response__c";
import STATUS_FIELD from "@salesforce/schema/Survey_Response__c.Status__c";

export default class FlPrayerRequests extends NavigationMixin(
  LightningElement
) {
  @api eventId;
  @api eventName; // NEW

  @track requests = [];
  wiredRequestsResult;
  isLoading = true;
  error;

  // Filter State
  currentUserId = USER_ID;
  filterStatus = "New";
  filterMine = false;

  // Schema Wires
  @wire(getObjectInfo, { objectApiName: SURVEY_RESPONSE_OBJECT })
  objectInfo;

  @wire(getPicklistValues, {
    recordTypeId: "$objectInfo.data.defaultRecordTypeId",
    fieldApiName: STATUS_FIELD
  })
  statusPicklistValues;

  @wire(getPrayerRequests, { eventId: "$eventId" })
  wiredRequests(result) {
    this.wiredRequestsResult = result;
    const { data, error } = result;

    if (data) {
      this.requests = data;
      this.error = undefined;
      this.isLoading = false;
    } else if (error) {
      this.error = error;
      this.requests = [];
      this.isLoading = false;
      console.error("Error fetching prayer requests:", error);
    }
  }

  async handleRefresh() {
    this.isLoading = true;
    try {
      await refreshApex(this.wiredRequestsResult);
    } catch (e) {
      console.error("Refresh failed", e);
    } finally {
      this.isLoading = false;
    }
  }

  async handleClaim(event) {
    const recordId = event.target.dataset.id;
    this.isLoading = true;

    try {
      await claimPrayerRequest({ recordId: recordId });

      this.dispatchEvent(
        new ShowToastEvent({
          title: "Success",
          message: "Prayer request claimed successfully",
          variant: "success"
        })
      );

      await refreshApex(this.wiredRequestsResult);
    } catch (error) {
      this.dispatchEvent(
        new ShowToastEvent({
          title: "Error",
          message: error.body ? error.body.message : error.message,
          variant: "error"
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

  // UPDATED: Toggles boolean on click
  handleMyFilterChange() {
    this.filterMine = !this.filterMine;
  }

  get filteredRequests() {
    if (!this.requests) return [];

    return this.requests.filter((req) => {
      // 1. Status Filter
      const matchesStatus =
        this.filterStatus === "All" || req.Status__c === this.filterStatus;

      // 2. "My" Filter
      const matchesOwner =
        !this.filterMine || req.Claimed_By__c === this.currentUserId;

      return matchesStatus && matchesOwner;
    });
  }

  get hasResults() {
    return this.filteredRequests && this.filteredRequests.length > 0;
  }

  get statusOptions() {
    if (!this.statusPicklistValues || !this.statusPicklistValues.data) {
      return [{ label: "All Statuses", value: "All" }];
    }

    return [
      { label: "All Statuses", value: "All" },
      ...this.statusPicklistValues.data.values
    ];
  }

  // --- Navigation ---

  handleNameClick(event) {
    event.preventDefault();
    const recordId = event.target.dataset.recordId;

    if (recordId) {
      this[NavigationMixin.Navigate]({
        type: "standard__recordPage",
        attributes: {
          recordId: recordId,
          objectApiName: "Survey_Response__c",
          actionName: "view"
        }
      });
    }
  }

  handleBack() {
    this.dispatchEvent(new CustomEvent("back"));
  }
}
