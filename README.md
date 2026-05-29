# vvc-generated

Generated files published from voicevox-calling and served as an Astro static site on GitHub Pages.

## Overview

This repository has two roles:

- Store generated slide HTML and image assets pushed from voicevox-calling.
- Build a lightweight archive UI where generated slides can be browsed by month and sorted by date.

Public URLs:

- Archive UI: `https://kunihiros.github.io/vvc-generated/`
- Slide assets: `https://kunihiros.github.io/vvc-generated/slides/...`
- Image assets: `https://kunihiros.github.io/vvc-generated/images/...`

## Repository Layout

- `public/slides/`: generated slide HTML and Visual Summary decks.
- `public/images/`: generated image files.
- `src/content/slides/`: Astro Content Collection entries for the archive UI.
- `src/pages/index.astro`: archive page.
- `src/content.config.ts`: slide entry schema.
- `.github/workflows/pages.yml`: GitHub Pages build and deploy workflow.

The public URL paths do not include `public/`. For example, `public/slides/2026/05/example.html` is served as `/vvc-generated/slides/2026/05/example.html`.

## Slide Entry Contract

voicevox-calling creates one Markdown entry per archived slide under `src/content/slides/<id>.md`.

Expected frontmatter fields:

- `title`: display title.
- `pubDate`: publication date used as the fallback archive date when `generatedAt` is missing.
- `generatedAt`: optional generation timestamp. The archive uses this for month grouping and sorting when present.
- `tags`: compatibility metadata retained for existing entries. Tags are not shown as archive filters.
- `slideUrl`: public URL path to the generated slide.
- `kind`: `slide-html` or `visual-summary-deck`.
- `summary`: optional short description.
- `thumbnailUrl`: optional public URL path for a deck thumbnail or representative image.
- `sourceSessionId`: optional source session identifier.
- `objectPath`: repository object path for traceability.

If an entry with the same id already exists, voicevox-calling leaves it unchanged. This keeps republishing the same generated slide close to a no-op and avoids rewriting archive metadata unexpectedly.

Image-only publishing does not create a slide entry.

## Archive UI Contract

The archive page derives its visible controls from entry dates, not from `tags`.

- Month filters show `All months` plus each `YYYY-MM` derived from the archive date.
- The archive date is `generatedAt` when present, otherwise `pubDate`.
- Initial order is `Newest`; users can switch to `Oldest`.
- `tags` remain readable in the Content Collection schema for compatibility, but are not exposed as filter buttons.
- `kind` can be displayed on cards, but is not exposed as a filter in the minimum UI.
- `Open` links use `target="_blank"` and `rel="noopener noreferrer"` so slide pages open in a separate tab safely.

## Local Development

```bash
npm install
npm test
npm run build
npm run dev
```

`npm run dev` starts a local Astro dev server for checking the archive UI. Generated slide HTML under `public/` can also be opened directly through the dev server.

## Publishing Flow

1. voicevox-calling generates a local slide or image.
2. voicevox-calling pushes assets into this repository:
   - slides to `public/slides/...`
   - images to `public/images/...`
   - archive entries to `src/content/slides/...` for slide HTML and Visual Summary decks
3. GitHub Actions runs the Pages workflow.
4. Astro builds the archive UI and deploys it to GitHub Pages.

GitHub Pages must use the GitHub Actions workflow build type. Legacy Pages / Jekyll publishing will serve static files but will not build the Astro archive UI.

You can check the Pages configuration with:

```bash
gh api repos/KunihiroS/vvc-generated/pages --jq '{build_type, html_url, status}'
```

The expected `build_type` is `workflow`.

## E2E Check

1. Generate a slide from voicevox-calling.
2. Open the publish result URL shown in voicevox-calling.
3. Open `https://kunihiros.github.io/vvc-generated/`.
4. Confirm the generated slide appears in the archive, can be filtered by its generated month, can be sorted Newest/Oldest, and opens from `Open` in a separate tab.
5. If GitHub Pages appears stale, wait for the workflow to finish and retry with a cache-busting query such as `?v=<timestamp>`.

If a push that changes `.github/workflows/pages.yml` is rejected with a missing `workflow` scope, update the workflow through an authenticated GitHub UI/app/connector or use a token that has the `workflow` scope.
