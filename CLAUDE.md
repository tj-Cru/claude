# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FLCL_1 is a Salesforce DX project for faith-based event management — handling registrations, check-ins, prayer requests, survey responses, and live event operations. API version: 65.0.

## Project Config
- Priortize low code, no code over code when appropriate - only use apex when best practices indicate it should be used.

## Agent Delegation

This project uses specialized sub-agents. **Do not handle the following tasks directly** — always delegate them to the appropriate agent using the Task tool:

| Task Type | Agent |
|---|---|
| Flows, custom objects, fields, validation rules, page layouts, permission sets, record types, custom metadata, sharing rules, compact layouts, list views, custom labels | `sf-admin-configurator` |
| Apex classes, triggers, test classes, LWC components | `sf-apex-lwc-developer` |
| Code review of Apex or LWC after writing | `sf-code-reviewer` |

When a user requests anything in the left column above, stop and delegate immediately. Do not attempt to build declarative Salesforce configuration yourself.

Full Apex and LWC coding standards live in `.claude/agents/sf-apex-lwc-developer.md`.

## Branding & UI
See `docs/ui-style-guide.md` for full branding, color, typography, and UI component guidelines.

# General Salesforce Development Requirements

- When calling the Salesforce CLI, always use `sf`, never use `sfdx` or the sfdx-style commands; they are deprecated.
- Use `https://github.com/salesforcecli/mcp` MCP tools (if available) before Salesforce CLI commands.
- When creating new objects, classes and triggers, always create XML metadata files for objects (.object-meta.xml), classes (.cls-meta.xml) and triggers (.trigger-meta.xml).

## Commands

### Salesforce Org Operations — prefer MCP, fall back to SF CLI

Use the **Salesforce MCP server tools** for all org interactions. Only fall back to SF CLI when the MCP tool is unavailable or fails.

| Operation | MCP Tool (preferred) | SF CLI fallback |
|---|---|---|
| Resolve org username | `mcp__Salesforce__get_username` | `sf org list` |
| List all orgs | `mcp__Salesforce__list_all_orgs` | `sf org list` |
| Deploy to org | `mcp__Salesforce__deploy_metadata` | `sf project deploy start` |
| Retrieve from org | `mcp__Salesforce__retrieve_metadata` | `sf project retrieve start` |
| Run Apex tests | `mcp__Salesforce__run_apex_test` | `sf apex run test --result-format human` |
| Run single Apex test class | `mcp__Salesforce__run_apex_test` with `classNames` | `sf apex run test --class-names <ClassName>` |
| Run single Apex test method | `mcp__Salesforce__run_apex_test` with `classNames` + `methodNames` | `sf apex run test --tests <Class.method>` |
| Run SOQL query | `mcp__Salesforce__run_soql_query` | `sf data query --query "..."` |
| Assign permission set | `mcp__Salesforce__assign_permission_set` | `sf org assign permset` |
| Resume long-running job | `mcp__Salesforce__resume_tool_operation` | `sf project deploy resume --job-id <id>` |
| Scan Apex for antipatterns | `mcp__Salesforce__scan_apex_class_for_antipatterns` | — |
| Org authentication (login) | *(not available via MCP)* | `sf org login web` |
| Execute anonymous Apex | *(not available via MCP)* | `sf apex run --file scripts/apex/<file>` |

### NPM Scripts
```bash
npm install                      # Install dependencies
npm run lint                     # ESLint on Aura and LWC JS files
npm run prettier                 # Format all code files
npm run prettier:verify          # Verify formatting without changes
npm test                         # Run LWC Jest unit tests
npm run test:unit:watch          # Run tests in watch mode
npm run test:unit:coverage       # Run tests with coverage report
npm run prepare                  # Install Husky git hooks (run after npm install)
```

### Single LWC Test
```bash
npx sfdx-lwc-jest --testPathPattern="<componentName>"
```

## Architecture

All source lives under `force-app/main/default/`. The app has four main layers:

### Apex Controllers (`classes/`)
Six controllers expose `@AuraEnabled` methods to LWC components:
- `flRegistrationsController` — registration queries and check-in logic
- `flPrayerRequestsController` — prayer request retrieval and claiming
- `flQuestionsController` — survey question retrieval
- `flWTRLiveEventController` / `flWTRGuestLocationController` — live event state for WTR event series
- `flEventRecordSharingAction` — `@InvocableMethod` called by Flows to share records

All controllers use `without sharing` to support public-facing event access. `Database.insert/update` calls use `false` (partial success) for error tolerance.

### LWC Components (`lwc/`)
~15 components. Key ones:
- `flRegistrations` — registration list with filtering and check-in capability
- `flPrayerRequests` — display/claim prayer requests
- `flQuestions` — survey question display
- `flEventFeedback` — feedback collection form
- `flBigTextArea` — custom Flow screen component for large text input
- `flWTR*` components — WTR event series-specific UI

### Flows (`flows/`)
~50 flows covering the bulk of business logic:
- **Trigger flows**: Automate on Event, Registration, Survey Response insert/update
- **Screen flows**: User-facing check-in and event management flows
- **Invocable flows**: Called from triggers or other automation, including `flEventRecordSharingAction`

### Custom Objects (`objects/`)
Core objects:
- `Event_Details__c` — event records (parent of most other objects)
- `Registration__c` — attendee registrations
- `Survey_Response__c` — prayer requests and survey answers
- `Event_Worker__c` — volunteers/staff
- `Ministry_Group__c` — ministry group management
- `Staging_*` objects — integration staging

## Code Quality

**Pre-commit hook** (Husky) automatically runs:
1. Prettier formatting on staged files (`.cls`, `.html`, `.js`, `.xml`, etc.)
2. ESLint on staged JS files
3. Jest on related LWC test files (`--bail --findRelatedTests --passWithNoTests`)

**ESLint contexts**: Aura files use `@salesforce/eslint-plugin-aura` with Locker rules; LWC files use `@salesforce/eslint-config-lwc` recommended.

## Test Conventions

**Apex tests** (`*Test.cls` suffix):
- `@TestSetup` static method creates shared test data (venue Account, Event_Details__c, Users)
- Tests cover success path, null/invalid input, and exception handling
- Use `System.assertEquals()` / `System.assert()` for assertions

**LWC tests** (`.test.js` colocated with component):
- Framework: `@salesforce/sfdx-lwc-jest`
- `.forceignore` excludes test files from org deploys
