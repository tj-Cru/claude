import { LightningElement } from "lwc";
import getRelevantEvents from "@salesforce/apex/flWTRLiveEventController.getRelevantEvents";

const STORAGE_KEY = "FL_EVENT_TEAM_LAST_EVENT_ID";

export default class FlEventTeam extends LightningElement {
  events = [];
  error;

  selectedEventId;
  selectedEventName;
  activeChild = null;
  isLoading = true;

  pendingRecordId;
  pendingRecordObjectApiName;
  pendingRecordEditFlow;
  pendingRecordFieldList;
  priorChild;

  connectedCallback() {
    this.initializeComponent();
  }

  async initializeComponent() {
    const cachedId = localStorage.getItem(STORAGE_KEY);
    const cachedName = localStorage.getItem(STORAGE_KEY + "_NAME");
    const cachedView = localStorage.getItem(STORAGE_KEY + "_VIEW");

    if (cachedId) {
      this.selectedEventId = cachedId;
      this.selectedEventName = cachedName;
      // Never restore 'detail' on reload — pendingRecordId is not persisted
      this.activeChild = cachedView === "detail" ? null : cachedView || null;
      this.isLoading = false;
      return;
    }

    try {
      const coords = await this.getCurrentPosition();
      await this.fetchEvents(coords.latitude, coords.longitude);
    } catch {
      await this.fetchEvents(null, null);
    }
  }

  async fetchEvents(lat, long) {
    this.isLoading = true;
    try {
      const result = await getRelevantEvents({ userLat: lat, userLong: long });
      this.events = result;
      if (lat && result.length === 1) {
        this.selectEvent(result[0]);
      }
    } catch (error) {
      this.error =
        "Error loading events: " +
        (error.body ? error.body.message : error.message);
    } finally {
      this.isLoading = false;
    }
  }

  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve(position.coords),
          (err) => reject(err),
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      }
    });
  }

  handleEventSelect(event) {
    const eventId = event.currentTarget.value;
    const selectedEvent = this.events.find((e) => e.Id === eventId);
    this.selectEvent(selectedEvent);
  }

  selectEvent(eventRecord) {
    this.selectedEventId = eventRecord.Id;
    this.selectedEventName = eventRecord.Name;
    localStorage.setItem(STORAGE_KEY, eventRecord.Id);
    localStorage.setItem(STORAGE_KEY + "_NAME", eventRecord.Name);
  }

  clearSelection() {
    this.selectedEventId = null;
    this.selectedEventName = null;
    this.activeChild = null;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY + "_NAME");
    localStorage.removeItem(STORAGE_KEY + "_VIEW");
    this.fetchEvents(null, null);
  }

  handleRefresh() {
    this.isLoading = true;
    this.initializeComponent();
  }

  openRegistrations() {
    this.activeChild = "registrations";
    localStorage.setItem(STORAGE_KEY + "_VIEW", "registrations");
  }
  openResponses() {
    this.activeChild = "responses";
    localStorage.setItem(STORAGE_KEY + "_VIEW", "responses");
  }
  handleBackToMenu() {
    this.activeChild = null;
    localStorage.removeItem(STORAGE_KEY + "_VIEW");
  }

  handleViewRecord(event) {
    this.priorChild = this.activeChild;
    this.pendingRecordId = event.detail.recordId;
    this.pendingRecordObjectApiName = event.detail.objectApiName;
    if (event.detail.objectApiName === "Registration__c") {
      this.pendingRecordEditFlow = "Registration_Screen_Flow_Event_Team_Edit";
      this.pendingRecordFieldList =
        "Name,Registration_Status__c,Registration_Type__c,Registrant_Type__c,Contact_GC__c,Waiver__c,Last_Event__c,First_Name__c,Last_Name__c";
    } else {
      this.pendingRecordEditFlow = null;
      this.pendingRecordFieldList =
        "Name,Status__c,Prayer_Request__c,Question__c,CreatedDate";
    }
    this.activeChild = "detail";
    // Do not persist 'detail' — pendingRecordId is memory-only and cannot be restored on reload
  }

  handleBackFromDetail() {
    this.activeChild = this.priorChild;
    if (this.priorChild) {
      localStorage.setItem(STORAGE_KEY + "_VIEW", this.priorChild);
    } else {
      localStorage.removeItem(STORAGE_KEY + "_VIEW");
    }
    this.pendingRecordId = null;
    this.pendingRecordObjectApiName = null;
    this.pendingRecordEditFlow = null;
    this.pendingRecordFieldList = null;
    this.priorChild = null;
  }

  get isNoEvents() {
    return !this.isLoading && (!this.events || this.events.length === 0);
  }

  get showEventList() {
    return (
      !this.isLoading &&
      this.events &&
      this.events.length > 0 &&
      !this.selectedEventId
    );
  }

  get showParentHeader() {
    return !this.activeChild;
  }

  get isRegistrations() {
    return this.activeChild === "registrations";
  }
  get isResponses() {
    return this.activeChild === "responses";
  }
  get isDetail() {
    return this.activeChild === "detail";
  }
}
