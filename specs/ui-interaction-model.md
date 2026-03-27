# Cuppanudel — UI Interaction Model
## Spec v0.1 — Compact / Expanded Dual-Mode Controls

---

## Motivation

Practice tools are used on a wide range of surfaces: a phone propped on a music stand, a
laptop on a desk, a tablet in portrait mode. A layout optimised for one context degrades
on others. The POC exposed two recurring tensions:

1. **Density vs. reach.** Canvas knobs and tiny drag handles pack a lot of information
   into a small area, but are difficult to operate accurately with a thumb or without a
   mouse.
2. **Visual richness vs. keyboard navigability.** Canvas-rendered controls are
   expressive but invisible to assistive technology and keyboard-only workflows.

The dual-mode model resolves both by giving every interactive control two faces:

| Mode | Name | Default? | Purpose |
|------|------|----------|---------|
| Primary | **Compact** | Yes | Information-dense, visually expressive, pointer-optimised |
| Secondary | **Expanded** | On demand | Larger hit targets, keyboard-navigable, screen-reader compatible |

Neither mode replaces the other. Compact is always the resting state. Expanded is a
transient overlay or in-place expansion that appears when the user signals they need it
and dismisses cleanly.

---

## Triggering Expanded Mode

A control enters expanded mode via any of:

| Input | Gesture |
|-------|---------|
| Touch | Short tap on the control (≤ 250 ms, ≤ 20 px movement) |
| Keyboard | `Tab` focus lands on the control's hidden focusable proxy; `Enter` or `Space` opens expanded |
| Mouse | Optional — e.g., a small `…` affordance shown on hover if the control is dense |

Expanded mode dismisses via:
- Another tap/click on the same control (toggle off)
- `Escape` key
- `Enter` key (confirm + close)
- Focus leaving the expanded element (blur)
- Touch outside the expanded overlay

---

## Control-Level Behaviour

### Rotary Knob

**Compact:** canvas arc (270° sweep). Drag up/down with mouse. Touch-unfriendly.

**Expanded:** a vertical `<input type="range">` overlay, positioned above (or below, if
near the top of the viewport) the canvas, clipped to viewport bounds. The slider's axis
orientation matches the knob's drag direction (up = more). Label shows current value.
Fine `+`/`−` step buttons remain active and stay in sync with the overlay when it is
open.

Key points:
- Overlay is a singleton per page — only one knob expanded at a time.
- `setValue()` on the knob keeps the overlay slider synchronised if it is currently open.
- The canvas redraws immediately as the slider moves.

### Beat Grid Handles (Metro Display)

**Compact:** draggable canvas circle. X = beat timing offset, Y = beat volume. Flash on
playhead crossing. Accent state (hi/lo) encoded in colour (cyan = hi, grey = lo).

**Expanded (future):** A per-beat detail panel, triggered by tapping the handle, showing:
- A labelled slider for volume (replaces Y-drag)
- A labelled slider or nudge buttons for timing offset (replaces X-drag)
- A toggle button for accent (hi / lo)
- Keyboard-navigable via arrow keys between beats, Tab to move between fields

The compact handle should remain visible and update live while the expanded panel is open.

### Sample Browser (future)

**Compact:** current row layout — thumbnail, label, duration, play / rename / delete.
Small buttons, dense list.

**Expanded:** a detail sheet or expanded row with larger controls, waveform preview at
increased height, labelled gain and pitch sliders, loop toggle, and keyboard shortcuts
displayed inline.

---

## Architectural Requirements (for `app/`)

### Focusable Proxy Pattern

Canvas elements cannot receive keyboard focus natively. Each compact canvas control must
have a visually-hidden (but not `display:none`) `<button>` or `<div tabindex="0">` proxy
immediately adjacent in the DOM. The proxy:
- Is the keyboard focus target
- Announces the control's name and current value via `aria-label` (updated whenever value
  changes)
- On `Enter`/`Space`, opens the expanded mode
- On `ArrowUp`/`ArrowDown` (for knobs), increments/decrements value directly without
  opening expanded mode — providing a lightweight keyboard interaction that doesn't
  require the overlay at all

### Expanded Element Placement

The expanded overlay must:
- Use `position: fixed` with runtime-computed coordinates
- Clamp all four edges to keep the element within `8px` of each viewport boundary
- Re-compute position on `resize` and `orientationchange` if currently visible
- Live in the same stacking context as the fullscreen panel when a panel is in fullscreen
  mode (use `z-index` values above the panel's own `z-index`)

### Shared Overlay Infrastructure

A single overlay element per control category (e.g., `KnobOverlay`, `HandleDetailPanel`)
shared across all instances is preferable to per-instance DOM nodes, for both memory and
focus-management simplicity. Only one overlay of each type can be visible at a time.

### ARIA

| Role | Usage |
|------|-------|
| `role="slider"` + `aria-valuemin/max/now` | Exposed on the hidden proxy for each knob; updated on every value change |
| `aria-expanded` | On the proxy button; reflects whether the expanded overlay is visible |
| `aria-haspopup="dialog"` | On controls whose expanded mode is a full detail panel |
| `aria-live="polite"` | On a status region that announces beat accent toggles, recording state changes, etc. |

### Keyboard Navigation Map (proposed)

| Key | Context | Action |
|-----|---------|--------|
| `Tab` / `Shift-Tab` | Page | Move between controls |
| `Enter` / `Space` | Compact control focused | Open expanded mode |
| `↑` / `↓` | Knob focused (compact) | Increment / decrement by 1 step |
| `↑` / `↓` | Expanded slider focused | Fine step |
| `Page Up` / `Page Down` | Expanded slider focused | Coarse step (10× fine step) |
| `Escape` | Expanded mode open | Close and return focus to proxy |
| `Enter` | Expanded mode open | Confirm and close |
| `←` / `→` | Beat grid focused | Move focus to previous / next beat handle |
| `t` | Beat handle focused | Toggle accent (hi / lo) |

---

## Relationship to Fullscreen Mode

The expanded overlay and the fullscreen panel are orthogonal features. When the metro
panel is in fullscreen mode (native API or CSS fallback):

- The knob overlay `z-index` must exceed the panel's `z-index` (currently 100; overlay
  uses 500) so it renders above the fullscreen panel.
- Beat handle expanded panels should appear inside the fullscreen panel's DOM subtree
  rather than as a body-level fixed element, so they inherit the panel's stacking context
  correctly under the native Fullscreen API.

---

## Open Questions

- [ ] Should the expanded overlay for a knob be vertical (matching drag direction) or
  horizontal (wider, easier to hit on narrow screens)? Consider user preference or
  auto-orient based on available space.
- [ ] How should multiple simultaneous expanded states interact? E.g. a beat handle
  detail panel open at the same time as a knob overlay. Probably: knob overlay is always
  singleton; beat handle panel is also singleton (only one beat expanded at a time).
- [ ] Should `ArrowLeft`/`ArrowRight` on a knob change value (horizontal analogue of
  `ArrowUp`/`ArrowDown`) or should they navigate between controls?
- [ ] For the `app/` framework: consider a `useExpandable(ref, options)` hook or
  `createExpandable(el, options)` factory that encapsulates focus trapping, overlay
  placement, proxy ARIA sync, and dismiss logic in one reusable unit.
