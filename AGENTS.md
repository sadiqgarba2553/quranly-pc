# Quranly Design Engineering & UI Standards (Emil Kowalski Philosophy)

All UI development, animations, micro-interactions, and component engineering in this application follow Emil Kowalski's Design Engineering philosophy and high-craft standards.

## 1. Core Principles & Philosophy
- **Unseen details compound:** Every invisible detail (micro-tap feedback, precise easing curves, origin points, momentum damping) aggregates into an experience users love without knowing why.
- **Beauty is leverage:** Crisp, responsive, high-craft motion distinguishes exceptional applications from ordinary ones.

---

## 2. Animation & Interaction Decision Framework

### A. Frequency Rules
- **High-frequency (100+ / day or keyboard actions):** No animation or instant feedback.
- **Medium-frequency (hover effects, list clicks):** Snappy, minimal duration (100-160ms).
- **Occasional (drawers, modals, sheets):** Smooth physics/springs or strong ease-out (200-300ms).

### B. Timing & Easing Curves
- **Never use `ease-in` on UI elements:** It feels sluggish and unresponsive.
- **Always use custom ease-out or spring curves:**
  ```css
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
  ```
- **UI durations must stay under 300ms:**
  - Button press feedback: `100ms - 160ms`
  - Popovers / Tooltips / Badges: `125ms - 200ms`
  - Dropdowns / Pickers: `150ms - 250ms`
  - Modals / Bottom Sheets / Drawers: `200ms - 300ms`

### C. Press Feedback & Active States
- Every pressable element (buttons, cards, list items, chips) must have responsive active feedback:
  ```css
  .pressable {
    transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
  }
  .pressable:active {
    transform: scale(0.97);
  }
  ```

### D. Entry & Exit Rules
- **Never animate from `scale(0)`:** Nothing in reality pops out of a zero point. Animate from `scale(0.95)` with `opacity: 0`.
- **Origin-aware Popovers:** Set `transform-origin` relative to trigger points. Modals stay centered (`transform-origin: center`).
- **Asymmetric Timing:** Entry should be deliberate, but exit/release must be snappy and instant.

---

## 3. Performance & Craft Guidelines
- **GPU Accelerated Only:** Animate `transform` and `opacity` exclusively. Never animate `height`, `width`, `margin`, or `padding` directly.
- **Use CSS transitions over keyframes** for interruptible interactions that retarget cleanly.
- **Touch Hover Protection:** Wrap hover states in `@media (hover: hover) and (pointer: fine)`.
- **Respect Motion Sensitivity:** Provide `@media (prefers-reduced-motion: reduce)` fallbacks.
- **Stagger Elements Naturally:** Cascading lists or grids should stagger by `30ms - 60ms`.

---

## 4. UI Review Checklist
When writing or refactoring UI components, verify against:
1. Are exact transition properties specified (avoid `transition: all`)?
2. Is active tap feedback (`scale(0.97)`) present on interactive components?
3. Is `scale(0)` avoided in favor of `scale(0.95)` + `opacity`?
4. Are UI animation durations kept under `300ms` with `--ease-out`?
5. Does the design preserve the user's requested uniform liquid-glass surfaces, original accent colours, blue-to-black app background and selectable animated full-screen player backgrounds? Keep text readable, with reduced-transparency and reduced-motion fallbacks.
