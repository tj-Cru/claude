import { LightningElement, track } from 'lwc';
import getRelevantEvents from '@salesforce/apex/flWTRLiveEventController.getRelevantEvents';

export default class FlWTRLiveEvent extends LightningElement {
    @track events = [];
    @track error;
    
    selectedEventId;
    selectedEventName;
    activeChild = null; 
    isLoading = true;

    // Persistence Key.
    STORAGE_KEY = 'FL_WTR_LAST_EVENT_ID';

    connectedCallback() {
        this.initializeComponent();
    }

    async initializeComponent() {
        // 1 Check Local Storage first (Data Persistence)
        const cachedId = localStorage.getItem(this.STORAGE_KEY);
        const cachedName = localStorage.getItem(this.STORAGE_KEY + '_NAME');

        if (cachedId) {
            this.selectedEventId = cachedId;
            this.selectedEventName = cachedName;
            this.isLoading = false;
            return;
        }

        // 2. If no cache, Get Location & Fetch Data
        try {
            const coords = await this.getCurrentPosition();
            await this.fetchEvents(coords.latitude, coords.longitude);
        } catch (e) {
            // If Geo fails/denied, fetch events without coordinates (returns full list)
            console.warn('Geo lookup failed or denied, fetching full list.');
            await this.fetchEvents(null, null);
        }
    }

    async fetchEvents(lat, long) {
        this.isLoading = true;
        try {
            const result = await getRelevantEvents({ userLat: lat, userLong: long });
            this.events = result;

            // LOGIC: 
            // If we provided coordinates AND exactly 1 record returned, 
            // it means Apex found a Geo-match. Auto-select it.
            if (lat && result.length === 1) {
                this.selectEvent(result[0]);
            } 
            
        } catch (error) {
            this.error = 'Error loading events: ' + (error.body ? error.body.message : error.message);
        } finally {
            this.isLoading = false;
        }
    }
    
    getCurrentPosition() {
            return new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error('Geolocation not supported'));
                } else {
                    navigator.geolocation.getCurrentPosition(
                        (position) => resolve(position.coords),
                        (error) => reject(error),
                        { 
                            enableHighAccuracy: false, // CHANGE: False is faster/reliable for Wi-Fi iPads
                            timeout: 10000,           // CHANGE: Increased to 10s for slower networks
                            maximumAge: 60000         // CHANGE: Accept cached position from last 60s
                        } 
                    );
                }
            });
        }

    // --- Interaction Handlers ---

    handleEventSelect(event) {
        // We use currentTarget here to support the custom HTML button structure
        const eventId = event.currentTarget.value;
        const selectedEvent = this.events.find(e => e.Id === eventId);
        this.selectEvent(selectedEvent);
    }

    selectEvent(eventRecord) {
        this.selectedEventId = eventRecord.Id;
        this.selectedEventName = eventRecord.Name;
        // Persist
        localStorage.setItem(this.STORAGE_KEY, eventRecord.Id);
        localStorage.setItem(this.STORAGE_KEY + '_NAME', eventRecord.Name);
    }

    clearSelection() {
        this.selectedEventId = null;
        this.selectedEventName = null;
        this.activeChild = null;
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.STORAGE_KEY + '_NAME');
        
        // Return to list view
        this.fetchEvents(null, null);
    }

    handleRefresh() {
        this.isLoading = true;
        this.initializeComponent();
    }

    // Navigation
    openRegistrations() { this.activeChild = 'registrations'; }
    openQuestions() { this.activeChild = 'questions'; }
    openPrayer() { this.activeChild = 'prayer'; }
    openFeedback() { this.activeChild = 'feedback'; }
    handleBackToMenu() { this.activeChild = null; }

    // --- Template Getters ---

    get isNoEvents() {
        return !this.isLoading && (!this.events || this.events.length === 0);
    }

    get showEventList() {
        return !this.isLoading && this.events && this.events.length > 0 && !this.selectedEventId;
    }

    // NEW: Only show the parent header (Location/Global Refresh) if we are on the main menu
    get showParentHeader() {
        return !this.activeChild;
    }

    get isRegistrations() { return this.activeChild === 'registrations'; }
    get isQuestions() { return this.activeChild === 'questions'; }
    get isPrayer() { return this.activeChild === 'prayer'; }
    get isFeedback() { return this.activeChild === 'feedback'; }
}