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

  connectedCallback() {
    this.initializeComponent();
  }

  async initializeComponent() {
    const cachedId = localStorage.getItem(STORAGE_KEY);
    const cachedName = localStorage.getItem(STORAGE_KEY + "_NAME");

    if (cachedId) {
      this.selectedEventId = cachedId;
      this.selectedEventName = cachedName;
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
    this.fetchEvents(null, null);
  }

  handleRefresh() {
    this.isLoading = true;
    this.initializeComponent();
  }

  openRegistrations() {
    this.activeChild = "registrations";
  }
  openResponses() {
    this.activeChild = "responses";
  }
  openFeedback() {
    this.activeChild = "feedback";
  }
  handleBackToMenu() {
    this.activeChild = null;
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
  get isFeedback() {
    return this.activeChild === "feedback";
  }
}
