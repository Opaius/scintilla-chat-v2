---
version: alpha
name: Scintilla Chat
description: A clean, minimal chat application design — high-contrast neutrals, generous whitespace, and a single blue accent for interaction.
colors:
  primary: "#0F172A"
  on-primary: "#FFFFFF"
  secondary: "#64748B"
  on-secondary: "#FFFFFF"
  tertiary: "#3B82F6"
  on-tertiary: "#FFFFFF"
  tertiary-container: "#DBEAFE"
  on-tertiary-container: "#1E3A5F"
  neutral: "#FAFAFA"
  neutral-container: "#F4F4F5"
  neutral-border: "#E4E4E7"
  surface: "#FFFFFF"
  on-surface: "#18181B"
  on-surface-variant: "#71717A"
  error: "#EF4444"
  on-error: "#FFFFFF"
typography:
  h1:
    fontFamily: Inter
    fontSize: 1.75rem
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 600
    lineHeight: 1.5
  body-md:
    fontFamily: Inter
    fontSize: 0.9375rem
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0.01em
  label:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.01em
  code:
    fontFamily: JetBrains Mono
    fontSize: 0.8125rem
    fontWeight: 400
    lineHeight: 1.5
rounded:
  none: 0
  xs: 2px
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  0: 0
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 20px
  6: 24px
  8: 32px
  10: 40px
  12: 48px
  16: 64px
elevation:
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)"
  md: "0 4px 6px -1px rgb(0 0 0 / 0.08)"
  lg: "0 10px 25px -5px rgb(0 0 0 / 0.1)"
components:
  chat-message:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.3} {spacing.4}"
    typography: body-md
  chat-message-own:
    backgroundColor: "{colors.tertiary-container}"
    textColor: "{colors.on-tertiary-container}"
    rounded: "{rounded.lg}"
    padding: "{spacing.3} {spacing.4}"
    typography: body-md
  chat-input:
    backgroundColor: "{colors.neutral-container}"
    rounded: "{rounded.lg}"
    padding: "{spacing.3} {spacing.4}"
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    rounded: "{rounded.md}"
    padding: "{spacing.2} {spacing.4}"
    typography: label
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.on-surface-variant}"
    rounded: "{rounded.md}"
    padding: "{spacing.2}"
    typography: label
  sidebar:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    width: 280px
  divider:
    backgroundColor: "{colors.neutral-border}"
    height: 1px

---

## Overview

Scintilla Chat is a clean, minimal messaging interface. The design prioritizes readability and focus — generous whitespace separates conversations, crisp typography carries the content, and a single blue accent guides interaction without noise. The aesthetic is premium but restrained, like a well-edited publication or a high-end productivity tool.

## Colors

The palette is rooted in high-contrast neutrals with a single blue accent.

- **Primary (#0F172A):** Deep ink for strong headlines, navigation text, and emphasis.
- **Secondary (#64748B):** Slate for secondary text, metadata, and subtle labels.
- **Tertiary (#3B82F6):** "Clear Blue" — the only interactive color. Used for send buttons, links, focus rings, and active states.
- **Neutral (#FAFAFA):** Light stone for sidebar and container backgrounds.
- **Surface (#FFFFFF):** Clean white for content cards, message bubbles, and modals.
- **Neutral-border (#E4E4E7):** Hairline borders and dividers.
- **On-surface (#18181B):** Near-black for body text on white surfaces.

## Typography

Inter is the sole typeface — neutral, highly legible at small sizes, with a large x-height that reads well in message threads.

- **H1:** App title, empty states — bold, tight tracking.
- **Body-md:** Message content, list items — 15px at comfortable leading.
- **Body-sm:** Timestamps, secondary info — 13px, still readable.
- **Caption:** Labels, counters, badges — 12px with subtle letter-spacing.
- **Code:** Inline code blocks, monospace formatting — JetBrains Mono.

## Layout

- **Page max-width:** full-bleed (chat fills the viewport).
- **Sidebar:** 280px fixed, with a 1px border-right separator.
- **Content area:** Flexible, with 24px padding.
- **Message spacing:** 12px between consecutive messages, 20px between separate groups.
- **Input area:** Fixed bottom, 16px padding from edges, with a 12px rounded container.

## Elevation & Depth

Subtle shadows create light depth without competing with content.

- **sm:** Subtle — hover states, cards resting on surfaces.
- **md:** Raised — dropdown menus, command palettes.
- **lg:** Modal overlay — dialogs, full-screen panels.

## Shapes

- **Messages:** 12px rounded corners with asymmetric radii for own messages (16px bottom-right, 4px top-right).
- **Input fields:** 8px — distinctly rounded but not pill-shaped.
- **Buttons:** 8px — consistent with inputs.
- **Avatars:** Full rounded (circle).
- **Modals:** 16px — the most rounded surface element.

## Components

### Chat Message
A bubble with the user's text, sender name, and timestamp. Sent messages use the tertiary-container background; received messages use white. Each message has 8px top padding above the sender name and 4px below the timestamp.

### Chat Input
A rounded neutral container with the text input, attachment button, and send button. The send button is the only tertiary-colored element in the bar — it sits at the far right.

### Sidebar
A fixed 280px panel on the left with conversation list items. Each item shows an avatar, conversation name, last message preview (truncated to one line), and timestamp. The active conversation has a tertiary left-border accent.

## Do's and Don'ts

- **Do** use generous whitespace — content needs room to breathe.
- **Do** use a single tertiary accent per view — multiple colored elements dilute the hierarchy.
- **Don't** use background colors on buttons that compete with tertiary — only the primary action button gets the blue fill.
- **Do** render code blocks in JetBrains Mono with a neutral-container background.
- **Don't** shadow content areas — shadows are for floating elements only (modals, dropdowns).
- **Do** keep message bubbles compact — padding inside, breathing room outside.
