# Agent Memory - SF Apex/LWC Developer

## LWC Component Architecture Patterns

### Parent Event Components (flWTRLiveEvent, flEventTeam)

- Use localStorage for event selection persistence (STORAGE_KEY pattern with \_NAME suffix)
- Geolocation-based auto-selection: if coords provided and exactly 1 result, auto-select
- `activeChild` string drives child rendering via `lwc:if` on computed getters (isRegistrations, etc.)
- `showParentHeader` getter hides parent header when child is active
- All use `flWTRLiveEventController.getRelevantEvents` for event loading
- CSS uses `wtr-*` brand variables and class prefixes

### Child Components (flQuestions, flPrayerRequests, flEventTeamResponses)

- Receive `eventId` and `eventName` via `@api`
- Dispatch `back` custom event to return to parent menu
- CSS uses `child-container`, `child-header`, `child-body` class structure
- Header actions: filter (stateful icon), status menu, back button, refresh
- Same brand CSS variables across all child components

### Brand CSS Variables

- `--wtr-green: #006C5B` (primary)
- `--wtr-soft-black: #24272A` (tile backgrounds)
- `--wtr-yellow: #F3BD48` (accent, left-border on text blocks)
- `--wtr-cool-grey: #898C8E` (weak text)
- Font: Akkurat/Roboto fallback

### Key Apex Controllers Used by LWC

- `flWTRLiveEventController.getRelevantEvents({userLat, userLong})` - event list
- `flQuestionsController.getQuestions({eventId})` - wire adapter, cacheable
- `flQuestionsController.claimQuestion({recordId})` - imperative
- `flPrayerRequestsController.getPrayerRequests({eventId})` - wire adapter, cacheable
- `flPrayerRequestsController.claimPrayerRequest({recordId})` - imperative

### Survey_Response\_\_c Fields Referenced

- Status**c (picklist), Question**c, Prayer_Request\_\_c, OwnerId, Owner.Name, CreatedDate, Name
