# percentages

A simple dark mode calculator that shows how much each value weighs on the total. It was primarily made to get an idea of the percentages of investments.

## Features

- Add and remove fields as needed, from 1 up to 12
- Rename each field to whatever you are tracking
- Live percentage next to every field, e.g. `70`, `15` and `15` become `70%`, `15%` and `15%`
- Donut chart and stacked bar that update as you type
- Hover or focus a field to highlight it in the charts, and hover the charts to highlight the field
- The largest share gets a badge
- Accepts both `.` and `,` as the decimal separator
- Your fields and values are kept in the browser between visits
- Dark mode, desktop first and mobile friendly
- Respects the `prefers-reduced-motion` setting

## How it works

Each percentage is calculated as `value / sum of all values * 100`. Empty, negative or invalid values count as `0`.

## Running

It is a static page with no dependencies and no build step. Open `index.html` in your browser.

To serve it locally instead:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Project structure

```
index.html   page markup
style.css    dark theme, layout and animations
script.js    calculation, charts and interactions
```

## Deploying

Any static host works. On GitHub Pages, go to **Settings → Pages**, choose the `main` branch and the root folder.

## License

Released under the [MIT License](LICENSE).
