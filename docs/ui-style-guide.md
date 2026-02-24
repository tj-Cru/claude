# FamilyLife.com — UI Style Guide

Source: `docs/New-UI-Style-Guide (3).pdf`

---

## 01. Colors

### Primary & Secondary Colors

| Name          | Hex       | Usage                  |
|---------------|-----------|------------------------|
| Dark Green    | `#006C5B` | Primary brand color    |
| Off White     | `#F1F1F1` | Background             |
| Cool Grey     | `#898C8E` | Secondary text / UI    |
| Soft Black    | `#24272A` | Body text / headings   |
| Pink          | `#EBB1B9` | Accent                 |
| Blue          | `#7CA7AD` | Accent                 |
| Yellow        | `#F3BD48` | CTA buttons / accents  |
| Orange        | `#E57E3B` | Accent                 |
| Lightest Grey | `#F8F8F8` | Card backgrounds       |
| White         | `#FFFFFF` | Base                   |
| Hyperlink Blue| `#1573A2` | Links                  |

### Color Ramps
- Color ramps increment up and down from the primary/secondary in steps: 90, 70, 50, 30, 10, 5
- Apply tints/shades of Dark Green and other brand colors using these increments

---

## 02. Typography

### Font Families
- **Primary**: Akkurat Regular & Bold
- **Secondary**: Roboto Family
- **Italics**: Use Roboto Italic (not Akkurat Italic)

### Type Scale

| Style      | Font              | Size  |
|------------|-------------------|-------|
| Headline 1 | Akkurat Regular   | 60px  |
| Headline 2 | Akkurat Regular   | 48px  |
| Headline 3 | Akkurat Bold      | 34px  |
| Headline 4 | Akkurat Regular   | 24px  |
| Headline 5 | Akkurat Bold      | 20px  |
| Headline 6 | Akkurat Bold      | 20px  |
| Body 1     | Akkurat Regular   | 16px  |
| Body 2     | Akkurat Regular   | 14px  |
| Button 1   | Akkurat Bold      | 16px  |
| Button 2   | Akkurat Bold      | 14px  |
| Caption    | Akkurat Regular   | 12px  |
| CAPTION    | Akkurat Regular, All Caps | 10px |

---

## 03. Icons

- Height and width: **24px**
- Stroke weight: **1px**
- Standard set includes: arrow right, checkmark, chevrons, hamburger menu, heart, share, play, mail, RSS, Facebook, YouTube, Apple

---

## 04. Buttons

### Button Heights
- Average: **45px**
- Minimum: **30px** (category tags only)
- Maximum: **60px**

### Button Types

| Type                | Style                                      |
|---------------------|--------------------------------------------|
| Primary CTA         | Filled Yellow (`#F3BD48`), rounded pill    |
| Primary Hover State | Slightly darker Yellow fill                |
| Secondary CTA       | Outlined (no fill), rounded pill           |
| Text Link CTA       | Hyperlink Blue (`#1573A2`) with arrow `→`  |
| Category Tag        | Small pill, muted/teal background          |
| Icon Button         | Yellow fill, icon centered (e.g. search)   |

---

## 05. Text Fields

| State         | Style                                              |
|---------------|----------------------------------------------------|
| Default       | Outlined box, placeholder text, icon prefix        |
| Active/Focus  | Dark Green (`#006C5B`) border highlight            |
| Error         | Pink/Red border, error message in pink below field |
| Textarea      | Multi-line outlined box with resize handle         |

- Label floats above field when active (material-style)
- Required fields marked with `*`

---

## 06. Selectors

### Filter Chips
- Inactive: outlined pill, no fill
- Active: Dark Green fill with checkmark, white text

### Page Selectors
- Current page: Yellow (`#F3BD48`) filled circle
- "Next page": Yellow filled pill button

### Radio Buttons
- Selected: Dark Green fill with white center dot
- Unselected: outlined circle
- Disabled: outlined, greyed label

### Checkboxes
- Checked: Dark Green fill with white checkmark
- Unchecked: outlined square
- Disabled: outlined, greyed label

### Dropdowns
- Outlined box with chevron down
- Options list drops below with clear item rows

---

## 07. UI Elements

### Cards

| Card Type          | Image Size    | Notes                                      |
|--------------------|---------------|--------------------------------------------|
| Standard article   | 150x150px     | Category chip, title in Dark Green, excerpt|
| Wide content       | 391x220px     | Expandable/collapsible section             |
| Download/promo     | 485x220px     | Email capture inline                       |
| Podcast (desktop)  | 100x100px     | Inline audio player, progress bar          |
| Podcast (mobile)   | Full width    | Stacked layout with progress bar           |
| Podcast compact    | 75x75px       | Condensed horizontal layout                |

### Audio Players
- Progress bar: thin, Pink/Peach dot indicator
- Controls: Play button Yellow (`#F3BD48`), skip 15s forward/back icons
- Timestamp: left (current) and right (total)

### Breadcrumbs
- Format: `Home > Section > Page`
- Separator: `>`
- Contained in a light grey bar

### Tabbed Pages
- Active tab: underline in Yellow (`#F3BD48`)
- Tab text: Dark Green (`#006C5B`) for active, Cool Grey for inactive

### Banners
- Desktop donate banner: 728x90px
- Mobile donate banner: 300x300px
- Article card image: 337x191px
