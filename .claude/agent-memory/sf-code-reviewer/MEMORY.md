# SF Code Reviewer - Agent Memory

## Project Patterns & Conventions

### Inherited Pattern Issues (from flWTRLiveEvent)

- `lwc:if={error}` / `lwc:if={isLoading}` / `lwc:else` chain in parent event components is structurally broken -- error and main content can render simultaneously. Present in both `flWTRLiveEvent.html` and `flEventTeam.html`.
- Inline `style` attributes on spinner containers (height, margin-top, font-weight) exist in `flWTRLiveEvent.html` and were cloned forward.
- `console.warn` in geo catch block is present in both `flWTRLiveEvent.js` and `flEventTeam.js`.
- `STORAGE_KEY` as instance property rather than const/static in both event hub components.
- `event.target.dataset.id` used in claim handlers across `flQuestions.js`, `flPrayerRequests.js`, and `flEventTeamResponses.js` -- should be `event.currentTarget.dataset.id`.

### Wire Adapter Patterns

- All wire handlers store raw result for `refreshApex` (correct).
- Original `flQuestions.js` and `flPrayerRequests.js` clear `this.error = undefined` on wire success; `flEventTeamResponses.js` missed this.
- `@track` is used on arrays/primitives in existing components but is unnecessary since API 40+.

### CSS & Brand

- Brand colors defined as CSS custom properties on `:host` in each component (not shared).
- `--sds-c-*` hooks are legacy; `--slds-c-*` hooks are SLDS 2 equivalents. Both are currently duplicated.
- `border-radius: 0px` is intentional per UI style guide "Cards" style.

### Meta XML

- Parent/page-level components: `isExposed=true` with targets.
- Child components: `isExposed=false` with no targets.
- `masterLabel` and `description` often missing -- should be added for discoverability.

### Testing

- LWC Jest tests are expected in `__tests__/` subdirectory per component.
- Apex tests follow `@TestSetup` + `System.assertEquals()` conventions.
- No LWC tests exist yet for `flEventTeam` or `flEventTeamResponses` as of 2026-02-24.

### Prettier

- Project uses Prettier with `prettier-plugin-apex`. Must run `npm install` first.
- Use `npx prettier --write` or `npm run prettier` to format.
- All files must pass `npm run prettier:verify` before commit. Husky pre-commit hook enforces this.
