# Wason

A daily logic puzzle based on the [Wason selection task](https://en.wikipedia.org/wiki/Wason_selection_task). Everyone on the same calendar date gets the same puzzle, generated in the browser from the date. No server, no answer key: the puzzle is derived, not stored. There is also endless practice per mechanic and a replayable archive of past days.

Play at https://sean-reid.github.io/wason/

## Development

Needs Node 22.13 or newer.

```sh
npm install
npx playwright install chromium
npm run dev
```

## Checks

`npm run check` runs lint, format, types, unit tests, and the build. End to end:

```sh
npm run e2e
```
