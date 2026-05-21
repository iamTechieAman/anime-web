---
version: alpha
name: Onoflix Dark Cinema
description: A moody streaming interface with cinematic contrast, soft surfaces, and bright action accents.
colors:
  primary: "#5865F2"
  secondary: "#229ED9"
  tertiary: "#F3F3F1"
  neutral: "#171611"
  surface: "#1F1C16"
  on-surface: "#F3F3F1"
  error: "#EF4444"
  border: "#374151"
  muted: "#8B8A85"
  accent-warm: "#D6A34B"
typography:
  headline-display:
    fontFamily: "Noto Sans"
    fontSize: "36px"
    fontWeight: 900
    lineHeight: "40px"
    letterSpacing: "0px"
  headline-lg:
    fontFamily: "Noto Sans"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "32px"
    letterSpacing: "-0.02em"
  headline-md:
    fontFamily: "Noto Sans"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: "28px"
    letterSpacing: "0px"
  headline-sm:
    fontFamily: "Noto Sans"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "20px"
    letterSpacing: "0px"
  body-lg:
    fontFamily: "Noto Sans"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
    letterSpacing: "0px"
  body-md:
    fontFamily: "Noto Sans"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "20px"
    letterSpacing: "0px"
  body-sm:
    fontFamily: "Noto Sans"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: "16px"
    letterSpacing: "0px"
  label-lg:
    fontFamily: "Noto Sans"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
    letterSpacing: "0px"
  label-md:
    fontFamily: "Noto Sans"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
    letterSpacing: "0px"
  label-sm:
    fontFamily: "Noto Sans"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: "14px"
    letterSpacing: "0px"
  overline:
    fontFamily: "Noto Sans"
    fontSize: "10px"
    fontWeight: 700
    lineHeight: "12px"
    letterSpacing: "0.08em"
rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 14px
  xl: 20px
  full: 9999px
spacing:
  xs: 2px
  sm: 10px
  md: 16px
  lg: 22px
  xl: 28px
  2xl: 48px
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.neutral}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.tertiary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
    height: "40px"
  button-tertiary:
    backgroundColor: "transparent"
    textColor: "{colors.tertiary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.none}"
    padding: "0px"
    height: "auto"
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.tertiary}"
  card:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
    height: "40px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  nav-icon:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    size: "32px"
  rating-badge:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "4px 8px"
---

# Onoflix Dark Cinema

## Overview
Onoflix feels like a cinematic streaming platform built for fast browsing and high-impact hero content. The tone is dark, dramatic, and slightly playful, with bright accent colors and rounded controls softening the moody backdrop. The interface is optimized for entertainment discovery: dense enough to surface lots of content, but spacious in its hero treatment so featured titles feel premium.

## Colors
- **Primary (#5865F2):** A vivid periwinkle accent used for energetic highlights and brand moments. It reads as modern and tech-forward against the dark canvas.
- **Secondary (#229ED9):** A cool blue accent that supports social/utility actions and provides visual variety without breaking the palette.
- **Tertiary (#F3F3F1):** The main light text and control color, used for primary content, icons, and strong button surfaces.
- **Neutral (#171611):** The foundational near-black background, giving the UI its cinematic, immersive feel.
- **Surface (#1F1C16):** A softened dark brown-black surface used for inputs, chips, and elevated dark controls.
- **On-surface (#F3F3F1):** High-contrast text and icon color on dark surfaces, ensuring readability over the background layers.
- **Border (#374151):** A subtle cool-gray edge color used sparingly to define cards and interactive boundaries.
- **Muted (#8B8A85):** Secondary text and less prominent UI details, keeping hierarchy clear without harsh contrast.
- **Accent-warm (#D6A34B):** A gold-toned accent that supports ratings, stars, and other entertainment-forward emphasis.

## Typography
The system uses Noto Sans throughout, which keeps the interface legible and broadly internationalized while remaining neutral enough for media content. Headline levels are bold and compact: `headline-display` for the hero title, `headline-lg` and `headline-md` for section headers and featured content, and `headline-sm` for smaller strong labels. Body text stays restrained in `body-md` and `body-sm`, with labels in `label-lg`, `label-md`, and `label-sm` handling buttons, chips, and metadata; the only noticeable tracking treatment is the slightly expanded `overline` style for compact emphasis.

## Layout & Spacing
The layout is a wide, fluid streaming dashboard with a strong left rail, a top utility bar, and a full-bleed hero stage. Content areas breathe through large horizontal spacing and controlled vertical rhythm, with the hero consuming most of the viewport before the grid of rails and carousels begins. Spacing follows a small-to-medium step scale, favoring tight icon spacing for navigation and larger gaps for section separation and card clusters.

## Elevation & Depth
Depth is created more with tonal layering and contrast than with heavy shadow. The background stays nearly flat and dark, while cards, search fields, pills, and buttons lift through slightly lighter surface colors and subtle borders rather than dramatic blur shadows. The result is a polished but understated hierarchy that suits media browsing and keeps the artwork dominant.

## Shapes
The shape language is soft and approachable, with rounded corners used across buttons, chips, cards, and inputs. `rounded.lg` and `rounded.full` do most of the work, giving the interface a friendly streaming-app feel while still preserving a structured, desktop-ready composition. Icon buttons and badges lean into circular or pill-like geometry to keep the UI visually light.

## Components
Buttons are a major brand signal. `button-primary` is the brightest call to action, using the light tertiary surface with dark text and a 40px height; it should feel confident and immediately actionable. `button-secondary` stays dark and quiet for supportive actions like “Add to List,” while `button-tertiary` is reserved for inline links or minimal actions. Hover states can shift toward `button-primary-hover` for a stronger accent feel, but the system should avoid overly elaborate motion or shadows.

Cards should remain dark, restrained, and content-first. Use `card` for poster tiles, info panels, and list surfaces with a 1px border and modest padding; keep the artwork or title hierarchy more prominent than the container. Inputs use the same dark-surface treatment with rounded corners and clear placeholder contrast, as shown by the search field in the top bar.

Chips and metadata pills are central to browsing and filtering. `chip` should be compact, fully rounded, and medium-weight, supporting tags like genre, season count, or content type. Rating badges should stay tiny and high-contrast, with warm accent treatment for stars and numeric scores.

Navigation icons are simple outline elements on transparent or dark backgrounds. Keep them medium-sized, consistent, and softly rounded, with active states indicated through brighter text, a filled surface, or a clearer boundary rather than decorative effects.

## Do's and Don'ts
- Do keep the UI dark and cinematic, with content artwork taking visual priority over container chrome.
- Do use rounded pills and soft corners for action controls, filters, and metadata.
- Do rely on high-contrast light text for readability on dark surfaces.
- Do use subtle borders and tonal shifts instead of large shadows.
- Don't introduce bright white backgrounds except for the most important primary button surfaces.
- Don't overcomplicate cards with multiple shadows, gradients, or heavy outlines.
- Don't make body text too large; the interface should stay compact and browse-friendly.
- Don't mix in unrelated accent hues that compete with the primary periwinkle and warm rating gold.
