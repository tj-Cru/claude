import { LightningElement, track } from "lwc";
// REMOVED: import findEvent from "@salesforce/apex/flWTRGuestLocationController.findEvent";
import getOpenSurveyEvents from "@salesforce/apex/flWTRGuestLocationController.getOpenSurveyEvents";
import getRegistrationFirstName from "@salesforce/apex/flWTRGuestLocationController.getRegistrationFirstName";

export default class FlWTRGuestLocation extends LightningElement {
  // --- Primitives ---
  selectedEventId;
  selectedEventName;
  selectionMethod;
  error;
  isLoading = true;
  selectedView;

  // --- State for Registration ---
  selectedRegistrationId; // Stores the ID from the lookup component
  pendingView; // Remembers which button was clicked (e.g., 'oneness')
  firstName; // Stores the fetched First Name

  // --- Arrays ---
  @track openEvents = [];

  // --- Header Text Logic ---
  get headerText() {
    if (this.showSuccess) {
      // Check if we are in one of the specific views and have a name
      const isPersonalizedView =
        this.showOneness || this.showMarriage || this.showFeedback;

      if (isPersonalizedView && this.firstName) {
        return `${this.firstName} - ${this.selectedEventName}`;
      }
      return this.selectedEventName;
    }
    return "Find Your Event";
  }

  // --- Getters for HTML conditional rendering ---
  get showSuccess() {
    return !this.isLoading && this.selectedEventId && this.selectedEventName;
  }
  get showHome() {
    // Show home ONLY if no specific view is selected
    return !this.selectedView;
  }
  get isGeoSelection() {
    return this.selectionMethod === "geo";
  }
  get isListSelection() {
    return this.selectionMethod === "list";
  }
  get showFallbackList() {
    return (
      !this.isLoading && !this.selectedEventId && this.openEvents.length > 0
    );
  }
  get showFinalError() {
    return (
      !this.isLoading &&
      !this.selectedEventId &&
      this.openEvents.length === 0 &&
      this.error
    );
  }

  // --- Getters for showing the correct child/view ---
  get showRegistrationLookup() {
    return this.selectedView === "lookup";
  }
  get showAskQuestion() {
    return this.selectedView === "ask";
  }
  get showRequestPrayer() {
    return this.selectedView === "prayer";
  }
  get showOneness() {
    return this.selectedView === "oneness";
  }
  get showMarriage() {
    return this.selectedView === "marriage";
  }
  get showFeedback() {
    return this.selectedView === "feedback";
  }

  // --- Lifecycle Hooks ---
  connectedCallback() {
    this.getLocationAndFindEvent();
  }

  // --- Geolocation Logic ---
  getLocationAndFindEvent() {
    if (navigator.geolocation) {
      // Define options to prevent hanging and ensure compatibility
      const geoOptions = {
        enableHighAccuracy: false, // Use 'false' for faster, coarse location (Wi-Fi/Cell)
        timeout: 10000,            // Wait 10 seconds max before triggering error
        maximumAge: 60000          // Accept cached location from last 60 seconds
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.findEventByCoords(
            position.coords.latitude,
            position.coords.longitude
          );
        },
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              this.error =
                "Location access was denied. Please select an event from the list below.";
              break;
            default:
              this.error =
                "Could not get your location. Please select an event from the list below.";
              break;
          }
          this.loadOpenSurveyEvents(false);
        },
        geoOptions 
      );
    } else {
      this.error =
        "Geolocation is not supported by this browser. Please select an event from the list below.";
      this.loadOpenSurveyEvents(false);
    }
  }

  // UPDATED: Finds the nearest event using Client-Side Logic instead of Apex
  findEventByCoords(lat, lon) {
    // 1. Fetch ALL open events (Cached by CDN/Browser)
    getOpenSurveyEvents()
      .then((result) => {
        if (result && result.length > 0) {
          
          // 2. Perform distance calculation in JavaScript
          const nearbyEvent = this.findClosestEvent(result, lat, lon);

          if (nearbyEvent) {
            // Success: Found a match nearby
            this.selectedEventId = nearbyEvent.Id;
            this.selectedEventName = nearbyEvent.Name;
            this.selectionMethod = "geo";
            this.error = undefined;
            this.isLoading = false;
          } else {
            // No match within threshold; populate the list for manual selection
            // We reuse the result we just fetched to populate the list
            this.openEvents = result.map((event) => ({
              label: event.Name,
              value: event.Id
            }));
            
            this.error = "Please select from the list of all active events.";
            this.isLoading = false;
          }
        } else {
          // No events in system at all
          this.loadOpenSurveyEvents(true);
        }
      })
      .catch((error) => {
        this.error =
          "Error finding nearby event. Please select an event from the list below.";
        this.loadOpenSurveyEvents(false);
      });
  }

  // --- NEW: Client-Side Helper to Filter Closest Event ---
  findClosestEvent(events, userLat, userLon) {
    let closestEvent = null;
    let minDistance = 1.0; // Threshold in Miles (same as original Apex)

    events.forEach(evt => {
      // Ensure the event has valid coordinates before calculating
      if (evt.Event_Geo__Latitude__s && evt.Event_Geo__Longitude__s) {
        const dist = this.getDistanceFromLatLonInMiles(
          userLat, 
          userLon, 
          evt.Event_Geo__Latitude__s, 
          evt.Event_Geo__Longitude__s
        );
        
        if (dist < minDistance) {
          minDistance = dist;
          closestEvent = evt;
        }
      }
    });
    return closestEvent;
  }

  // --- NEW: Haversine Formula for Distance ---
  getDistanceFromLatLonInMiles(lat1, lon1, lat2, lon2) {
    const R = 3958.8; // Radius of the earth in miles
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in miles
  }

  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  // --- Existing Methods ---

  loadOpenSurveyEvents(geoSearchAttempted = false) {
    getOpenSurveyEvents()
      .then((result) => {
        if (result && result.length > 0) {
          this.openEvents = result.map((event) => ({
            label: event.Name,
            value: event.Id
          }));

          if (geoSearchAttempted) {
            this.error =
              "No active event was found at your location. Please select from the list of all active events.";
          } else if (this.error) {
            // Keep existing error
          } else {
            this.error = "Please select an event from the list below.";
          }
        } else {
          this.openEvents = [];
          if (geoSearchAttempted) {
            this.error =
              "Unfortunately, no active Weekend to Remember events were found at your location or anywhere else at this time.";
          } else {
            this.error =
              "Unfortunately, there are no active Weekend to Remember events available at this time.";
          }
        }
      })
      .catch((error) => {
        this.error = "An error occurred loading the list of events.";
        this.openEvents = [];
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  handleEventSelection(event) {
    this.selectedEventId = event.detail.value;
    this.selectionMethod = "list";
    const selectedOption = this.openEvents.find(
      (opt) => opt.value === this.selectedEventId
    );
    if (selectedOption) {
      this.selectedEventName = selectedOption.label;
    }
    this.error = undefined;
    this.openEvents = [];
  }

  handleNavClick(event) {
    const view = event.target.dataset.view;

    if (view === "oneness" || view === "marriage" || view === "feedback") {
      if (this.selectedRegistrationId) {
        this.selectedView = view;
      } else {
        this.pendingView = view;
        this.selectedView = "lookup";
      }
    } else {
      this.selectedView = view;
    }
  }

  handleRegistrationSuccess(event) {
    this.selectedRegistrationId = event.detail; // Get the ID
    this.selectedView = this.pendingView; // Go to the screen we originally wanted
    this.pendingView = null; // Clear the pending state

    // Use Apex to fetch the name (Wire might fail due to Guest User permissions context)
    getRegistrationFirstName({ registrationId: this.selectedRegistrationId })
      .then((result) => {
        this.firstName = result;
      })
      .catch((error) => {
        console.error("Error fetching first name:", error);
        this.firstName = "";
      });
  }

  handleChildClose() {
    this.selectedView = null;
    this.pendingView = null;
    // The 'selectedRegistrationId' and 'firstName' are retained for the session
  }
}