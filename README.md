# Chromix

A color-matching game inspired by Colorfle, but with open-ended guessing and continuous percentages.

## Rules
- You can only mix `Cyan`, `Magenta`, `Yellow`, `White`, and `Black`.
- Each slider is a raw `0-100%` input.
- The pie chart shows each color's share relative to the whole slider total.
  - Example: if all five sliders are `100`, each pie slice is `20%`.
- Press `Check` to submit a guess.
- After submit, the pie turns into your guessed color.
- As soon as you move any slider again, the pie returns to segmented mode.

## Scoring
- Accuracy is based on RGB distance between your mixed guess and the target.
- Milestones tracked for sharing:
  - `50%`
  - `75%`
  - `90%`
  - `95%`
  - `98%`
  - `99%`

## UI Behavior
- The page background is the target color.
- Text and card contrast automatically switch for readability.
- Target swatch remains visible.
- Guess history stores score and the submitted mix.
