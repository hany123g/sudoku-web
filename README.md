# Mobile Sudoku

A simple mobile-friendly Sudoku game for GitHub Pages.

## Features

- 9x9 Sudoku board
- Easy, medium, hard difficulty
- New game, check, hint, reset
- Timer
- Local browser save through `localStorage`
- Responsive layout for phone browsers
- Mobile number pad with locked-after-input behavior

## Run locally

Open `index.html` directly in a browser, or run a small local server:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Deploy with GitHub Pages

1. Create a GitHub repository, for example `sudoku-web`.
2. Upload these files to the repository root:
   - `index.html`
   - `style.css`
   - `app.js`
   - `README.md`
   - `.nojekyll`
3. Go to repository `Settings` > `Pages`.
4. Set source to `Deploy from a branch`.
5. Select branch `main` and folder `/root`, then save.
6. Open the published URL on your phone.

Typical URL:

```text
https://YOUR_GITHUB_ID.github.io/sudoku-web/
```

## Mobile input behavior

- Tap a blank cell, then tap a number to enter it.
- Or tap a number first, then tap a blank cell to enter it.
- After a number is entered, that cell is automatically deselected so pressing another number does not overwrite it.
- To change an entered value, tap that cell again and then tap the new number.
- Tap Erase, or select a cell and tap Erase, to clear an editable cell.
