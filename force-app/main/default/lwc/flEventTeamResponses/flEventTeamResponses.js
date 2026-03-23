import { LightningElement, api, wire } from "lwc";
import { refreshApex } from "@salesforce/apex";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { getObjectInfo, getPicklistValues } from "lightning/uiObjectInfoApi";
import getQuestions from "@salesforce/apex/flQuestionsController.getQuestions";
import claimQuestion from "@salesforce/apex/flQuestionsController.claimQuestion";
import getExportData from "@salesforce/apex/flQuestionsController.getExportData";
import updateSortOrder from "@salesforce/apex/flQuestionsController.updateSortOrder";
import getPrayerRequests from "@salesforce/apex/flPrayerRequestsController.getPrayerRequests";
import claimPrayerRequest from "@salesforce/apex/flPrayerRequestsController.claimPrayerRequest";
import USER_ID from "@salesforce/user/Id";

import SURVEY_RESPONSE_OBJECT from "@salesforce/schema/Survey_Response__c";
import STATUS_FIELD from "@salesforce/schema/Survey_Response__c.Status__c";

const STORAGE_TYPE_KEY = "FL_RESPONSES_TYPE";
const STORAGE_STATUS_KEY = "FL_RESPONSES_STATUS";

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

  connectedCallback() {
    // When component re-mounts (e.g. returning from record detail edit),
    // refresh wire data to pick up any changes made while unmounted.
    Promise.resolve().then(() => {
      const promises = [];
      if (this.wiredQuestionsResult) {
        promises.push(refreshApex(this.wiredQuestionsResult));
      }
      if (this.wiredPrayersResult) {
        promises.push(refreshApex(this.wiredPrayersResult));
      }
      if (promises.length) {
        Promise.all(promises).catch(() => {});
      }
    });
  }

  // ── Stats tracking (computed from unfiltered wire data) ──────────────
  _questionTotal = 0;
  _questionRespondedCount = 0;
  _questionRespondedPercent = 0;
  _prayerTotal = 0;
  _prayerRespondedCount = 0;
  _prayerRespondedPercent = 0;
  selectedType = localStorage.getItem(STORAGE_TYPE_KEY) || "Prayer";

  currentUserId = USER_ID;
  filterStatus = localStorage.getItem(STORAGE_STATUS_KEY) || "All";
  filterMine = false;
  _isExporting = false;

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
      this._computeStats();
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
      this._computeStats();
    } else if (error) {
      this.error = error;
      this.prayerRequests = [];
      this._prayersLoaded = true;
    }
  }

  get isLoading() {
    if (this.selectedType === "Question") return !this._questionsLoaded;
    return !this._prayersLoaded;
  }

  selectQuestions() {
    this.selectedType = "Question";
    localStorage.setItem(STORAGE_TYPE_KEY, "Question");
    this.handleRefresh();
  }

  selectPrayer() {
    this.selectedType = "Prayer";
    localStorage.setItem(STORAGE_TYPE_KEY, "Prayer");
    this.handleRefresh();
  }

  async handleRefresh() {
    // Reset loading state for the active type (spinner only for visible list)
    if (this.selectedType === "Question") {
      this._questionsLoaded = false;
    } else {
      this._prayersLoaded = false;
    }
    try {
      // Refresh both wires so stats are always current for both types
      await Promise.all([
        refreshApex(this.wiredQuestionsResult),
        refreshApex(this.wiredPrayersResult)
      ]);
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
    localStorage.setItem(STORAGE_STATUS_KEY, this.filterStatus);
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
          detail: {
            recordId,
            objectApiName: "Survey_Response__c",
            type: this.selectedType
          }
        })
      );
    }
  }

  get isExportDisabled() {
    if (this._isExporting) return true;
    const source =
      this.selectedType === "Question" ? this.questions : this.prayerRequests;
    return !source || source.length === 0;
  }

  async handleExport() {
    this._isExporting = true;
    try {
      const records = await getExportData({
        eventId: this.eventId,
        filterType: this.selectedType,
        filterStatus: this.filterStatus
      });

      if (!records || records.length === 0) {
        this.dispatchEvent(
          new ShowToastEvent({
            title: "No Data",
            message: "No records to export.",
            variant: "info"
          })
        );
        return;
      }

      const csv = this._buildCsv(records);
      const BOM = "\uFEFF";

      const eventName = (this.eventName || "Event").replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );
      const today = new Date().toISOString().slice(0, 10);
      const statusPart =
        this.filterStatus !== "All" ? `_${this.filterStatus}` : "";
      const fileName = `${eventName}_${this.selectedType}${statusPart}_${today}.csv`;

      const encodedCsv = encodeURIComponent(BOM + csv);
      const dataUri = "data:text/csv;charset=utf-8," + encodedCsv;
      const anchor = document.createElement("a");
      anchor.href = dataUri;
      anchor.download = fileName;
      anchor.click();
    } catch (err) {
      this.dispatchEvent(
        new ShowToastEvent({
          title: "Export Error",
          message: err.body ? err.body.message : err.message,
          variant: "error"
        })
      );
    } finally {
      this._isExporting = false;
    }
  }

  _buildCsv(records) {
    const columns = [
      { header: "Name", field: "Name" },
      { header: "Type", field: "Type__c" },
      { header: "Status", field: "Status__c" },
      { header: "Created Date", field: "CreatedDate" },
      { header: "Question", field: "Question__c" },
      { header: "Prayer Request", field: "Prayer_Request__c" },
      { header: "Claimed By", field: "Claimed_By__r.Name" },
      { header: "Comment Log", field: "Comment_Log__c" },
      { header: "Attendee Name", field: "Attendee__r.Name" },
      { header: "Event Name", field: "Event_Detail__r.Name" }
    ];

    const headerRow = columns
      .map((col) => this._escapeCsvValue(col.header))
      .join(",");

    const dataRows = records.map((record) =>
      columns
        .map((col) => {
          let value;
          if (col.field.includes(".")) {
            const parts = col.field.split(".");
            value = record[parts[0]] ? record[parts[0]][parts[1]] || "" : "";
          } else {
            value = record[col.field] || "";
          }
          return this._escapeCsvValue(String(value));
        })
        .join(",")
    );

    return [headerRow, ...dataRows].join("\r\n");
  }

  _escapeCsvValue(value) {
    if (value == null) return '""';
    let str = String(value);
    // Prevent CSV formula injection — prefix dangerous leading characters
    if (/^[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }
    str = str.replace(/"/g, '""').replace(/[\r\n]+/g, " ");
    return `"${str}"`;
  }

  async handleMoveUp(event) {
    const recordId = event.currentTarget.dataset.id;
    await this._swapItems(recordId, -1);
  }

  async handleMoveDown(event) {
    const recordId = event.currentTarget.dataset.id;
    await this._swapItems(recordId, 1);
  }

  async _swapItems(recordId, direction) {
    const items = [...this.filteredItems];
    const currentIndex = items.findIndex((item) => item.Id === recordId);
    const targetIndex = currentIndex + direction;

    if (targetIndex < 0 || targetIndex >= items.length) return;

    // Move item in the array
    const [moved] = items.splice(currentIndex, 1);
    items.splice(targetIndex, 0, moved);

    // Reassign sequential sort orders to all visible items — handles gaps
    // from status-filtered items gracefully
    const updates = items.map((item, idx) => ({
      id: item.Id,
      sortOrder: idx + 1
    }));

    const sourceKey =
      this.selectedType === "Question" ? "questions" : "prayerRequests";
    this[sourceKey] = [...this[sourceKey]].map((item) => {
      const upd = updates.find((u) => u.id === item.Id);
      if (upd) {
        return { ...item, Sort_Order__c: upd.sortOrder };
      }
      return item;
    });

    try {
      await updateSortOrder({ updates: JSON.stringify(updates) });
    } catch (e) {
      this.dispatchEvent(
        new ShowToastEvent({
          title: "Error",
          message: e.body ? e.body.message : "Could not update sort order.",
          variant: "error"
        })
      );
      await this.handleRefresh();
    }
  }

  handleBack() {
    this.dispatchEvent(new CustomEvent("back"));
  }

  // ── Stats computation ─────────────────────────────────────────────
  _computeStats() {
    // Questions
    if (this.questions && this.questions.length > 0) {
      this._questionTotal = this.questions.length;
      this._questionRespondedCount = this.questions.filter(
        (q) => q.Status__c === "Responded" || q.Status__c === "Removed"
      ).length;
      this._questionRespondedPercent = Math.round(
        (this._questionRespondedCount / this._questionTotal) * 100
      );
    } else {
      this._questionTotal = 0;
      this._questionRespondedCount = 0;
      this._questionRespondedPercent = 0;
    }

    // Prayer
    if (this.prayerRequests && this.prayerRequests.length > 0) {
      this._prayerTotal = this.prayerRequests.length;
      this._prayerRespondedCount = this.prayerRequests.filter(
        (p) => p.Status__c === "Responded" || p.Status__c === "Removed"
      ).length;
      this._prayerRespondedPercent = Math.round(
        (this._prayerRespondedCount / this._prayerTotal) * 100
      );
    } else {
      this._prayerTotal = 0;
      this._prayerRespondedCount = 0;
      this._prayerRespondedPercent = 0;
    }
  }

  get hasStatsData() {
    return (
      !this.isLoading && (this._questionTotal > 0 || this._prayerTotal > 0)
    );
  }

  get questionTotal() {
    return this._questionTotal;
  }

  get questionRespondedCount() {
    return this._questionRespondedCount;
  }

  get questionRespondedPercent() {
    return this._questionRespondedPercent;
  }

  get prayerTotal() {
    return this._prayerTotal;
  }

  get prayerRespondedCount() {
    return this._prayerRespondedCount;
  }

  get prayerRespondedPercent() {
    return this._prayerRespondedPercent;
  }

  get _statusLabelMap() {
    const map = {};
    if (this.statusPicklistValues && this.statusPicklistValues.data) {
      for (const entry of this.statusPicklistValues.data.values) {
        map[entry.value] = entry.label;
      }
    }
    return map;
  }

  get filteredItems() {
    const source =
      this.selectedType === "Question" ? this.questions : this.prayerRequests;
    if (!source) return [];

    const labelMap = this._statusLabelMap;

    let items = source
      .filter((item) => {
        const matchesStatus =
          this.filterStatus === "All" || item.Status__c === this.filterStatus;
        const matchesOwner =
          !this.filterMine || item.Claimed_By__c === this.currentUserId;
        return matchesStatus && matchesOwner;
      })
      .map((item) => ({
        ...item,
        responseText:
          this.selectedType === "Question"
            ? item.Question__c
            : item.Prayer_Request__c,
        statusLabel: labelMap[item.Status__c] || item.Status__c,
        isResponded: item.Status__c === "Responded",
        isClaimed: item.Status__c === "Pending"
      }));

    if (this.filterMine) {
      items.sort((a, b) => {
        const aOrder = a.Sort_Order__c;
        const bOrder = b.Sort_Order__c;
        if (aOrder == null && bOrder == null) {
          return a.CreatedDate < b.CreatedDate ? 1 : -1;
        }
        if (aOrder == null) return 1;
        if (bOrder == null) return -1;
        return aOrder - bOrder;
      });
    } else {
      items.sort((a, b) => {
        if (!a.CreatedDate) return 1;
        if (!b.CreatedDate) return -1;
        return a.CreatedDate < b.CreatedDate ? 1 : -1;
      });
    }

    return items.map((item, index, arr) => ({
      ...item,
      showUpArrow: this.filterMine && index > 0,
      showDownArrow: this.filterMine && index < arr.length - 1,
      showArrows: this.filterMine
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
