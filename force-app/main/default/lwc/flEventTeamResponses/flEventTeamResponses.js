import { LightningElement, api, wire } from "lwc";
import { refreshApex } from "@salesforce/apex";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { getObjectInfo, getPicklistValues } from "lightning/uiObjectInfoApi";
import getQuestions from "@salesforce/apex/flQuestionsController.getQuestions";
import claimQuestion from "@salesforce/apex/flQuestionsController.claimQuestion";
import getPrayerRequests from "@salesforce/apex/flPrayerRequestsController.getPrayerRequests";
import claimPrayerRequest from "@salesforce/apex/flPrayerRequestsController.claimPrayerRequest";
import USER_ID from "@salesforce/user/Id";

import SURVEY_RESPONSE_OBJECT from "@salesforce/schema/Survey_Response__c";
import STATUS_FIELD from "@salesforce/schema/Survey_Response__c.Status__c";

export default class FlEventTeamResponses extends LightningElement {
  @api eventId;
  @api eventName;

  questions = [];
  prayerRequests = [];
  wiredQuestionsResult;
  wiredPrayersResult;

  _questionsLoaded = false;
  _prayersLoaded = false;
  error;
  selectedType = "Question"; // 'Question' | 'Prayer'

  currentUserId = USER_ID;
  filterStatus = "New";
  filterMine = false;

  @wire(getObjectInfo, { objectApiName: SURVEY_RESPONSE_OBJECT })
  objectInfo;

  @wire(getPicklistValues, {
    recordTypeId: "$objectInfo.data.defaultRecordTypeId",
    fieldApiName: STATUS_FIELD
  })
  statusPicklistValues;

  @wire(getQuestions, { eventId: "$eventId" })
  wiredQuestions(result) {
    this.wiredQuestionsResult = result;
    const { data, error } = result;
    if (data) {
      this.questions = data;
      this.error = undefined;
      this._questionsLoaded = true;
    } else if (error) {
      this.error = error;
      this.questions = [];
      this._questionsLoaded = true;
    }
  }

  @wire(getPrayerRequests, { eventId: "$eventId" })
  wiredPrayers(result) {
    this.wiredPrayersResult = result;
    const { data, error } = result;
    if (data) {
      this.prayerRequests = data;
      this.error = undefined;
      this._prayersLoaded = true;
    } else if (error) {
      this.error = error;
      this.prayerRequests = [];
      this._prayersLoaded = true;
    }
  }

  get isLoading() {
    if (this.selectedType === "Feedback") return false;
    if (this.selectedType === "Question") return !this._questionsLoaded;
    return !this._prayersLoaded;
  }

  selectQuestions() {
    this.selectedType = "Question";
    this.filterStatus = "New";
    this.filterMine = false;
  }

  selectPrayer() {
    this.selectedType = "Prayer";
    this.filterStatus = "New";
    this.filterMine = false;
  }

  selectFeedback() {
    this.selectedType = "Feedback";
    this.filterStatus = "New";
    this.filterMine = false;
  }

  get isFeedback() {
    return this.selectedType === "Feedback";
  }

  get isNotFeedback() {
    return this.selectedType !== "Feedback";
  }

  get feedbackButtonClass() {
    return this.selectedType === "Feedback"
      ? "type-pill type-pill_active"
      : "type-pill";
  }

  async handleRefresh() {
    if (this.selectedType === "Feedback") {
      const feedbackChild = this.template.querySelector("c-fl-event-feedback");
      if (feedbackChild) {
        await feedbackChild.refresh();
      }
      return;
    }
    if (this.selectedType === "Question") {
      this._questionsLoaded = false;
    } else {
      this._prayersLoaded = false;
    }
    try {
      if (this.selectedType === "Question") {
        await refreshApex(this.wiredQuestionsResult);
      } else {
        await refreshApex(this.wiredPrayersResult);
      }
    } catch {
      // wire handler surfaces errors
    } finally {
      this._questionsLoaded = true;
      this._prayersLoaded = true;
    }
  }

  async handleClaim(event) {
    const recordId = event.currentTarget.dataset.id;
    if (this.selectedType === "Question") {
      this._questionsLoaded = false;
    } else {
      this._prayersLoaded = false;
    }
    try {
      if (this.selectedType === "Question") {
        await claimQuestion({ recordId });
        this.dispatchEvent(
          new ShowToastEvent({
            title: "Success",
            message: "Question claimed successfully",
            variant: "success"
          })
        );
        await refreshApex(this.wiredQuestionsResult);
      } else {
        await claimPrayerRequest({ recordId });
        this.dispatchEvent(
          new ShowToastEvent({
            title: "Success",
            message: "Prayer request claimed successfully",
            variant: "success"
          })
        );
        await refreshApex(this.wiredPrayersResult);
      }
    } catch (err) {
      this.dispatchEvent(
        new ShowToastEvent({
          title: "Error",
          message: err.body ? err.body.message : err.message,
          variant: "error"
        })
      );
      // Re-mark as loaded so spinner stops on error
      this._questionsLoaded = true;
      this._prayersLoaded = true;
    }
  }

  handleStatusChange(event) {
    this.filterStatus = event.detail.value;
  }

  handleMyFilterChange() {
    this.filterMine = !this.filterMine;
  }

  handleNameClick(event) {
    event.preventDefault();
    const recordId = event.currentTarget.dataset.recordId;
    if (recordId) {
      this.dispatchEvent(
        new CustomEvent("viewrecord", {
          bubbles: true,
          composed: true,
          detail: { recordId, objectApiName: "Survey_Response__c" }
        })
      );
    }
  }

  handleBack() {
    this.dispatchEvent(new CustomEvent("back"));
  }

  get filteredItems() {
    const source =
      this.selectedType === "Question" ? this.questions : this.prayerRequests;
    if (!source) return [];

    return source
      .filter((item) => {
        const matchesStatus =
          this.filterStatus === "All" || item.Status__c === this.filterStatus;
        const matchesOwner =
          !this.filterMine || item.OwnerId === this.currentUserId;
        return matchesStatus && matchesOwner;
      })
      .map((item) => ({
        ...item,
        responseText:
          this.selectedType === "Question"
            ? item.Question__c
            : item.Prayer_Request__c
      }));
  }

  get hasResults() {
    const items = this.filteredItems;
    return items && items.length > 0;
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

  get selectedTypeLabel() {
    return this.selectedType === "Question" ? "questions" : "prayer requests";
  }

  get questionsButtonClass() {
    return this.selectedType === "Question"
      ? "type-pill type-pill_active"
      : "type-pill";
  }

  get prayerButtonClass() {
    return this.selectedType === "Prayer"
      ? "type-pill type-pill_active"
      : "type-pill";
  }
}
