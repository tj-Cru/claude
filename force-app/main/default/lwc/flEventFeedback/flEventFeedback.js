import { LightningElement, api, wire, track } from "lwc";
import { NavigationMixin } from "lightning/navigation";
import { refreshApex } from "@salesforce/apex";
import { getObjectInfo, getPicklistValues } from "lightning/uiObjectInfoApi";

// Import the new method from flQuestionsController.
import getFeedback from "@salesforce/apex/flQuestionsController.getFeedback";

import SURVEY_RESPONSE_OBJECT from "@salesforce/schema/Survey_Response__c";
import TYPE_FIELD from "@salesforce/schema/Survey_Response__c.Type__c";

export default class FlEventFeedback extends NavigationMixin(LightningElement) {
  @api eventId;
  @api eventName;
  /** When true, renders the built-in header with event name, back, and refresh buttons. */
  @api showHeader = false;

  wiredFeedbackResult;

  @track allRecords = [];
  @track filteredRecords = [];

  // Filter State
  filterName = "";
  filterAttendee = "";
  filterType = "";

  // Sort State
  sortedBy;
  sortDirection = "asc";

  isLoading = true;
  error;

  @wire(getObjectInfo, { objectApiName: SURVEY_RESPONSE_OBJECT })
  objectInfo;

  @wire(getPicklistValues, {
    recordTypeId: "$objectInfo.data.defaultRecordTypeId",
    fieldApiName: TYPE_FIELD
  })
  typePicklistValues;

  @wire(getFeedback, { eventId: "$eventId" })
  wiredFeedback(result) {
    this.wiredFeedbackResult = result;
    const { data, error } = result;

    if (data) {
      // Flatten relationships for sorting/filtering
      this.allRecords = data.map((rec) => {
        return {
          ...rec,
          AttendeeName: rec.Attendee__r ? rec.Attendee__r.Name : "",
          HouseholdName: rec.Household__r ? rec.Household__r.Name : ""
        };
      });

      this.applyFilters();
      this.error = undefined;
      this.isLoading = false;
    } else if (error) {
      this.error = error;
      this.allRecords = [];
      this.filteredRecords = [];
      this.isLoading = false;
      console.error("Error fetching feedback:", error);
    }
  }

  /**
   * Public refresh method — called by parent components to trigger a data refresh.
   */
  @api async refresh() {
    this.isLoading = true;
    try {
      await refreshApex(this.wiredFeedbackResult);
    } catch (e) {
      console.error("Refresh failed", e);
    } finally {
      this.isLoading = false;
    }
  }

  handleNameClick(event) {
    event.preventDefault();
    const recordId = event.currentTarget.dataset.recordId;
    this.navigateToRecord(recordId, "Survey_Response__c");
  }

  handleAttendeeClick(event) {
    event.preventDefault();
    const recordId = event.currentTarget.dataset.recordId;
    // Navigate to Registration record
    this.navigateToRecord(recordId, "Registration__c");
  }

  navigateToRecord(recordId, objectApiName) {
    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        recordId: recordId,
        objectApiName: objectApiName,
        actionName: "view"
      }
    });
  }

  handleFilterChange(event) {
    const field = event.target.dataset.filter;
    const rawValue = event.detail.value;

    if (field === "name") this.filterName = rawValue;
    if (field === "attendee") this.filterAttendee = rawValue;
    if (field === "type") this.filterType = rawValue;

    this.applyFilters();
  }

  applyFilters() {
    if (!this.allRecords) {
      this.filteredRecords = [];
      return;
    }

    const termName = (this.filterName || "").trim().toLowerCase();
    const termAttendee = (this.filterAttendee || "").trim().toLowerCase();
    const termType = this.filterType;

    let tempResults = this.allRecords.filter((rec) => {
      const valName = rec.Name ? rec.Name.toLowerCase() : "";
      const matchName = !termName || valName.includes(termName);

      const valAttendee = rec.AttendeeName
        ? rec.AttendeeName.toLowerCase()
        : "";
      const matchAttendee = !termAttendee || valAttendee.includes(termAttendee);

      const matchType = !termType || rec.Type__c === termType;

      return matchName && matchAttendee && matchType;
    });

    if (this.sortedBy) {
      this.sortData(tempResults);
    } else {
      this.filteredRecords = tempResults;
    }
  }

  handleSort(event) {
    event.preventDefault();

    const fieldName = event.currentTarget.dataset.id;
    const isReverse =
      this.sortedBy === fieldName && this.sortDirection === "asc";

    this.sortedBy = fieldName;
    this.sortDirection = isReverse ? "desc" : "asc";

    this.sortData(this.filteredRecords);
  }

  sortData(incomingData) {
    const cloneData = [...incomingData];
    const reverse = this.sortDirection === "desc" ? -1 : 1;
    const key = this.sortedBy;

    cloneData.sort((a, b) => {
      let valA = a[key] ? String(a[key]).toLowerCase() : "";
      let valB = b[key] ? String(b[key]).toLowerCase() : "";

      return reverse * ((valA > valB) - (valB > valA));
    });

    this.filteredRecords = cloneData;
  }

  handleBack() {
    this.dispatchEvent(new CustomEvent("back"));
  }

  get hasResults() {
    return this.filteredRecords && this.filteredRecords.length > 0;
  }

  get typeOptions() {
    if (!this.typePicklistValues || !this.typePicklistValues.data) {
      return [];
    }
    return [
      { label: "All Types", value: "" },
      ...this.typePicklistValues.data.values
    ];
  }

  get sortIconName() {
    return this.sortDirection === "asc"
      ? "utility:arrowup"
      : "utility:arrowdown";
  }

  get isNameSort() {
    return this.sortedBy === "Name";
  }
  get isTypeSort() {
    return this.sortedBy === "Type__c";
  }
  get isAttendeeSort() {
    return this.sortedBy === "AttendeeName";
  }
  get isHouseholdSort() {
    return this.sortedBy === "HouseholdName";
  }
}
